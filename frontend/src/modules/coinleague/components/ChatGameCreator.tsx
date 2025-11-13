import { fadeVariants } from '@/animations';
import { AnimatedTextField } from '@/components/animated/AnimatedTextField';
import { ChatBox } from '@/modules/coinleague/components/ChatBox';
import { GameLevel, GameType } from '@/modules/coinleague/constants/enums';
import { useLeaguesChainInfo } from '@/modules/coinleague/hooks/chain';
import { ChainId } from '@/modules/common/constants/enums';
import { useWeb3React } from '@dexkit/wallet-connectors/hooks/useWeb3React';
import SendIcon from '@mui/icons-material/Send';
import {
  Box,
  IconButton,
  Paper,
  Stack,
  useTheme
} from '@mui/material';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useIntl } from 'react-intl';
import { TokenPerformance } from '../types/chat';

interface ChatGameCreatorProps {
  onGameParamsExtracted: (params: {
    gameType?: GameType;
    duration?: number;
    gameLevel?: GameLevel;
    maxCoins?: number;
    maxPlayers?: number;
  }) => void;
}

export function ChatGameCreator({ onGameParamsExtracted }: ChatGameCreatorProps) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  // Removed isFocused state - border will always be visible
  const [showChatBox, setShowChatBox] = useState(false);
  const [chatBoxInitialMessage, setChatBoxInitialMessage] = useState<string>();
  const [chatBoxInitialData, setChatBoxInitialData] = useState<{
    tokens: TokenPerformance[];
    timePeriod: string;
  }>();
  const { formatMessage } = useIntl();
  const theme = useTheme();
  const { chainId, account } = useWeb3React();
  const { chainId: gameChainId } = useLeaguesChainInfo();
  const activeChainId = (gameChainId || chainId) as ChainId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput('');
    setIsLoading(true);

    setChatBoxInitialMessage(userInput);
    setChatBoxInitialData(undefined);
    setShowChatBox(true);
    setIsLoading(false);

    if (activeChainId) {
      fetch('/api/analyze-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: userInput,
          chainId: activeChainId,
        }),
      })
        .then((analysisResponse) => {
          if (analysisResponse.ok) {
            return analysisResponse.json();
          }
          return null;
        })
        .then((analysisData) => {
          if (analysisData && analysisData.tokens && analysisData.tokens.length > 0) {
            setChatBoxInitialData(analysisData);
          }
        })
        .catch((error) => {
        });
    }

  };

  const handleCloseChatBox = () => {
    setShowChatBox(false);
    setChatBoxInitialMessage(undefined);
    setChatBoxInitialData(undefined);
  };

  return (
    <>
      {showChatBox && (
        <ChatBox
          dialogProps={{
            open: showChatBox,
            onClose: handleCloseChatBox,
          }}
          initialMessage={chatBoxInitialMessage}
          initialData={chatBoxInitialData}
          chainId={activeChainId}
          onGameParamsExtracted={onGameParamsExtracted}
        />
      )}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          px: { xs: 2, sm: 4 },
          '@keyframes gradientShift': {
            '0%': {
              backgroundPosition: '0% 50%',
            },
            '50%': {
              backgroundPosition: '100% 50%',
            },
            '100%': {
              backgroundPosition: '0% 50%',
            },
          },
          '@keyframes pulseGlow': {
            '0%, 100%': {
              opacity: 0.6,
            },
            '50%': {
              opacity: 1,
            },
          },
          '@keyframes pulseGlowRed': {
            '0%, 100%': {
              opacity: 0.6,
            },
            '50%': {
              opacity: 1,
            },
          },
          '@keyframes shimmer': {
            '0%': {
              backgroundPosition: '-200% 50%',
            },
            '100%': {
              backgroundPosition: '200% 50%',
            },
          },
        }}
      >
        <motion.div
          variants={fadeVariants}
          initial="hidden"
          animate="visible"
          style={{
            width: '100%',
            maxWidth: '100%',
          }}
        >
          <Box
            sx={(theme) => ({
              position: 'relative',
              borderRadius: 3,
              p: '2px',
              background: !account
                ? `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark}, ${theme.palette.error.main})`
                : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || theme.palette.primary.light}, ${theme.palette.primary.main})`,
              backgroundSize: '200% 200%',
              animation: !account
                ? 'gradientShift 3s ease infinite, pulseGlowRed 2s ease-in-out infinite'
                : 'gradientShift 3s ease infinite, pulseGlow 2s ease-in-out infinite',
              transition: 'all 0.3s ease',
              boxShadow: !account
                ? `0 0 20px ${theme.palette.error.main}40, 0 0 40px ${theme.palette.error.main}20, 0 0 60px ${theme.palette.error.main}20`
                : `0 0 20px ${theme.palette.primary.main}40, 0 0 40px ${theme.palette.primary.main}20, 0 0 60px ${theme.palette.primary.main}20`,
              filter: !account
                ? `drop-shadow(0 0 10px ${theme.palette.error.main}60) drop-shadow(0 0 20px ${theme.palette.error.main}40)`
                : `drop-shadow(0 0 10px ${theme.palette.primary.main}60) drop-shadow(0 0 20px ${theme.palette.primary.main}40)`,
              '&::before': {
                content: '""',
                position: 'absolute',
                top: '-2px',
                left: '-2px',
                right: '-2px',
                bottom: '-2px',
                borderRadius: 3,
                background: !account
                  ? `linear-gradient(135deg, ${theme.palette.error.main}, ${theme.palette.error.dark}, ${theme.palette.error.main})`
                  : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary?.main || theme.palette.primary.light}, ${theme.palette.primary.main})`,
                backgroundSize: '200% 200%',
                animation: 'shimmer 3s linear infinite',
                zIndex: -1,
                opacity: 0.7,
              },
            })}
          >
            <Paper
              elevation={4}
              sx={(theme) => ({
                p: 2,
                borderRadius: 2.5,
                position: 'relative',
                backgroundColor: 'background.paper',
                transition: 'all 0.3s ease',
              })}
            >
              <Stack spacing={1.5}>
                <Box
                  component="form"
                  onSubmit={handleSubmit}
                  sx={{
                    display: 'flex',
                    gap: 2,
                    alignItems: 'center',
                  }}
                >
                  <motion.div
                    style={{ flex: 1 }}
                    whileFocus={{ scale: 1.02 }}
                    transition={{ duration: 0.2 }}
                  >
                    <AnimatedTextField
                      fullWidth
                      size="medium"
                      placeholder={formatMessage({
                        id: !account ? 'chat.game.placeholder.connect.wallet' : 'chat.game.placeholder',
                        defaultMessage: !account
                          ? 'Please connect your wallet to use the chat'
                          : 'e.g., "Create a bull game for 10 players with 3 coins"',
                      })}
                      value={input}
                      onChange={(e) => {
                        if (account) {
                          setInput(e.target.value);
                        }
                      }}
                      disabled={!account || isLoading}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: 2,
                          fontSize: '1rem',
                          py: 1,
                          '& fieldset': {
                            borderColor: !account 
                              ? theme.palette.error.main 
                              : theme.palette.mode === 'dark' 
                                ? theme.palette.grey[600] 
                                : theme.palette.grey[300],
                          },
                          '&:hover': {
                            '& fieldset': {
                              borderColor: !account 
                                ? theme.palette.error.main 
                                : theme.palette.primary.main,
                            },
                          },
                          '&.Mui-focused': {
                            '& fieldset': {
                              borderColor: !account 
                                ? theme.palette.error.main 
                                : theme.palette.primary.main,
                              borderWidth: 2,
                            },
                          },
                        },
                      }}
                    />
                  </motion.div>
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <IconButton
                      type="submit"
                      disabled={!account || !input.trim() || isLoading}
                      color="primary"
                      size="large"
                      sx={{
                        color: '#FFFFFF',
                        backgroundColor: theme.palette.primary.main,
                        width: 56,
                        height: 56,
                        '&:hover': {
                          backgroundColor: theme.palette.primary.dark,
                        },
                        '&:disabled': {
                          opacity: 0.5,
                          backgroundColor: theme.palette.action.disabledBackground,
                        },
                        boxShadow: `0 4px 20px ${theme.palette.primary.main}40`,
                        transition: 'all 0.3s ease',
                      }}
                    >
                      {isLoading ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                        >
                          <SendIcon />
                        </motion.div>
                      ) : (
                        <SendIcon />
                      )}
                    </IconButton>
                  </motion.div>
                </Box>
              </Stack>
            </Paper>
          </Box>
        </motion.div>
      </Box>
    </>
  );
}

