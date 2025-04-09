import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

const timeframes = [
  { value: '1m', label: '1 Minute' },
  { value: '5m', label: '5 Minutes' },
  { value: '15m', label: '15 Minutes' },
  { value: '30m', label: '30 Minutes' },
  { value: '1h', label: '1 Hour' },
  { value: '4h', label: '4 Hours' },
  { value: '1d', label: 'Daily' }
];

const Backtester = () => {
  const [formData, setFormData] = useState({
    symbol: '',
    startDate: null,
    endDate: null,
    timeframe: '1h',
    initialBalance: 10000,
    positionSize: 0.02,
    maxPositions: 5
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: formData.symbol.toUpperCase(),
          start_date: formData.startDate.toISOString(),
          end_date: formData.endDate.toISOString(),
          timeframe: formData.timeframe,
          initial_balance: formData.initialBalance,
          position_size: formData.positionSize,
          max_positions: formData.maxPositions
        })
      });

      if (!response.ok) {
        throw new Error('Failed to run backtest');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

  const handleDateChange = (field) => (date) => {
    setFormData({
      ...formData,
      [field]: date
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Strategy Backtester
      </Typography>

      {/* Backtest Form */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                label="Symbol"
                value={formData.symbol}
                onChange={handleInputChange('symbol')}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Timeframe</InputLabel>
                <Select
                  value={formData.timeframe}
                  label="Timeframe"
                  onChange={handleInputChange('timeframe')}
                >
                  {timeframes.map(tf => (
                    <MenuItem key={tf.value} value={tf.value}>
                      {tf.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DateTimePicker
                label="Start Date"
                value={formData.startDate}
                onChange={handleDateChange('startDate')}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <DateTimePicker
                label="End Date"
                value={formData.endDate}
                onChange={handleDateChange('endDate')}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Initial Balance"
                value={formData.initialBalance}
                onChange={handleInputChange('initialBalance')}
                InputProps={{ inputProps: { min: 1000 } }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Position Size (%)"
                value={formData.positionSize * 100}
                onChange={(e) => handleInputChange('positionSize')(
                  { target: { value: parseFloat(e.target.value) / 100 } }
                )}
                InputProps={{ inputProps: { min: 0.1, max: 100, step: 0.1 } }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Max Positions"
                value={formData.maxPositions}
                onChange={handleInputChange('maxPositions')}
                InputProps={{ inputProps: { min: 1, max: 10 } }}
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ minWidth: 200 }}
              >
                {loading ? <CircularProgress size={24} /> : 'Run Backtest'}
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Results */}
      {results && (
        <>
          {/* Summary */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Performance Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2">Total PnL</Typography>
                <Typography
                  variant="h6"
                  color={results.summary.total_pnl >= 0 ? 'success.main' : 'error.main'}
                >
                  ${results.summary.total_pnl.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2">Win Rate</Typography>
                <Typography variant="h6">
                  {results.summary.win_rate.toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2">Profit Factor</Typography>
                <Typography variant="h6">
                  {results.summary.profit_factor.toFixed(2)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Typography variant="subtitle2">Max Drawdown</Typography>
                <Typography variant="h6" color="error.main">
                  ${results.summary.max_drawdown.toFixed(2)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Equity Curve */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Equity Curve
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={results.equity_curve.map((value, index) => ({
                  trade: index + 1,
                  equity: value,
                  drawdown: results.drawdown_curve[index]
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="trade" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="equity"
                  stroke="#2196f3"
                  name="Equity"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="drawdown"
                  stroke="#f44336"
                  name="Drawdown"
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>

          {/* Trade List */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Trade History
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Entry Time</TableCell>
                    <TableCell>Exit Time</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Entry</TableCell>
                    <TableCell>Exit</TableCell>
                    <TableCell>Stop Loss</TableCell>
                    <TableCell>Target</TableCell>
                    <TableCell>PnL</TableCell>
                    <TableCell>Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {results.trades.map((trade, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        {format(new Date(trade.entry_time), 'yyyy-MM-dd HH:mm')}
                      </TableCell>
                      <TableCell>
                        {trade.exit_time
                          ? format(new Date(trade.exit_time), 'yyyy-MM-dd HH:mm')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={trade.type}
                          color={trade.type === 'long' ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{trade.entry_price}</TableCell>
                      <TableCell>{trade.exit_price || '-'}</TableCell>
                      <TableCell>{trade.stop_loss}</TableCell>
                      <TableCell>{trade.target_price}</TableCell>
                      <TableCell
                        sx={{
                          color: trade.pnl >= 0 ? 'success.main' : 'error.main',
                          fontWeight: 'bold'
                        }}
                      >
                        ${trade.pnl.toFixed(2)}
                      </TableCell>
                      <TableCell>{trade.exit_reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
};

export default Backtester;
