import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  List, 
  ListItem, 
  ListItemIcon,
  ListItemText,
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

// List of Indian stocks for suggestions
const INDIAN_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE' },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', exchange: 'NSE' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE' },
  { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', exchange: 'NSE' },
  { symbol: 'SBIN', name: 'State Bank of India', exchange: 'NSE' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE' },
  { symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE' },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', exchange: 'NSE' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', exchange: 'NSE' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE' },
  { symbol: 'ITC', name: 'ITC Ltd', exchange: 'NSE' },
  { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', exchange: 'NSE' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd', exchange: 'NSE' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', exchange: 'NSE' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', exchange: 'NSE' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', exchange: 'NSE' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises', exchange: 'NSE' },
  { symbol: 'BAJAJFINSV', name: 'Bajaj Finserv', exchange: 'NSE' },
  { symbol: 'NIFTY50', name: 'Nifty 50 Index', exchange: 'NSE' },
  { symbol: 'BANKNIFTY', name: 'Bank Nifty Index', exchange: 'NSE' },
  { symbol: 'SENSEX', name: 'BSE Sensex', exchange: 'BSE' },
  { symbol: 'LT', name: 'Larsen & Toubro', exchange: 'NSE' },
  { symbol: 'TITAN', name: 'Titan Company', exchange: 'NSE' },
  { symbol: 'ONGC', name: 'Oil and Natural Gas Corporation', exchange: 'NSE' },
  { symbol: 'NTPC', name: 'NTPC Limited', exchange: 'NSE' },
  { symbol: 'POWERGRID', name: 'Power Grid Corporation', exchange: 'NSE' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement', exchange: 'NSE' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel', exchange: 'NSE' },
  { symbol: 'TATASTEEL', name: 'Tata Steel', exchange: 'NSE' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra', exchange: 'NSE' },
  { symbol: 'GRASIM', name: 'Grasim Industries', exchange: 'NSE' }
];

const IndianWatchlistPanel = ({ onSelectSymbol, currentSymbol }) => {
  const theme = useTheme();
  // Load Indian watchlist from localStorage, default to some common stocks if not available
  const [watchlist, setWatchlist] = useState(() => {
    const savedWatchlist = localStorage.getItem('indian_stocks_watchlist');
    return savedWatchlist ? JSON.parse(savedWatchlist) : ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'NIFTY50'];
  });
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [pairData, setPairData] = useState({});
  const [updating, setUpdating] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Load stock data on mount and when watchlist changes
  useEffect(() => {
    let isActive = true; // Flag to prevent state updates after component unmounts
    
    const fetchPriceData = async () => {
      try {
        // Dynamically import MarketDataService to avoid circular dependencies
        const marketDataModule = await import('../services/marketDataService');
        const MarketDataService = marketDataModule.default;
        
        console.log('Fetching price data for Indian watchlist:', watchlist);
        
        // Set updating indicator
        if (isActive) setUpdating(true);
        
        // Get real-time data for all symbols in watchlist
        const data = await MarketDataService.getRealtimePriceData(watchlist);
        
        // Small delay to make update indicator visible
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Only update state if component is still mounted
        if (isActive) {
          console.log('Updating Indian market price data:', data);
          setPairData(data);
          setLastUpdate(new Date());
          setUpdating(false);
        }
      } catch (error) {
        console.error('Error fetching Indian market data:', error);
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

  // Handle symbol search
  const handleSymbolSearch = (event, value) => {
    setSearchInput(value);
    
    if (!value || value.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    
    // Filter Indian stocks based on search input
    setTimeout(() => {
      const filteredResults = INDIAN_STOCKS.filter(stock => 
        stock.symbol.toLowerCase().includes(value.toLowerCase()) || 
        stock.name.toLowerCase().includes(value.toLowerCase())
      );
      
      // Add category headers for better organization
      const results = [
        { isHeader: true, name: 'Indian Stocks & Indices' },
        ...filteredResults.map(stock => ({
          ...stock,
          tradingViewSupported: true // All Indian stocks are supported in our demo
        }))
      ];
      
      setSearchResults(results);
      setSearchLoading(false);
    }, 300);
  };

  // Add symbol to watchlist
  const handleAddToWatchlist = (symbol) => {
    if (!watchlist.includes(symbol)) {
      const newWatchlist = [...watchlist, symbol];
      setWatchlist(newWatchlist);
      localStorage.setItem('indian_stocks_watchlist', JSON.stringify(newWatchlist));
    }
    
    if (onSelectSymbol) {
      onSelectSymbol(symbol);
    }
  };

  // Remove from watchlist
  const removeFromWatchlist = (symbol) => {
    const newWatchlist = watchlist.filter(s => s !== symbol);
    setWatchlist(newWatchlist);
    localStorage.setItem('indian_stocks_watchlist', JSON.stringify(newWatchlist));
    
    // If the current symbol is being removed, select the first one in the list
    if (currentSymbol === symbol && newWatchlist.length > 0 && onSelectSymbol) {
      onSelectSymbol(newWatchlist[0]);
    }
  };

  return (
    <MarketContainer title="Indian Watchlist" sx={{ height: '100%' }}>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6" component="h2" fontWeight="bold">
            Indian Watchlist
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
            // Group by exchange if available
            return option.exchange || '';
          }}
          onInputChange={handleSymbolSearch}
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
            
            // For regular items, show the symbol with exchange info
            return (
              <li {...props}>
                <Box sx={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body1" fontWeight="bold">
                      {option.symbol}
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
              label="Search Indian Stock"
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
                        {data.price && data.price.toFixed ? data.price.toFixed(2) : '0.00'}
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
                          {isBull ? '+' : ''}{data.change}
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
            Add Indian Stock
          </Button>
        </Box>
      </Box>
    </MarketContainer>
  );
};

export default IndianWatchlistPanel;
