import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Typography, 
  Box, 
  Divider,
  useTheme,
  Paper,
  Chip,
  CircularProgress,
  Tabs,
  Tab,
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown,
  Public,
  PieChart
} from '@mui/icons-material';
import MarketContainer from './MarketContainer';

// Sample market data (in production, this would come from an API)
const MARKET_DATA = {
  asia: [
    { 
      name: 'Nifty 50', 
      country: 'India', 
      value: 22345.32, 
      change: 1.25, 
      trend: 'up', 
      currency: 'INR',
      description: 'National Stock Exchange of India'
    },
    { 
      name: 'Sensex', 
      country: 'India', 
      value: 73854.81, 
      change: 0.98, 
      trend: 'up', 
      currency: 'INR',
      description: 'Bombay Stock Exchange'
    },
    { 
      name: 'Nikkei 225', 
      country: 'Japan', 
      value: 39794.12, 
      change: -0.32, 
      trend: 'down', 
      currency: 'JPY',
      description: 'Tokyo Stock Exchange'
    },
    { 
      name: 'Shanghai Composite', 
      country: 'China', 
      value: 3095.21, 
      change: -0.74, 
      trend: 'down', 
      currency: 'CNY',
      description: 'Shanghai Stock Exchange'
    },
    { 
      name: 'Hang Seng', 
      country: 'Hong Kong', 
      value: 17713.45, 
      change: 0.05, 
      trend: 'up', 
      currency: 'HKD',
      description: 'Hong Kong Stock Exchange'
    },
  ],
  europe: [
    { 
      name: 'FTSE 100', 
      country: 'UK', 
      value: 7927.71, 
      change: 0.41, 
      trend: 'up', 
      currency: 'GBP',
      description: 'London Stock Exchange'
    },
    { 
      name: 'DAX', 
      country: 'Germany', 
      value: 18174.89, 
      change: -0.17, 
      trend: 'down', 
      currency: 'EUR',
      description: 'Frankfurt Stock Exchange'
    },
    { 
      name: 'CAC 40', 
      country: 'France', 
      value: 8084.24, 
      change: 0.28, 
      trend: 'up', 
      currency: 'EUR',
      description: 'Euronext Paris'
    },
    { 
      name: 'IBEX 35', 
      country: 'Spain', 
      value: 10892.41, 
      change: -0.65, 
      trend: 'down', 
      currency: 'EUR',
      description: 'Madrid Stock Exchange'
    },
  ],
  americas: [
    { 
      name: 'S&P 500', 
      country: 'USA', 
      value: 5131.05, 
      change: 0.87, 
      trend: 'up', 
      currency: 'USD',
      description: 'US Stock Market Index'
    },
    { 
      name: 'Dow Jones', 
      country: 'USA', 
      value: 38274.28, 
      change: 0.69, 
      trend: 'up', 
      currency: 'USD',
      description: 'US Stock Market Index'
    },
    { 
      name: 'NASDAQ', 
      country: 'USA', 
      value: 16284.41, 
      change: 1.12, 
      trend: 'up', 
      currency: 'USD',
      description: 'US Stock Market Index'
    },
    { 
      name: 'TSX', 
      country: 'Canada', 
      value: 21832.35, 
      change: 0.23, 
      trend: 'up', 
      currency: 'CAD',
      description: 'Toronto Stock Exchange'
    },
    { 
      name: 'IPC', 
      country: 'Mexico', 
      value: 54923.84, 
      change: -0.43, 
      trend: 'down', 
      currency: 'MXN',
      description: 'Mexican Stock Exchange'
    },
  ]
};

// Styled MarketCard component
const MarketCard = ({ market }) => {
  const theme = useTheme();
  const isBull = market.trend === 'up';
  const marketDirection = isBull ? 'bull' : 'bear';
  
  return (
    <MarketContainer marketDirection={marketDirection} sx={{ height: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight="bold">
            {market.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {market.country} • {market.description}
          </Typography>
        </Box>
        <Chip 
          icon={isBull ? <TrendingUp /> : <TrendingDown />}
          label={`${isBull ? '+' : ''}${market.change}%`}
          color={isBull ? 'primary' : 'secondary'}
          sx={{ 
            bgcolor: isBull ? theme.palette.bull.main : theme.palette.bear.main,
            fontWeight: 'bold'
          }}
        />
      </Box>
      
      <Typography 
        variant="h4" 
        fontWeight="bold" 
        color={isBull ? 'bull.main' : 'bear.main'}
        sx={{ mb: 2 }}
      >
        {market.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
      </Typography>
      
      <Divider sx={{ my: 1, opacity: 0.4 }} />
      
      <Typography variant="caption" color="text.secondary">
        Currency: {market.currency}
      </Typography>
    </MarketContainer>
  );
};

const GlobalMarketsOverview = () => {
  const theme = useTheme();
  const [region, setRegion] = useState('all');
  const [loading, setLoading] = useState(false);
  
  // Simulate loading effect
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [region]);
  
  const handleRegionChange = (event, newValue) => {
    setRegion(newValue);
  };
  
  // Function to determine bull/bear market sentiment
  const getMarketSentiment = (markets) => {
    if (!markets || markets.length === 0) return 'neutral';
    
    const upCount = markets.filter(m => m.trend === 'up').length;
    const downCount = markets.length - upCount;
    
    if (upCount > downCount) return 'bull';
    if (downCount > upCount) return 'bear';
    return 'neutral';
  };
  
  // Get all markets for display
  const getMarketsForDisplay = () => {
    if (region === 'all') {
      return [
        ...MARKET_DATA.asia,
        ...MARKET_DATA.europe,
        ...MARKET_DATA.americas
      ];
    }
    
    return MARKET_DATA[region] || [];
  };
  
  const marketsToDisplay = getMarketsForDisplay();
  const marketSentiment = getMarketSentiment(marketsToDisplay);
  
  return (
    <Box>
      {/* Header with global market sentiment */}
      <MarketContainer 
        marketDirection={marketSentiment}
        title="Global Markets Overview"
        sx={{ mb: 3, py: 2 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            Global Markets Overview
          </Typography>
          
          <Chip 
            icon={<Public />}
            label={marketSentiment === 'bull' ? 'Bullish Sentiment' : marketSentiment === 'bear' ? 'Bearish Sentiment' : 'Neutral Sentiment'}
            color={marketSentiment === 'bull' ? 'primary' : marketSentiment === 'bear' ? 'secondary' : 'default'}
          />
        </Box>
        
        <Tabs
          value={region}
          onChange={handleRegionChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
        >
          <Tab label="All Markets" value="all" icon={<PieChart />} iconPosition="start" />
          <Tab label="Asia-Pacific" value="asia" />
          <Tab label="Europe" value="europe" />
          <Tab label="Americas" value="americas" />
        </Tabs>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress color={marketSentiment === 'bull' ? 'primary' : 'secondary'} />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {marketsToDisplay.map((market, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <MarketCard market={market} />
              </Grid>
            ))}
          </Grid>
        )}
      </MarketContainer>
    </Box>
  );
};

export default GlobalMarketsOverview;
