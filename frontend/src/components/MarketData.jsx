import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Chip
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon
} from '@mui/icons-material';
import useWebSocket from '../hooks/useWebSocket';

const MarketData = ({ symbol, userId }) => {
  const [marketData, setMarketData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { isConnected, error: wsError, subscribe, unsubscribe } = useWebSocket(userId);

  useEffect(() => {
    // Initial data fetch
    fetchMarketData();

    // Subscribe to real-time updates
    if (isConnected) {
      subscribe(symbol);
    }

    // Listen for market updates
    const handleMarketUpdate = (event) => {
      const updates = event.detail;
      if (updates[symbol]) {
        setMarketData(updates[symbol]);
        setLoading(false);
      }
    };

    window.addEventListener('market_update', handleMarketUpdate);

    return () => {
      unsubscribe(symbol);
      window.removeEventListener('market_update', handleMarketUpdate);
    };
  }, [symbol, isConnected, subscribe, unsubscribe]);

  const fetchMarketData = async () => {
    try {
      const response = await fetch(`/api/market/${symbol}`);
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }
      const data = await response.json();
      setMarketData(data);
      setError(null);
    } catch (err) {
      setError('Failed to load market data');
      console.error('Error fetching market data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || wsError) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error || wsError}
      </Alert>
    );
  }

  if (!marketData) {
    return null;
  }

  const { market_data, analysis } = marketData;
  const priceChange = market_data.Close - market_data.Open;
  const priceChangePercent = (priceChange / market_data.Open) * 100;
  const isBullish = analysis?.trend === 'BULLISH';

  return (
    <Paper sx={{ p: 2 }}>
      <Grid container spacing={2}>
        {/* Price Information */}
        <Grid item xs={12} md={4}>
          <Typography variant="h6" gutterBottom>
            {symbol}
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
            {market_data.Close.toFixed(5)}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            {priceChange >= 0 ? (
              <TrendingUpIcon color="success" />
            ) : (
              <TrendingDownIcon color="error" />
            )}
            <Typography
              variant="body1"
              sx={{
                color: priceChange >= 0 ? 'success.main' : 'error.main',
                ml: 1
              }}
            >
              {priceChange.toFixed(5)} ({priceChangePercent.toFixed(2)}%)
            </Typography>
          </Box>
        </Grid>

        {/* Trading Analysis */}
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle1" gutterBottom>
            Trading Analysis
          </Typography>
          <Box sx={{ mb: 1 }}>
            <Chip
              label={analysis.trend}
              color={isBullish ? 'success' : 'error'}
              sx={{ fontWeight: 'bold' }}
            />
          </Box>
          <Typography variant="body2">
            Confidence: {(analysis.confidence * 100).toFixed(1)}%
          </Typography>
          <Typography variant="body2">
            Risk/Reward: {analysis.risk_reward_ratio.toFixed(2)}
          </Typography>
        </Grid>

        {/* Entry/Exit Points */}
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle1" gutterBottom>
            Entry/Exit Points
          </Typography>
          <Typography variant="body2">
            Entry: {analysis.entry_price.toFixed(5)}
          </Typography>
          <Typography variant="body2" color="success.main">
            Target: {analysis.target_price.toFixed(5)}
          </Typography>
          <Typography variant="body2" color="error.main">
            Stop Loss: {analysis.stop_loss.toFixed(5)}
          </Typography>
        </Grid>

        {/* Technical Indicators */}
        <Grid item xs={12}>
          <Typography variant="subtitle1" gutterBottom>
            Technical Indicators
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2">
                RSI: {analysis.indicators.RSI.toFixed(2)}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2">
                BB Position: {analysis.indicators.BB_Position.toFixed(2)}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2">
                SMA 20: {analysis.indicators.SMA_20.toFixed(5)}
              </Typography>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="body2">
                EMA 20: {analysis.indicators.EMA_20.toFixed(5)}
              </Typography>
            </Grid>
          </Grid>
        </Grid>

        {/* Pattern Recognition */}
        {analysis.patterns && analysis.patterns.length > 0 && (
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom>
              Detected Patterns
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {analysis.patterns.map((pattern, index) => (
                <Chip
                  key={index}
                  label={pattern}
                  size="small"
                  color={isBullish ? 'success' : 'error'}
                  variant="outlined"
                />
              ))}
            </Box>
          </Grid>
        )}
      </Grid>
    </Paper>
  );
};

export default MarketData;
