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
  Grid,
  Tab,
  Tabs,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import TradingViewWidget from './components/ExnessTrader';
import MarketDataService from './services/marketDataService';
import AIAnalysisPanel from './components/AIAnalysisPanel';
import TradeHistory from './components/TradeHistory';

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
  const [tradeHistory, setTradeHistory] = useState([]);
  const [activeTab, setActiveTab] = useState(0);

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
              allNews = allNews.concat(data);
            } catch (error) {
              console.error(`Error fetching ${category} news:`, error);
            }
          }
          
          retryCount++;
          if (allNews.length === 0 && retryCount < maxRetries) {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }

        // Process news items
        const processedNews = allNews.map(item => {
          return {
            ...item,
            datetime: new Date(item.datetime * 1000).toLocaleString(),
            symbol: item.related || '',
            headline: item.headline || 'News headline unavailable'
          };
        }).filter(item => item.headline && item.headline.length > 0);

        setMarketNews(processedNews);
      } catch (error) {
        console.error('Error fetching market news:', error);
        setError('Failed to load market news. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    
    // Refresh news every 5 minutes
    const interval = setInterval(fetchNews, 300000);
    
    return () => clearInterval(interval);
  }, [FINNHUB_API_KEY]);

  // Fetch news for the selected symbol
  useEffect(() => {
    const fetchSymbolNews = async () => {
      if (!currentSymbol) return;
      
      setLoading(true);
      try {
        // Use the new symbol-specific news service
        const news = await MarketDataService.getSymbolNews(currentSymbol);
        setMarketNews(news);
        setError(null);
      } catch (error) {
        console.error(`Error fetching ${currentSymbol} news:`, error);
        setError(`Failed to load news for ${currentSymbol}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSymbolNews();
    
    // Refresh news every 3 minutes or when symbol changes
    const interval = setInterval(fetchSymbolNews, 180000);
    
    return () => clearInterval(interval);
  }, [currentSymbol]); // Re-run when symbol changes

  // Filter news for the selected symbol
  const getFilteredNews = () => {
    if (!marketNews || marketNews.length === 0) return [];
    
    // Normalize current symbol for comparison
    const normalizedSymbol = currentSymbol.replace('/', '').toUpperCase();
    
    // Filter news that contains the current symbol
    return marketNews.filter(news => {
      // Check in related symbols
      if (news.related && news.related.includes(normalizedSymbol)) {
        return true;
      }
      // Check in headline
      if (news.headline && news.headline.toUpperCase().includes(normalizedSymbol)) {
        return true;
      }
      // Check in summary
      if (news.summary && news.summary.toUpperCase().includes(normalizedSymbol)) {
        return true;
      }
      return false;
    });
  };

  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // Handle successful trade execution
  const handleTradeExecuted = (tradeData) => {
    // In a real app, you would update the trade history
    console.log('Trade executed:', tradeData);
    // For now, we're using mock data in the TradeHistory component
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ mt: 3, mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          AI Forex Trader
        </Typography>
        
        <Grid container spacing={2}>
          {/* Left sidebar with watchlist and search */}
          <Grid item xs={12} md={3}>
            <Paper elevation={3} sx={{ p: 2, height: '80vh', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" component="h2" gutterBottom>
                Watchlist
              </Typography>
              
              <Autocomplete
                freeSolo
                options={searchResults}
                getOptionLabel={(option) => option.symbol || option}
                onInputChange={debouncedSearch}
                onChange={(event, value) => {
                  if (value && typeof value === 'object') {
                    handleAddToWatchlist(value.symbol);
                  } else if (value && typeof value === 'string') {
                    handleAddToWatchlist(value);
                  }
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
                  bgcolor: 'background.paper',
                  overflow: 'auto',
                  flexGrow: 1
                }}
                component="nav"
              >
                {watchlist.map((symbol) => (
                  <ListItem
                    button
                    key={symbol}
                    selected={currentSymbol === symbol}
                    onClick={() => handleSelectSymbol(symbol)}
                  >
                    <ListItemText primary={symbol} />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" aria-label="delete" onClick={() => removeFromWatchlist(symbol)}>
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
          
          {/* Main content area - center and right columns */}
          <Grid item xs={12} md={9}>
            <Grid container spacing={2}>
              {/* Center column - Chart */}
              <Grid item xs={12} md={8}>
                <Paper elevation={3} sx={{ height: '60vh', display: 'flex', flexDirection: 'column' }}>
                  {/* Main chart */}
                  <Box
                    sx={{
                      flexGrow: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <TradingViewWidget symbol={currentSymbol} />
                  </Box>
                </Paper>
                
                {/* AI Analysis Panel below the chart */}
                <Paper elevation={3} sx={{ mt: 2, height: '30vh', overflow: 'auto' }}>
                  <Tabs
                    value={activeTab}
                    onChange={handleTabChange}
                    variant="fullWidth"
                    sx={{ borderBottom: 1, borderColor: 'divider' }}
                  >
                    <Tab label="AI Analysis" />
                    <Tab label="Trade History" />
                  </Tabs>
                  
                  <Box sx={{ p: 0, height: 'calc(30vh - 48px)', overflow: 'auto' }}>
                    {activeTab === 0 ? (
                      <AIAnalysisPanel 
                        symbol={currentSymbol} 
                        onExecuteTrade={handleTradeExecuted}
                      />
                    ) : (
                      <TradeHistory />
                    )}
                  </Box>
                </Paper>
              </Grid>
              
              {/* Right column - News */}
              <Grid item xs={12} md={4}>
                <Paper elevation={3} sx={{ p: 2, height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {currentSymbol} News
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
                    <List sx={{ overflow: 'auto', flexGrow: 1 }}>
                      {getFilteredNews().length > 0 ? (
                        getFilteredNews().map((news, index) => (
                          <React.Fragment key={news.id || index}>
                            <ListItem 
                              component="a" 
                              href={news.url} 
                              target="_blank"
                              sx={{ display: 'block' }}
                            >
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {news.headline}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {news.datetime}
                              </Typography>
                              {news.summary && (
                                <Typography variant="body2" sx={{ mt: 1, fontSize: '0.85rem' }}>
                                  {news.summary.length > 120 ? `${news.summary.substring(0, 120)}...` : news.summary}
                                </Typography>
                              )}
                            </ListItem>
                            {index < getFilteredNews().length - 1 && <Divider />}
                          </React.Fragment>
                        ))
                      ) : (
                        <Box sx={{ p: 2, textAlign: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            No related news found for {currentSymbol}
                          </Typography>
                        </Box>
                      )}
                    </List>
                  )}
                </Paper>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </Container>
    </ThemeProvider>
  );
}

export default App;
