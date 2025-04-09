import pandas as pd
import numpy as np
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class TechnicalIndicators:
    trend: str
    strength: float
    support: float
    resistance: float
    rsi: float
    macd: dict
    ma_signals: dict
    patterns: List[str]

class TechnicalAnalyzer:
    def __init__(self):
        self.lookback_period = 14

    def calculate_rsi(self, data: pd.DataFrame) -> float:
        delta = data['Close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=self.lookback_period).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=self.lookback_period).mean()
        rs = gain / loss
        return 100 - (100 / (1 + rs.iloc[-1]))

    def calculate_macd(self, data: pd.DataFrame) -> dict:
        exp1 = data['Close'].ewm(span=12, adjust=False).mean()
        exp2 = data['Close'].ewm(span=26, adjust=False).mean()
        macd = exp1 - exp2
        signal = macd.ewm(span=9, adjust=False).mean()
        histogram = macd - signal
        return {
            'macd': macd.iloc[-1],
            'signal': signal.iloc[-1],
            'histogram': histogram.iloc[-1]
        }

    def calculate_support_resistance(self, data: pd.DataFrame) -> tuple:
        pivot = data['Close'].iloc[-1]
        support = min(data['Low'].tail(self.lookback_period))
        resistance = max(data['High'].tail(self.lookback_period))
        return support, resistance

    def identify_trend(self, data: pd.DataFrame) -> str:
        sma20 = data['Close'].rolling(window=20).mean()
        sma50 = data['Close'].rolling(window=50).mean()
        current_price = data['Close'].iloc[-1]
        
        if current_price > sma20.iloc[-1] and sma20.iloc[-1] > sma50.iloc[-1]:
            return "STRONG_UPTREND"
        elif current_price > sma20.iloc[-1]:
            return "UPTREND"
        elif current_price < sma20.iloc[-1] and sma20.iloc[-1] < sma50.iloc[-1]:
            return "STRONG_DOWNTREND"
        elif current_price < sma20.iloc[-1]:
            return "DOWNTREND"
        else:
            return "SIDEWAYS"

    def calculate_trend_strength(self, data: pd.DataFrame) -> float:
        atr = self.calculate_atr(data)
        volatility = (data['High'] - data['Low']).mean()
        strength = (atr / volatility) * 100
        return min(max(strength, 0), 100)

    def calculate_atr(self, data: pd.DataFrame) -> float:
        high_low = data['High'] - data['Low']
        high_close = abs(data['High'] - data['Close'].shift())
        low_close = abs(data['Low'] - data['Close'].shift())
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = ranges.max(axis=1)
        return true_range.rolling(window=self.lookback_period).mean().iloc[-1]

    def calculate_ma_signals(self, data: pd.DataFrame) -> dict:
        periods = [10, 20, 50, 100]
        signals = {}
        current_price = data['Close'].iloc[-1]
        
        for period in periods:
            ma = data['Close'].rolling(window=period).mean().iloc[-1]
            if current_price > ma * 1.02:
                signals[f'MA{period}'] = 'STRONG_BUY'
            elif current_price > ma:
                signals[f'MA{period}'] = 'BUY'
            elif current_price < ma * 0.98:
                signals[f'MA{period}'] = 'STRONG_SELL'
            elif current_price < ma:
                signals[f'MA{period}'] = 'SELL'
            else:
                signals[f'MA{period}'] = 'NEUTRAL'
        
        return signals

    def identify_patterns(self, data: pd.DataFrame) -> List[str]:
        patterns = []
        
        # Doji pattern
        body = abs(data['Open'] - data['Close'])
        wick = data['High'] - data['Low']
        if body.iloc[-1] < wick.iloc[-1] * 0.1:
            patterns.append('DOJI')
        
        # Hammer pattern
        if (data['Low'].iloc[-1] < data['Open'].iloc[-1] and 
            data['Low'].iloc[-1] < data['Close'].iloc[-1] and 
            data['High'].iloc[-1] - max(data['Open'].iloc[-1], data['Close'].iloc[-1]) < 
            min(data['Open'].iloc[-1], data['Close'].iloc[-1]) - data['Low'].iloc[-1] * 0.6):
            patterns.append('HAMMER')
        
        # Engulfing pattern
        if (data['Open'].iloc[-2] > data['Close'].iloc[-2] and  # Previous red candle
            data['Open'].iloc[-1] < data['Close'].iloc[-1] and  # Current green candle
            data['Open'].iloc[-1] < data['Close'].iloc[-2] and  # Opens below previous close
            data['Close'].iloc[-1] > data['Open'].iloc[-2]):    # Closes above previous open
            patterns.append('BULLISH_ENGULFING')
        
        return patterns

    def analyze(self, data: pd.DataFrame) -> Optional[TechnicalIndicators]:
        if len(data) < 100:  # Need enough data for analysis
            return None
            
        try:
            trend = self.identify_trend(data)
            strength = self.calculate_trend_strength(data)
            support, resistance = self.calculate_support_resistance(data)
            rsi = self.calculate_rsi(data)
            macd = self.calculate_macd(data)
            ma_signals = self.calculate_ma_signals(data)
            patterns = self.identify_patterns(data)
            
            return TechnicalIndicators(
                trend=trend,
                strength=strength,
                support=support,
                resistance=resistance,
                rsi=rsi,
                macd=macd,
                ma_signals=ma_signals,
                patterns=patterns
            )
        except Exception as e:
            print(f"Error in technical analysis: {e}")
            return None

technical_analyzer = TechnicalAnalyzer()
