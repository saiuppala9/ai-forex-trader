import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Grid, 
  Typography, 
  Chip,
  useTheme
} from '@mui/material';
import { 
  CurrencyExchange, 
  TrendingUp, 
  TrendingDown 
} from '@mui/icons-material';

// Import the existing components
import TradingViewWidget from './ExnessTrader';
import AIAnalysisPanel from './AIAnalysisPanel';
import NewsPanel from './NewsPanel';
import TradeHistory from './TradeHistory';
import OrderBookIndicator from './OrderBookIndicator';
import MarketContainer from './MarketContainer';
// Import removed to prevent circular dependency - will use dynamic loading

// Forex pairs for the dashboard
const FOREX_PAIRS = [
  { symbol: 'EUR/USD', name: 'Euro / US Dollar', importance: 'major' },
  { symbol: 'GBP/USD', name: 'British Pound / US Dollar', importance: 'major' },
  { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', importance: 'major' },
  { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', importance: 'major' },
  { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', importance: 'major' },
  { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', importance: 'minor' },
  { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', importance: 'minor' },
  { symbol: 'EUR/GBP', name: 'Euro / British Pound', importance: 'cross' },
  { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', importance: 'cross' },
  { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', importance: 'cross' },
];

const ForexMarket = ({ currentSymbol = 'EUR/USD' }) => {
  const theme = useTheme();
  // Note: currentSymbol now comes from props
  const [pairData, setPairData] = useState({});
  const [marketDirection, setMarketDirection] = useState('neutral');
  const [activeTab, setActiveTab] = useState(0);

  // Fetch live prices for forex pairs
  useEffect(() => {
    const fetchPriceData = async () => {
      try {
        // Dynamically import MarketDataService to prevent circular dependency
        const MarketDataService = (await import('../services/marketDataService')).default;
        
        // Get data for all forex pairs
        const symbols = FOREX_PAIRS.map(pair => pair.symbol);
        const data = await MarketDataService.getRealtimePriceData(symbols);
        
        setPairData(data);
        
        // Set market direction based on majority trend
        const upCount = Object.values(data).filter(d => d.trend === 'up').length;
        const downCount = Object.values(data).length - upCount;
        
        if (upCount > downCount) {
          setMarketDirection('bull');
        } else if (downCount > upCount) {
          setMarketDirection('bear');
        } else {
          setMarketDirection('neutral');
        }
        
      } catch (error) {
        console.error('Error fetching forex data:', error);
      }
    };
    
    fetchPriceData();
    const intervalId = setInterval(fetchPriceData, 5000); // Update more frequently for better UX
    
    return () => clearInterval(intervalId);
  }, []);

  // Currency pair click handler - this would be better with prop callbacks
  const handlePairClick = (symbol) => {
    // In this component, we still update the local view
    document.dispatchEvent(new CustomEvent('forex-symbol-selected', { detail: symbol }));
  };

  return (
    <Box>
      <MarketContainer 
        marketDirection={marketDirection}
        title="Forex Trading Dashboard"
        sx={{ mb: 3, p: 2 }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            Forex Market
          </Typography>
          
          <Chip 
            icon={<CurrencyExchange />}
            label={marketDirection === 'bull' ? 'Bullish Forex Market' : marketDirection === 'bear' ? 'Bearish Forex Market' : 'Neutral Forex Market'}
            color={marketDirection === 'bull' ? 'primary' : marketDirection === 'bear' ? 'secondary' : 'default'}
          />
        </Box>
        
        {/* Major Forex Pairs Overview */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {FOREX_PAIRS.filter(pair => pair.importance === 'major').map((pair) => {
            const data = pairData[pair.symbol] || { price: 0, change: '0.00', trend: 'neutral' };
            const isBull = data.trend === 'up';
            
            return (
              <Grid item xs={6} sm={4} md={2} key={pair.symbol}>
                <Box 
                  sx={{ 
                    p: 2, 
                    borderRadius: 1,
                    cursor: 'pointer',
                    border: `1px solid ${currentSymbol === pair.symbol 
                      ? (isBull ? theme.palette.bull.main : theme.palette.bear.main)
                      : theme.palette.divider}`,
                    bgcolor: currentSymbol === pair.symbol ? 
                      (isBull ? theme.palette.background.bullPanel : theme.palette.background.bearPanel) : 
                      'transparent',
                    '&:hover': {
                      bgcolor: isBull ? theme.palette.background.bullPanel : theme.palette.background.bearPanel,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out'
                    }
                  }}
                  onClick={() => handlePairClick(pair.symbol)}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {pair.symbol}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="body1" fontWeight="bold">
                      {data.price.toFixed(4)}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {isBull ? (
                        <TrendingUp fontSize="small" sx={{ color: theme.palette.bull.main, mr: 0.5 }} />
                      ) : (
                        <TrendingDown fontSize="small" sx={{ color: theme.palette.bear.main, mr: 0.5 }} />
                      )}
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          color: isBull ? theme.palette.bull.main : theme.palette.bear.main,
                          fontWeight: 'bold'
                        }}
                      >
                        {isBull ? '+' : ''}{data.change}%
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
        
        {/* Main Trading Area */}
        <Grid container spacing={3}>
          {/* Main content area - using full width now */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {/* Chart */}
              <Grid item xs={12}>
                <MarketContainer 
                  marketDirection={pairData[currentSymbol]?.trend === 'up' ? 'bull' : 'bear'}
                  title={`${currentSymbol} Chart`}
                  sx={{ p: 2 }}
                >
                  <Box
                    sx={{
                      height: '600px',
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <TradingViewWidget symbol={currentSymbol} />
                  </Box>
                  
                  {/* Order Book Indicator showing buy/sell percentages */}
                  <Box mt={2}>
                    <OrderBookIndicator symbol={currentSymbol} />
                  </Box>
                </MarketContainer>
              </Grid>
              
              {/* Analysis Panel */}
              <Grid item xs={12}>
                <AIAnalysisPanel symbol={currentSymbol} />
              </Grid>
              
              {/* News */}
              <Grid item xs={12} md={6}>
                <MarketContainer 
                  marketDirection={marketDirection}
                  title={`${currentSymbol} News`}
                  sx={{ p: 2, height: '100%' }}
                >
                  <NewsPanel symbol={currentSymbol} key={currentSymbol} />
                </MarketContainer>
              </Grid>
              
              {/* Trade History */}
              <Grid item xs={12} md={6}>
                <MarketContainer 
                  marketDirection={marketDirection}
                  title="Trade History"
                  sx={{ p: 2, height: '100%' }}
                >
                  <TradeHistory />
                </MarketContainer>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </MarketContainer>
    </Box>
  );
};

export default ForexMarket;
