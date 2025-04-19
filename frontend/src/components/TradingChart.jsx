import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Divider, useTheme } from '@mui/material';
import OrderBookIndicator from './OrderBookIndicator';
import { createChart, CrosshairMode } from 'lightweight-charts';
import MarketContainer from './MarketContainer';

const TradingChart = ({ symbol, data, analysis }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();
  const theme = useTheme();
  // Determine market direction based on price movement in the data
  const [marketDirection, setMarketDirection] = useState('neutral');
  
  // Calculate market direction based on recent price movements
  useEffect(() => {
    if (data && data.length >= 2) {
      const recentData = data.slice(-10); // Last 10 candles
      const firstPrice = recentData[0].Close;
      const lastPrice = recentData[recentData.length - 1].Close;
      
      // If price increased over the period, it's bullish
      // If price decreased, it's bearish
      if (lastPrice > firstPrice) {
        setMarketDirection('bull');
      } else if (lastPrice < firstPrice) {
        setMarketDirection('bear');
      } else {
        setMarketDirection('neutral');
      }
    }
  }, [data]);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 600,
      layout: {
        backgroundColor: '#253248',
        textColor: 'rgba(255, 255, 255, 0.9)',
      },
      grid: {
        vertLines: {
          color: 'rgba(197, 203, 206, 0.1)',
        },
        horzLines: {
          color: 'rgba(197, 203, 206, 0.1)',
        },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
      },
    });

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Add candlestick data
    const candleData = data.map(item => ({
      time: new Date(item.timestamp).getTime() / 1000,
      open: item.Open,
      high: item.High,
      low: item.Low,
      close: item.Close,
    }));
    candlestickSeries.setData(candleData);

    // Add volume series
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Add volume data
    const volumeData = data.map(item => ({
      time: new Date(item.timestamp).getTime() / 1000,
      value: item.Volume,
      color: item.Close >= item.Open ? '#26a69a' : '#ef5350',
    }));
    volumeSeries.setData(volumeData);

    // Add technical indicators if available
    if (data[0].SMA_20) {
      const sma20Series = chart.addLineSeries({
        color: '#2962FF',
        lineWidth: 1,
        title: 'SMA 20',
      });
      sma20Series.setData(data.map(item => ({
        time: new Date(item.timestamp).getTime() / 1000,
        value: item.SMA_20,
      })));
    }

    if (data[0].EMA_20) {
      const ema20Series = chart.addLineSeries({
        color: '#FF6D00',
        lineWidth: 1,
        title: 'EMA 20',
      });
      ema20Series.setData(data.map(item => ({
        time: new Date(item.timestamp).getTime() / 1000,
        value: item.EMA_20,
      })));
    }

    // Add support and resistance levels if available in analysis
    if (analysis && analysis['1h']) {
      const timeframe = analysis['1h'];
      const markers = [];

      // Add support level
      if (timeframe.support) {
        const supportSeries = chart.addLineSeries({
          color: '#4CAF50',
          lineWidth: 1,
          title: 'Support',
          lineStyle: 2,
        });
        supportSeries.setData([{
          time: candleData[0].time,
          value: timeframe.support,
        }, {
          time: candleData[candleData.length - 1].time,
          value: timeframe.support,
        }]);
      }

      // Add resistance level
      if (timeframe.resistance) {
        const resistanceSeries = chart.addLineSeries({
          color: '#F44336',
          lineWidth: 1,
          title: 'Resistance',
          lineStyle: 2,
        });
        resistanceSeries.setData([{
          time: candleData[0].time,
          value: timeframe.resistance,
        }, {
          time: candleData[candleData.length - 1].time,
          value: timeframe.resistance,
        }]);
      }

      // Add entry and target markers
      if (timeframe.entry_price) {
        markers.push({
          time: candleData[candleData.length - 1].time,
          position: 'belowBar',
          color: '#2196F3',
          shape: 'arrowUp',
          text: `Entry ${timeframe.entry_price}`,
        });
      }

      if (timeframe.target_price) {
        markers.push({
          time: candleData[candleData.length - 1].time,
          position: 'aboveBar',
          color: '#4CAF50',
          shape: 'arrowDown',
          text: `Target ${timeframe.target_price}`,
        });
      }

      if (markers.length > 0) {
        candlestickSeries.setMarkers(markers);
      }
    }

    // Handle resize
    const handleResize = () => {
      chart.applyOptions({
        width: chartContainerRef.current.clientWidth,
      });
    };

    window.addEventListener('resize', handleResize);

    // Store chart reference
    chartRef.current = chart;

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, analysis]);

  return (
    <MarketContainer 
      marketDirection={marketDirection}
      title={`${symbol} Chart`}
      sx={{ p: 2 }}
    >
      {/* Chart display area with custom styling */}
      <Box 
        ref={chartContainerRef} 
        sx={{ 
          height: '600px',
          borderRadius: 1,
          overflow: 'hidden',
          border: `1px solid ${theme.palette.background.chart}`,
          '& .tv-lightweight-charts': {
            borderRadius: 1,
          }
        }} 
      />
      
      {/* Order Book Indicator showing buy/sell percentages */}
      <Box mt={2}>
        <OrderBookIndicator symbol={symbol} />
      </Box>
      
      <Divider sx={{ 
        my: 2, 
        borderColor: marketDirection === 'bull' 
          ? theme.palette.bull.main 
          : marketDirection === 'bear' 
            ? theme.palette.bear.main 
            : theme.palette.divider,
        opacity: 0.2
      }} />
      
      {analysis && analysis['1h'] && (
        <Box mt={1}>
          <Typography 
            variant="subtitle2" 
            color={marketDirection === 'bull' ? 'text.bull' : marketDirection === 'bear' ? 'text.bear' : 'primary'}
            fontWeight="medium"
          >
            AI Analysis (1H):
          </Typography>
          <Typography variant="body2" sx={{ 
            mt: 1, 
            p: 1.5, 
            borderRadius: 1,
            bgcolor: theme.palette.background.neutral,
            border: `1px solid ${marketDirection === 'bull' 
              ? theme.palette.bull.main 
              : marketDirection === 'bear' 
                ? theme.palette.bear.main 
                : theme.palette.divider}`,
            borderLeftWidth: 4,
          }}>
            <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>Trend:</Box>
            <Box 
              component="span" 
              sx={{ 
                color: analysis['1h'].trend === 'Bullish' 
                  ? 'bull.main' 
                  : analysis['1h'].trend === 'Bearish' 
                    ? 'bear.main' 
                    : 'text.primary',
                fontWeight: 'medium'
              }}
            >
              {analysis['1h'].trend}
            </Box>
            <br/>
            <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>Entry:</Box>
            <Box component="span" sx={{ fontWeight: 'medium' }}>{analysis['1h'].entry_price}</Box>
            <br/>
            <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>Target:</Box>
            <Box component="span" sx={{ color: 'bull.main', fontWeight: 'medium' }}>{analysis['1h'].target_price}</Box>
            <br/>
            <Box component="span" sx={{ color: 'text.secondary', mr: 1 }}>Stop:</Box>
            <Box component="span" sx={{ color: 'bear.main', fontWeight: 'medium' }}>{analysis['1h'].stop_loss}</Box>
          </Typography>
        </Box>
      )}
    </MarketContainer>
  );
};

export default TradingChart;
