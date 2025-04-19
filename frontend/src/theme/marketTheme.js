import { createTheme } from '@mui/material/styles';

// Custom theme with bull and bear market colors
const marketTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4caf50', // Bull green
      light: '#80e27e',
      dark: '#087f23',
      contrastText: '#fff',
    },
    secondary: {
      main: '#ef5350', // Bear red
      light: '#ff867c',
      dark: '#b61827',
      contrastText: '#fff',
    },
    background: {
      default: '#121212',
      paper: '#1E1E1E',
      chart: '#253248', // Dark blue for charts
      bullPanel: 'rgba(76, 175, 80, 0.05)', // Light green panel
      bearPanel: 'rgba(239, 83, 80, 0.05)', // Light red panel
      neutral: '#2C2C2C', // Neutral dark panel
    },
    text: {
      primary: '#E0E0E0',
      secondary: '#ACACAC',
      hint: '#757575',
      bull: '#4caf50', // Bull text color
      bear: '#ef5350', // Bear text color
      neutral: '#BBBBBB', // Neutral text
      gold: '#FFD700', // Gold for premium features
    },
    bull: {
      main: '#4caf50', // Bull main color (green)
      light: '#80e27e',
      dark: '#087f23',
      gradient: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
    },
    bear: {
      main: '#ef5350', // Bear main color (red)
      light: '#ff867c',
      dark: '#b61827',
      gradient: 'linear-gradient(135deg, #ef5350 0%, #c62828 100%)',
    },
    neutral: {
      main: '#9e9e9e', // Neutral market color (gray)
      light: '#cfcfcf',
      dark: '#707070',
    },
    chart: {
      gridLines: 'rgba(255, 255, 255, 0.08)',
      crosshair: 'rgba(255, 255, 255, 0.5)',
      bullCandle: '#4caf50',
      bearCandle: '#ef5350',
      volume: '#8884d8',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 500,
    },
    h5: {
      fontWeight: 500,
    },
    h6: {
      fontWeight: 500,
    },
    subtitle1: {
      fontWeight: 400,
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
    },
    body1: {
      fontWeight: 400,
    },
    body2: {
      fontWeight: 400,
      fontSize: '0.875rem',
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiPaper: {
      defaultProps: {
        elevation: 2,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.2)',
          },
        },
        containedPrimary: {
          backgroundImage: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
        },
        containedSecondary: {
          backgroundImage: 'linear-gradient(135deg, #ef5350 0%, #c62828 100%)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.12)',
          backgroundImage: 'linear-gradient(90deg, #1E1E1E 0%, #2C2C2C 100%)',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontWeight: 600,
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          height: 8,
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: '#4caf50',
            '&:hover': {
              backgroundColor: 'rgba(76, 175, 80, 0.08)',
            },
          },
          '&.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#4caf50',
          },
        },
        track: {
          backgroundColor: '#ef5350',
        },
      },
    },
  },
});

export default marketTheme;
