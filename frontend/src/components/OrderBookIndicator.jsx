import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  LinearProgress, 
  Grid,
  Tooltip,
  IconButton,
  CircularProgress,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { ArrowDropUp, ArrowDropDown, InfoOutlined, Refresh, ShowChart } from '@mui/icons-material';
import MarketContainer from './MarketContainer';

// Styled components for order book visualization
const OrderVolumeBar = styled(Box)(({ theme, type }) => ({
  height: 30,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: type === 'buy' ? theme.palette.bull.main : theme.palette.bear.main,
  color: 'white',
  fontWeight: 'bold',
  transition: 'width 0.5s ease-in-out',
}));

const VolumeIndicator = styled(Box)(({ theme, type }) => ({
  display: 'flex',
  alignItems: 'center',
  '& .volume-dot': {
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: type === 'buy' ? theme.palette.bull.main : theme.palette.bear.main,
    marginRight: theme.spacing(1),
  },
  '& .volume-change': {
    display: 'flex',
    alignItems: 'center',
    marginLeft: theme.spacing(1),
    color: type === 'buy' 
      ? (props) => props.change > 0 ? theme.palette.bull.main : theme.palette.bear.main
      : (props) => props.change > 0 ? theme.palette.bull.main : theme.palette.bear.main,
  }
}));

const OrderBookIndicator = ({ symbol }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [orderData, setOrderData] = useState(null);
  const [error, setError] = useState(null);
  const [marketDirection, setMarketDirection] = useState('neutral');

  // Determine market direction based on order book data
  useEffect(() => {
    if (orderData) {
      const { buy_percentage, sell_percentage } = orderData;
      if (buy_percentage > 55) {
        setMarketDirection('bull');
      } else if (sell_percentage > 55) {
        setMarketDirection('bear');
      } else {
        setMarketDirection('neutral');
      }
    }
  }, [orderData]);

  useEffect(() => {
    if (symbol) {
      fetchOrderBookData();
    }
  }, [symbol]);

  const fetchOrderBookData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Using our backend API endpoint for order book data
      const response = await fetch(`http://localhost:8000/api/market/orderbook/${symbol}`);
      if (!response.ok) {
        throw new Error(`Error fetching order book data: ${response.status}`);
      }
      
      const data = await response.json();
      setOrderData(data);
    } catch (err) {
      console.error('Error fetching order book data:', err);
      setError(err.message);
      
      // Generate mock data if API request fails
      const mockData = {
        symbol: symbol,
        buy_percentage: Math.random() * 70 + 15, // 15-85%
        sell_percentage: 0, // Will be calculated below
        total_orders: Math.floor(Math.random() * 900) + 100 // 100-1000
      };
      
      // Ensure percentages add up to 100%
      mockData.sell_percentage = 100 - mockData.buy_percentage;
      
      setOrderData(mockData);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MarketContainer marketDirection='neutral' sx={{ p: 1, mb: 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" py={1}>
          <CircularProgress size={24} sx={{ mr: 2 }} color='inherit' />
          <Typography variant="body2">Loading order book data...</Typography>
        </Box>
      </MarketContainer>
    );
  }

  if (error) {
    return (
      <MarketContainer marketDirection='bear' sx={{ p: 1, mb: 2 }}>
        <Typography variant="body2" color="error.main">
          Error loading order book: {error}
        </Typography>
      </MarketContainer>
    );
  }

  if (!orderData) {
    return null;
  }

  const { 
    buy_percentage, 
    sell_percentage, 
    buy_volume, 
    sell_volume, 
    total_volume,
    buy_change,
    sell_change,
    timestamp
  } = orderData;

  // Format numbers
  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num;
  };

  // Format timestamp
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <MarketContainer 
      marketDirection={marketDirection}
      title="Market Sentiment"
      sx={{ p: 1.5, mb: 2 }}
    >
      <Box display="flex" justifyContent="flex-end" alignItems="center" mb={1}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
          Updated: {formatTime(timestamp)}
        </Typography>
        <Tooltip title="Refresh data">
          <IconButton size="small" onClick={fetchOrderBookData}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Shows the percentage of buy vs sell orders currently in the market. This data helps gauge market sentiment and potential price direction.">
          <IconButton size="small">
            <InfoOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Order book visualization with our themed components */}
      <Box sx={{ display: 'flex', width: '100%', borderRadius: 1, overflow: 'hidden', mb: 1.5 }}>
        <OrderVolumeBar 
          type="buy" 
          sx={{ width: `${buy_percentage}%` }}
        >
          <ShowChart sx={{ fontSize: 16, mr: 0.5 }} />
          BUY {buy_percentage}%
        </OrderVolumeBar>
        <OrderVolumeBar 
          type="sell" 
          sx={{ width: `${sell_percentage}%` }}
        >
          SELL {sell_percentage}%
          <ShowChart sx={{ fontSize: 16, ml: 0.5, transform: 'rotate(180deg)' }} />
        </OrderVolumeBar>
      </Box>

      {/* Volume data with our themed components */}
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <VolumeIndicator type="buy" change={buy_change}>
            <Box className="volume-dot" />
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>Buy Volume:</Typography>
            <Typography variant="caption" fontWeight="bold" color="bull.main">
              {formatNumber(buy_volume)}
            </Typography>
            <Box className="volume-change">
              {buy_change > 0 ? (
                <ArrowDropUp style={{ color: theme.palette.bull.main }} fontSize="small" />
              ) : (
                <ArrowDropDown style={{ color: theme.palette.bear.main }} fontSize="small" />
              )}
              <Typography 
                variant="caption" 
                color={buy_change > 0 ? 'bull.main' : 'bear.main'}
              >
                {Math.abs(buy_change)}%
              </Typography>
            </Box>
          </VolumeIndicator>
        </Grid>
        <Grid item xs={6}>
          <VolumeIndicator type="sell" change={sell_change}>
            <Box className="volume-dot" />
            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>Sell Volume:</Typography>
            <Typography variant="caption" fontWeight="bold" color="bear.main">
              {formatNumber(sell_volume)}
            </Typography>
            <Box className="volume-change">
              {sell_change > 0 ? (
                <ArrowDropUp style={{ color: theme.palette.bull.main }} fontSize="small" />
              ) : (
                <ArrowDropDown style={{ color: theme.palette.bear.main }} fontSize="small" />
              )}
              <Typography 
                variant="caption" 
                color={sell_change > 0 ? 'bull.main' : 'bear.main'}
              >
                {Math.abs(sell_change)}%
              </Typography>
            </Box>
          </VolumeIndicator>
        </Grid>
      </Grid>
    </MarketContainer>
  );
};

export default OrderBookIndicator;
