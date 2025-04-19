import logging
from typing import Dict, List, Any
import asyncio
import json
from datetime import datetime, timedelta
from collections import defaultdict
from google import genai
import os
import google.generativeai as genai
import pandas as pd
import numpy as np
from datetime import datetime
import ta

class RateLimiter:
    def __init__(self):
        self.minute_requests = defaultdict(list)  # Tracks requests per minute
        self.day_requests = defaultdict(list)     # Tracks requests per day
        self.RPM_LIMIT = 15                       # Requests per minute limit
        self.RPD_LIMIT = 1500                     # Requests per day limit

    def can_make_request(self, timestamp: datetime) -> bool:
        """Check if we can make a new request based on rate limits"""
        # Clean up old requests
        self._cleanup_old_requests(timestamp)
        
        # Get current counts
        minute_count = len(self.minute_requests[timestamp.minute])
        day_count = len(self.day_requests[timestamp.date()])
        
        # Check if we're within limits
        return minute_count < self.RPM_LIMIT and day_count < self.RPD_LIMIT

    def add_request(self, timestamp: datetime):
        """Record a new request"""
        self.minute_requests[timestamp.minute].append(timestamp)
        self.day_requests[timestamp.date()].append(timestamp)

    def _cleanup_old_requests(self, current_time: datetime):
        """Remove expired requests"""
        # Clean minute requests
        minute_ago = current_time - timedelta(minutes=1)
        self.minute_requests = defaultdict(list, {
            k: [t for t in v if t > minute_ago]
            for k, v in self.minute_requests.items()
        })
        
        # Clean day requests
        today = current_time.date()
        self.day_requests = defaultdict(list, {
            k: v for k, v in self.day_requests.items()
            if k == today
        })

class GeminiTrader:
    def __init__(self):
        api_key = os.getenv('GEMINI_API_KEY')
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        
        genai.configure(api_key=api_key)
        # Updated to use the correct model name for the API version
        self.model = genai.GenerativeModel('gemini-1.5-pro')
        self.last_analysis_time = {}
        self.analysis_interval = timedelta(minutes=1)  # More frequent updates for scalping
        self.logger = logging.getLogger(__name__)
        self.rate_limiter = RateLimiter()
        self.cached_analyses = {}
        
    def _calculate_technical_indicators(self, df):
        """Calculate technical indicators for scalping and short-term trading"""
        # RSI with shorter period for scalping
        df['RSI'] = ta.momentum.RSIIndicator(df['close'], window=9).rsi()
        
        # MACD with faster settings
        macd = ta.trend.MACD(df['close'], window_fast=12, window_slow=26, window_sign=9)
        df['MACD'] = macd.macd()
        df['MACD_Signal'] = macd.macd_signal()
        
        # Bollinger Bands
        bollinger = ta.volatility.BollingerBands(df['close'], window=20, window_dev=2)
        df['BB_Upper'] = bollinger.bollinger_hband()
        df['BB_Lower'] = bollinger.bollinger_lband()
        df['BB_Middle'] = bollinger.bollinger_mavg()
        
        # Moving Averages for scalping
        df['EMA_8'] = ta.trend.EMAIndicator(df['close'], window=8).ema_indicator()
        df['EMA_21'] = ta.trend.EMAIndicator(df['close'], window=21).ema_indicator()
        df['EMA_50'] = ta.trend.EMAIndicator(df['close'], window=50).ema_indicator()
        df['EMA_200'] = ta.trend.EMAIndicator(df['close'], window=200).ema_indicator()
        
        # Stochastic RSI for scalping
        stoch_rsi = ta.momentum.StochRSIIndicator(df['close'])
        df['Stoch_RSI_K'] = stoch_rsi.stochrsi_k()
        df['Stoch_RSI_D'] = stoch_rsi.stochrsi_d()
        
        return df
        
    async def analyze_chart(self, df, symbol, timeframe='5m'):
        """Analyze chart data for scalping (5m) and short-term trading (15m) with news"""
        # Calculate technical indicators
        df = self._calculate_technical_indicators(df)
        
        # Get the most recent data points
        recent_data = df.tail(5)
        
        # Format the data for analysis
        current_price = recent_data['close'].iloc[-1]
        prev_close = recent_data['close'].iloc[-2]
        price_change = ((current_price - prev_close) / prev_close) * 100
        
        rsi = recent_data['RSI'].iloc[-1]
        macd = recent_data['MACD'].iloc[-1]
        macd_signal = recent_data['MACD_Signal'].iloc[-1]
        bb_upper = recent_data['BB_Upper'].iloc[-1]
        bb_lower = recent_data['BB_Lower'].iloc[-1]
        bb_middle = recent_data['BB_Middle'].iloc[-1]
        
        ema_8 = recent_data['EMA_8'].iloc[-1]
        ema_21 = recent_data['EMA_21'].iloc[-1]
        ema_50 = recent_data['EMA_50'].iloc[-1]
        ema_200 = recent_data['EMA_200'].iloc[-1]
        
        stoch_k = recent_data['Stoch_RSI_K'].iloc[-1]
        stoch_d = recent_data['Stoch_RSI_D'].iloc[-1]
        
        # Fetch latest news
        news_items = await self._fetch_forex_news(symbol)
        news_summary = "\n".join([f"- {item['title']} ({item['date']})" for item in news_items[:5]])
        
        # Create analysis prompt based on timeframe
        if timeframe == '5m':
            prompt = f"""As a forex scalping expert, analyze the following {symbol} {timeframe} chart data and news for quick scalping opportunities:

Current Price: {current_price:.5f} ({price_change:+.2f}%)

Scalping Indicators:
1. EMAs:
   - EMA 8: {ema_8:.5f}
   - EMA 21: {ema_21:.5f}
   - EMA 50: {ema_50:.5f}
   - EMA 200: {ema_200:.5f}

2. Momentum:
   - RSI: {rsi:.2f}
   - MACD: {macd:.5f}
   - MACD Signal: {macd_signal:.5f}
   - Stochastic RSI K: {stoch_k:.2f}
   - Stochastic RSI D: {stoch_d:.2f}

3. Volatility:
   - Bollinger Upper: {bb_upper:.5f}
   - Bollinger Middle: {bb_middle:.5f}
   - Bollinger Lower: {bb_lower:.5f}

Latest News:
{news_summary}

Provide a detailed scalping analysis including:
1. Whether there's an immediate scalping opportunity considering both technicals and news
2. Entry price levels with reasoning
3. Tight stop loss (in pips) considering market volatility
4. Quick take profit targets (in pips) based on key levels
5. Expected trade duration (in minutes)
6. Risk:Reward ratio
7. Market volatility assessment
8. News impact assessment and how it affects the scalp trade

Key Takeaway: Summarize your scalping recommendation in 2-3 sentences, integrating both technical and news factors."""
        else:  # 15m timeframe
            prompt = f"""As a short-term forex trader, analyze the following {symbol} {timeframe} chart data and news for swing trading opportunities:

Current Price: {current_price:.5f} ({price_change:+.2f}%)

Technical Indicators:
1. EMAs:
   - EMA 8: {ema_8:.5f}
   - EMA 21: {ema_21:.5f}
   - EMA 50: {ema_50:.5f}
   - EMA 200: {ema_200:.5f}

2. Momentum:
   - RSI: {rsi:.2f}
   - MACD: {macd:.5f}
   - MACD Signal: {macd_signal:.5f}
   - Stochastic RSI K: {stoch_k:.2f}
   - Stochastic RSI D: {stoch_d:.2f}

3. Volatility:
   - Bollinger Upper: {bb_upper:.5f}
   - Bollinger Middle: {bb_middle:.5f}
   - Bollinger Lower: {bb_lower:.5f}

Latest News:
{news_summary}

Provide a detailed swing trading analysis including:
1. Trade Signal (Buy/Sell) based on both technicals and news
2. Entry Price Range with reasoning
3. Stop Loss Level considering volatility
4. Take Profit Targets (multiple levels)
5. Key Support and Resistance Levels
6. Trade Duration Expectation
7. Risk:Reward Ratio
8. Trend Strength Assessment
9. News Impact Analysis and how it affects the trade setup

Important Notes:
- This analysis is for educational purposes only
- Always use proper risk management
- Monitor the trade and adjust levels as needed"""
        
        # Get analysis from Gemini
        response = self.model.generate_content(prompt)
        
        return response.text
        
    async def _fetch_forex_news(self, symbol):
        """Fetch latest forex news for the given symbol"""
        try:
            # Extract currency pairs
            if '/' in symbol:
                base, quote = symbol.split('/')
            else:
                base = symbol[:3]
                quote = symbol[3:]
                
            # Use feedparser to get news from multiple sources
            news_sources = [
                'https://www.fxempire.com/news/forex-news/feed',
                'https://www.investing.com/rss/forex.rss',
                'https://www.forexlive.com/feed'
            ]
            
            news_items = []
            for source in news_sources:
                feed = feedparser.parse(source)
                for entry in feed.entries:
                    if base in entry.title or quote in entry.title:
                        news_items.append({
                            'title': entry.title,
                            'date': entry.published,
                            'summary': entry.summary
                        })
                        
            # Sort by date (newest first) and return top items
            news_items.sort(key=lambda x: x['date'], reverse=True)
            return news_items[:10]
            
        except Exception as e:
            print(f"Error fetching news: {str(e)}")
            return []
        
    def get_ai_analysis(self, market_data, news_sentiment=None):
        """Get AI analysis for trading decisions"""
        df = pd.DataFrame(market_data)
        
        # Calculate technical indicators
        df = self._calculate_technical_indicators(df)
        
        # Prepare the prompt
        prompt = self._prepare_analysis_prompt(df, news_sentiment)
        
        # Get analysis from Gemini
        response = self.model.generate_content(prompt)
        
        return response.text
        


    async def get_real_time_analysis(self, symbol: str, current_price: float, indicators: Dict[str, float], support_resistance: Dict[str, List[float]], market_context: Dict[str, str], timeframe: str = '1h') -> Dict[str, Any]:
        current_time = datetime.now()

        # Check cache first
        cache_key = f"{symbol}_{current_time.strftime('%Y%m%d_%H%M')}"
        if hasattr(self, 'cached_analyses') and cache_key in self.cached_analyses:
            return self.cached_analyses[cache_key]

        # Prepare the prompt for Gemini
        prompt = f"""
        Analyze the following forex market data for {symbol}:

Current Market Conditions:
- Current Price: {current_price}
- Trend: {market_context['trend']}
- Volatility: {market_context['volatility']}
- Momentum: {market_context['momentum']}

Technical Indicators:
- RSI: {indicators['RSI']:.2f}
- MACD: {indicators['MACD']:.2f}
- MACD Signal: {indicators['MACD_Signal']:.2f}
- SMA 20: {indicators['SMA_20']:.4f}
- SMA 50: {indicators['SMA_50']:.4f}
- SMA 200: {indicators['SMA_200']:.4f}
- ADX: {indicators['ADX']:.2f}
- ATR: {indicators['ATR']:.4f}

Support Levels: {support_resistance['support']}
Resistance Levels: {support_resistance['resistance']}

Based on this data, provide a detailed trading analysis in the following JSON format:
{{
    "trade_recommendation": "BUY/SELL/NO_TRADE",
    "entry_price": float,
    "stop_loss": float,
    "take_profit_targets": [float, float],
    "risk_reward_ratio": float,
    "trade_timeframe": "{timeframe}",
    "key_levels_to_watch": {{
        "support": float,
        "resistance": float
    }},
    "market_analysis": "Detailed reasoning"
}}
"""

        try:
            # Get analysis from Gemini
            response = self.model.generate_content(prompt)
            
            # Extract the JSON response
            analysis_text = response.text
            
            # Try to find and parse JSON content with multiple approaches
            try:
                # First attempt: Try to find JSON content between ```json and ```
                if '```json' in analysis_text:
                    json_content = analysis_text.split('```json')[1].split('```')[0].strip()
                    analysis = json.loads(json_content)
                # Second attempt: Try to find JSON content between ``` and ```
                elif '```' in analysis_text:
                    json_content = analysis_text.split('```')[1].split('```')[0].strip()
                    analysis = json.loads(json_content)
                # Third attempt: Try to parse the whole text as JSON
                else:
                    analysis = json.loads(analysis_text.strip())
            except json.JSONDecodeError as e:
                self.logger.error(f"Error parsing JSON from Gemini response: {str(e)}")
                # Create a simplified response with the raw text as fallback
                analysis = {
                    "trade_recommendation": "NO_TRADE",
                    "entry_price": current_price,
                    "stop_loss": current_price * 0.99,
                    "take_profit_targets": [current_price * 1.01, current_price * 1.02],
                    "risk_reward_ratio": 1.0,
                    "trade_timeframe": timeframe,
                    "key_levels_to_watch": {
                        "support": float(support_resistance['support'][0]),
                        "resistance": float(support_resistance['resistance'][0])
                    },
                    "market_analysis": "Unable to parse Gemini response. Please try again later.",
                    "raw_response": analysis_text
                }
            
            # Add timestamp and symbol
            analysis['timestamp'] = current_time.isoformat()
            analysis['symbol'] = symbol
            analysis['current_price'] = current_price
            
            # Cache the analysis
            if not hasattr(self, 'cached_analyses'):
                self.cached_analyses = {}
            self.cached_analyses[cache_key] = analysis
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"Error getting Gemini analysis: {str(e)}")
            return {
                "error": str(e),
                "timestamp": current_time.isoformat(),
                "symbol": symbol,
                "current_price": current_price
            }

    def _get_fallback_analysis(self, 
                             symbol: str, 
                             current_price: float,
                             technical_indicators: Dict[str, float],
                             market_context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generate fallback analysis when Gemini is unavailable or rate limited
        """
        # Use technical indicators for basic analysis
        rsi = technical_indicators['RSI']
        macd = technical_indicators['MACD']
        macd_signal = technical_indicators['MACD_Signal']
        
        # Determine trade direction
        if rsi > 70 and macd < macd_signal:
            recommendation = "SELL"
        elif rsi < 30 and macd > macd_signal:
            recommendation = "BUY"
        else:
            recommendation = "NO_TRADE"
        
        return {
            "trade_recommendation": recommendation,
            "entry_price": current_price,
            "stop_loss": current_price * 0.995 if recommendation == "BUY" else current_price * 1.005,
            "take_profit_targets": [
                current_price * 1.01 if recommendation == "BUY" else current_price * 0.99,
                current_price * 1.02 if recommendation == "BUY" else current_price * 0.98
            ],
            "risk_reward_ratio": 2.0,
            "trade_timeframe": "5m",
            "key_levels_to_watch": {
                "support": current_price * 0.995,
                "resistance": current_price * 1.005
            },
            "market_analysis": "Fallback analysis based on technical indicators",
            "timestamp": datetime.now().isoformat(),
            "symbol": symbol,
            "current_price": current_price
        }

    def _cleanup_cache(self, current_time: datetime):
        """Clean up old cache entries"""
        cutoff_time = current_time - timedelta(minutes=10)
        self.cached_analyses = {
            k: v for k, v in self.cached_analyses.items()
            if datetime.strptime(k.split('_')[1], '%Y%m%d_%H%M') > cutoff_time
        }
        
    def _validate_price_levels(self, 
                             entry: float, 
                             stop_loss: float, 
                             take_profit: float, 
                             current_price: float) -> bool:
        """
        Validate if the price levels make sense
        """
        # Check if prices are reasonable (within 5% of current price)
        max_deviation = current_price * 0.05
        
        if abs(entry - current_price) > max_deviation:
            return False
            
        if abs(stop_loss - entry) > max_deviation:
            return False
            
        if abs(take_profit - entry) > max_deviation:
            return False
            
        return True


        """Get real-time trading analysis"""
        
        # Check rate limiting
        if not self.rate_limiter.can_make_request(datetime.now()):
            return "Rate limit exceeded. Please try again later."
            
        # Check if we have a recent analysis
        now = datetime.now()
        last_analysis = self.last_analysis_time.get(symbol)
        if last_analysis and (now - last_analysis) < self.analysis_interval:
            return self.cached_analyses.get(symbol, "Recent analysis not found")
            
        # Update last analysis time
        self.last_analysis_time[symbol] = now
        
        # Prepare the prompt
        prompt = f"""Analyze the following forex trading data for {symbol}:

Current Price: {current_price}
Historical Data: {historical_data}
News Sentiment: {news_sentiment if news_sentiment is not None else 'Not available'}

Provide:
1. Trading signal (buy/sell/hold)
2. Entry price recommendation
3. Stop loss and take profit levels
4. Risk assessment
5. Confidence level (percentage)

Base your analysis on technical indicators, price action, and market sentiment."""

        try:
            # Get analysis from Gemini
            response = self.model.generate_content(prompt)
            analysis = response.text
            
            # Cache the analysis
            self.cached_analyses[symbol] = analysis
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"Error getting analysis: {str(e)}")
            return f"Error: {str(e)}"
