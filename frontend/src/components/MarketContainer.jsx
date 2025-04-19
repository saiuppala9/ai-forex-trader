import React from 'react';
import { Paper, Box, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';

// Import SVG icons (these will be used as background elements)
import { ReactComponent as BullIcon } from '../assets/images/bull-icon.svg';
import { ReactComponent as BearIcon } from '../assets/images/bear-icon.svg';

// Styled components for market themed containers
const StyledPaper = styled(Paper)(({ theme, marketDirection }) => ({
  position: 'relative',
  overflow: 'hidden',
  borderRadius: theme.shape.borderRadius,
  backgroundColor: marketDirection === 'bull' 
    ? theme.palette.background.bullPanel 
    : marketDirection === 'bear' 
      ? theme.palette.background.bearPanel 
      : theme.palette.background.neutral,
  border: `1px solid ${
    marketDirection === 'bull' 
      ? theme.palette.bull.main 
      : marketDirection === 'bear' 
        ? theme.palette.bear.main 
        : theme.palette.neutral.main
  }`,
  boxShadow: theme.shadows[2],
  padding: theme.spacing(2),
  transition: 'all 0.3s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[4],
    transform: 'translateY(-2px)',
  }
}));

const MarketIconOverlay = styled(Box)(({ theme }) => ({
  position: 'absolute',
  bottom: -40,
  right: -40,
  opacity: 0.05,
  pointerEvents: 'none',
  height: 180,
  width: 180,
  '& svg': {
    height: '100%',
    width: '100%',
  }
}));

// Header that includes a colored indicator based on market direction
const MarketHeader = styled(Box)(({ theme, marketDirection }) => ({
  display: 'flex',
  alignItems: 'center',
  marginBottom: theme.spacing(1),
  '&::before': {
    content: '""',
    display: 'inline-block',
    width: 12,
    height: 12,
    marginRight: theme.spacing(1),
    borderRadius: '50%',
    backgroundColor: marketDirection === 'bull' 
      ? theme.palette.bull.main 
      : marketDirection === 'bear' 
        ? theme.palette.bear.main 
        : theme.palette.neutral.main
  }
}));

/**
 * Market themed container component
 * 
 * @param {Object} props
 * @param {'bull'|'bear'|'neutral'} props.marketDirection - The market direction theme
 * @param {string} props.title - The title of the container
 * @param {React.ReactNode} props.children - The content of the container
 * @param {Object} props.sx - Additional MUI sx props
 */
const MarketContainer = ({ 
  marketDirection = 'neutral', 
  title, 
  children, 
  sx = {},
  ...rest 
}) => {
  const theme = useTheme();
  
  // Determine text color based on market direction
  const textColor = marketDirection === 'bull' 
    ? theme.palette.text.bull 
    : marketDirection === 'bear' 
      ? theme.palette.text.bear 
      : theme.palette.text.primary;
      
  return (
    <StyledPaper marketDirection={marketDirection} sx={sx} {...rest}>
      {title && (
        <MarketHeader marketDirection={marketDirection}>
          <Typography 
            variant="subtitle1" 
            fontWeight="medium" 
            color={textColor}
          >
            {title}
          </Typography>
        </MarketHeader>
      )}
      
      {/* Content */}
      <Box sx={{ position: 'relative', zIndex: 2 }}>
        {children}
      </Box>
      
      {/* Background Icon */}
      <MarketIconOverlay>
        {marketDirection === 'bull' && <BullIcon />}
        {marketDirection === 'bear' && <BearIcon />}
        {marketDirection === 'neutral' && null}
      </MarketIconOverlay>
    </StyledPaper>
  );
};

export default MarketContainer;
