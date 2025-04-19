import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Drawer, 
  AppBar, 
  Toolbar, 
  List, 
  Typography, 
  Divider, 
  ListItem, 
  ListItemIcon, 
  ListItemText,
  CssBaseline,
  useTheme,
  IconButton,
  useMediaQuery,
  Grid,
  Container
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { 
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  TrendingUp,
  Public,
  CurrencyExchange,
  BarChart,
  Settings,
  Notifications,
  Search as SearchIcon,
  Business as BusinessIcon
} from '@mui/icons-material';

import { ReactComponent as ForexLogo } from '../assets/images/forex-logo.svg';
import GlobalMarketsOverview from './GlobalMarketsOverview';
import ForexMarket from './ForexMarket';
import WatchlistPanel from './WatchlistPanel';
import IndianMarket from './IndianMarket';
import IndianWatchlistPanel from './IndianWatchlistPanel';

// Styled components for dashboard
const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${drawerWidth}px`,
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
      marginLeft: 0,
    }),
    [theme.breakpoints.down('md')]: {
      marginLeft: 0,
    },
  }),
);

const AppBarStyled = styled(AppBar, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    backgroundImage: 'linear-gradient(90deg, #1E1E1E 0%, #2C2C2C 100%)',
    ...(open && {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: `${drawerWidth}px`,
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  }),
);

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'center',
}));

const MenuItems = [
  { text: 'Dashboard Overview', icon: <DashboardIcon />, value: 'overview' },
  { text: 'Forex Market', icon: <CurrencyExchange />, value: 'forex' },
  { text: 'Indian Market', icon: <BusinessIcon />, value: 'indian' },
  { text: 'Global Markets', icon: <Public />, value: 'global' },
  { text: 'Technical Analysis', icon: <BarChart />, value: 'analysis' },
  { text: 'Settings', icon: <Settings />, value: 'settings' },
];

const Dashboard = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [open, setOpen] = useState(!isMobile);
  const [activeTab, setActiveTab] = useState('overview');
  const [currentSymbol, setCurrentSymbol] = useState('EUR/USD');

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleTabChange = (tabValue) => {
    setActiveTab(tabValue);
    if (isMobile) {
      setOpen(false);
    }
  };

  const [currentIndianSymbol, setCurrentIndianSymbol] = useState('RELIANCE');

  const handleSelectSymbol = (symbol) => {
    setCurrentSymbol(symbol);
  };

  const handleSelectIndianSymbol = (symbol) => {
    setCurrentIndianSymbol(symbol);
  };

  // Listen for custom events from child components
  useEffect(() => {
    const handleForexSymbolSelected = (event) => {
      setCurrentSymbol(event.detail);
    };

    const handleIndianStockSelected = (event) => {
      setCurrentIndianSymbol(event.detail);
    };
    
    document.addEventListener('forex-symbol-selected', handleForexSymbolSelected);
    document.addEventListener('indian-stock-selected', handleIndianStockSelected);
    
    return () => {
      document.removeEventListener('forex-symbol-selected', handleForexSymbolSelected);
      document.removeEventListener('indian-stock-selected', handleIndianStockSelected);
    };
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
      case 'global':
        return <GlobalMarketsOverview />;
      case 'forex':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <WatchlistPanel 
                onSelectSymbol={handleSelectSymbol} 
                currentSymbol={currentSymbol} 
              />
            </Grid>
            <Grid item xs={12} md={9}>
              <ForexMarket currentSymbol={currentSymbol} />
            </Grid>
          </Grid>
        );
      case 'indian':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <IndianWatchlistPanel 
                onSelectSymbol={handleSelectIndianSymbol} 
                currentSymbol={currentIndianSymbol} 
              />
            </Grid>
            <Grid item xs={12} md={9}>
              <IndianMarket currentSymbol={currentIndianSymbol} />
            </Grid>
          </Grid>
        );
      case 'analysis':
        return (
          <Box p={2}>
            <Typography variant="h5">Technical Analysis</Typography>
            <Typography variant="body1" color="text.secondary" mt={2}>
              Advanced technical analysis tools will be available in future updates.
            </Typography>
          </Box>
        );
      case 'settings':
        return (
          <Box p={2}>
            <Typography variant="h5">Settings</Typography>
            <Typography variant="body1" color="text.secondary" mt={2}>
              User settings and preferences will be available in future updates.
            </Typography>
          </Box>
        );
      default:
        return <GlobalMarketsOverview />;
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <CssBaseline />
      <AppBarStyled position="fixed" open={open}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <ForexLogo style={{ height: 40, width: 160 }} />
          </Box>
          <Box sx={{ flexGrow: 1 }} />
          <IconButton color="inherit">
            <Notifications />
          </IconButton>
        </Toolbar>
      </AppBarStyled>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            backgroundImage: theme.palette.mode === 'dark' ? 'linear-gradient(180deg, #1E1E1E 0%, #121212 100%)' : 'none',
          },
        }}
        variant={isMobile ? "temporary" : "persistent"}
        anchor="left"
        open={open}
        onClose={handleDrawerToggle}
      >
        <DrawerHeader>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp sx={{ mr: 1, color: theme.palette.bull.main }} />
            <Typography variant="h6" fontWeight="bold">
              Market Dashboard
            </Typography>
          </Box>
        </DrawerHeader>
        <Divider />
        <List>
          {MenuItems.map((item) => (
            <ListItem 
              button 
              key={item.text} 
              selected={activeTab === item.value}
              onClick={() => handleTabChange(item.value)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: theme.palette.background.neutral,
                  borderLeft: `4px solid ${
                    item.value === 'forex' ? theme.palette.bull.main :
                    item.value === 'analysis' ? theme.palette.bear.main :
                    theme.palette.primary.main
                  }`,
                  '& .MuiListItemIcon-root': {
                    color: item.value === 'forex' ? theme.palette.bull.main :
                           item.value === 'analysis' ? theme.palette.bear.main :
                           theme.palette.primary.main,
                  },
                },
                borderLeft: '4px solid transparent',
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Drawer>
      <Main open={open}>
        <DrawerHeader />
        <Box sx={{ 
          height: 'calc(100vh - 64px)', 
          overflow: 'auto',
          backgroundImage: `url(${require('../assets/images/chart-bg.svg')})`,
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed',
          p: 2
        }}>
          {renderContent()}
        </Box>
      </Main>
    </Box>
  );
};

export default Dashboard;
