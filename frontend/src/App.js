import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Container, 
  List, 
  ListItem, 
  ListItemText, 
  Paper, 
  TextField, 
  Typography,
  Autocomplete,
  IconButton,
  CircularProgress,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Divider,
  ListItemSecondaryAction,
  Alert,
  Avatar,
  Chip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import TradingViewWidget from './components/ExnessTrader';
import MarketDataService from './services/marketDataService';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    background: {
      default: '#131722',
      paper: '#1e222d',
    },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e222d',
          backgroundImage: 'none',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          '&.Mui-selected': {
            backgroundColor: '#2a2e39',
            '&:hover': {
              backgroundColor: '#363c4e',
            },
          },
          '&:hover': {
            backgroundColor: '#2a2e39',
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#2a2e39',
        },
      },
    },
  },
});

function App() {
  const [currentSymbol, setCurrentSymbol] = useState('EUR/USD');
  const [watchlist, setWatchlist] = useState(() => {
    // Load watchlist from localStorage on initialization
    const savedWatchlist = localStorage.getItem('forex_trader_watchlist');
    return savedWatchlist ? JSON.parse(savedWatchlist) : ['EUR/USD', 'GBP/USD', 'BTC/USD', 'AAPL', 'XAUUSD'];
  });
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [marketNews, setMarketNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [popularSymbols, setPopularSymbols] = useState({});

  // Get API key from environment
  const FINNHUB_API_KEY = 'cvr1e9pr01qp88co31igcvr1e9pr01qp88co31j0'; // Hardcoded to bypass env caching issues

  // Handle adding a symbol to watchlist
  const handleAddToWatchlist = (symbol) => {
    if (!watchlist.includes(symbol)) {
      const newWatchlist = [...watchlist, symbol];
      setWatchlist(newWatchlist);
      // Save to localStorage
      localStorage.setItem('forex_trader_watchlist', JSON.stringify(newWatchlist));
    }
    setCurrentSymbol(symbol);
  };

  // Handle selecting a symbol
  const handleSelectSymbol = (symbol) => {
    setCurrentSymbol(symbol);
  };

  // Handle removing from watchlist
  const removeFromWatchlist = (symbol) => {
    const newWatchlist = watchlist.filter(s => s !== symbol);
    setWatchlist(newWatchlist);
    // Save to localStorage
    localStorage.setItem('forex_trader_watchlist', JSON.stringify(newWatchlist));
    
    if (currentSymbol === symbol) {
      setCurrentSymbol(newWatchlist[0] || 'EUR/USD');
    }
  };

  // Handle symbol search with live data
  const handleSymbolSearch = async (event, value) => {
    setSearchInput(value);
    
    if (!value || value.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearchLoading(true);
    try {
      // Use our service to search for symbols
      const results = await MarketDataService.searchSymbols(value);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching symbols:', error);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Debounced search function to prevent too many API calls
  const debouncedSearch = (event, value) => {
    setSearchInput(value);
    
    if (value && value.length >= 2) {
      // Clear previous timeout
      if (window.searchTimeout) {
        clearTimeout(window.searchTimeout);
      }
      
      // Set new timeout
      window.searchTimeout = setTimeout(() => {
        handleSymbolSearch(event, value);
      }, 300); // 300ms debounce
    } else {
      setSearchResults([]);
    }
  };

  // Load popular symbols on mount
  useEffect(() => {
    const loadPopularSymbols = async () => {
      try {
        const symbols = await MarketDataService.getPopularSymbols();
        setPopularSymbols(symbols);
      } catch (error) {
        console.error('Error loading popular symbols:', error);
      }
    };
    
    loadPopularSymbols();
  }, []);

  // Fetch market news with retries
  useEffect(() => {
    const fetchNews = async () => {
      if (!FINNHUB_API_KEY) {
        setError('Finnhub API key is not configured');
        return;
      }

      setLoading(true);
      try {
        // Try multiple categories with retries
        const categories = ['forex', 'general', 'crypto', 'merger', 'economic'];
        let allNews = [];
        let retryCount = 0;
        const maxRetries = 3;

        while (allNews.length === 0 && retryCount < maxRetries) {
          for (const category of categories) {
            try {
              console.log(`Fetching ${category} news, attempt ${retryCount + 1}`);
              
              const url = `https://finnhub.io/api/v1/news?category=${category}&token=${FINNHUB_API_KEY}`;
              const response = await fetch(url);
              
              if (!response.ok) {
                const text = await response.text();
                console.error(`API Error for ${category}:`, text);
                continue;
              }
              
              const data = await response.json();
              if (Array.isArray(data) && data.length > 0) {
                console.log(`Received ${data.length} news items for ${category}`);
                allNews = [...allNews, ...data];
              }
            } catch (err) {
              console.warn(`Failed to fetch ${category} news:`, err);
            }
          }
          
          if (allNews.length === 0) {
            retryCount++;
            if (retryCount < maxRetries) {
              console.log(`No news found, retrying... (${retryCount}/${maxRetries})`);
              await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
            }
          }
        }

        if (allNews.length === 0) {
          throw new Error('No news available after all retries');
        }

        // Sort by datetime and take latest 10
        allNews.sort((a, b) => b.datetime - a.datetime);
        const latestNews = allNews.slice(0, 10).map(news => ({
          ...news,
          datetime: new Date(news.datetime * 1000).toLocaleString(),
          summary: news.summary?.slice(0, 150) + '...' // Truncate long summaries
        }));

        console.log('Processed news items:', latestNews.length);
        setMarketNews(latestNews);
        setError(null);
      } catch (err) {
        setError('Unable to load market news');
        console.error('Error fetching news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, [FINNHUB_API_KEY]);

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', backgroundColor: '#131722' }}>
        <Container maxWidth="xl" sx={{ py: 2 }}>
          <Typography variant="h5" sx={{ mb: 2, color: '#d1d4dc' }}>
            AI Forex Trader
          </Typography>
          
          <Box display="flex" gap={2}>
            {/* Left Sidebar - Watchlist */}
            <Paper sx={{ width: 300, p: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#d1d4dc' }}>
                Watchlist
              </Typography>
              
              <Autocomplete
                freeSolo
                options={searchResults}
                getOptionLabel={(option) => 
                  typeof option === 'string' ? option : `${option.symbol} - ${option.name}`
                }
                inputValue={searchInput}
                onInputChange={debouncedSearch}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search markets"
                    variant="outlined"
                    size="small"
                    fullWidth
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {searchLoading ? <CircularProgress color="inherit" size={20} /> : <SearchIcon color="disabled" />}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        color: '#d1d4dc',
                        '& fieldset': {
                          borderColor: '#2a2e39',
                        },
                        '&:hover fieldset': {
                          borderColor: '#90caf9',
                        },
                      },
                      '& .MuiInputLabel-root': {
                        color: '#787b86',
                      },
                    }}
                  />
                )}
                renderOption={(props, option) => (
                  <ListItem 
                    {...props} 
                    onClick={() => handleAddToWatchlist(option.symbol)}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {option.symbol}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.name}
                      </Typography>
                    </Box>
                    
                    {option.exchange && (
                      <Chip
                        size="small"
                        label={option.exchange}
                        sx={{ 
                          bgcolor: 'rgba(66, 133, 244, 0.1)',
                          color: '#90caf9',
                          fontSize: '0.7rem'
                        }}
                      />
                    )}
                  </ListItem>
                )}
                noOptionsText="No markets found. Try a different search."
                loadingText="Searching markets..."
                loading={searchLoading}
                sx={{
                  '& .MuiAutocomplete-paper': {
                    backgroundColor: '#1e222d',
                    color: '#d1d4dc',
                  }
                }}
              />

              <List sx={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
                {watchlist.map((symbol) => (
                  <ListItem
                    key={symbol}
                    button
                    selected={symbol === currentSymbol}
                    onClick={() => handleSelectSymbol(symbol)}
                  >
                    <ListItemText 
                      primary={symbol}
                    />
                    <ListItemSecondaryAction>
                      <IconButton 
                        edge="end" 
                        size="small"
                        onClick={() => removeFromWatchlist(symbol)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>

            {/* Center - Chart */}
            <Paper sx={{ flex: 1 }}>
              <Box sx={{ height: 'calc(100vh - 100px)', p: 2 }}>
                <TradingViewWidget symbol={currentSymbol} />
              </Box>
            </Paper>

            {/* Right Sidebar - Market News */}
            <Paper sx={{ width: 300, p: 2 }}>
              <Typography variant="h6" gutterBottom sx={{ color: '#d1d4dc' }}>
                Market News
              </Typography>
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              {loading ? (
                <Box display="flex" justifyContent="center" p={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <List sx={{ maxHeight: 'calc(100vh - 250px)', overflow: 'auto' }}>
                  {marketNews.map((news, index) => (
                    <React.Fragment key={news.id}>
                      <ListItem 
                        component="a" 
                        href={news.url} 
                        target="_blank"
                        sx={{ display: 'block' }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {news.headline}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#787b86' }}>
                          {news.datetime}
                        </Typography>
                      </ListItem>
                      {index < marketNews.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </Paper>
          </Box>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
