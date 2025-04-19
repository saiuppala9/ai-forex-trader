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
  TrendingDown,
  BarChart
} from '@mui/icons-material';

// Import the existing components
import TradingViewWidget from './ExnessTrader';
import AIAnalysisPanel from './AIAnalysisPanel';
import NewsPanel from './NewsPanel';
import TradeHistory from './TradeHistory';
import OrderBookIndicator from './OrderBookIndicator';
import MarketContainer from './MarketContainer';

// Indian stocks for the dashboard
const INDIAN_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', importance: 'major' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', exchange: 'NSE', importance: 'major' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE', importance: 'major' },
  { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', importance: 'major' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', importance: 'major' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', exchange: 'NSE', importance: 'major' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE', importance: 'major' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE', importance: 'major' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE', importance: 'major' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', exchange: 'NSE', importance: 'major' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', exchange: 'NSE', importance: 'major' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE', importance: 'major' },
  { symbol: 'ITC', name: 'ITC Ltd', exchange: 'NSE', importance: 'major' },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', exchange: 'NSE', importance: 'major' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd', exchange: 'NSE', importance: 'major' }
];

// Indian market indices
const INDIAN_INDICES = [
  { symbol: 'NIFTY50', name: 'Nifty 50', exchange: 'NSE' },
  { symbol: 'BANKNIFTY', name: 'Bank Nifty', exchange: 'NSE' },
  { symbol: 'NIFTYMID50', name: 'Nifty Mid50', exchange: 'NSE' },
  { symbol: 'SENSEX', name: 'BSE Sensex', exchange: 'BSE' }
];

const IndianMarket = ({ currentSymbol = 'RELIANCE' }) => {
  const theme = useTheme();
  const [stockData, setStockData] = useState({});
  const [marketDirection, setMarketDirection] = useState('neutral');
  const [activeTab, setActiveTab] = useState(0);
  const [indexData, setIndexData] = useState({});

  // Fetch data for Indian stocks and indices
  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        // Dynamically import MarketDataService to prevent circular dependency
        const marketDataModule = await import('../services/marketDataService');
        const MarketDataService = marketDataModule.default;
        
        // Get symbols for all stocks and indices
        const stockSymbols = INDIAN_STOCKS.map(stock => stock.symbol);
        const indexSymbols = INDIAN_INDICES.map(index => index.symbol);
        
        // Fetch data for stocks and indices
        const stocksData = await MarketDataService.getRealtimePriceData(stockSymbols);
        const indicesData = await MarketDataService.getRealtimePriceData(indexSymbols);
        
        setStockData(stocksData);
        setIndexData(indicesData);
        
        // Determine market direction based on Nifty 50 or overall market sentiment
        if (indicesData['NIFTY50']) {
          setMarketDirection(indicesData['NIFTY50'].trend === 'up' ? 'bull' : 'bear');
        } else {
          // Fallback to overall market sentiment
          const upCount = Object.values(stocksData).filter(d => d.trend === 'up').length;
          const downCount = Object.values(stocksData).length - upCount;
          
          if (upCount > downCount) {
            setMarketDirection('bull');
          } else if (downCount > upCount) {
            setMarketDirection('bear');
          } else {
            setMarketDirection('neutral');
          }
        }
      } catch (error) {
        console.error('Error fetching Indian market data:', error);
      }
    };
    
    fetchMarketData();
    const intervalId = setInterval(fetchMarketData, 5000); // Update every 5 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  // Stock click handler
  const handleStockClick = (symbol) => {
    // Dispatch custom event to update the selected stock
    document.dispatchEvent(new CustomEvent('indian-stock-selected', { detail: symbol }));
  };

  return (
    <Box>
      <MarketContainer 
        marketDirection={marketDirection}
        title="Indian Stock Market Dashboard"
        sx={{ mb: 3, p: 2 }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h5" fontWeight="bold">
            Indian Market
          </Typography>
          
          <Chip 
            icon={<BarChart />}
            label={marketDirection === 'bull' ? 'Bullish Market' : marketDirection === 'bear' ? 'Bearish Market' : 'Neutral Market'}
            color={marketDirection === 'bull' ? 'primary' : marketDirection === 'bear' ? 'secondary' : 'default'}
          />
        </Box>
        
        {/* Indian Market Indices Overview */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {INDIAN_INDICES.map((index) => {
            const data = indexData[index.symbol] || { price: 0, change: '0.00', trend: 'neutral' };
            const isBull = data.trend === 'up';
            
            return (
              <Grid item xs={6} sm={3} key={index.symbol}>
                <Box 
                  sx={{ 
                    p: 2, 
                    borderRadius: 1,
                    cursor: 'pointer',
                    border: `1px solid ${isBull ? theme.palette.bull.main : theme.palette.bear.main}`,
                    bgcolor: isBull ? `${theme.palette.bull.main}15` : `${theme.palette.bear.main}15`,
                    '&:hover': {
                      bgcolor: isBull ? `${theme.palette.bull.main}25` : `${theme.palette.bear.main}25`,
                      transform: 'translateY(-2px)',
                      transition: 'all 0.2s ease-in-out'
                    }
                  }}
                  onClick={() => handleStockClick(index.symbol)}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {index.name}
                  </Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="body1" fontWeight="bold">
                      {data.price.toFixed(2)}
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
                        {isBull ? '+' : ''}{data.change}
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
          {/* Main content area - using full width */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {/* Chart */}
              <Grid item xs={12}>
                <MarketContainer 
                  marketDirection={stockData[currentSymbol]?.trend === 'up' ? 'bull' : 'bear'}
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
                    <TradingViewWidget symbol={`NSE:${currentSymbol}`} />
                  </Box>
                  
                  {/* Order Book Indicator showing buy/sell percentages */}
                  <Box mt={2}>
                    <OrderBookIndicator symbol={currentSymbol} />
                  </Box>
                </MarketContainer>
              </Grid>
              
              {/* Analysis Panel */}
              <Grid item xs={12}>
                <AIAnalysisPanel symbol={currentSymbol} marketType="indian" />
              </Grid>
              
              {/* News */}
              <Grid item xs={12} md={6}>
                <MarketContainer 
                  marketDirection={marketDirection}
                  title={`${currentSymbol} News`}
                  sx={{ p: 2, height: '100%' }}
                >
                  <NewsPanel symbol={currentSymbol} marketType="indian" key={currentSymbol} />
                </MarketContainer>
              </Grid>
              
              {/* Trade History */}
              <Grid item xs={12} md={6}>
                <MarketContainer 
                  marketDirection={marketDirection}
                  title="Indian Market Trade History"
                  sx={{ p: 2, height: '100%' }}
                >
                  <TradeHistory marketType="indian" />
                </MarketContainer>
              </Grid>
              
              {/* Top Indian Stocks */}
              <Grid item xs={12}>
                <MarketContainer 
                  marketDirection={marketDirection}
                  title="Top Indian Stocks"
                  sx={{ p: 2 }}
                >
                  <Grid container spacing={2}>
                    {INDIAN_STOCKS.map((stock) => {
                      const data = stockData[stock.symbol] || { price: 0, change: '0.00', trend: 'neutral' };
                      const isBull = data.trend === 'up';
                      
                      return (
                        <Grid item xs={6} sm={4} md={2} key={stock.symbol}>
                          <Box 
                            sx={{ 
                              p: 2, 
                              borderRadius: 1,
                              cursor: 'pointer',
                              border: `1px solid ${currentSymbol === stock.symbol 
                                ? (isBull ? theme.palette.bull.main : theme.palette.bear.main)
                                : theme.palette.divider}`,
                              bgcolor: currentSymbol === stock.symbol ? 
                                (isBull ? theme.palette.background.bullPanel : theme.palette.background.bearPanel) : 
                                'transparent',
                              '&:hover': {
                                bgcolor: isBull ? theme.palette.background.bullPanel : theme.palette.background.bearPanel,
                                transform: 'translateY(-2px)',
                                transition: 'all 0.2s ease-in-out'
                              }
                            }}
                            onClick={() => handleStockClick(stock.symbol)}
                          >
                            <Typography variant="body2" fontWeight="bold">
                              {stock.symbol}
                            </Typography>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                              <Typography variant="body1" fontWeight="bold">
                                {data.price.toFixed(2)}
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
                                  {isBull ? '+' : ''}{data.change}
                                </Typography>
                              </Box>
                            </Box>
                          </Box>
                        </Grid>
                      );
                    })}
                  </Grid>
                </MarketContainer>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </MarketContainer>
    </Box>
  );
};

export default IndianMarket;
