import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  ExpandMore
} from '@mui/icons-material';
import AIAnalysisService from '../services/aiAnalysisService';

const timeframes = ['1m', '5m', '15m', '1h', '4h', '1d'];

const AIAnalysisPanel = ({ symbol }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('consensus');
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [signalHistory, setSignalHistory] = useState([]);

  useEffect(() => {
    if (symbol) {
      fetchAnalysis();
    }
  }, [symbol]);

  const fetchAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await AIAnalysisService.getMultiTimeframeAnalysis(symbol, timeframes);
      setAnalysisData(data);
      
      const metrics = await AIAnalysisService.getPerformanceMetrics(symbol);
      setPerformanceMetrics(metrics);
      
      const history = await AIAnalysisService.getSignalHistory(symbol);
      setSignalHistory(history);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTimeframeChange = (timeframe) => {
    setSelectedTimeframe(timeframe);
  };

  const renderTimeframeTabs = () => {
    return (
      <Tabs
        value={selectedTimeframe}
        onChange={(e, value) => handleTimeframeChange(value)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 3 }}
      >
        {timeframes.map((tf) => (
          <Tab
            key={tf}
            label={tf.toUpperCase()}
            value={tf}
          />
        ))}
        <Tab label="CONSENSUS" value="consensus" />
      </Tabs>
    );
  };

  const renderPerformanceMetrics = () => {
    const metrics = performanceMetrics || {};
    if (!metrics || !Object.keys(metrics).length) {
      return (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
          <Alert severity="info">
            No performance metrics available yet.
          </Alert>
        </Box>
      );
    }

    return (
      <Paper elevation={3} sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {(metrics.winRate || 0).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Win Rate
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" sx={{ 
                color: (metrics.avgProfit || 0) > 0 ? 'success.main' : 'error.main' 
              }}>
                {(metrics.avgProfit || 0).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Profit
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {(metrics.accuracy || 0).toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Accuracy
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">
                {metrics.totalTrades || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Trades
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const renderSignalHistory = () => {
    const history = signalHistory || [];
    if (!history.length) {
      return (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" gutterBottom>Signal History</Typography>
          <Alert severity="info">
            No signal history available yet.
          </Alert>
        </Box>
      );
    }

    return (
      <Paper elevation={3} sx={{ p: 2, mt: 3 }}>
        <Typography variant="h6" gutterBottom>Signal History</Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Time</TableCell>
                <TableCell>Signal</TableCell>
                <TableCell>Confidence</TableCell>
                <TableCell>Entry</TableCell>
                <TableCell>Stop Loss</TableCell>
                <TableCell>Take Profit</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((signal, index) => (
                <TableRow key={index}>
                  <TableCell>{new Date(signal.timestamp).toLocaleTimeString()}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {signal.signal === 'buy' ? (
                        <TrendingUp color="success" />
                      ) : (
                        <TrendingDown color="error" />
                      )}
                      <Typography
                        color={signal.signal === 'buy' ? 'success.main' : 'error.main'}
                        sx={{ fontWeight: 'bold' }}
                      >
                        {signal.signal.toUpperCase()}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>{signal.confidence || 0}%</TableCell>
                  <TableCell>{signal.entryPrice ? parseFloat(signal.entryPrice).toFixed(4) : '-'}</TableCell>
                  <TableCell>{signal.stopLoss ? parseFloat(signal.stopLoss).toFixed(4) : '-'}</TableCell>
                  <TableCell>{signal.takeProfit ? parseFloat(signal.takeProfit).toFixed(4) : '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  const renderAnalysis = () => {
    if (!analysisData) {
      return (
        <Alert severity="info">
          No analysis data available for {symbol}.
        </Alert>
      );
    }
    
    const analysis = selectedTimeframe === 'consensus' ? 
      analysisData.consensus : 
      analysisData.timeframes[selectedTimeframe];
    
    if (!analysis) {
      return (
        <Alert severity="warning">
          Analysis not available for {selectedTimeframe} timeframe.
        </Alert>
      );
    }
    
    return (
      <Box>
        {/* Signal and Confidence */}
        <Paper elevation={3} sx={{ p: 2, mb: 2, background: analysis.signal === 'buy' ? 'success.dark' : 'error.dark', color: 'white' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {analysis.signal === 'buy' ? (
                  <TrendingUp sx={{ fontSize: 40 }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 40 }} />
                )}
                <Box>
                  <Typography variant="h4" component="span" sx={{ fontWeight: 'bold', mr: 2 }}>
                    {analysis.signal?.toUpperCase()}
                  </Typography>
                  <Chip 
                    label={`${analysis.confidence}% Confidence`}
                    color="primary"
                    size="medium"
                  />
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} sx={{ textAlign: { sm: 'right' } }}>
              <Typography variant="body1">
                Signal Generated: {new Date(analysis.timestamp).toLocaleTimeString()}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Price Levels */}
        <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>Trade Setup</Typography>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                <Typography variant="subtitle2" color="text.secondary">Entry Price</Typography>
                <Typography variant="h4">{analysis.entryPrice?.toFixed(4)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'error.dark', color: 'white' }}>
                <Typography variant="subtitle2">Stop Loss</Typography>
                <Typography variant="h4">{analysis.stopLoss?.toFixed(4)}</Typography>
                <Typography variant="body2">
                  Risk: {((Math.abs(analysis.stopLoss - analysis.entryPrice) / analysis.entryPrice) * 100).toFixed(2)}%
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'success.dark', color: 'white' }}>
                <Typography variant="subtitle2">Take Profit</Typography>
                <Typography variant="h4">{analysis.exitPrice?.toFixed(4)}</Typography>
                <Typography variant="body2">
                  Target: {((Math.abs(analysis.exitPrice - analysis.entryPrice) / analysis.entryPrice) * 100).toFixed(2)}%
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Technical Indicators */}
        {analysis.indicators && analysis.indicators.length > 0 && (
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Technical Analysis</Typography>
            <Grid container spacing={2}>
              {analysis.indicators.map((indicator, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Paper 
                    elevation={0} 
                    sx={{ 
                      p: 2,
                      bgcolor: indicator.signal === 'buy' ? 'success.dark' : 'error.dark',
                      color: 'white',
                      height: '100%'
                    }}
                  >
                    <Typography variant="h6">{indicator.name}</Typography>
                    <Typography variant="body1" sx={{ mt: 1, fontWeight: 'bold' }}>
                      {indicator.value}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
        
        {/* Chart Patterns */}
        {analysis.patterns && analysis.patterns.length > 0 && (
          <Paper elevation={3} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Pattern Recognition</Typography>
            <Grid container spacing={2}>
              {analysis.patterns.map((pattern, index) => (
                <Grid item xs={12} key={index}>
                  <Accordion 
                    elevation={0}
                    defaultExpanded
                    sx={{
                      bgcolor: 'background.default',
                      '&:before': { display: 'none' }
                    }}
                  >
                    <AccordionSummary 
                      expandIcon={<ExpandMore />}
                      sx={{
                        bgcolor: pattern.signal === 'buy' ? 'success.dark' : 'error.dark',
                        color: 'white',
                        '& .MuiAccordionSummary-expandIconWrapper': {
                          color: 'white'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
                        <Typography variant="h6">{pattern.name}</Typography>
                        <Chip 
                          label={`${pattern.confidence}% Confidence`}
                          color="primary"
                          size="small"
                          sx={{ ml: 'auto' }}
                        />
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body1" sx={{ mt: 1 }}>
                        {pattern.description}
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}
        
        {/* Analysis Summary */}
        <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>AI Analysis Summary</Typography>
          <Typography variant="body1">{analysis.summary}</Typography>
        </Paper>
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading AI analysis...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          {symbol} AI Analysis
        </Typography>
      </Box>
      
      {renderTimeframeTabs()}
      {renderPerformanceMetrics()}
      {renderAnalysis()}
      {renderSignalHistory()}
    </Box>
  );



};

export default AIAnalysisPanel;
