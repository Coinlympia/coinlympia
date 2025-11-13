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
}

interface ChartDataPoint {
  timestamp: number;
  price: number;
}

export function TokenChartModal({
  dialogProps,
  tokenSymbol,
  tokenAddress,
  chainId,
}: TokenChartModalProps) {
  const { mode } = useColorScheme();
  const [isMounted, setIsMounted] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            days: 7,
          }),
        });

        const result = await response.json();

        if (result.success && result.data) {
          setChartData(result.data);
        } else {
          setError(result.error || 'Failed to load chart data');
        }
      } catch (err: any) {
        console.error('Error fetching chart data:', err);
        setError(err.message || 'Failed to load chart data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchChartData();
  }, [isMounted, tokenSymbol, tokenAddress, chainId]);

  if (!isMounted) {
    return null;
  }

  const formattedData = chartData.map((point) => ({
    ...point,
    date: formatDate(point.timestamp),
    time: formatTime(point.timestamp),
    formattedPrice: point.price.toFixed(6),
  }));

  const priceChange = chartData.length > 1
    ? chartData[chartData.length - 1].price - chartData[0].price
    : 0;
  const priceChangePercent = chartData.length > 1 && chartData[0].price > 0
    ? ((priceChange / chartData[0].price) * 100)
    : 0;

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0;

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
          {currentPrice > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                ${currentPrice.toFixed(6)}
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
