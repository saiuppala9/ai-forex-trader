import React, { useState, useEffect } from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import Dashboard from './components/Dashboard';
import marketTheme from './theme/marketTheme';

/**
 * Main application component that serves as the entry point for the AI Forex Trader
 * All functionality has been moved to child components for better organization
 */
function App() {
  return (
    <ThemeProvider theme={marketTheme}>
      <CssBaseline />
      <Dashboard />
    </ThemeProvider>
  );
}

export default App;
