import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Divider,
  TextField,
  Autocomplete,
  CircularProgress,
  Chip,
  useTheme,
  Button
} from '@mui/material';
import { 
  Delete as DeleteIcon, 
  TrendingUp, 
  TrendingDown,
  Search as SearchIcon,
  Add as AddIcon,
  ShowChart
} from '@mui/icons-material';
import MarketContainer from './MarketContainer';
// Using dynamic import instead of static import to avoid circular dependencies

const WatchlistPanel = ({ onSelectSymbol, currentSymbol }) => {
  const theme = useTheme();
  const [watchlist, setWatchlist] = useState(() => {
    // Load watchlist from localStorage on initialization
    const savedWatchlist = localStorage.getItem('forex_trader_watchlist');
    return savedWatchlist ? JSON.parse(savedWatchlist) : ['EUR/USD', 'GBP/USD', 'USD/JPY', 'AUD/USD', 'USD/CAD'];
  });
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [pairData, setPairData] = useState({});
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Load pair data on mount and when watchlist changes
  useEffect(() => {
    let isActive = true; // Flag to prevent state updates after component unmounts
    
    const fetchPriceData = async () => {
      try {
        // Dynamically import MarketDataService to avoid circular dependencies
        const marketDataModule = await import('../services/marketDataService');
        const MarketDataService = marketDataModule.default;
        
        console.log('Fetching price data for watchlist:', watchlist);
        
        // Set updating indicator
        if (isActive) setUpdating(true);
        
        // Get real-time data for all symbols in watchlist
        const data = await MarketDataService.getRealtimePriceData(watchlist);
        
        // Small delay to make update indicator visible
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Only update state if component is still mounted
        if (isActive) {
          console.log('Updating price data:', data);
          setPairData(data);
          setLastUpdate(new Date());
          setUpdating(false);
        }
      } catch (error) {
        console.error('Error fetching forex data:', error);
      }
    };
    
    // Initial data fetch
    fetchPriceData();
    
    // Set up interval for real-time updates
    const intervalId = setInterval(fetchPriceData, 3000); // Update every 3 seconds
    
    // Cleanup function
    return () => {
      isActive = false; // Prevent state updates after unmount
      clearInterval(intervalId);
    };
  }, [watchlist]);

  // Handle symbol search with debounce
  const handleSymbolSearch = async (event, value) => {
    if (!value || value.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    
    try {
      // In a real app, fetch from API
      // For demo, provide predefined results based on input
      setTimeout(() => {
        const results = [
          // Add a header for Forex
          { isHeader: true, name: 'Forex Pairs' },
          
          // Popular forex pairs
          { symbol: 'EUR/USD', name: 'Euro / US Dollar', provider: 'Forex', exchange: 'FX', tradingViewSupported: true },
          { symbol: 'GBP/USD', name: 'British Pound / US Dollar', provider: 'Forex', exchange: 'FX', tradingViewSupported: true },
          { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', provider: 'Forex', exchange: 'FX', tradingViewSupported: true },
          { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', provider: 'Forex', exchange: 'FX', tradingViewSupported: true },
          { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', provider: 'Forex', exchange: 'FX', tradingViewSupported: true },
          
          // Add a header for Cryptocurrencies
          { isHeader: true, name: 'Cryptocurrencies' },
          
          // Popular cryptocurrencies
          { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', provider: 'Crypto', exchange: 'Binance', tradingViewSupported: true },
          { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', provider: 'Crypto', exchange: 'Binance', tradingViewSupported: true },
          { symbol: 'XRP/USD', name: 'Ripple / US Dollar', provider: 'Crypto', exchange: 'Binance', tradingViewSupported: true },
          
          // Add a header for Stocks
          { isHeader: true, name: 'Stocks' },
          
          // Popular stocks
          { symbol: 'AAPL', name: 'Apple Inc.', provider: 'Stocks', exchange: 'NASDAQ', tradingViewSupported: true },
          { symbol: 'MSFT', name: 'Microsoft Corporation', provider: 'Stocks', exchange: 'NASDAQ', tradingViewSupported: true },
          { symbol: 'GOOGL', name: 'Alphabet Inc.', provider: 'Stocks', exchange: 'NASDAQ', tradingViewSupported: true },
          { symbol: 'AMZN', name: 'Amazon.com Inc.', provider: 'Stocks', exchange: 'NASDAQ', tradingViewSupported: true },
          
          // Add a header for Commodities
          { isHeader: true, name: 'Commodities' },
          
          // Popular commodities
          { symbol: 'XAUUSD', name: 'Gold / US Dollar', provider: 'Commodities', exchange: 'COMEX', tradingViewSupported: true },
          { symbol: 'XAGUSD', name: 'Silver / US Dollar', provider: 'Commodities', exchange: 'COMEX', tradingViewSupported: true },
          { symbol: 'CL1!', name: 'Crude Oil WTI', provider: 'Commodities', exchange: 'NYMEX', tradingViewSupported: true },
        ].filter(item => {
          if (item.isHeader) return true;
          return item.symbol.toLowerCase().includes(value.toLowerCase()) || 
                 item.name.toLowerCase().includes(value.toLowerCase());
        });
        
        setSearchResults(results);
        setSearchLoading(false);
      }, 300);
    } catch (error) {
      console.error('Error searching symbols:', error);
      setSearchResults([]);
      setSearchLoading(false);
    }
  };

  // Add symbol to watchlist
  const handleAddToWatchlist = (symbol) => {
    if (!watchlist.includes(symbol)) {
      const newWatchlist = [...watchlist, symbol];
      setWatchlist(newWatchlist);
      localStorage.setItem('forex_trader_watchlist', JSON.stringify(newWatchlist));
    }
    
    if (onSelectSymbol) {
      onSelectSymbol(symbol);
    }
  };

  // Remove from watchlist
  const removeFromWatchlist = (symbol) => {
    const newWatchlist = watchlist.filter(s => s !== symbol);
    setWatchlist(newWatchlist);
    localStorage.setItem('forex_trader_watchlist', JSON.stringify(newWatchlist));
    
    // If the current symbol is being removed, select the first one in the list
    if (currentSymbol === symbol && newWatchlist.length > 0 && onSelectSymbol) {
      onSelectSymbol(newWatchlist[0]);
    }
  };

  return (
    <MarketContainer title="Watchlist" sx={{ height: '100%' }}>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="h2" fontWeight="bold">
            Watchlist
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {updating && (
              <CircularProgress size={16} sx={{ mr: 1, color: theme.palette.bull.main }} />
            )}
            <Typography variant="caption" color="text.secondary">
              {lastUpdate ? `Updated: ${lastUpdate.toLocaleTimeString()}` : 'Loading...'}
            </Typography>
          </Box>
        </Box>
        
        <Autocomplete
          freeSolo
          options={searchResults}
          getOptionLabel={(option) => {
            // Return empty string for headers
            if (option.isHeader) return '';
            // Return symbol for regular items
            return option.symbol || option;
          }}
          groupBy={(option) => {
            // Group by provider if available
            return option.provider || '';
          }}
          onInputChange={(event, value) => {
            setSearchInput(value);
            handleSymbolSearch(event, value);
          }}
          onChange={(event, value) => {
            if (value && typeof value === 'object' && !value.isHeader) {
              handleAddToWatchlist(value.symbol);
            } else if (value && typeof value === 'string') {
              handleAddToWatchlist(value);
            }
          }}
          renderOption={(props, option) => {
            // If this is a header item, render it as a divider with text
            if (option.isHeader) {
              return (
                <li {...props} style={{ 
                  backgroundColor: theme.palette.background.neutral, 
                  color: theme.palette.text.secondary,
                  fontWeight: 'bold',
                  fontSize: '0.85rem',
                  pointerEvents: 'none'
                }}>
                  {option.name}
                </li>
              );
            }
            
            // For regular items, show the symbol with provider/exchange info
            return (
              <li {...props} style={{ 
                opacity: option.tradingViewSupported === false ? 0.6 : 1,
                cursor: option.tradingViewSupported === false ? 'not-allowed' : 'pointer'
              }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" fontWeight="bold">
                      {option.symbol}
                      {option.tradingViewSupported === false && (
                        <span style={{ color: theme.palette.error.main, marginLeft: '6px', fontSize: '0.75rem' }}>
                          (not available)
                        </span>
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                      {option.exchange}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {option.name}
                  </Typography>
                </Box>
              </li>
            );
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search Symbol"
              margin="normal"
              variant="outlined"
              fullWidth
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {searchLoading ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
        
        <Divider sx={{ my: 2 }} />
        
        <List
          sx={{
            width: '100%',
            overflow: 'auto',
            flexGrow: 1
          }}
          component="nav"
        >
          {watchlist.map((symbol) => {
            const data = pairData[symbol] || { price: 0, change: '0.00', trend: 'neutral' };
            const isBull = data.trend === 'up';
                      
            return (
              <ListItem
                button
                key={symbol}
                selected={currentSymbol === symbol}
                onClick={() => onSelectSymbol && onSelectSymbol(symbol)}
                sx={{
                  borderRadius: 1,
                  mb: 1,
                  '&.Mui-selected': {
                    backgroundColor: isBull ? 
                      `${theme.palette.bull.main}20` : 
                      `${theme.palette.bear.main}20`,
                    borderLeft: `4px solid ${isBull ? 
                      theme.palette.bull.main : 
                      theme.palette.bear.main}`
                  },
                  '&:hover': {
                    backgroundColor: theme.palette.background.neutral
                  }
                }}
              >
                <ListItemIcon>
                  <ShowChart sx={{ 
                    color: isBull ? theme.palette.bull.main : theme.palette.bear.main 
                  }} />
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Typography variant="body1" fontWeight="medium">
                      {symbol}
                    </Typography>
                  } 
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                      <Typography variant="body2" fontWeight="bold">
                        {data.price && data.price.toFixed ? data.price.toFixed(4) : '0.0000'}
                      </Typography>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center',
                          ml: 1,
                          color: isBull ? theme.palette.bull.main : theme.palette.bear.main
                        }}
                      >
                        {isBull ? (
                          <TrendingUp fontSize="small" sx={{ mr: 0.5 }} />
                        ) : (
                          <TrendingDown fontSize="small" sx={{ mr: 0.5 }} />
                        )}
                        <Typography 
                          variant="caption" 
                          fontWeight="bold"
                        >
                          {isBull ? '+' : ''}{data.change}%
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <IconButton 
                    edge="end" 
                    aria-label="delete" 
                    onClick={(event) => {
                      event.stopPropagation();
                      removeFromWatchlist(symbol);
                    }}
                    size="small"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            );
          })}
        </List>
        
        <Box sx={{ pt: 2 }}>
          <Button 
            fullWidth 
            variant="outlined" 
            startIcon={<AddIcon />}
            onClick={() => document.querySelector('input[aria-autocomplete="list"]').focus()}
          >
            Add Symbol
          </Button>
        </Box>
      </Box>
    </MarketContainer>
  );
};

export default WatchlistPanel;
