import React, { useState, useEffect } from 'react';
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import { format } from 'date-fns';

const impactColors = {
  'High': '#ef5350',
  'Medium': '#fb8c00',
  'Low': '#66bb6a'
};

const EconomicCalendar = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, high, medium, low

  useEffect(() => {
    fetchEconomicCalendar();
    // Refresh every 5 minutes
    const interval = setInterval(fetchEconomicCalendar, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchEconomicCalendar = async () => {
    try {
      const response = await fetch('/api/economic-calendar');
      if (!response.ok) {
        throw new Error('Failed to fetch economic calendar');
      }
      const data = await response.json();
      setEvents(data);
      setError(null);
    } catch (err) {
      setError('Failed to load economic calendar data');
      console.error('Error fetching calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  const getImpactColor = (impact) => {
    return impactColors[impact] || '#9e9e9e';
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return event.impact.toLowerCase() === filter;
  });

  const formatDateTime = (dateStr) => {
    try {
      return format(new Date(dateStr), 'MMM dd, HH:mm');
    } catch (e) {
      return dateStr;
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
      <Paper sx={{ p: 2, bgcolor: '#ffebee' }}>
        <Typography color="error">{error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Economic Calendar</Typography>
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Impact</InputLabel>
          <Select
            value={filter}
            label="Impact"
            onChange={(e) => setFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="high">High</MenuItem>
            <MenuItem value="medium">Medium</MenuItem>
            <MenuItem value="low">Low</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Currency</TableCell>
              <TableCell>Event</TableCell>
              <TableCell>Impact</TableCell>
              <TableCell>Actual</TableCell>
              <TableCell>Forecast</TableCell>
              <TableCell>Previous</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEvents.map((event, index) => (
              <TableRow 
                key={index}
                sx={{
                  backgroundColor: event.actual !== null ? '#f5f5f5' : 'inherit',
                  '&:hover': { backgroundColor: '#fafafa' }
                }}
              >
                <TableCell>{formatDateTime(event.time)}</TableCell>
                <TableCell>{event.currency}</TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    {event.event}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={event.impact}
                    size="small"
                    sx={{
                      bgcolor: getImpactColor(event.impact),
                      color: 'white',
                      fontWeight: 500
                    }}
                  />
                </TableCell>
                <TableCell>
                  {event.actual !== null ? (
                    <Typography
                      sx={{
                        color: event.actual > event.forecast ? 'success.main' :
                               event.actual < event.forecast ? 'error.main' :
                               'text.primary'
                      }}
                    >
                      {event.actual}
                    </Typography>
                  ) : '—'}
                </TableCell>
                <TableCell>{event.forecast || '—'}</TableCell>
                <TableCell>{event.previous || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Paper>
  );
};

export default EconomicCalendar;
