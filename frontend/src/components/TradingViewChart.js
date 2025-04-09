import React, { useEffect, useRef, useState } from 'react';
import { createChart, LineStyle, CrosshairMode } from 'lightweight-charts';
import {
  Box,
  ButtonGroup,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  IconButton,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Timeline as TimelineIcon,
  ShowChart as ShowChartIcon,
  TrendingUp as TrendingUpIcon,
  PriceChange as PriceChangeIcon,
  Add as LongIcon,
  Remove as ShortIcon,
  Delete as DeleteIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
} from '@mui/icons-material';

// Get API keys from environment or hardcoded fallbacks
const FINNHUB_API_KEY = 'cvr1e9pr01qp88co31igcvr1e9pr01qp88co31j0'; // Hardcoded to bypass env caching issues
const ALPHA_VANTAGE_API_KEY = 'demo'; // Using demo key for testing

const TIMEFRAMES = [
  { label: '1m', value: '1', count: 1000, resolution: '1' },
  { label: '5m', value: '5', count: 500, resolution: '5' },
  { label: '15m', value: '15', count: 400, resolution: '15' },
  { label: '30m', value: '30', count: 300, resolution: '30' },
  { label: '1h', value: '60', count: 200, resolution: '60' },
  { label: '4h', value: '240', count: 150, resolution: '240' },
  { label: '1D', value: 'D', count: 100, resolution: 'D' },
];

export default function TradingViewChart({ symbol }) {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const resizeObserver = useRef();
  const candleSeries = useRef();
  const [timeframe, setTimeframe] = useState('D');
  const [drawingTool, setDrawingTool] = useState(null);
  const [lines, setLines] = useState([]);
  const [positions, setPositions] = useState([]);
  const [drawingState, setDrawingState] = useState({
    isDrawing: false,
    startPoint: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Format symbol for Finnhub API
  const formatSymbol = (symbol) => {
    try {
      // Handle Forex pairs
      if (symbol.includes('/')) {
        const [base, quote] = symbol.split('/');
        return `${base}${quote}`; // Finnhub expects EURUSD format for forex
      }
      
      // Handle commodities
      if (['XAUUSD', 'XAGUSD', 'WTIUSD', 'BRENTUSD'].includes(symbol)) {
        return symbol;
      }
      
      // Handle crypto
      if (symbol.endsWith('/USD')) {
        const base = symbol.replace('/USD', '');
        return `BINANCE:${base}USDT`;
      }
      
      // Handle stocks (default)
      return symbol;
    } catch (error) {
      console.error('Error formatting symbol:', error);
      return symbol;
    }
  };

  const fetchHistoricalData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Format symbol for Alpha Vantage (they expect FROM_TO format like EUR_USD)
      let formattedSymbol;
      if (symbol.includes('/')) {
        const [base, quote] = symbol.split('/');
        formattedSymbol = `${base}_${quote}`;
      } else if (['XAUUSD', 'XAGUSD'].includes(symbol)) {
        // Gold and Silver special case
        const metal = symbol.substring(0, 3);
        const currency = symbol.substring(3);
        formattedSymbol = `${metal}_${currency}`;
      } else {
        // Use the symbol as is for stocks
        formattedSymbol = symbol;
      }
      
      console.log('Using Alpha Vantage API for Forex data');
      console.log('Fetching data for symbol:', formattedSymbol);

      // Determine which API function to use based on the symbol
      const isForex = symbol.includes('/') || ['XAUUSD', 'XAGUSD'].includes(symbol);
      
      // Map timeframe to Alpha Vantage intervals
      const intervalMap = {
        '1': '1min',
        '5': '5min',
        '15': '15min',
        '30': '30min',
        '60': '60min',
        'D': 'daily',
      };
      
      const interval = intervalMap[timeframe] || 'daily';
      
      let url;
      if (isForex) {
        url = `https://www.alphavantage.co/query?` +
          `function=FX_${interval === 'daily' ? 'DAILY' : 'INTRADAY'}&` +
          `from_symbol=${formattedSymbol.split('_')[0]}&` +
          `to_symbol=${formattedSymbol.split('_')[1]}&` +
          (interval !== 'daily' ? `interval=${interval}&` : '') +
          `outputsize=full&` +
          `apikey=${ALPHA_VANTAGE_API_KEY}`;
      } else {
        // Fall back to stock data for non-forex symbols
        url = `https://www.alphavantage.co/query?` +
          `function=TIME_SERIES_${interval === 'daily' ? 'DAILY' : 'INTRADAY'}&` +
          `symbol=${formattedSymbol}&` +
          (interval !== 'daily' ? `interval=${interval}&` : '') +
          `outputsize=full&` +
          `apikey=${ALPHA_VANTAGE_API_KEY}`;
      }
      
      console.log('Fetching from URL:', url);

      const response = await fetch(url);

      if (!response.ok) {
        const text = await response.text();
        console.error('API Error:', text);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received data:', data);

      // Check for Alpha Vantage error messages
      if (data['Error Message']) {
        throw new Error(`Alpha Vantage API error: ${data['Error Message']}`);
      }
      
      if (data['Information']) {
        console.warn('Alpha Vantage info:', data['Information']);
      }

      // Parse Alpha Vantage response format, which is different from Finnhub
      let timeSeries;
      if (isForex) {
        // For Forex data
        if (interval === 'daily') {
          timeSeries = data['Time Series FX (Daily)'];
        } else {
          timeSeries = data[`Time Series FX (${interval})`];
        }
      } else {
        // For stock data
        if (interval === 'daily') {
          timeSeries = data['Time Series (Daily)'];
        } else {
          timeSeries = data[`Time Series (${interval})`];
        }
      }

      if (!timeSeries) {
        console.error('Invalid data format:', data);
        throw new Error('Invalid data format received from Alpha Vantage');
      }

      // Convert Alpha Vantage format to the format expected by LightweightCharts
      const chartData = Object.entries(timeSeries).map(([date, values]) => {
        const timestamp = new Date(date).getTime();
        return {
          time: timestamp,
          open: parseFloat(values['1. open']),
          high: parseFloat(values['2. high']),
          low: parseFloat(values['3. low']),
          close: parseFloat(values['4. close']),
          volume: parseFloat(values['5. volume'] || 0),
        };
      });

      // Sort by time ascending (Alpha Vantage returns data in descending order)
      chartData.sort((a, b) => a.time - b.time);
      
      console.log('Processed chart data:', chartData.length, 'candles');
      return chartData;

    } catch (error) {
      console.error('Error in fetchHistoricalData:', error);
      setError(error.message);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleTimeframeChange = async (event, newTimeframe) => {
    if (newTimeframe !== null && chartRef.current) {
      setTimeframe(newTimeframe);
      try {
        const data = await fetchHistoricalData();
        candleSeries.current?.setData(data);
        updateMovingAverages(data);
      } catch (error) {
        console.error('Error updating timeframe:', error);
      }
    }
  };

  const handleDrawingToolChange = (event, newTool) => {
    if (chartRef.current) {
      // Clear drawing state when switching tools
      setDrawingState({ isDrawing: false, startPoint: null });
      setDrawingTool(newTool);
    }
  };

  const handleChartClick = (param) => {
    if (!drawingTool || !chartRef.current) return;

    const { time, price } = param;
    const chart = chartRef.current.chart;
    const candleSeries = chartRef.current.candleSeries;

    switch (drawingTool) {
      case 'trendline':
        if (!drawingState.isDrawing) {
          // Start drawing
          setDrawingState({
            isDrawing: true,
            startPoint: { time, price }
          });
        } else {
          // Finish drawing
          const line = {
            type: 'trendline',
            startTime: drawingState.startPoint.time,
            startPrice: drawingState.startPoint.price,
            endTime: time,
            endPrice: price,
          };

          const lineProperties = {
            price: drawingState.startPoint.price,
            time: drawingState.startPoint.time,
            color: '#2196F3',
            lineWidth: 2,
            lineStyle: LineStyle.Solid,
            axisLabelVisible: true,
            title: 'Trend Line',
          };

          candleSeries.createPriceLine(lineProperties);
          setLines([...lines, line]);
          setDrawingState({ isDrawing: false, startPoint: null });
        }
        break;

      case 'long':
        const longMarker = {
          time: time,
          position: 'belowBar',
          color: '#4CAF50',
          shape: 'arrowUp',
          text: 'LONG',
        };
        candleSeries.setMarkers([...candleSeries.markers(), longMarker]);
        setPositions([...positions, { type: 'long', time, price }]);
        break;

      case 'short':
        const shortMarker = {
          time: time,
          position: 'aboveBar',
          color: '#FF5252',
          shape: 'arrowDown',
          text: 'SHORT',
        };
        candleSeries.setMarkers([...candleSeries.markers(), shortMarker]);
        setPositions([...positions, { type: 'short', time, price }]);
        break;

      case 'fibonacci':
        if (!drawingState.isDrawing) {
          setDrawingState({
            isDrawing: true,
            startPoint: { time, price }
          });
        } else {
          const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
          const priceRange = price - drawingState.startPoint.price;
          
          fibLevels.forEach(level => {
            const fibPrice = drawingState.startPoint.price + (priceRange * level);
            const lineProperties = {
              price: fibPrice,
              color: '#9C27B0',
              lineWidth: 1,
              lineStyle: LineStyle.Dotted,
              axisLabelVisible: true,
              title: `Fib ${(level * 100).toFixed(1)}%`,
            };
            candleSeries.createPriceLine(lineProperties);
          });

          setDrawingState({ isDrawing: false, startPoint: null });
        }
        break;
    }
  };

  const handleUndo = () => {
    if (!chartRef.current || !chartRef.current.candleSeries) return;
    
    const candleSeries = chartRef.current.candleSeries;
    const currentMarkers = candleSeries.markers();
    if (currentMarkers.length > 0) {
      candleSeries.setMarkers(currentMarkers.slice(0, -1));
    }
    // Remove last line if exists
    if (lines.length > 0) {
      setLines(lines.slice(0, -1));
    }
  };

  const handleClearAll = () => {
    if (!chartRef.current || !chartRef.current.candleSeries) return;
    
    const candleSeries = chartRef.current.candleSeries;
    candleSeries.setMarkers([]);
    setLines([]);
    setPositions([]);
  };

  const updateMovingAverages = (data) => {
    if (!chartRef.current) return;

    const ma20Data = calculateMA(data, 20);
    const ma50Data = calculateMA(data, 50);
    chartRef.current.ma20Series.setData(ma20Data);
    chartRef.current.ma50Series.setData(ma50Data);
    chartRef.current.timeScale.fitContent();
  };

  const calculateMA = (data, period) => {
    return data.map((d, i, arr) => {
      if (i < period) return null;
      const sum = arr.slice(i - period + 1, i + 1).reduce((a, b) => a + b.close, 0);
      return {
        time: d.time,
        value: parseFloat((sum / period).toFixed(4))
      };
    }).filter(d => d !== null);
  };

  useEffect(() => {
    if (!FINNHUB_API_KEY) {
      setError('Finnhub API key is not configured');
      return;
    }

    const container = chartContainerRef.current;
    const chart = createChart(container, {
      width: container.clientWidth,
      height: container.clientHeight,
      layout: {
        background: { color: '#1e222d' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2a2e39' },
        horzLines: { color: '#2a2e39' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
      },
      timeScale: {
        borderColor: '#2a2e39',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    candleSeries.current = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Add moving averages
    const ma20Series = chart.addLineSeries({
      color: '#2962FF',
      lineWidth: 1,
      title: 'MA20',
    });

    const ma50Series = chart.addLineSeries({
      color: '#FF6D00',
      lineWidth: 1,
      title: 'MA50',
    });

    // Store references
    chartRef.current = {
      chart,
      ma20Series,
      ma50Series,
      timeScale: chart.timeScale(),
    };

    // Set up resize observer
    resizeObserver.current = new ResizeObserver(entries => {
      if (entries.length === 0 || !chartRef.current) return;
      const newRect = entries[0].contentRect;
      chartRef.current.chart.applyOptions({
        width: newRect.width,
        height: newRect.height,
      });
    });
    resizeObserver.current.observe(container);

    // Initial data load
    const loadData = async () => {
      try {
        const data = await fetchHistoricalData();
        if (data.length > 0) {
          candleSeries.current?.setData(data);
          updateMovingAverages(data);
        }
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };
    loadData();

    // Set up WebSocket
    const ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`);
    const formattedSymbol = formatSymbol(symbol);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'subscribe', symbol: formattedSymbol }));
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('Failed to connect to real-time data feed');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'trade' && data.data && data.data.length > 0) {
        const trade = data.data[0];
        const timestamp = Math.floor(trade.t / 1000) * 1000;

        const update = {
          time: timestamp,
          open: trade.p,
          high: trade.p,
          low: trade.p,
          close: trade.p,
        };

        candleSeries.current?.update(update);
      }
    };

    // Cleanup
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'unsubscribe', symbol: formattedSymbol }));
        ws.close();
      }
      if (resizeObserver.current) {
        resizeObserver.current.disconnect();
      }
      chart.remove();
    };
  }, [symbol, FINNHUB_API_KEY]);

  const handleCloseError = () => {
    setError(null);
  };

  return (
    <Box sx={{ height: '100%', width: '100%', position: 'relative' }}>
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <ToggleButtonGroup
            value={timeframe}
            exclusive
            onChange={handleTimeframeChange}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                color: '#787b86',
                borderColor: '#2a2e39',
                '&:hover': {
                  backgroundColor: '#2a2e39'
                },
                '&.Mui-selected': {
                  backgroundColor: '#363c4e',
                  color: '#d1d4dc',
                  '&:hover': {
                    backgroundColor: '#363c4e'
                  }
                }
              }
            }}
          >
            {TIMEFRAMES.map(tf => (
              <ToggleButton key={tf.value} value={tf.resolution}>
                {tf.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>

          <ToggleButtonGroup
            value={drawingTool}
            exclusive
            onChange={handleDrawingToolChange}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                color: '#787b86',
                borderColor: '#2a2e39',
                '&:hover': {
                  backgroundColor: '#2a2e39'
                },
                '&.Mui-selected': {
                  backgroundColor: '#363c4e',
                  color: '#d1d4dc',
                  '&:hover': {
                    backgroundColor: '#363c4e'
                  }
                }
              }
            }}
          >
            <ToggleButton value="trendline">
              <Tooltip title="Trend Line">
                <TrendingUpIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="fibonacci">
              <Tooltip title="Fibonacci">
                <ShowChartIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="long">
              <Tooltip title="Long Position">
                <LongIcon />
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="short">
              <Tooltip title="Short Position">
                <ShortIcon />
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>

          <ButtonGroup 
            size="small"
            sx={{
              '& .MuiButtonBase-root': {
                color: '#787b86',
                borderColor: '#2a2e39',
                '&:hover': {
                  backgroundColor: '#2a2e39'
                }
              }
            }}
          >
            <Tooltip title="Undo">
              <IconButton size="small" onClick={handleUndo}>
                <UndoIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear All">
              <IconButton size="small" onClick={handleClearAll}>
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </ButtonGroup>
        </Box>
      </Box>
      <div ref={chartContainerRef} style={{ height: 'calc(100% - 50px)' }} />
    </Box>
  );
}
