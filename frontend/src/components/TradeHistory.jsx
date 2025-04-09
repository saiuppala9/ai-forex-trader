import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  LinearProgress
} from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import AiAnalysisService from '../services/aiAnalysisService';

const TradeHistory = () => {
  const [loading, setLoading] = useState(true);
  const [trades, setTrades] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // In a real implementation, this would fetch from API
        // For now, use mock data or fetch from the backend
        const metricsData = await AiAnalysisService.getPerformanceMetrics();
        setMetrics(metricsData);
        
        // Mock data for trades (would come from API in real implementation)
        const mockTrades = [
          {
            id: 'trade-001',
            symbol: 'EUR/USD',
            action: 'BUY',
            entry_price: 1.08243,
            exit_price: 1.08562,
            profit_loss: 319,
            profit_loss_pct: 0.29,
            status: 'CLOSED',
            timestamp: '2025-04-09T08:32:41',
            confidence: 0.78,
            ai_recommended: true
          },
          {
            id: 'trade-002',
            symbol: 'GBP/USD',
            action: 'SELL',
            entry_price: 1.26547,
            exit_price: 1.26102,
            profit_loss: 445,
            profit_loss_pct: 0.35,
            status: 'CLOSED',
            timestamp: '2025-04-08T15:47:22',
            confidence: 0.65,
            ai_recommended: true
          },
          {
            id: 'trade-003',
            symbol: 'XAUUSD',
            action: 'BUY',
            entry_price: 2321.45,
            exit_price: 2318.20,
            profit_loss: -325,
            profit_loss_pct: -0.14,
            status: 'CLOSED',
            timestamp: '2025-04-08T11:05:33',
            confidence: 0.52,
            ai_recommended: true
          },
          {
            id: 'trade-004',
            symbol: 'EUR/USD',
            action: 'BUY',
            entry_price: 1.08120,
            exit_price: null,
            profit_loss: null,
            profit_loss_pct: null,
            status: 'OPEN',
            timestamp: '2025-04-09T14:22:15',
            confidence: 0.81,
            ai_recommended: true
          }
        ];
        
        setTrades(mockTrades);
      } catch (err) {
        setError('Failed to load trade history and performance metrics');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Refresh data every 5 minutes
    const intervalId = setInterval(fetchData, 300000);
    
    return () => clearInterval(intervalId);
  }, []);

  // Render performance metrics cards
  const renderMetricsCards = () => {
    if (!metrics) return null;
    
    return (
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Win Rate
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'flex-end' }}>
                <Typography variant="h5" component="div" fontWeight="medium">
                  {metrics.win_rate}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={metrics.win_rate} 
                sx={{ 
                  mt: 1,
                  height: 4, 
                  borderRadius: 2,
                  bgcolor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: metrics.win_rate >= 60 ? 'success.main' : 'warning.main'
                  }
                }} 
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Average Return
              </Typography>
              <Typography 
                variant="h5" 
                component="div"
                color={metrics.avg_return >= 0 ? 'success.main' : 'error.main'}
                fontWeight="medium"
              >
                {metrics.avg_return > 0 ? '+' : ''}{metrics.avg_return.toFixed(2)}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Total Trades
              </Typography>
              <Typography variant="h5" component="div" fontWeight="medium">
                {metrics.total_trades}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={6} md={3}>
          <Card sx={{ bgcolor: 'background.paper', height: '100%' }}>
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Profitable Trades
              </Typography>
              <Typography variant="h5" component="div" fontWeight="medium">
                {metrics.profitable_trades}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                of {metrics.total_trades} trades
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Paper 
        elevation={3} 
        sx={{ 
          p: 3, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          gap: 2,
          height: '100%'
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Loading trade history...
        </Typography>
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper elevation={3} sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Typography variant="h6" component="h2" sx={{ mb: 3 }}>
        AI Trading Performance
      </Typography>
      
      {renderMetricsCards()}
      
      <Typography variant="subtitle1" sx={{ mb: 2 }}>
        Recent Trades
      </Typography>
      
      <TableContainer component={Paper} sx={{ bgcolor: 'background.paper' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Symbol</TableCell>
              <TableCell>Action</TableCell>
              <TableCell align="right">Entry</TableCell>
              <TableCell align="right">Exit</TableCell>
              <TableCell align="right">P/L</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">AI Conf</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {trades.map((trade) => (
              <TableRow key={trade.id}>
                <TableCell>
                  {new Date(trade.timestamp).toLocaleDateString()}
                </TableCell>
                <TableCell>{trade.symbol}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={trade.action}
                    icon={trade.action === 'BUY' ? <ArrowUpwardIcon /> : <ArrowDownwardIcon />}
                    color={trade.action === 'BUY' ? 'success' : 'error'}
                    variant="outlined"
                    sx={{ minWidth: 70 }}
                  />
                </TableCell>
                <TableCell align="right">{trade.entry_price.toFixed(5)}</TableCell>
                <TableCell align="right">
                  {trade.exit_price ? trade.exit_price.toFixed(5) : '—'}
                </TableCell>
                <TableCell 
                  align="right"
                  sx={{ 
                    color: 
                      trade.profit_loss > 0 
                        ? 'success.main' 
                        : trade.profit_loss < 0 
                          ? 'error.main' 
                          : 'text.primary',
                    fontWeight: 'medium'
                  }}
                >
                  {trade.profit_loss 
                    ? `${trade.profit_loss > 0 ? '+' : ''}${trade.profit_loss_pct.toFixed(2)}%` 
                    : '—'}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    label={trade.status}
                    color={trade.status === 'OPEN' ? 'primary' : 'default'}
                    variant="outlined"
                    sx={{ minWidth: 70 }}
                  />
                </TableCell>
                <TableCell align="center">
                  <Box 
                    sx={{ 
                      width: 35, 
                      height: 35, 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      bgcolor: 
                        trade.confidence > 0.7 
                          ? 'rgba(76, 175, 80, 0.1)' 
                          : trade.confidence > 0.5 
                            ? 'rgba(255, 167, 38, 0.1)'
                            : 'rgba(255, 255, 255, 0.1)',
                      color:
                        trade.confidence > 0.7 
                          ? 'success.main' 
                          : trade.confidence > 0.5 
                            ? 'warning.main'
                            : 'text.primary',
                      mx: 'auto'
                    }}
                  >
                    {Math.round(trade.confidence * 100)}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
            
            {trades.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    No trade history available
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default TradeHistory;
