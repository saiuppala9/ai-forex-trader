import React, { useEffect, useState, useRef } from 'react';
import { Box, Typography, CircularProgress, Alert, Snackbar } from '@mui/material';

/**
 * Component that embeds TradingView charts using the official iframe embedding method
 * This approach avoids CORS issues by using their widget directly
 */
const TradingViewWidget = ({ symbol = 'EUR/USD' }) => {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Format symbol for TradingView (they expect OANDA:EURUSD format for forex)
  const formatSymbol = (symbolToFormat) => {
    if (!symbolToFormat) return 'OANDA:EURUSD';
    
    try {
      // Handle Forex pairs
      if (symbolToFormat.includes('/')) {
        const [base, quote] = symbolToFormat.split('/');
        return `OANDA:${base}${quote}`;
      }
      
      // Handle Indian stock symbols
      if (['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'SBIN', 
           'TATAMOTORS', 'WIPRO', 'KOTAKBANK', 'AXISBANK', 'BHARTIARTL', 'ITC', 
           'HCLTECH', 'SUNPHARMA', 'ASIANPAINT', 'BAJFINANCE', 'ADANIENT', 
           'ADANIPORTS', 'MARUTI'].includes(symbolToFormat)) {
        return `NSE:${symbolToFormat}`;
      }
      
      // Handle Indian indices
      if (symbolToFormat === 'IN50') return 'NSE:NIFTY';
      if (symbolToFormat === 'BSESENSEX') return 'BSE:SENSEX';
      
      // Handle global indices
      if (symbolToFormat === 'US500') return 'FOREXCOM:SPX500';
      if (symbolToFormat === 'US30') return 'FOREXCOM:DJI';
      if (symbolToFormat === 'US100') return 'FOREXCOM:NASDAQ';  
      if (symbolToFormat === 'UK100') return 'FOREXCOM:UK100';
      if (symbolToFormat === 'JP225') return 'FOREXCOM:JP225';
      if (symbolToFormat === 'DE40') return 'FOREXCOM:DE40';
      if (symbolToFormat === 'FR40') return 'FOREXCOM:FR40';
      if (symbolToFormat === 'EU50') return 'STOXX:EU50';
      
      // Handle commodities
      if (symbolToFormat === 'XAUUSD') return 'OANDA:XAUUSD';
      if (symbolToFormat === 'XAGUSD') return 'OANDA:XAGUSD';
      if (symbolToFormat === 'WTICOUSD') return 'TVC:USOIL';  
      if (symbolToFormat === 'BRENTCOUSD') return 'TVC:UKOIL';
      if (symbolToFormat === 'NATGASUSD') return 'TVC:NATGAS';  
      if (symbolToFormat === 'COPPUSD') return 'TVC:COPPER';  
      if (symbolToFormat === 'PLTUSD') return 'TVC:PLATINUM';
      if (symbolToFormat === 'PALUSD') return 'TVC:PALLADIUM';
      
      // Handle crypto
      if (symbolToFormat.endsWith('/USD')) {
        const base = symbolToFormat.replace('/USD', '');
        return `COINBASE:${base}USD`;
      }
      
      // Handle NYSE stocks
      if (['JPM', 'V', 'WMT', 'BAC', 'DIS', 'PFE', 'XOM', 'KO', 'MA', 'T', 'VZ', 'CVX', 'HD'].includes(symbolToFormat)) {
        return `NYSE:${symbolToFormat}`;
      }
      
      // Handle stocks (default to NASDAQ)
      return `NASDAQ:${symbolToFormat}`;
    } catch (error) {
      console.error('Error formatting symbol:', error);
      // Fallback to a reliable default
      return 'OANDA:EURUSD';
    }
  };
  
  // Check if symbol is supported by TradingView
  const isSymbolSupported = (symbol) => {
    try {
      // This function contains the same logic as formatSymbol but returns a boolean
      // Add any symbol validation logic here
      
      // Currently we support:
      // 1. All forex pairs (X/Y format)
      if (symbol.includes('/')) return true;
      
      // 2. Listed Indian stocks
      if (['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'SBIN', 
           'TATAMOTORS', 'WIPRO', 'KOTAKBANK', 'AXISBANK', 'BHARTIARTL', 'ITC', 
           'HCLTECH', 'SUNPHARMA', 'ASIANPAINT', 'BAJFINANCE', 'ADANIENT', 
           'ADANIPORTS', 'MARUTI'].includes(symbol)) {
        return true;
      }
      
      // 3. Listed indices
      if (['US500', 'US30', 'US100', 'UK100', 'JP225', 'DE40', 'FR40', 'EU50', 'IN50', 'BSESENSEX'].includes(symbol)) {
        return true;
      }
      
      // 4. Listed commodities
      if (['XAUUSD', 'XAGUSD', 'WTICOUSD', 'BRENTCOUSD', 'NATGASUSD', 'COPPUSD', 'PLTUSD', 'PALUSD'].includes(symbol)) {
        return true;
      }
      
      // 5. Listed NYSE stocks
      if (['JPM', 'V', 'WMT', 'BAC', 'DIS', 'PFE', 'XOM', 'KO', 'MA', 'T', 'VZ', 'CVX', 'HD'].includes(symbol)) {
        return true;
      }
      
      // 6. Popular NASDAQ stocks
      if (['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'GOOG', 'META', 'TSLA', 'NVDA', 'INTC', 'AMD', 
           'NFLX', 'PYPL', 'ADBE', 'CMCSA', 'CSCO', 'PEP'].includes(symbol)) {
        return true;
      }
      
      // For other symbols, assume not supported by default
      // This is a conservative approach to prevent errors
      console.warn('Symbol may not be supported in TradingView:', symbol);
      return false;
    } catch (error) {
      console.error('Error checking symbol support:', error);
      return false;
    }
  };
  
  // Export isSymbolSupported to be used by other components
  window.isSymbolSupported = isSymbolSupported;
  
  // Create and load the TradingView widget when the component mounts or symbol changes
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    try {
      // Format the symbol for TradingView
      const formattedSymbol = formatSymbol(symbol);
      console.log('Loading TradingView chart for:', formattedSymbol);
      
      // Get container reference
      const container = containerRef.current;
      if (!container) return;
      
      // Clear previous content
      container.innerHTML = '';
      
      // Create an iframe for TradingView widget
      // This avoids CORS issues since iframes are allowed to load cross-origin content
      const iframe = document.createElement('iframe');
      iframe.id = `tradingview_widget_${Date.now()}`;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      
      // Set iframe attributes
      iframe.setAttribute('allowTransparency', 'true');
      iframe.setAttribute('scrolling', 'no');
      iframe.setAttribute('frameBorder', '0');
      
      // Use TradingView's official widget URL with our symbol
      // This approach uses their official embed code which handles CORS correctly
      iframe.src = `https://www.tradingview.com/widgetembed/?frameElementId=${iframe.id}&symbol=${formattedSymbol}&interval=D&hidesidetoolbar=0&symboledit=1&saveimage=1&toolbarbg=f1f3f6&studies=BB%40tv-basicstudies%1FMACD%40tv-basicstudies%1FRSISearch%40tv-basicstudies&theme=Dark&style=1&timezone=exchange&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D`;
      
      // Add iframe to container
      container.appendChild(iframe);
      
      // Hide loading state once iframe loads
      iframe.onload = () => {
        setLoading(false);
      };
      
      // Set a timeout to hide loading state even if iframe doesn't trigger onload
      setTimeout(() => {
        setLoading(false);
      }, 3000);
    } catch (err) {
      console.error('Error setting up TradingView widget:', err);
      setError(`Error setting up chart: ${err.message || 'Unknown error'}`);
      setLoading(false);
    }
  }, [symbol]);
  
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
