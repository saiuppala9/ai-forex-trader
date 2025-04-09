import React, { useState, useEffect } from 'react';
import { Card, Grid, Typography, Box, Chip, CircularProgress } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import axios from 'axios';

const GlobalMarkets = () => {
  const [marketsData, setMarketsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/global-markets');
        setMarketsData(response.data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up polling every minute
    const interval = setInterval(fetchData, 60000);

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">Error loading market data: {error}</Typography>
      </Box>
    );
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  const renderMarketCard = (market, region) => {
    const isPositive = market.change_percent >= 0;
    const color = isPositive ? 'success.main' : 'error.main';
    const Icon = isPositive ? TrendingUp : TrendingDown;

    return (
      <Card key={market.symbol} sx={{ p: 2, height: '100%' }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6" gutterBottom>
              {market.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {market.symbol}
            </Typography>
          </Box>
          <Chip
            label={market.market_state}
            color={market.market_state === 'REGULAR' ? 'success' : 'default'}
            size="small"
          />
        </Box>
        
        <Box mt={2}>
          <Typography variant="h5">
            {market.currency} {formatNumber(market.price)}
          </Typography>
          <Box display="flex" alignItems="center" mt={1}>
            <Icon sx={{ color, mr: 1 }} />
            <Typography color={color}>
              {formatNumber(market.change)} ({formatNumber(market.change_percent)}%)
            </Typography>
          </Box>
        </Box>
        
        <Box mt={2}>
          <Typography variant="body2" color="text.secondary">
            Volume: {new Intl.NumberFormat('en-US').format(market.volume)}
          </Typography>
        </Box>
      </Card>
    );
  };

  const renderNews = (news, region) => {
    if (!news || !news[region] || news[region].length === 0) return null;

    return (
      <Card sx={{ p: 2, mt: 2 }}>
        <Typography variant="h6" gutterBottom>Latest News</Typography>
        {news[region].map((item, index) => (
          <Box key={index} mb={2}>
            <Typography variant="subtitle2">
              <a href={item.link} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
                {item.title}
              </a>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(item.published).toLocaleString()}
            </Typography>
          </Box>
        ))}
      </Card>
    );
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {Object.entries(marketsData.markets).map(([region, markets]) => (
        <Box key={region} mb={4}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
            {region} Markets
          </Typography>
          <Grid container spacing={3}>
            {markets.map((market) => (
              <Grid item xs={12} sm={6} md={4} key={market.symbol}>
                {renderMarketCard(market, region)}
              </Grid>
            ))}
          </Grid>
          {renderNews(marketsData.news, region)}
        </Box>
      ))}
    </Box>
  );
};

export default GlobalMarkets;
