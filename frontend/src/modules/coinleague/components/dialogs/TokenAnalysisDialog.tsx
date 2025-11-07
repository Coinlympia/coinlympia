import { AppDialogTitle } from '@/modules/common/components/AppDialogTitle';
import {
  Box,
  Dialog,
  DialogContent,
  DialogProps,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Stack,
  Typography,
  useTheme,
} from '@mui/material';
import { motion } from 'framer-motion';
import { FormattedMessage } from 'react-intl';
import { fadeVariants, listItemVariants, listVariants } from '@/animations';
import { useReducedMotion } from '@/animations/hooks/useReducedMotion';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import { TokenPerformance } from '../../types/chat';

interface Props {
  dialogProps: DialogProps;
  tokens: TokenPerformance[];
  timePeriod: string;
}

export function TokenAnalysisDialog({ dialogProps, tokens, timePeriod }: Props) {
  const { onClose } = dialogProps;
  const theme = useTheme();
  const prefersReducedMotion = useReducedMotion();

  const handleClose = () => {
    if (onClose) {
      onClose({}, 'escapeKeyDown');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(price);
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  return (
    <Dialog {...dialogProps} onClose={handleClose} maxWidth="sm" fullWidth>
      <motion.div
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <AppDialogTitle
          title={
            <FormattedMessage
              id="token.performance.analysis"
              defaultMessage="Token Performance Analysis"
            />
          }
          onClose={handleClose}
        />
        <Divider />
        <DialogContent dividers sx={{ p: 0 }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              <FormattedMessage
                id="token.performance.period"
                defaultMessage="Performance in the last {timePeriod}"
                values={{ timePeriod }}
              />
            </Typography>
            {tokens.length === 0 ? (
              <Box sx={{ py: 4, textAlign: 'center' }}>
                <Typography variant="body1" color="textSecondary">
                  <FormattedMessage
                    id="no.token.data.available"
                    defaultMessage="No token data available"
                  />
                </Typography>
              </Box>
            ) : (
              <List disablePadding>
                {prefersReducedMotion ? (
                  tokens.map((token, index) => (
                    <Paper
                      key={token.address}
                      elevation={1}
                      sx={{
                        mb: 1,
                        borderRadius: 2,
                        overflow: 'hidden',
                      }}
                    >
                      <ListItem>
                        <ListItemAvatar>
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: '50%',
                              backgroundColor: 'background.default',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              overflow: 'hidden',
                            }}
                          >
                            <Typography variant="caption" fontWeight="bold">
                              {token.symbol.substring(0, 2).toUpperCase()}
                            </Typography>
                          </Box>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {token.symbol}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {token.name}
                              </Typography>
                            </Stack>
                          }
                          secondary={
                            <Stack direction="row" spacing={2} alignItems="center">
                              <Typography variant="body2">
                                {formatPrice(token.currentPrice)}
                              </Typography>
                              <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                                sx={{
                                  color:
                                    token.priceChangePercent >= 0
                                      ? theme.palette.success.main
                                      : theme.palette.error.main,
                                }}
                              >
                                {token.priceChangePercent >= 0 ? (
                                  <TrendingUpIcon fontSize="small" />
                                ) : (
                                  <TrendingDownIcon fontSize="small" />
                                )}
                                <Typography variant="body2" fontWeight={600}>
                                  {formatPercent(token.priceChangePercent)}
                                </Typography>
                              </Stack>
                            </Stack>
                          }
                        />
                      </ListItem>
                    </Paper>
                  ))
                ) : (
                  <motion.div
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {tokens.map((token, index) => (
                      <motion.div
                        key={token.address}
                        variants={listItemVariants}
                        style={{ marginBottom: 8 }}
                      >
                        <Paper
                          elevation={2}
                          sx={{
                            borderRadius: 2,
                            overflow: 'hidden',
                            transition: 'all 0.2s ease',
                            '&:hover': {
                              elevation: 4,
                              transform: 'translateY(-2px)',
                            },
                          }}
                        >
                          <ListItem>
                            <ListItemAvatar>
                              <Box
                                sx={{
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  backgroundColor: 'background.default',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  overflow: 'hidden',
                                }}
                              >
                                <Typography variant="caption" fontWeight="bold">
                                  {token.symbol.substring(0, 2).toUpperCase()}
                                </Typography>
                              </Box>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Stack direction="row" alignItems="center" spacing={1}>
                                  <Typography variant="subtitle1" fontWeight={600}>
                                    {token.symbol}
                                  </Typography>
                                  <Typography variant="caption" color="textSecondary">
                                    {token.name}
                                  </Typography>
                                </Stack>
                              }
                              secondary={
                                <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 0.5 }}>
                                  <Typography variant="body2">
                                    {formatPrice(token.currentPrice)}
                                  </Typography>
                                  <Stack
                                    direction="row"
                                    spacing={0.5}
                                    alignItems="center"
                                    sx={{
                                      color:
                                        token.priceChangePercent >= 0
                                          ? theme.palette.success.main
                                          : theme.palette.error.main,
                                    }}
                                  >
                                    {token.priceChangePercent >= 0 ? (
                                      <TrendingUpIcon fontSize="small" />
                                    ) : (
                                      <TrendingDownIcon fontSize="small" />
                                    )}
                                    <Typography variant="body2" fontWeight={600}>
                                      {formatPercent(token.priceChangePercent)}
                                    </Typography>
                                  </Stack>
                                </Stack>
                              }
                            />
                          </ListItem>
                        </Paper>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </List>
            )}
          </Box>
        </DialogContent>
      </motion.div>
    </Dialog>
  );
}

