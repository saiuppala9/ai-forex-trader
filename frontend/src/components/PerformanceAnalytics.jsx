import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  Warning,
  Timeline,
  Assessment,
  ShowChart,
  Lightbulb
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const COLORS = ['#2196f3', '#4caf50', '#f44336', '#ff9800', '#9c27b0', '#795548'];

const TabPanel = ({ children, value, index }) => (
  <div hidden={value !== index} style={{ padding: '24px 0' }}>
    {value === index && children}
  </div>
);

const PerformanceAnalytics = ({ trades }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [patterns, setPatterns] = useState(null);
  const [riskMetrics, setRiskMetrics] = useState(null);
  const [suggestions, setSuggestions] = useState(null);

  useEffect(() => {
    if (trades && trades.length > 0) {
      loadAnalytics();
    }
  }, [trades]);

  const loadAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load trades into analytics engine
      await fetch('/api/analytics/load-trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trades)
      });

      // Fetch all analytics in parallel
      const [
        metricsResponse,
        patternsResponse,
        riskResponse,
        suggestionsResponse
      ] = await Promise.all([
        fetch('/api/analytics/overall-metrics'),
        fetch('/api/analytics/pattern-analysis'),
        fetch('/api/analytics/risk-metrics'),
        fetch('/api/analytics/optimization-suggestions')
      ]);

      const [
        metricsData,
        patternsData,
        riskData,
        suggestionsData
      ] = await Promise.all([
        metricsResponse.json(),
        patternsResponse.json(),
        riskResponse.json(),
        suggestionsResponse.json()
      ]);

      setMetrics(metricsData);
      setPatterns(patternsData);
      setRiskMetrics(riskData);
      setSuggestions(suggestionsData);

    } catch (err) {
      setError('Failed to load analytics');
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!metrics) {
    return (
      <Alert severity="info">
        No trading data available for analysis
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Paper sx={{ width: '100%', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Assessment />} label="Overview" />
          <Tab icon={<Timeline />} label="Patterns" />
          <Tab icon={<ShowChart />} label="Risk Analysis" />
          <Tab icon={<Lightbulb />} label="Suggestions" />
        </Tabs>

        {/* Overview Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            {/* Key Metrics */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2">Total PnL</Typography>
                    <Typography
                      variant="h4"
                      color={metrics.summary.total_pnl >= 0 ? 'success.main' : 'error.main'}
                    >
                      ${metrics.summary.total_pnl.toFixed(2)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2">Win Rate</Typography>
                    <Typography variant="h4">
                      {metrics.summary.win_rate.toFixed(1)}%
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2">Profit Factor</Typography>
                    <Typography variant="h4">
                      {metrics.summary.profit_factor.toFixed(2)}
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle2">Sharpe Ratio</Typography>
                    <Typography variant="h4">
                      {metrics.summary.sharpe_ratio.toFixed(2)}
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </Grid>

            {/* Monthly Performance */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Monthly Performance
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(metrics.time_analysis.monthly).map(([date, data]) => ({
                    month: date.split('T')[0],
                    pnl: data.pnl,
                    trades: data.trades
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="pnl" fill="#2196f3" name="PnL ($)" />
                  <Bar yAxisId="right" dataKey="trades" fill="#4caf50" name="Trades" />
                </BarChart>
              </ResponsiveContainer>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Patterns Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            {/* Hourly Performance */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Hourly Performance
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={Object.entries(patterns.time_patterns.hourly).map(([hour, data]) => ({
                    hour: `${hour}:00`,
                    pnl: data.mean,
                    trades: data.count
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="hour" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="pnl" fill="#2196f3" name="Avg PnL" />
                  <Bar dataKey="trades" fill="#4caf50" name="Trades" />
                </BarChart>
              </ResponsiveContainer>
            </Grid>

            {/* Position Type Analysis */}
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Position Type Analysis
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={Object.entries(patterns.position_analysis).map(([type, data]) => ({
                      name: type,
                      value: data.pnl.count
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    label
                  >
                    {Object.entries(patterns.position_analysis).map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Grid>

            {/* Exit Analysis */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Exit Analysis
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Exit Reason</TableCell>
                      <TableCell align="right">Count</TableCell>
                      <TableCell align="right">Avg PnL</TableCell>
                      <TableCell align="right">Total PnL</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(patterns.exit_analysis).map(([reason, data]) => (
                      <TableRow key={reason}>
                        <TableCell>{reason}</TableCell>
                        <TableCell align="right">{data.pnl.count}</TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: data.pnl.mean >= 0 ? 'success.main' : 'error.main'
                          }}
                        >
                          ${data.pnl.mean.toFixed(2)}
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: data.pnl.sum >= 0 ? 'success.main' : 'error.main'
                          }}
                        >
                          ${data.pnl.sum.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Risk Analysis Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            {/* Value at Risk */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Value at Risk (VaR)
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>95% VaR</TableCell>
                        <TableCell align="right">
                          ${Math.abs(riskMetrics.var_metrics.var_95).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>99% VaR</TableCell>
                        <TableCell align="right">
                          ${Math.abs(riskMetrics.var_metrics.var_99).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>95% CVaR</TableCell>
                        <TableCell align="right">
                          ${Math.abs(riskMetrics.var_metrics.cvar_95).toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>99% CVaR</TableCell>
                        <TableCell align="right">
                          ${Math.abs(riskMetrics.var_metrics.cvar_99).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>

            {/* Risk-Reward Statistics */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Risk-Reward Statistics
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableBody>
                      <TableRow>
                        <TableCell>Average R:R Ratio</TableCell>
                        <TableCell align="right">
                          {riskMetrics.risk_reward_stats.mean.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Median R:R Ratio</TableCell>
                        <TableCell align="right">
                          {riskMetrics.risk_reward_stats.median.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>R:R Standard Deviation</TableCell>
                        <TableCell align="right">
                          {riskMetrics.risk_reward_stats.std.toFixed(2)}
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Average Risk per Trade</TableCell>
                        <TableCell align="right">
                          ${riskMetrics.risk_per_trade.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Suggestions Tab */}
        <TabPanel value={activeTab} index={3}>
          <Grid container spacing={3}>
            {/* Optimization Suggestions */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Optimization Suggestions
                </Typography>
                <List>
                  {suggestions.suggestions.map((suggestion, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Lightbulb color="primary" />
                      </ListItemIcon>
                      <ListItemText primary={suggestion} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>

            {/* Warnings */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Warnings
                </Typography>
                <List>
                  {suggestions.warnings.map((warning, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Warning color="error" />
                      </ListItemIcon>
                      <ListItemText primary={warning} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default PerformanceAnalytics;
