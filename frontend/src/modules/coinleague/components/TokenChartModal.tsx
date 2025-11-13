import { Dialog, DialogContent, DialogProps, Box, IconButton, Typography, CircularProgress, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useColorScheme } from '@mui/material/styles';
import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const month = date.toLocaleString('en-US', { month: 'short' });
  const day = date.getDate();
  return `${month} ${day}`;
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

interface TokenChartModalProps {
  dialogProps: DialogProps;
  tokenSymbol: string;
  tokenAddress?: string;
  chainId?: number;
  requestedTimePeriod?: string;
}

interface ChartDataPoint {
  timestamp: number;
  price: number;
}

interface ChartDataResponse {
  success: boolean;
  data?: ChartDataPoint[];
  historicalPrice?: number | null;
  currentPrice?: number | null;
  error?: string;
}

export function TokenChartModal({
  dialogProps,
  tokenSymbol,
  tokenAddress,
  chainId,
  requestedTimePeriod,
}: TokenChartModalProps) {
  const { mode } = useColorScheme();
  const [isMounted, setIsMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [historicalPrice, setHistoricalPrice] = useState<number | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

  useEffect(() => {
    setIsMounted(true);
    setIsDark(mode === 'dark');
  }, [mode]);

  useEffect(() => {
    if (!isMounted || !tokenSymbol || !chainId) {
      return;
    }

    const fetchChartData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch('/api/token-chart-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenAddress,
            symbol: tokenSymbol,
            chainId,
            timePeriod: requestedTimePeriod,
          }),
        });

        const result = await response.json() as ChartDataResponse;

        if (result.success && result.data) {
          let filteredData = result.data;
          
          if (requestedTimePeriod) {
            const timePeriodLower = requestedTimePeriod.toLowerCase();
            const now = Date.now();
            let maxAge = 0;
            
            if (timePeriodLower.includes('year') || timePeriodLower.includes('1y') || timePeriodLower.includes('12m') || timePeriodLower.includes('past year')) {
              maxAge = 30 * 24 * 60 * 60 * 1000;
            } else if (timePeriodLower.includes('past month') || timePeriodLower.includes('month') || timePeriodLower.includes('30d') || timePeriodLower.includes('30 days') || timePeriodLower.includes('1m')) {
              maxAge = 30 * 24 * 60 * 60 * 1000;
            } else if (timePeriodLower.includes('week') || timePeriodLower.includes('7d') || timePeriodLower.includes('1w') || timePeriodLower.includes('past week')) {
              maxAge = 7 * 24 * 60 * 60 * 1000;
            } else if (timePeriodLower.includes('day') || timePeriodLower.includes('24h') || timePeriodLower.includes('1d')) {
              maxAge = 24 * 60 * 60 * 1000;
            } else if (timePeriodLower.includes('8h') || timePeriodLower.includes('8 hours')) {
              maxAge = 8 * 60 * 60 * 1000;
            } else if (timePeriodLower.includes('4h') || timePeriodLower.includes('4 hours')) {
              maxAge = 4 * 60 * 60 * 1000;
            } else if (timePeriodLower.includes('1h') || timePeriodLower.includes('1 hour')) {
              maxAge = 60 * 60 * 1000;
            } else if (timePeriodLower.includes('20m') || timePeriodLower.includes('20 minutes')) {
              maxAge = 20 * 60 * 1000;
            }
            
            if (maxAge > 0) {
              const cutoffTime = now - maxAge;
              filteredData = result.data.filter((point: ChartDataPoint) => point.timestamp >= cutoffTime);
            }
            
            if (filteredData.length === 0 && (timePeriodLower.includes('year') || timePeriodLower.includes('1y') || timePeriodLower.includes('12m') || timePeriodLower.includes('past year') || 
                timePeriodLower.includes('past month') || timePeriodLower.includes('month') || timePeriodLower.includes('30d') || timePeriodLower.includes('30 days') || timePeriodLower.includes('1m'))) {
              const maxAvailableAge = 30 * 24 * 60 * 60 * 1000;
              const maxAvailableCutoff = now - maxAvailableAge;
              filteredData = result.data.filter((point: ChartDataPoint) => point.timestamp >= maxAvailableCutoff);
            }
          }
          
          setChartData(filteredData);
          
          if (result.historicalPrice !== null && result.historicalPrice !== undefined && 
              result.currentPrice !== null && result.currentPrice !== undefined &&
              result.historicalPrice > 0 && result.currentPrice > 0) {
            setHistoricalPrice(result.historicalPrice);
            setCurrentPrice(result.currentPrice);
          } else {
            setHistoricalPrice(null);
            setCurrentPrice(null);
          }
        } else {
          setError(result.error || 'Failed to load chart data');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load chart data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, [isMounted, tokenSymbol, tokenAddress, chainId, requestedTimePeriod]);

  if (!isMounted) {
    return null;
  }

  const formattedData = chartData.map((point) => ({
    ...point,
    date: formatDate(point.timestamp),
    time: formatTime(point.timestamp),
    formattedPrice: point.price.toFixed(6),
  }));

  let priceChange = 0;
  let priceChangePercent = 0;
  let displayCurrentPrice = 0;

  if (historicalPrice !== null && currentPrice !== null && historicalPrice > 0 && currentPrice > 0) {
    priceChange = currentPrice - historicalPrice;
    priceChangePercent = ((priceChange / historicalPrice) * 100);
    displayCurrentPrice = currentPrice;
  } else if (chartData.length > 1) {
    const firstPrice = chartData[0].price;
    const lastPrice = chartData[chartData.length - 1].price;
    priceChange = lastPrice - firstPrice;
    priceChangePercent = firstPrice > 0 ? ((priceChange / firstPrice) * 100) : 0;
    displayCurrentPrice = lastPrice;
  } else if (chartData.length > 0) {
    displayCurrentPrice = chartData[chartData.length - 1].price;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: isDark ? 'rgba(0, 0, 0, 0.9)' : 'rgba(255, 255, 255, 0.95)',
            border: `1px solid ${isDark ? '#333' : '#ddd'}`,
            borderRadius: 1,
            p: 1.5,
            boxShadow: 2,
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {data.date} {data.time}
          </Typography>
          <Typography variant="body2" sx={{ color: priceChange >= 0 ? 'success.main' : 'error.main' }}>
            ${data.formattedPrice}
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Dialog
      {...dialogProps}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh',
        },
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <Typography variant="h6" component="span">
            {tokenSymbol} Chart
          </Typography>
          {displayCurrentPrice > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                ${displayCurrentPrice.toFixed(6)}
              </Typography>
              {priceChangePercent !== 0 && (
                <Typography
                  variant="body2"
                  sx={{
                    color: priceChangePercent >= 0 ? 'success.main' : 'error.main',
                    fontWeight: 600,
                  }}
                >
                  {priceChangePercent >= 0 ? '+' : ''}
                  {priceChangePercent.toFixed(2)}%
                </Typography>
              )}
            </Box>
          )}
        </Box>
        <IconButton
          onClick={(e) => {
            if (dialogProps.onClose) {
              dialogProps.onClose(e, 'backdropClick');
            }
          }}
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </Box>
      <DialogContent
        sx={{
          p: 3,
          height: '70vh',
          minHeight: 500,
          position: 'relative',
        }}
      >
        {isLoading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error">{error}</Alert>
        ) : formattedData.length === 0 ? (
          <Alert severity="info">No chart data available for this token</Alert>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={formattedData}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#e0e0e0'} />
              <XAxis
                dataKey="date"
                stroke={isDark ? '#999' : '#666'}
                style={{ fontSize: '12px' }}
              />
              <YAxis
                stroke={isDark ? '#999' : '#666'}
                style={{ fontSize: '12px' }}
                domain={['auto', 'auto']}
                tickFormatter={(value) => `$${value.toFixed(4)}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={chartData[0]?.price}
                stroke={isDark ? '#666' : '#999'}
                strokeDasharray="5 5"
                label={{ value: 'Start', position: 'insideTopRight', fill: isDark ? '#999' : '#666' }}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke={priceChange >= 0 ? '#4caf50' : '#f44336'}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </DialogContent>
    </Dialog>
  );
}
