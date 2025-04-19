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
  AccordionDetails,
  Button,
  Divider,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import MarketContainer from './MarketContainer';
import {
  TrendingUp,
  TrendingDown,
  ExpandMore,
  AutoGraph,
  Article,
  Timeline,
  Speed
} from '@mui/icons-material';
import AIAnalysisService from '../services/aiAnalysisService';

const timeframes = ['5m', '15m', '1h', '4h', '1d'];  // Complete range of trading timeframes

// Styled Components for Market Theme
const MarketTab = styled(Tab)(({ theme, marketDirection }) => ({
  color: 
    marketDirection === 'bull' ? theme.palette.text.bull : 
    marketDirection === 'bear' ? theme.palette.text.bear : 
    theme.palette.text.primary,
  '&.Mui-selected': {
    color: 
      marketDirection === 'bull' ? theme.palette.bull.main : 
      marketDirection === 'bear' ? theme.palette.bear.main : 
      theme.palette.primary.main,
    fontWeight: 'bold',
  },
}));

const TrendChip = styled(Chip)(({ theme, trend }) => ({
  backgroundColor: 
    trend === 'Bullish' ? theme.palette.bull.main : 
    trend === 'Bearish' ? theme.palette.bear.main : 
    theme.palette.neutral.main,
  color: '#fff',
  fontWeight: 'bold',
  '& .MuiChip-icon': {
    color: '#fff',
  },
}));

const StyledTableCell = styled(TableCell)(({ theme, isBull, isBear }) => ({
  color: 
    isBull ? theme.palette.bull.main : 
    isBear ? theme.palette.bear.main : 
    theme.palette.text.primary,
  fontWeight: isBull || isBear ? 'bold' : 'regular',
}));

const SignalListItem = styled(ListItem)(({ theme, signal }) => ({
  borderLeft: `4px solid ${signal === 'buy' 
    ? theme.palette.bull.main 
    : signal === 'sell' 
      ? theme.palette.bear.main 
      : theme.palette.divider}`,
  backgroundColor: signal === 'buy' 
    ? theme.palette.background.bullPanel
    : signal === 'sell' 
      ? theme.palette.background.bearPanel
      : 'transparent',
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(1),
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateX(4px)',
    boxShadow: theme.shadows[2],
  }
}));

const AIAnalysisPanel = ({ symbol }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('consensus');
  const [performanceMetrics, setPerformanceMetrics] = useState(null);
  const [signalHistory, setSignalHistory] = useState([]);
  const [marketDirection, setMarketDirection] = useState('neutral');
  
  // Determine market direction based on analysis data
  useEffect(() => {
    if (analysisData?.consensus) {
      const { trend } = analysisData.consensus;
      if (trend === 'Bullish') {
        setMarketDirection('bull');
      } else if (trend === 'Bearish') {
        setMarketDirection('bear');
      } else {
        setMarketDirection('neutral');
      }
    }
  }, [analysisData]);

  useEffect(() => {
    if (symbol) {
      // Initial fetch, don't force refresh to avoid duplicate calls
      fetchAnalysis(false);
    }
  }, [symbol, selectedTimeframe]); // Re-fetch when timeframe changes

  const fetchAnalysis = async (forceRefresh = true) => {
    try {
      setLoading(true);
      setError(null);
      
      // Clear previous data if forcing refresh
      if (forceRefresh) {
        console.log('Forcing refresh of analysis data');
        setAnalysisData({});
      }
      
      // Fetch analysis for the selected timeframe with current timestamp
      const singleAnalysis = await AIAnalysisService.getAnalysis(
        symbol, 
        selectedTimeframe === 'consensus' ? '1h' : selectedTimeframe
      );
      console.log('Fetched fresh analysis:', singleAnalysis); // Debug log
      
      // Create new analysis data object (don't use previous cached data)
      const updatedAnalysisData = {};
      
      if (selectedTimeframe === 'consensus') {
        // If consensus is selected, fetch data for all timeframes with fresh data
        const allPromises = timeframes.map(tf => AIAnalysisService.getAnalysis(symbol, tf));
        const allResults = await Promise.all(allPromises);
        
        timeframes.forEach((tf, index) => {
          updatedAnalysisData[tf] = allResults[index];
        });
        
        // Calculate consensus from fresh data
        updatedAnalysisData['consensus'] = calculateConsensus(allResults);
      } else {
        // Just update the specific timeframe with fresh data
        updatedAnalysisData[selectedTimeframe] = singleAnalysis;
      }
      
      console.log('Setting fresh analysis data:', updatedAnalysisData); // Debug log
      setAnalysisData(updatedAnalysisData);
      
      // Update performance metrics from the fresh data
      if (singleAnalysis && singleAnalysis.performanceMetrics) {
        setPerformanceMetrics(singleAnalysis.performanceMetrics);
      }
      
      // Generate a timestamp for the analysis
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      console.log(`Analysis generated at: ${timeString}`);
      
    } catch (err) {
      console.error('Error in fetchAnalysis:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Calculate consensus from multiple timeframe analyses with improved error handling
  const calculateConsensus = (analyses) => {
    if (!analyses || !Array.isArray(analyses) || analyses.length === 0) {
      // Get current market price from the most recent data
      const currentPrice = analyses[0].tradeSetup.currentPrice || analyses[0].entryPrice;
      
      // Ensure entry price is realistic (near current price)
      let adjustedEntryPrice = analyses[0].entryPrice;
      if (Math.abs(adjustedEntryPrice - currentPrice) / currentPrice > 0.01) {
        // If entry is more than 1% away from current price, adjust it
        adjustedEntryPrice = analyses[0].signal.toLowerCase().includes('buy') ? 
          currentPrice * 0.9998 : // Slightly below for buy
          currentPrice * 1.0002; // Slightly above for sell
      }
      
      // Ensure stop loss and take profit are correctly placed based on entry
      let adjustedStopLoss = analyses[0].stopLoss;
      let adjustedTakeProfit = analyses[0].takeProfit;
      
      if (analyses[0].signal.toLowerCase().includes('buy')) {
        // For BUY: stop loss must be below entry
        if (adjustedStopLoss >= adjustedEntryPrice) {
          adjustedStopLoss = adjustedEntryPrice * 0.998; // 0.2% below entry
        }
        // Take profit must be above entry
        if (adjustedTakeProfit <= adjustedEntryPrice) {
          adjustedTakeProfit = adjustedEntryPrice * 1.003; // 0.3% above entry
        }
      } else if (analyses[0].signal.toLowerCase().includes('sell')) {
        // For SELL: stop loss must be above entry
        if (adjustedStopLoss <= adjustedEntryPrice) {
          adjustedStopLoss = adjustedEntryPrice * 1.002; // 0.2% above entry
        }
        // Take profit must be below entry
        if (adjustedTakeProfit >= adjustedEntryPrice) {
          adjustedTakeProfit = adjustedEntryPrice * 0.997; // 0.3% below entry
        }
      }
      
      // Calculate the absolute pip distance for stop loss and take profit
      const stopLossPips = Math.abs(adjustedEntryPrice - adjustedStopLoss) * 10000; // Convert to pips for forex
      const takeProfitPips = adjustedTakeProfit ? Math.abs(adjustedEntryPrice - adjustedTakeProfit) * 10000 : 0;
      
      // Calculate risk-reward ratio
      const riskRewardRatio = takeProfitPips && stopLossPips ? (takeProfitPips / stopLossPips).toFixed(1) : '-';
      
      // Calculate risk percentage based on a hypothetical position size
      const riskPercentage = stopLossPips ? (stopLossPips / adjustedEntryPrice * 100).toFixed(2) : '0.00';
      
      // Convert to appropriate format for frontend
      const formattedTradeSetup = {
        entryPrice: adjustedEntryPrice.toFixed(5),
        stopLoss: adjustedStopLoss.toFixed(5),
        takeProfit: adjustedTakeProfit ? adjustedTakeProfit.toFixed(5) : '-',
        riskRewardRatio,
        riskPercentage,
        entryReason: analyses[0].entryReason
      };
      
      // Return a default analysis if we don't have valid data
      console.warn('No valid analyses to calculate consensus from');
      return {
        signal: 'neutral',
        confidence: 50,
        analysis: 'Insufficient data to generate consensus analysis. Try refreshing or selecting a specific timeframe.',
        timestamp: new Date().toISOString(),
        timeframe: 'consensus',
        tradeSetup: formattedTradeSetup
      };
    }
    
    // Filter out any potentially undefined or null analyses
    const validAnalyses = analyses.filter(a => a && typeof a === 'object');
    
    if (validAnalyses.length === 0) {
      console.warn('No valid analyses after filtering');
      return {
        signal: 'neutral',
        confidence: 50,
        analysis: 'Insufficient data to generate consensus analysis. Try refreshing or selecting a specific timeframe.',
        timestamp: new Date().toISOString(),
        timeframe: 'consensus'
      };
    }
    
    // Count bullish vs bearish signals
    let bullishCount = 0;
    let bearishCount = 0;
    
    validAnalyses.forEach(analysis => {
      if (analysis.signal === 'buy') bullishCount++;
      else if (analysis.signal === 'sell') bearishCount++;
    });
    
    // Determine the overall sentiment
    const sentiment = bullishCount > bearishCount ? 'bullish' : 
                      bearishCount > bullishCount ? 'bearish' : 'neutral';
    
    // Find the strongest analysis matching the consensus
    const matchingAnalyses = validAnalyses.filter(a => 
      (sentiment === 'bullish' && a.signal === 'buy') || 
      (sentiment === 'bearish' && a.signal === 'sell')
    );
    
    // Use the analysis with highest confidence, or the first one if tied
    let primaryAnalysis;
    if (matchingAnalyses.length > 0) {
      primaryAnalysis = matchingAnalyses.reduce((prev, curr) => 
        (curr.confidence > prev.confidence) ? curr : prev, matchingAnalyses[0]);
    } else {
      primaryAnalysis = validAnalyses[0];
    }
    
    // Build a safe consensus view with defaults for missing properties
    return {
      ...primaryAnalysis,
      signal: sentiment === 'bullish' ? 'buy' : sentiment === 'bearish' ? 'sell' : 'neutral',
      confidence: primaryAnalysis.confidence || 50,
      analysis: `Consensus analysis across multiple timeframes indicates a ${sentiment} outlook with ${primaryAnalysis.confidence || 50}% confidence.`,
      timeframe: 'consensus',
      timestamp: primaryAnalysis.timestamp || new Date().toISOString()
    };
  };

  const handleTimeframeChange = (timeframe) => {
    setSelectedTimeframe(timeframe);
  };

  const renderTimeframeTabs = () => {
    return (
      <MarketContainer marketDirection={marketDirection}>
        <Typography variant="subtitle1" gutterBottom fontWeight="bold">
          Select Timeframe:
        </Typography>
        <Tabs
          value={selectedTimeframe}
          onChange={(e, newValue) => setSelectedTimeframe(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mb: 2, 
            borderBottom: 1, 
            borderColor: marketDirection === 'bull' 
              ? theme.palette.bull.main 
              : marketDirection === 'bear' 
                ? theme.palette.bear.main 
                : 'divider',
            '& .MuiTabs-indicator': {
              backgroundColor: marketDirection === 'bull' 
                ? theme.palette.bull.main 
                : marketDirection === 'bear' 
                  ? theme.palette.bear.main 
                  : theme.palette.primary.main,
              height: 3,
            }
          }}
        >
          <MarketTab 
            label="Consensus" 
            value="consensus" 
            marketDirection={marketDirection} 
            icon={<AutoGraph sx={{ fontSize: 20 }} />}
            iconPosition="start"
          />
          {/* Always render the timeframe tabs */}
          {timeframes.map((tf) => (
            <MarketTab 
              key={tf} 
              label={tf.toUpperCase()} 
              value={tf} 
              marketDirection={marketDirection}
              icon={<Timeline sx={{ fontSize: 18 }} />}
              iconPosition="start"
            />
          ))}
        </Tabs>
        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={() => fetchAnalysis(true)}
          startIcon={<AutoGraph />}
          disabled={loading}
          sx={{ py: 1.5 }}
        >
          Get AI-Powered Trade Setup
        </Button>
      </MarketContainer>
    );
  };

  const renderPerformanceMetrics = () => {
    const metrics = performanceMetrics || {};
    return (
      <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>Performance Metrics</Typography>
        <Grid container spacing={3}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">
                {metrics.winRate ? `${metrics.winRate.toFixed(1)}%` : '0.0%'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Win Rate
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">
                {metrics.avgProfit ? `${metrics.avgProfit.toFixed(1)}R` : '0.0R'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Avg Profit
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4">
                {metrics.accuracy ? `${metrics.accuracy.toFixed(1)}%` : '0.0%'}
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
    if (!analysisData || Object.keys(analysisData).length === 0) {
      return (
        <Alert severity="info">
          Click the AI-Powered Trade Setup button to analyze {symbol}.
        </Alert>
      );
    }
    
    // The analysis data is stored directly in analysisData with timeframe keys
    const analysis = analysisData[selectedTimeframe];
    
    if (!analysis) {
      return (
        <Alert severity="warning">
          Analysis not available for {selectedTimeframe} timeframe. Try clicking the refresh button.
        </Alert>
      );
    }
    
    return (
      <MarketContainer marketDirection={marketDirection}>
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
          
          {/* Trade Setup */}
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Timeline /> Trade Setup
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" color="text.secondary">Entry Price</Typography>
                  <Typography variant="h4">{analysis.entryPrice ? analysis.entryPrice.toFixed(4) : '-'}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {analysis.entryReason || 'Based on technical pattern'}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'error.dark', color: 'white' }}>
                  <Typography variant="subtitle2">Stop Loss</Typography>
                  <Typography variant="h4">{analysis.stopLoss ? analysis.stopLoss.toFixed(4) : '-'}</Typography>
                  <Typography variant="body2">
                    {analysis.stopLoss && analysis.entryPrice ? 
                      `Risk: ${((Math.abs(analysis.stopLoss - analysis.entryPrice) / analysis.entryPrice) * 100).toFixed(2)}%` : 
                      'Risk: -'}
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2, textAlign: 'center', bgcolor: 'success.dark', color: 'white' }}>
                  <Typography variant="subtitle2">Take Profit</Typography>
                  <Typography variant="h4">{analysis.exitPrice ? analysis.exitPrice.toFixed(4) : '-'}</Typography>
                  <Typography variant="body2">
                    {analysis.exitPrice && analysis.entryPrice ? 
                      `Target: ${((Math.abs(analysis.exitPrice - analysis.entryPrice) / analysis.entryPrice) * 100).toFixed(2)}%` : 
                      'Target: -'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Market Analysis */}
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AutoGraph /> Market Analysis
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Speed /> Volatility Assessment
                  </Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>{analysis.volatilityAssessment}</Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={6}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" color="text.secondary">Expected Duration</Typography>
                  <Typography variant="body1" sx={{ mt: 1 }}>{analysis.expectedDuration}</Typography>
                </Paper>
              </Grid>
            </Grid>
          </Paper>
          
          {/* News Impact */}
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Article /> News Impact
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>{analysis.newsImpact}</Typography>
            <Divider sx={{ mb: 2 }} />
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>Latest News</Typography>
            <List dense>
              {analysis.news?.slice(0, 3).map((item, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Article color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.title}
                    secondary={item.date}
                  />
                </ListItem>
              ))}
            </List>
          </Paper>
          
          {/* Technical Indicators */}
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Technical Analysis</Typography>
            <Grid container spacing={2}>
              {analysis.indicators && analysis.indicators.length > 0 ? (
                analysis.indicators.map((indicator, index) => (
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
                        {indicator.value || 'Based on AI analysis'}
                      </Typography>
                    </Paper>
                  </Grid>
                ))
              ) : (
                <Grid item xs={12}>
                  <Alert severity="info">Technical indicator data not available</Alert>
                </Grid>
              )}
            </Grid>
          </Paper>
          
          {/* Chart Patterns */}
          <Paper elevation={3} sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>Support/Resistance</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Support Levels</Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {analysis.supportLevels && analysis.supportLevels.length > 0 ? 
                    analysis.supportLevels.map(level => level.toFixed(4)).join(', ') : 
                    'Calculating...'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">Resistance Levels</Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  {analysis.resistanceLevels && analysis.resistanceLevels.length > 0 ? 
                    analysis.resistanceLevels.map(level => level.toFixed(4)).join(', ') : 
                    'Calculating...'}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
          
          {/* Analysis Summary */}
          <Paper elevation={3} sx={{ p: 2, mt: 2 }}>
            <Typography variant="h6" gutterBottom>AI Analysis Summary</Typography>
            <Typography variant="body1">{analysis.analysis || 'AI analysis in progress...'}</Typography>
          </Paper>
        </Box>
      </MarketContainer>
    );
  };

  if (loading) {
    return (
      <MarketContainer marketDirection={marketDirection} sx={{ p: 2 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress size={40} color={marketDirection === 'bull' ? 'primary' : marketDirection === 'bear' ? 'secondary' : 'inherit'} />
        </Box>
      </MarketContainer>
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
    <MarketContainer marketDirection={marketDirection} sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          {symbol} AI Analysis
        </Typography>
      </Box>
      
      {renderTimeframeTabs()}
      {renderPerformanceMetrics()}
      {renderAnalysis()}
      {renderSignalHistory()}
    </MarketContainer>
  );



};

export default AIAnalysisPanel;
