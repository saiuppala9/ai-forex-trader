import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, CircularProgress, Alert, Snackbar } from '@mui/material';

/**
 * Component that embeds TradingView charts and widgets
 */
const TradingViewWidget = ({ symbol = 'EUR/USD' }) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  
  // Format symbol for TradingView (they expect OANDA:EURUSD format for forex)
  const formatSymbol = (symbolToFormat) => {
    if (!symbolToFormat) return 'OANDA:EURUSD';
    
    // Handle Forex pairs
    if (symbolToFormat.includes('/')) {
      const [base, quote] = symbolToFormat.split('/');
      return `OANDA:${base}${quote}`;
    }
    
    // Handle commodities
    if (['XAUUSD', 'XAGUSD'].includes(symbolToFormat)) {
      return `OANDA:${symbolToFormat}`;
    }
    
    // Handle crypto
    if (symbolToFormat.endsWith('/USD')) {
      const base = symbolToFormat.replace('/USD', '');
      return `COINBASE:${base}USD`;
    }
    
    // Handle stocks (default)
    return `NASDAQ:${symbolToFormat}`;
  };
  
  // Load TradingView script only once when component mounts
  useEffect(() => {
    // Check if TradingView script is already loaded
    if (window.TradingView) {
      setIsScriptLoaded(true);
      return;
    }
    
    // Define a global callback function for when script loads
    window.onTvScriptLoad = () => {
      setIsScriptLoaded(true);
    };
    
    // Load TradingView script with crossorigin attribute
    const script = document.createElement('script');
    script.id = 'tradingview-widget-script';
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.onload = function() {
      if (window.onTvScriptLoad) {
        window.onTvScriptLoad();
      }
    };
    
    script.onerror = function(e) {
      console.error('Failed to load TradingView script:', e);
      setError('Failed to load TradingView script. Please refresh the page.');
      setLoading(false);
    };
    
    // Check if script is already in document
    if (!document.getElementById('tradingview-widget-script')) {
      document.head.appendChild(script);
    }
    
    return () => {
      // Clean up the global callback when component unmounts
      window.onTvScriptLoad = null;
    };
  }, []);
  
  // Initialize the widget when the script is loaded or symbol changes
  useEffect(() => {
    if (!isScriptLoaded) return;
    
    // Get container reference
    const container = containerRef.current;
    if (!container) return;
    
    // Clear previous content
    container.innerHTML = '';
    setLoading(true);
    setError(null);
    
    try {
      // Create container for TradingView widget
      const widgetContainer = document.createElement('div');
      widgetContainer.id = `tradingview_widget_${Date.now()}`;
      widgetContainer.style.width = '100%';
      widgetContainer.style.height = '100%';
      container.appendChild(widgetContainer);
      
      // Format the symbol
      const formattedSymbol = formatSymbol(symbol);
      console.log('Loading TradingView chart for:', formattedSymbol);
      
      // Wait a bit for the DOM to be fully ready
      setTimeout(() => {
        try {
          if (typeof window.TradingView !== 'undefined') {
            new window.TradingView.widget({
              autosize: true,
              symbol: formattedSymbol,
              interval: 'D',
              timezone: 'Etc/UTC',
              theme: 'dark',
              style: '1',
              locale: 'en',
              toolbar_bg: '#131722',
              enable_publishing: false,
              withdateranges: true,
              hide_side_toolbar: false,
              allow_symbol_change: true,
              studies: [
                'MASimple@tv-basicstudies',
                'RSI@tv-basicstudies',
                'MACD@tv-basicstudies'
              ],
              container_id: widgetContainer.id,
              library_path: 'https://s3.tradingview.com/charting_library/',
            });
            setLoading(false);
          } else {
            throw new Error('TradingView library not available');
          }
        } catch (err) {
          console.error('Error initializing TradingView widget:', err);
          setError(`Error initializing chart: ${err.message || 'Unknown error'}`);
          setLoading(false);
        }
      }, 300); // Increased delay for more safety
    } catch (err) {
      console.error('Error setting up TradingView container:', err);
      setError(`Error setting up chart: ${err.message || 'Unknown error'}`);
      setLoading(false);
    }
    
    // Cleanup function
    return () => {
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [symbol, isScriptLoaded]);
  
  // Handle closing the error message
  const handleCloseError = () => {
    setError(null);
  };
  
  // Fallback chart message when there's an error
  const renderFallbackMessage = () => (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      p: 3,
      bgcolor: '#1e222d',
      color: '#d1d4dc'
    }}>
      <Typography variant="h6" gutterBottom>
        Chart temporarily unavailable
      </Typography>
      <Typography variant="body2" align="center">
        We're having trouble loading the chart for {symbol}.
        Please try refreshing the page or selecting a different symbol.
      </Typography>
    </Box>
  );
  
  return (
    <Box sx={{ 
      width: '100%', 
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      bgcolor: '#131722' 
    }}>
      {loading && (
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          display: 'flex', 
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(19, 23, 34, 0.7)',
          zIndex: 1,
        }}>
          <CircularProgress sx={{ color: '#90caf9' }} />
        </Box>
      )}
      
      <Snackbar 
        open={!!error} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseError} 
          severity="error" 
          sx={{ 
            width: '100%',
            backgroundColor: '#2a2e39',
            color: '#d1d4dc',
            '& .MuiAlert-icon': {
              color: '#ef5350'
            }
          }}
        >
          {error}
        </Alert>
      </Snackbar>
      
      <Box sx={{ 
        p: 1, 
        borderBottom: 1, 
        borderColor: '#2a2e39',
        backgroundColor: '#1e222d'
      }}>
        <Typography variant="h6" sx={{ color: '#d1d4dc' }}>
          {symbol} - Advanced Forex Chart
        </Typography>
      </Box>
      
      {error ? renderFallbackMessage() : (
        <Box 
          sx={{ 
            flexGrow: 1,
            width: '100%',
            height: 'calc(100% - 48px)', /* Subtract header height */
          }} 
          ref={containerRef}
        />
      )}
    </Box>
  );
};

export default TradingViewWidget;
