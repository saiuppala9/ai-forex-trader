import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

// Basic TradingView Widget Component
const ExnessTrader = ({ symbol = 'EURUSD', interval = 'D' }) => {
  const container = useRef(null);
  
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    
    script.onload = () => {
      if (typeof TradingView !== 'undefined') {
        new TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: interval || 'D',
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: 'tradingview-chart-container'
        });
      }
    };
    
    document.head.appendChild(script);
    
    return () => {
      // Cleanup script if component unmounts
      // But don't remove it if there are other instances
      const containerElement = document.getElementById('tradingview-chart-container');
      if (containerElement) {
        containerElement.innerHTML = '';
      }
    };
  }, [symbol, interval]);
  
  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <div id="tradingview-chart-container" style={{ height: '100%', width: '100%' }} />
    </Box>
  );
};

export default ExnessTrader;
