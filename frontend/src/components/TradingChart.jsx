import React, { useEffect, useRef } from 'react';
import { Box, Paper, Typography } from '@mui/material';
import { createChart, CrosshairMode } from 'lightweight-charts';

const TradingChart = ({ symbol, data, analysis }) => {
  const chartContainerRef = useRef();
  const chartRef = useRef();

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
    <Paper sx={{ p: 2, height: '700px' }}>
      <Typography variant="h6" gutterBottom>
        {symbol} Chart
      </Typography>
      <Box ref={chartContainerRef} sx={{ height: '600px' }} />
      {analysis && analysis['1h'] && (
        <Box mt={2}>
          <Typography variant="subtitle2" color="primary">
            AI Analysis (1H):
          </Typography>
          <Typography variant="body2">
            Trend: {analysis['1h'].trend} | Entry: {analysis['1h'].entry_price} | 
            Target: {analysis['1h'].target_price} | Stop: {analysis['1h'].stop_loss}
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default TradingChart;
