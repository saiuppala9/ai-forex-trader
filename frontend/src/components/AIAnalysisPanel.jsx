import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Divider, 
  Button, 
  Chip, 
  Grid, 
  CircularProgress,
  Alert,
  LinearProgress,
  Stack
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingFlatIcon from '@mui/icons-material/TrendingFlat';
import AiAnalysisService from '../services/aiAnalysisService';

const AIAnalysisPanel = ({ symbol, onExecuteTrade }) => {
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [tradeExecuting, setTradeExecuting] = useState(false);
  const [tradeResult, setTradeResult] = useState(null);

  // Fetch AI analysis when symbol changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchAnalysis = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const data = await AiAnalysisService.getAnalysis(symbol);
        if (isMounted) {
          setAnalysis(data);
        }
      } catch (err) {
        if (isMounted) {
          setError('Failed to fetch AI analysis. Please try again.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    fetchAnalysis();
    
    // Refresh analysis every 60 seconds
    const intervalId = setInterval(fetchAnalysis, 60000);
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [symbol]);

  // Handle trade execution
  const handleExecuteTrade = async (action) => {
    setTradeExecuting(true);
    setTradeResult(null);
    
    try {
      const tradeData = {
        symbol,
        action, // 'BUY' or 'SELL'
        entry_price: analysis.entry_price,
        stop_loss: analysis.stop_loss,
        target_price: analysis.target_price,
        confidence: analysis.confidence,
        risk_reward_ratio: analysis.risk_reward_ratio
      };
      
      const result = await AiAnalysisService.executeTrade(tradeData);
      setTradeResult({
        success: true,
        message: `${action} order placed successfully at ${result.executed_price}`,
        data: result
      });
      
      // Notify parent component
      if (onExecuteTrade) {
        onExecuteTrade(result);
      }
    } catch (err) {
      setTradeResult({
        success: false,
        message: `Failed to execute ${action} order: ${err.message}`
      });
    } finally {
      setTradeExecuting(false);
    }
  };

  // Render confidence meter
  const renderConfidenceMeter = (confidence) => {
    let color = '#FFB347'; // orange for medium confidence
    
    if (confidence >= 0.7) {
      color = '#4CAF50'; // green for high confidence
    } else if (confidence < 0.4) {
      color = '#F44336'; // red for low confidence
    }
    
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, mb: 2 }}>
        <Typography variant="body2" sx={{ mr: 1, minWidth: '100px' }}>
          Confidence:
        </Typography>
        <Box sx={{ width: '100%', mr: 1 }}>
          <LinearProgress 
            variant="determinate" 
            value={confidence * 100} 
            sx={{ 
              height: 8, 
              borderRadius: 5,
              bgcolor: 'rgba(255,255,255,0.1)',
              '& .MuiLinearProgress-bar': {
                bgcolor: color
              }
            }} 
          />
        </Box>
        <Typography variant="body2" sx={{ minWidth: '40px' }}>
          {Math.round(confidence * 100)}%
        </Typography>
      </Box>
    );
  };

  // Render pattern chips
  const renderPatterns = (patterns) => {
    if (!patterns || patterns.length === 0) {
      return <Typography variant="body2" color="text.secondary">No patterns detected</Typography>;
    }
    
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {patterns.map((pattern, index) => (
          <Chip 
            key={index} 
            label={pattern.replace('_', ' ')} 
            size="small" 
            sx={{ 
              textTransform: 'capitalize',
              bgcolor: 'rgba(255,255,255,0.05)'
            }} 
          />
        ))}
      </Box>
    );
  };

  // Determine which action to recommend based on the analysis
  const getRecommendedAction = () => {
    if (!analysis) return null;
    
    if (analysis.trend === 'BULLISH' && analysis.confidence >= 0.5) {
      return 'BUY';
    } else if (analysis.trend === 'BEARISH' && analysis.confidence >= 0.5) {
      return 'SELL';
    }
    return null;
  };

  if (loading) {
    return (
      <Paper 
        elevation={3} 
        sx={{ 
          p: 2, 
          height: '100%', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Analyzing {symbol} with AI...
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={3} sx={{ p: 2, height: '100%' }}>
        <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
        <Button 
          variant="outlined" 
          onClick={() => window.location.reload()}
          fullWidth
        >
          Retry
        </Button>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 2, height: '100%', overflow: 'auto' }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="h2">
          AI Analysis
        </Typography>
        <Chip 
          icon={
            analysis.trend === 'BULLISH' 
              ? <TrendingUpIcon /> 
              : analysis.trend === 'BEARISH' 
                ? <TrendingDownIcon /> 
                : <TrendingFlatIcon />
          }
          label={analysis.trend} 
          color={
            analysis.trend === 'BULLISH' 
              ? 'success' 
              : analysis.trend === 'BEARISH' 
                ? 'error' 
                : 'default'
          }
          variant="filled"
          size="small"
        />
      </Box>

      {renderConfidenceMeter(analysis.confidence)}

      <Divider sx={{ my: 1.5 }} />
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">Support</Typography>
          <Typography variant="body1" fontWeight="medium">{analysis.support.toFixed(5)}</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="body2" color="text.secondary">Resistance</Typography>
          <Typography variant="body1" fontWeight="medium">{analysis.resistance.toFixed(5)}</Typography>
        </Grid>
      </Grid>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Detected patterns
        </Typography>
        {renderPatterns(analysis.patterns)}
      </Box>

      <Divider sx={{ my: 1.5 }} />
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>Trade Recommendation</Typography>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary">Entry</Typography>
            <Typography variant="body1" fontWeight="medium">{analysis.entry_price.toFixed(5)}</Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary">Target</Typography>
            <Typography 
              variant="body1" 
              fontWeight="medium" 
              color={analysis.trend === 'BULLISH' ? 'success.main' : 'error.main'}
            >
              {analysis.target_price.toFixed(5)}
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="body2" color="text.secondary">Stop Loss</Typography>
            <Typography 
              variant="body1" 
              fontWeight="medium" 
              color="error.main"
            >
              {analysis.stop_loss.toFixed(5)}
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Market Sentiment
        </Typography>
        <Chip 
          size="small"
          label={
            analysis.sentiment > 0.2 
              ? 'Bullish' 
              : analysis.sentiment < -0.2 
                ? 'Bearish' 
                : 'Neutral'
          }
          sx={{ 
            bgcolor: 
              analysis.sentiment > 0.2 
                ? 'rgba(76, 175, 80, 0.1)' 
                : analysis.sentiment < -0.2 
                  ? 'rgba(244, 67, 54, 0.1)' 
                  : 'rgba(255, 255, 255, 0.1)',
            color: 
              analysis.sentiment > 0.2 
                ? 'success.main' 
                : analysis.sentiment < -0.2 
                  ? 'error.main' 
                  : 'text.primary'
          }} 
        />
      </Box>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Technical Indicators
        </Typography>
        <Grid container spacing={1}>
          <Grid item xs={6}>
            <Typography variant="caption" display="block" color="text.secondary">
              RSI
            </Typography>
            <Typography variant="body2">
              {analysis.indicators.RSI.toFixed(2)}
              <Box component="span" sx={{ 
                ml: 0.5,
                color: 
                  analysis.indicators.RSI > 70 
                    ? 'error.main' 
                    : analysis.indicators.RSI < 30 
                      ? 'success.main' 
                      : 'text.secondary',
                fontSize: '0.75rem'
              }}>
                {analysis.indicators.RSI > 70 
                  ? '(Overbought)' 
                  : analysis.indicators.RSI < 30 
                    ? '(Oversold)' 
                    : ''}
              </Box>
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" display="block" color="text.secondary">
              BB Position
            </Typography>
            <Typography variant="body2">
              {analysis.indicators.BB_Position.toFixed(2)}
              <Box component="span" sx={{ 
                ml: 0.5,
                color: 
                  analysis.indicators.BB_Position > 0.8 
                    ? 'error.main' 
                    : analysis.indicators.BB_Position < 0.2 
                      ? 'success.main' 
                      : 'text.secondary',
                fontSize: '0.75rem'
              }}>
                {analysis.indicators.BB_Position > 0.8 
                  ? '(Upper)' 
                  : analysis.indicators.BB_Position < 0.2 
                    ? '(Lower)' 
                    : '(Middle)'}
              </Box>
            </Typography>
          </Grid>
        </Grid>
      </Box>

      <Divider sx={{ my: 1.5 }} />
      
      {/* Trade execution buttons */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button 
          variant="contained" 
          color="success"
          fullWidth
          startIcon={<ArrowUpwardIcon />}
          disabled={tradeExecuting || analysis.trend !== 'BULLISH' || analysis.confidence < 0.5}
          onClick={() => handleExecuteTrade('BUY')}
        >
          Buy
        </Button>
        <Button 
          variant="contained" 
          color="error"
          fullWidth
          startIcon={<ArrowDownwardIcon />}
          disabled={tradeExecuting || analysis.trend !== 'BEARISH' || analysis.confidence < 0.5}
          onClick={() => handleExecuteTrade('SELL')}
        >
          Sell
        </Button>
      </Box>
      
      {/* Trade result notification */}
      {tradeExecuting && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Executing trade...</Typography>
        </Box>
      )}
      
      {tradeResult && (
        <Alert 
          severity={tradeResult.success ? 'success' : 'error'} 
          sx={{ mt: 2 }}
        >
          {tradeResult.message}
        </Alert>
      )}

      {/* Risk-reward ratio */}
      {analysis.risk_reward_ratio > 0 && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
          <Typography variant="caption" color="text.secondary">
            Risk/Reward: 
            <Box 
              component="span" 
              sx={{ 
                ml: 0.5, 
                color: analysis.risk_reward_ratio >= 1.5 ? 'success.main' : 'text.primary',
                fontWeight: 'medium'
              }}
            >
              1:{analysis.risk_reward_ratio.toFixed(2)}
            </Box>
          </Typography>
        </Box>
      )}
    </Paper>
  );
};

export default AIAnalysisPanel;
