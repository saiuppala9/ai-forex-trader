import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
import logging
import json
from datetime import datetime, timedelta
import asyncio
import aiohttp
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class AITrader:
    def __init__(self):
        self.sentiment_sources = [
            'https://www.forexfactory.com/calendar',
            'https://www.investing.com/news/forex-news',
            'https://www.dailyfx.com/market-news'
        ]
        self.pattern_weights = {
            'bullish': {
                'hammer': 0.7,
                'morning_star': 0.8,
                'engulfing': 0.6,
                'three_white_soldiers': 0.9
            },
            'bearish': {
                'hanging_man': 0.7,
                'evening_star': 0.8,
                'engulfing': 0.6,
                'three_black_crows': 0.9
            }
        }

    def _detect_candlestick_patterns(self, df: pd.DataFrame) -> List[Dict]:
        """Detect candlestick patterns in the data"""
        patterns = []
        
        try:
            for i in range(len(df) - 1):
                current = df.iloc[i]
                prev = df.iloc[i-1] if i > 0 else None
                next_candle = df.iloc[i+1] if i < len(df) - 1 else None
                
                # Calculate candle properties
                body = current['Close'] - current['Open']
                upper_wick = current['High'] - max(current['Open'], current['Close'])
                lower_wick = min(current['Open'], current['Close']) - current['Low']
                
                # Detect hammer (bullish)
                if (lower_wick > abs(body) * 2) and (upper_wick < abs(body) * 0.5):
                    patterns.append({
                        'pattern': 'hammer',
                        'type': 'bullish',
                        'confidence': self.pattern_weights['bullish']['hammer'],
                        'timestamp': df.index[i]
                    })
                
                # Detect hanging man (bearish)
                if (upper_wick > abs(body) * 2) and (lower_wick < abs(body) * 0.5):
                    patterns.append({
                        'pattern': 'hanging_man',
                        'type': 'bearish',
                        'confidence': self.pattern_weights['bearish']['hanging_man'],
                        'timestamp': df.index[i]
                    })
                
                # Detect engulfing patterns
                if prev is not None:
                    prev_body = prev['Close'] - prev['Open']
                    
                    # Bullish engulfing
                    if (prev_body < 0) and (body > 0) and (current['Open'] < prev['Close']) and (current['Close'] > prev['Open']):
                        patterns.append({
                            'pattern': 'engulfing',
                            'type': 'bullish',
                            'confidence': self.pattern_weights['bullish']['engulfing'],
                            'timestamp': df.index[i]
                        })
                    
                    # Bearish engulfing
                    if (prev_body > 0) and (body < 0) and (current['Open'] > prev['Close']) and (current['Close'] < prev['Open']):
                        patterns.append({
                            'pattern': 'engulfing',
                            'type': 'bearish',
                            'confidence': self.pattern_weights['bearish']['engulfing'],
                            'timestamp': df.index[i]
                        })
                
                # Detect three white soldiers (bullish)
                if i >= 2:
                    if all(df.iloc[j]['Close'] > df.iloc[j]['Open'] for j in range(i-2, i+1)):
                        if all(df.iloc[j]['Open'] > df.iloc[j-1]['Open'] for j in range(i-1, i+1)):
                            patterns.append({
                                'pattern': 'three_white_soldiers',
                                'type': 'bullish',
                                'confidence': self.pattern_weights['bullish']['three_white_soldiers'],
                                'timestamp': df.index[i]
                            })
                
                # Detect three black crows (bearish)
                if i >= 2:
                    if all(df.iloc[j]['Close'] < df.iloc[j]['Open'] for j in range(i-2, i+1)):
                        if all(df.iloc[j]['Open'] < df.iloc[j-1]['Open'] for j in range(i-1, i+1)):
                            patterns.append({
                                'pattern': 'three_black_crows',
                                'type': 'bearish',
                                'confidence': self.pattern_weights['bearish']['three_black_crows'],
                                'timestamp': df.index[i]
                            })
        
        except Exception as e:
            logger.error(f"Error detecting patterns: {str(e)}")
        
        return patterns

    async def _analyze_sentiment(self, symbol: str) -> float:
        """Analyze market sentiment using news and economic calendar"""
        try:
            sentiment_score = 0
            total_sources = 0
            
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            
            async with aiohttp.ClientSession() as session:
                for source in self.sentiment_sources:
                    try:
                        async with session.get(source, headers=headers) as response:
                            if response.status == 200:
                                html = await response.text()
                                soup = BeautifulSoup(html, 'html.parser')
                                
                                # Find relevant news/events
                                news_items = soup.find_all(['article', 'tr', 'div'], class_=['news-item', 'calendar-event'])
                                
                                for item in news_items:
                                    text = item.get_text().lower()
                                    
                                    # Check if the news is related to our symbol
                                    if symbol.lower() in text:
                                        # Simple sentiment analysis based on keywords
                                        positive_words = ['bullish', 'surge', 'gain', 'rise', 'higher', 'strong', 'positive']
                                        negative_words = ['bearish', 'fall', 'drop', 'decline', 'lower', 'weak', 'negative']
                                        
                                        # Calculate sentiment for this item
                                        pos_count = sum(1 for word in positive_words if word in text)
                                        neg_count = sum(1 for word in negative_words if word in text)
                                        
                                        if pos_count + neg_count > 0:
                                            item_sentiment = (pos_count - neg_count) / (pos_count + neg_count)
                                            sentiment_score += item_sentiment
                                            total_sources += 1
                                
                    except Exception as e:
                        logger.error(f"Error fetching sentiment from {source}: {str(e)}")
                        continue
            
            # Normalize sentiment score to [-1, 1]
            return sentiment_score / total_sources if total_sources > 0 else 0
            
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {str(e)}")
            return 0

    def _calculate_support_resistance(self, df: pd.DataFrame, window: int = 20) -> Tuple[float, float]:
        """Calculate support and resistance levels using price action"""
        try:
            # Get recent price swings
            highs = df['High'].rolling(window=window).max()
            lows = df['Low'].rolling(window=window).min()
            
            # Find potential support levels
            recent_lows = lows.nsmallest(3)
            support = recent_lows.mean()
            
            # Find potential resistance levels
            recent_highs = highs.nlargest(3)
            resistance = recent_highs.mean()
            
            return support, resistance
            
        except Exception as e:
            logger.error(f"Error calculating support/resistance: {str(e)}")
            return df['Low'].min(), df['High'].max()

    async def analyze_market(self, df: pd.DataFrame) -> Dict:
        """Perform comprehensive market analysis"""
        try:
            # Detect candlestick patterns
            patterns = self._detect_candlestick_patterns(df)
            
            # Calculate support and resistance
            support, resistance = self._calculate_support_resistance(df)
            
            # Get market sentiment
            sentiment = await self._analyze_sentiment(symbol="EURUSD")  # Replace with actual symbol
            
            # Calculate trend strength using moving averages
            sma_20 = df['SMA_20'].iloc[-1]
            ema_20 = df['EMA_20'].iloc[-1]
            current_price = df['Close'].iloc[-1]
            
            trend = "BULLISH" if current_price > sma_20 and current_price > ema_20 else "BEARISH"
            
            # Calculate entry points
            entry_price = current_price
            
            if trend == "BULLISH":
                target_price = entry_price + (resistance - entry_price) * 0.8
                stop_loss = support
            else:
                target_price = entry_price - (entry_price - support) * 0.8
                stop_loss = resistance
            
            # Calculate risk-reward ratio
            risk = abs(entry_price - stop_loss)
            reward = abs(target_price - entry_price)
            rr_ratio = reward / risk if risk > 0 else 0
            
            # Combine technical and sentiment analysis
            confidence = 0
            pattern_signals = []
            
            for pattern in patterns[-3:]:  # Look at last 3 patterns
                if pattern['type'] == trend.lower():
                    confidence += pattern['confidence']
                    pattern_signals.append(pattern['pattern'])
            
            # Adjust confidence based on sentiment
            sentiment_weight = 0.3
            confidence = (confidence + abs(sentiment) * sentiment_weight) / (1 + sentiment_weight)
            
            return {
                'timestamp': datetime.utcnow().isoformat(),
                'trend': trend,
                'confidence': round(confidence, 2),
                'entry_price': round(entry_price, 5),
                'target_price': round(target_price, 5),
                'stop_loss': round(stop_loss, 5),
                'support': round(support, 5),
                'resistance': round(resistance, 5),
                'risk_reward_ratio': round(rr_ratio, 2),
                'patterns': pattern_signals,
                'sentiment': round(sentiment, 2),
                'indicators': {
                    'RSI': round(df['RSI'].iloc[-1], 2),
                    'SMA_20': round(sma_20, 2),
                    'EMA_20': round(ema_20, 2),
                    'BB_Position': round((current_price - df['BB_Lower'].iloc[-1]) / 
                                      (df['BB_Upper'].iloc[-1] - df['BB_Lower'].iloc[-1]), 2)
                }
            }
            
        except Exception as e:
            logger.error(f"Error analyzing market: {str(e)}")
            raise

# Create global instance
ai_trader = AITrader()
