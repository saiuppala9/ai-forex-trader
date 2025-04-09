import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  Chip, 
  CircularProgress, 
  Alert,
  Link,
  Stack,
  Card,
  CardContent,
  CardActionArea,
  IconButton,
  InputBase,
  Tabs,
  Tab
} from '@mui/material';
import { 
  Search, 
  TrendingUp, 
  TrendingDown, 
  OpenInNew, 
  TimelineOutlined, 
  FeedOutlined, 
  FilterList,
  ArrowUpward,
  ArrowDownward
} from '@mui/icons-material';
import MarketDataService from '../services/marketDataService';

const NewsPanel = ({ symbol, onNewsSentimentChange }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [news, setNews] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(0);
  const [sortOrder, setSortOrder] = useState('newest');
  const [sentiment, setSentiment] = useState({
    positive: 0,
    neutral: 0, 
    negative: 0,
    overall: 0
  });

  // Fetch news when symbol changes
  useEffect(() => {
    if (!symbol) return;
    
    const fetchNews = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Get news from multiple sources via the market data service
        const newsData = await MarketDataService.getMarketNews(symbol);
        
        // Add sentiment scoring to each news item (normally would come from backend)
        const newsWithSentiment = newsData.map(item => ({
          ...item,
          sentiment: item.sentiment || calculateSentiment(item.title, symbol)
        }));
        
        setNews(newsWithSentiment);
        
        // Calculate overall sentiment
        const overallSentiment = calculateOverallSentiment(newsWithSentiment);
        setSentiment(overallSentiment);
        
        // Notify parent component of sentiment change if callback exists
        if (onNewsSentimentChange) {
          onNewsSentimentChange(overallSentiment);
        }
      } catch (error) {
        console.error('Error fetching news:', error);
        setError('Failed to load market news. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNews();
    
    // Refresh news every 5 minutes
    const interval = setInterval(fetchNews, 300000);
    
    return () => clearInterval(interval);
  }, [symbol, onNewsSentimentChange]);
  
  // Handle tab change
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  // Handle search input change
  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
  };
  
  // Toggle sort order between newest and oldest
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest');
  };
  
  // Filter news based on search query and selected category
  const filteredNews = news.filter(item => {
    const matchesSearch = !searchQuery || 
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.summary && item.summary.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Don't filter by category at all - show all news
    return matchesSearch;
  });
  
  // Sort news by date
  const sortedNews = [...filteredNews].sort((a, b) => {
    const dateA = new Date(a.datetime || a.date);
    const dateB = new Date(b.datetime || b.date);
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
  });
  
  // Calculate sentiment score for a news item based on title and symbol
  const calculateSentiment = (title, symbol) => {
    if (!title) return 0; // Return neutral sentiment if title is missing
    
    const bullishKeywords = ['rise', 'up', 'gain', 'bullish', 'growth', 'rally', 'surge', 'jump', 'high'];
    const bearishKeywords = ['fall', 'down', 'drop', 'bearish', 'decline', 'slump', 'plunge', 'loss', 'low'];
    
    const titleLower = title.toLowerCase();
    let score = 0;
    
    // Check for bullish keywords
    bullishKeywords.forEach(keyword => {
      if (titleLower.includes(keyword)) score += 0.2;
    });
    
    // Check for bearish keywords
    bearishKeywords.forEach(keyword => {
      if (titleLower.includes(keyword)) score -= 0.2;
    });
    
    // Check if the symbol is mentioned
    if (titleLower.includes(symbol.toLowerCase())) {
      // Amplify the sentiment if the symbol is directly mentioned
      score *= 1.5;
    }
    
    // Clamp between -1 and 1
    return Math.max(-1, Math.min(1, score));
  };
  
  // Calculate overall sentiment from all news items
  const calculateOverallSentiment = (newsItems) => {
    if (!newsItems || !newsItems.length) {
      return { positive: 0, neutral: 0, negative: 0, overall: 0 };
    }
    
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;
    let totalScore = 0;
    let validItems = 0;
    
    newsItems.forEach(item => {
      // Skip items without sentiment values
      if (item.sentiment === undefined || item.sentiment === null) return;
      
      validItems++;
      totalScore += item.sentiment;
      
      if (item.sentiment > 0.2) {
        positiveCount++;
      } else if (item.sentiment < -0.2) {
        negativeCount++;
      } else {
        neutralCount++;
      }
    });
    
    // Use valid items count instead of total length
    const total = validItems || 1; // Avoid division by zero
    
    return {
      positive: Math.round((positiveCount / total) * 100),
      neutral: Math.round((neutralCount / total) * 100),
      negative: Math.round((negativeCount / total) * 100),
      overall: totalScore / total
    };
  };
  
  // Render sentiment indicator
  const renderSentimentIndicator = (sentimentValue) => {
    let color = '#9e9e9e'; // neutral gray
    let label = 'Neutral';
    
    if (sentimentValue > 0.2) {
      color = '#4caf50'; // green for positive
      label = 'Bullish';
    } else if (sentimentValue < -0.2) {
      color = '#f44336'; // red for negative
      label = 'Bearish';
    }
    
    return (
      <Chip 
        label={label}
        sx={{ 
          backgroundColor: color,
          color: 'white',
          fontWeight: 'bold'
        }}
        size="small"
      />
    );
  };
  
  // Render news list
  const renderNewsList = () => {
    if (sortedNews.length === 0) {
      return (
        <Box sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            No news found for the selected criteria.
          </Typography>
        </Box>
      );
    }
    
    return (
      <List disablePadding>
        {sortedNews.map((item, index) => (
          <React.Fragment key={item.id || index}>
            <Card sx={{ mb: 1, border: '1px solid rgba(0, 0, 0, 0.12)' }}>
              <CardActionArea component="a" href={item.url} target="_blank" rel="noopener noreferrer">
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Chip
                      label={item.source || 'News'}
                      size="small"
                      sx={{ height: 20, fontSize: '0.7rem' }}
                    />
                    {renderSentimentIndicator(item.sentiment)}
                  </Box>
                  
                  <Typography variant="subtitle1" component="h3" gutterBottom>
                    {item.title}
                  </Typography>
                  
                  {item.summary && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {item.summary.length > 150 
                        ? `${item.summary.substring(0, 150)}...` 
                        : item.summary}
                    </Typography>
                  )}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      {item.date} {item.time && `at ${item.time}`}
                    </Typography>
                    <IconButton size="small">
                      <OpenInNew fontSize="small" />
                    </IconButton>
                  </Box>
                </CardContent>
              </CardActionArea>
            </Card>
            {index < sortedNews.length - 1 && <Box sx={{ my: 1 }} />}
          </React.Fragment>
        ))}
      </List>
    );
  };
  
  // Render sentiment summary
  const renderSentimentSummary = () => {
    return (
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          News Sentiment for {symbol}
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Box sx={{ flexGrow: 1, mr: 1 }}>
            <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden' }}>
              <Box 
                sx={{ 
                  width: `${sentiment.positive}%`, 
                  bgcolor: '#4caf50',
                  transition: 'width 0.3s ease-in-out',
                  minWidth: '1px'
                }} 
              />
              <Box 
                sx={{ 
                  width: `${sentiment.neutral}%`, 
                  bgcolor: '#9e9e9e',
                  transition: 'width 0.3s ease-in-out',
                  minWidth: '1px'
                }} 
              />
              <Box 
                sx={{ 
                  width: `${sentiment.negative}%`, 
                  bgcolor: '#f44336',
                  transition: 'width 0.3s ease-in-out',
                  minWidth: '1px'
                }} 
              />
            </Box>
          </Box>
          
          {sentiment.overall > 0.2 ? (
            <TrendingUp color="success" />
          ) : sentiment.overall < -0.2 ? (
            <TrendingDown color="error" />
          ) : (
            <TimelineOutlined color="action" />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="caption" color="success.main">
            Bullish: {sentiment.positive}%
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Neutral: {sentiment.neutral}%
          </Typography>
          <Typography variant="caption" color="error.main">
            Bearish: {sentiment.negative}%
          </Typography>
        </Box>
      </Paper>
    );
  };
  
  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading market news...
        </Typography>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ px: 2, pt: 2 }}>
        {renderSentimentSummary()}
      </Box>
      
      <Box sx={{ p: 2, maxHeight: 'none', overflow: 'visible' }}>
        <Paper sx={{ p: 0, overflow: 'hidden' }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="h6" component="h3">
              Latest Market News
            </Typography>
          </Box>
          <Divider />
          <Box sx={{ p: 2 }}>
            {renderNewsList()}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default NewsPanel;
