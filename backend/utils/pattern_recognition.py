import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import talib
from scipy import stats
import logging

logger = logging.getLogger(__name__)

@dataclass
class CandlePattern:
    name: str
    confidence: float
    direction: str  # 'bullish' or 'bearish'
    description: str
    entry_price: float
    stop_loss: float
    target_price: float

class PatternRecognizer:
    def __init__(self):
        # Define pattern detection functions from TALib
        self.candlestick_patterns = {
            'CDL2CROWS': {'name': 'Two Crows', 'direction': 'bearish'},
            'CDL3BLACKCROWS': {'name': 'Three Black Crows', 'direction': 'bearish'},
            'CDL3INSIDE': {'name': 'Three Inside Up/Down', 'direction': 'both'},
            'CDL3LINESTRIKE': {'name': 'Three-Line Strike', 'direction': 'both'},
            'CDL3OUTSIDE': {'name': 'Three Outside Up/Down', 'direction': 'both'},
            'CDL3STARSINSOUTH': {'name': 'Three Stars In The South', 'direction': 'bullish'},
            'CDL3WHITESOLDIERS': {'name': 'Three Advancing White Soldiers', 'direction': 'bullish'},
            'CDLABANDONEDBABY': {'name': 'Abandoned Baby', 'direction': 'both'},
            'CDLADVANCEBLOCK': {'name': 'Advance Block', 'direction': 'bearish'},
            'CDLBELTHOLD': {'name': 'Belt-hold', 'direction': 'both'},
            'CDLBREAKAWAY': {'name': 'Breakaway', 'direction': 'both'},
            'CDLCLOSINGMARUBOZU': {'name': 'Closing Marubozu', 'direction': 'both'},
            'CDLDARKCLOUDCOVER': {'name': 'Dark Cloud Cover', 'direction': 'bearish'},
            'CDLDOJI': {'name': 'Doji', 'direction': 'both'},
            'CDLDOJISTAR': {'name': 'Doji Star', 'direction': 'both'},
            'CDLDRAGONFLYDOJI': {'name': 'Dragonfly Doji', 'direction': 'bullish'},
            'CDLENGULFING': {'name': 'Engulfing Pattern', 'direction': 'both'},
            'CDLEVENINGDOJISTAR': {'name': 'Evening Doji Star', 'direction': 'bearish'},
            'CDLEVENINGSTAR': {'name': 'Evening Star', 'direction': 'bearish'},
            'CDLGAPSIDESIDEWHITE': {'name': 'Up/Down-gap side-by-side white lines', 'direction': 'both'},
            'CDLGRAVESTONEDOJI': {'name': 'Gravestone Doji', 'direction': 'bearish'},
            'CDLHAMMER': {'name': 'Hammer', 'direction': 'bullish'},
            'CDLHANGINGMAN': {'name': 'Hanging Man', 'direction': 'bearish'},
            'CDLHARAMI': {'name': 'Harami Pattern', 'direction': 'both'},
            'CDLHARAMICROSS': {'name': 'Harami Cross Pattern', 'direction': 'both'},
            'CDLHIGHWAVE': {'name': 'High-Wave Candle', 'direction': 'both'},
            'CDLHIKKAKE': {'name': 'Hikkake Pattern', 'direction': 'both'},
            'CDLHIKKAKEMOD': {'name': 'Modified Hikkake Pattern', 'direction': 'both'},
            'CDLHOMINGPIGEON': {'name': 'Homing Pigeon', 'direction': 'bullish'},
            'CDLIDENTICAL3CROWS': {'name': 'Identical Three Crows', 'direction': 'bearish'},
            'CDLINNECK': {'name': 'In-Neck Pattern', 'direction': 'bearish'},
            'CDLINVERTEDHAMMER': {'name': 'Inverted Hammer', 'direction': 'bullish'},
            'CDLKICKING': {'name': 'Kicking', 'direction': 'both'},
            'CDLKICKINGBYLENGTH': {'name': 'Kicking - bull/bear determined by the longer marubozu', 'direction': 'both'},
            'CDLLADDERBOTTOM': {'name': 'Ladder Bottom', 'direction': 'bullish'},
            'CDLLONGLEGGEDDOJI': {'name': 'Long Legged Doji', 'direction': 'both'},
            'CDLMARUBOZU': {'name': 'Marubozu', 'direction': 'both'},
            'CDLMATCHINGLOW': {'name': 'Matching Low', 'direction': 'bullish'},
            'CDLMATHOLD': {'name': 'Mat Hold', 'direction': 'bullish'},
            'CDLMORNINGDOJISTAR': {'name': 'Morning Doji Star', 'direction': 'bullish'},
            'CDLMORNINGSTAR': {'name': 'Morning Star', 'direction': 'bullish'},
            'CDLONNECK': {'name': 'On-Neck Pattern', 'direction': 'bearish'},
            'CDLPIERCING': {'name': 'Piercing Pattern', 'direction': 'bullish'},
            'CDLRICKSHAWMAN': {'name': 'Rickshaw Man', 'direction': 'both'},
            'CDLRISEFALL3METHODS': {'name': 'Rising/Falling Three Methods', 'direction': 'both'},
            'CDLSEPARATINGLINES': {'name': 'Separating Lines', 'direction': 'both'},
            'CDLSHOOTINGSTAR': {'name': 'Shooting Star', 'direction': 'bearish'},
            'CDLSHORTLINE': {'name': 'Short Line Candle', 'direction': 'both'},
            'CDLSPINNINGTOP': {'name': 'Spinning Top', 'direction': 'both'},
            'CDLSTALLEDPATTERN': {'name': 'Stalled Pattern', 'direction': 'bearish'},
            'CDLSTICKSANDWICH': {'name': 'Stick Sandwich', 'direction': 'bullish'},
            'CDLTAKURI': {'name': 'Takuri (Dragonfly Doji with very long lower shadow)', 'direction': 'bullish'},
            'CDLTASUKIGAP': {'name': 'Tasuki Gap', 'direction': 'both'},
            'CDLTHRUSTING': {'name': 'Thrusting Pattern', 'direction': 'bearish'},
            'CDLTRISTAR': {'name': 'Tristar Pattern', 'direction': 'both'},
            'CDLUNIQUE3RIVER': {'name': 'Unique 3 River', 'direction': 'bullish'},
            'CDLUPSIDEGAP2CROWS': {'name': 'Upside Gap Two Crows', 'direction': 'bearish'},
            'CDLXSIDEGAP3METHODS': {'name': 'Upside/Downside Gap Three Methods', 'direction': 'both'}
        }

    def recognize_patterns(self, df: pd.DataFrame) -> List[CandlePattern]:
        """Recognize candlestick patterns in the data"""
        try:
            patterns = []
            
            # Calculate required indicators
            df['ATR'] = talib.ATR(df['High'], df['Low'], df['Close'], timeperiod=14)
            
            # Check each candlestick pattern
            for pattern_func, info in self.candlestick_patterns.items():
                try:
                    # Get pattern recognition function from TALib
                    pattern_result = getattr(talib, pattern_func)(
                        df['Open'], df['High'], df['Low'], df['Close']
                    )
                    
                    # Check last candle for pattern
                    if pattern_result[-1] != 0:
                        direction = 'bullish' if pattern_result[-1] > 0 else 'bearish'
                        
                        # Skip if pattern direction doesn't match the defined direction
                        if info['direction'] != 'both' and info['direction'] != direction:
                            continue
                        
                        # Calculate confidence based on pattern strength and volume
                        confidence = self._calculate_confidence(df, pattern_result[-1])
                        
                        # Calculate entry, stop loss, and target prices
                        entry_price = df['Close'].iloc[-1]
                        atr = df['ATR'].iloc[-1]
                        
                        if direction == 'bullish':
                            stop_loss = entry_price - (2 * atr)
                            target_price = entry_price + (3 * atr)
                        else:
                            stop_loss = entry_price + (2 * atr)
                            target_price = entry_price - (3 * atr)
                        
                        pattern = CandlePattern(
                            name=info['name'],
                            confidence=confidence,
                            direction=direction,
                            description=self._get_pattern_description(info['name'], direction),
                            entry_price=entry_price,
                            stop_loss=stop_loss,
                            target_price=target_price
                        )
                        
                        patterns.append(pattern)
                        
                except Exception as e:
                    logger.error(f"Error checking pattern {pattern_func}: {str(e)}")
                    continue
            
            # Sort patterns by confidence
            patterns.sort(key=lambda x: x.confidence, reverse=True)
            
            return patterns
            
        except Exception as e:
            logger.error(f"Error in pattern recognition: {str(e)}")
            return []

    def _calculate_confidence(self, df: pd.DataFrame, pattern_value: int) -> float:
        """Calculate pattern confidence based on multiple factors"""
        try:
            # Start with base confidence from pattern value
            confidence = abs(pattern_value) / 100
            
            # Volume confirmation
            if len(df) >= 2:
                avg_volume = df['Volume'].iloc[-10:-1].mean()
                current_volume = df['Volume'].iloc[-1]
                volume_factor = min(current_volume / avg_volume, 2.0) if avg_volume > 0 else 1.0
                confidence *= (0.5 + 0.5 * volume_factor)
            
            # Trend confirmation
            sma20 = talib.SMA(df['Close'], timeperiod=20)
            sma50 = talib.SMA(df['Close'], timeperiod=50)
            
            if pattern_value > 0:  # Bullish pattern
                if sma20.iloc[-1] > sma50.iloc[-1]:  # Uptrend
                    confidence *= 1.2
                else:  # Downtrend or sideways
                    confidence *= 0.8
            else:  # Bearish pattern
                if sma20.iloc[-1] < sma50.iloc[-1]:  # Downtrend
                    confidence *= 1.2
                else:  # Uptrend or sideways
                    confidence *= 0.8
            
            # Support/Resistance confirmation
            price = df['Close'].iloc[-1]
            support, resistance = self._calculate_support_resistance(df)
            
            if pattern_value > 0:  # Bullish pattern
                if price <= support * 1.02:  # Near support
                    confidence *= 1.2
            else:  # Bearish pattern
                if price >= resistance * 0.98:  # Near resistance
                    confidence *= 1.2
            
            return min(confidence, 1.0)
            
        except Exception as e:
            logger.error(f"Error calculating confidence: {str(e)}")
            return 0.5

    def _calculate_support_resistance(
        self,
        df: pd.DataFrame,
        window: int = 20
    ) -> Tuple[float, float]:
        """Calculate dynamic support and resistance levels"""
        try:
            if len(df) < window:
                return df['Low'].min(), df['High'].max()
            
            # Get recent price action
            recent_df = df.tail(window)
            
            # Find potential support levels
            lows = recent_df['Low'].values
            supports = []
            
            for i in range(1, len(lows) - 1):
                if lows[i] < lows[i-1] and lows[i] < lows[i+1]:
                    supports.append(lows[i])
            
            # Find potential resistance levels
            highs = recent_df['High'].values
            resistances = []
            
            for i in range(1, len(highs) - 1):
                if highs[i] > highs[i-1] and highs[i] > highs[i+1]:
                    resistances.append(highs[i])
            
            # Calculate weighted average of levels
            if supports:
                support = np.average(supports, weights=range(1, len(supports) + 1))
            else:
                support = recent_df['Low'].min()
                
            if resistances:
                resistance = np.average(resistances, weights=range(1, len(resistances) + 1))
            else:
                resistance = recent_df['High'].max()
            
            return support, resistance
            
        except Exception as e:
            logger.error(f"Error calculating support/resistance: {str(e)}")
            return df['Low'].min(), df['High'].max()

    def _get_pattern_description(self, pattern_name: str, direction: str) -> str:
        """Get detailed pattern description"""
        descriptions = {
            'Hammer': 'A single candle pattern with a small body and long lower shadow, suggesting a potential bullish reversal.',
            'Engulfing Pattern': f'A two-candle pattern where the second candle completely engulfs the first, suggesting a potential {direction} reversal.',
            'Doji': 'A single candle with a very small body, indicating market indecision.',
            'Morning Star': 'A three-candle bullish reversal pattern often seen at market bottoms.',
            'Evening Star': 'A three-candle bearish reversal pattern often seen at market tops.',
            # Add more pattern descriptions as needed
        }
        
        return descriptions.get(
            pattern_name,
            f"A {direction} pattern indicating potential trend {'continuation' if direction == 'both' else 'reversal'}"
        )

# Global pattern recognizer instance
pattern_recognizer = PatternRecognizer()
