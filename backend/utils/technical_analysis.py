import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Union, Tuple
import talib
from dataclasses import dataclass
import logging
from datetime import datetime, timedelta
from .pattern_recognition import pattern_recognizer

logger = logging.getLogger(__name__)

@dataclass
class TechnicalIndicators:
    sma: Dict[str, float]
    ema: Dict[str, float]
    rsi: float
    macd: Dict[str, float]
    bollinger: Dict[str, float]
    atr: float
    adx: float
    stochastic: Dict[str, float]
    support_resistance: Dict[str, float]

@dataclass
class PredictionResult:
    direction: str  # 'buy', 'sell', or 'neutral'
    confidence: float
    entry_price: float
    stop_loss: float
    take_profit: float
    indicators: TechnicalIndicators
    patterns: List[Dict[str, any]]
    timestamp: str
    timeframe: str

class TechnicalAnalyzer:
    def __init__(self):
        self.cache = {}
        self.cache_duration = 300  # 5 minutes

    def analyze(
        self,
        df: pd.DataFrame,
        timeframe: str = '1h'
    ) -> Optional[PredictionResult]:
        """Perform technical analysis and generate trading signals"""
        try:
            if df.empty or len(df) < 50:
                return None

            # Calculate technical indicators
            indicators = self._calculate_indicators(df)
            
            # Get candlestick patterns
            patterns = pattern_recognizer.recognize_patterns(df)
            
            # Generate prediction
            prediction = self._generate_prediction(df, indicators, patterns)
            
            # Calculate entry, stop loss, and take profit levels
            entry_price = df['Close'].iloc[-1]
            atr = indicators.atr
            
            if prediction.direction == 'buy':
                stop_loss = entry_price - (2 * atr)
                take_profit = entry_price + (3 * atr)
            elif prediction.direction == 'sell':
                stop_loss = entry_price + (2 * atr)
                take_profit = entry_price - (3 * atr)
            else:
                stop_loss = entry_price
                take_profit = entry_price

            return PredictionResult(
                direction=prediction.direction,
                confidence=prediction.confidence,
                entry_price=entry_price,
                stop_loss=stop_loss,
                take_profit=take_profit,
                indicators=indicators,
                patterns=[p.__dict__ for p in patterns],
                timestamp=datetime.now().isoformat(),
                timeframe=timeframe
            )

        except Exception as e:
            logger.error(f"Error in technical analysis: {str(e)}")
            return None

    def _calculate_indicators(self, df: pd.DataFrame) -> TechnicalIndicators:
        """Calculate all technical indicators"""
        try:
            close = df['Close'].values
            high = df['High'].values
            low = df['Low'].values
            volume = df['Volume'].values if 'Volume' in df else np.zeros_like(close)

            # Moving Averages
            sma_20 = talib.SMA(close, timeperiod=20)[-1]
            sma_50 = talib.SMA(close, timeperiod=50)[-1]
            sma_200 = talib.SMA(close, timeperiod=200)[-1]
            
            ema_20 = talib.EMA(close, timeperiod=20)[-1]
            ema_50 = talib.EMA(close, timeperiod=50)[-1]
            ema_200 = talib.EMA(close, timeperiod=200)[-1]

            # RSI
            rsi = talib.RSI(close, timeperiod=14)[-1]

            # MACD
            macd, macd_signal, macd_hist = talib.MACD(close)
            macd = macd[-1]
            macd_signal = macd_signal[-1]
            macd_hist = macd_hist[-1]

            # Bollinger Bands
            bb_upper, bb_middle, bb_lower = talib.BBANDS(
                close,
                timeperiod=20,
                nbdevup=2,
                nbdevdn=2
            )
            
            # ATR
            atr = talib.ATR(high, low, close, timeperiod=14)[-1]

            # ADX
            adx = talib.ADX(high, low, close, timeperiod=14)[-1]

            # Stochastic
            slowk, slowd = talib.STOCH(
                high,
                low,
                close,
                fastk_period=5,
                slowk_period=3,
                slowk_matype=0,
                slowd_period=3,
                slowd_matype=0
            )
            
            # Support and Resistance
            support, resistance = self._calculate_support_resistance(df)

            return TechnicalIndicators(
                sma={'20': sma_20, '50': sma_50, '200': sma_200},
                ema={'20': ema_20, '50': ema_50, '200': ema_200},
                rsi=rsi,
                macd={
                    'macd': macd,
                    'signal': macd_signal,
                    'hist': macd_hist
                },
                bollinger={
                    'upper': bb_upper[-1],
                    'middle': bb_middle[-1],
                    'lower': bb_lower[-1]
                },
                atr=atr,
                adx=adx,
                stochastic={'k': slowk[-1], 'd': slowd[-1]},
                support_resistance={
                    'support': support,
                    'resistance': resistance
                }
            )

        except Exception as e:
            logger.error(f"Error calculating indicators: {str(e)}")
            raise

    def _calculate_support_resistance(
        self,
        df: pd.DataFrame,
        window: int = 20
    ) -> Tuple[float, float]:
        """Calculate support and resistance levels"""
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

    def _generate_prediction(
        self,
        df: pd.DataFrame,
        indicators: TechnicalIndicators,
        patterns: List[any]
    ) -> PredictionResult:
        """Generate trading prediction based on technical analysis"""
        try:
            # Initialize scores
            buy_score = 0.0
            sell_score = 0.0
            
            # Trend Analysis (30% weight)
            if indicators.ema['20'] > indicators.ema['50']:
                buy_score += 0.15
            else:
                sell_score += 0.15
                
            if indicators.sma['50'] > indicators.sma['200']:
                buy_score += 0.15
            else:
                sell_score += 0.15

            # Momentum Analysis (20% weight)
            if indicators.rsi < 30:
                buy_score += 0.1
            elif indicators.rsi > 70:
                sell_score += 0.1
                
            if indicators.macd['hist'] > 0:
                buy_score += 0.1
            else:
                sell_score += 0.1

            # Support/Resistance (20% weight)
            current_price = df['Close'].iloc[-1]
            
            if current_price < indicators.support_resistance['support'] * 1.02:
                buy_score += 0.2
            elif current_price > indicators.support_resistance['resistance'] * 0.98:
                sell_score += 0.2

            # Pattern Recognition (20% weight)
            pattern_score = 0
            for pattern in patterns:
                if pattern.direction == 'bullish':
                    pattern_score += pattern.confidence
                else:
                    pattern_score -= pattern.confidence
            
            if pattern_score > 0:
                buy_score += 0.2 * min(abs(pattern_score), 1)
            else:
                sell_score += 0.2 * min(abs(pattern_score), 1)

            # Volume Analysis (10% weight)
            if 'Volume' in df:
                volume_sma = df['Volume'].rolling(window=20).mean()
                if df['Volume'].iloc[-1] > volume_sma.iloc[-1]:
                    if current_price > df['Close'].iloc[-2]:
                        buy_score += 0.1
                    else:
                        sell_score += 0.1

            # Determine direction and confidence
            if buy_score > sell_score:
                direction = 'buy'
                confidence = buy_score
            elif sell_score > buy_score:
                direction = 'sell'
                confidence = sell_score
            else:
                direction = 'neutral'
                confidence = 0.5

            return PredictionResult(
                direction=direction,
                confidence=confidence,
                entry_price=current_price,
                stop_loss=0.0,  # Will be calculated later
                take_profit=0.0,  # Will be calculated later
                indicators=indicators,
                patterns=[],  # Will be filled later
                timestamp=datetime.now().isoformat(),
                timeframe=df.index.freq if hasattr(df.index, 'freq') else '1h'
            )

        except Exception as e:
            logger.error(f"Error generating prediction: {str(e)}")
            raise

# Global instance
technical_analyzer = TechnicalAnalyzer()
