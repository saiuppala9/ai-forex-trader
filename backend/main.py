import os
from dotenv import load_dotenv
load_dotenv()  # Load environment variables from .env file

from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import uvicorn
import aiohttp
import json
import yfinance as yf
import pandas as pd
import numpy as np
import ta
import tensorflow as tf
import asyncio
import nltk
from nltk.sentiment import SentimentIntensityAnalyzer
from bs4 import BeautifulSoup
import feedparser
import logging
import time
from technical_analysis import technical_analyzer
from ai_models import AIMarketAnalyzer
from binance.client import Client
from binance.exceptions import BinanceAPIException
from gemini_trader import GeminiTrader
from order_book import order_book_analyzer

logger = logging.getLogger(__name__)

app = FastAPI(title="AI Forex Trading System")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
SECRET_KEY = "your-secret-key-here"  # In production, use environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# Mock database (replace with real database in production)
users_db = {}
watchlist_db = {}

# Market data sources
MARKET_DATA_SOURCES = {
    'PRIMARY': 'https://www.alphavantage.co/query',
    'BACKUP': 'https://query1.finance.yahoo.com/v7/finance/quote'
}

# News sources
NEWS_SOURCES = {
    'FX Empire': 'https://www.fxempire.com/news/forex-news/feed',
    'Investing.com': 'https://www.investing.com/rss/forex.rss',
    'ForexLive': 'https://www.forexlive.com/feed',
    'DailyFX': 'https://www.dailyfx.com/feeds/market-news'
}

# Maximum number of news items to fetch
MAX_NEWS_ITEMS = 10

# Rate limiting configuration
RATE_LIMITS = {
    'YAHOO': {'requests': 2, 'per_second': 1},  # 2 requests per second
    'ALPHA_VANTAGE': {'requests': 5, 'per_minute': 1},  # 5 requests per minute
    'RSS_FEEDS': {'requests': 1, 'per_second': 1}  # 1 request per second
}

class RateLimiter:
    def __init__(self):
        self.last_request_time = {}
        self.request_counts = {}
        
    async def wait_if_needed(self, source: str):
        current_time = time.time()
        
        if source not in self.last_request_time:
            self.last_request_time[source] = current_time
            self.request_counts[source] = 1
            return
            
        if source == 'YAHOO':
            if current_time - self.last_request_time[source] < 1:  # Less than 1 second
                await asyncio.sleep(1)
            self.last_request_time[source] = current_time
            
        elif source == 'ALPHA_VANTAGE':
            if current_time - self.last_request_time[source] < 60:  # Less than 1 minute
                if self.request_counts[source] >= 5:
                    await asyncio.sleep(60 - (current_time - self.last_request_time[source]))
                    self.request_counts[source] = 0
                    self.last_request_time[source] = current_time
                else:
                    self.request_counts[source] += 1
            else:
                self.request_counts[source] = 1
                self.last_request_time[source] = current_time
                
        elif source == 'RSS_FEEDS':
            if current_time - self.last_request_time[source] < 1:
                await asyncio.sleep(1)
            self.last_request_time[source] = current_time

rate_limiter = RateLimiter()

# Initialize Binance client
binance_client = Client(None, None)  # No API keys needed for public market data

async def fetch_forex_data(symbol: str):
    """Fetch real-time forex data using yfinance"""
    try:
        # Format symbol for yfinance (e.g., EUR/USD -> EURUSD=X)
        yf_symbol = symbol.replace('/', '') + '=X' if '/' in symbol else symbol
        
        # Fetch historical data from yfinance
        df = yf.download(yf_symbol, period='1d', interval='5m', progress=False)
        
        # If data is empty, try alternative symbol format
        if len(df) == 0:
            # Try without =X suffix
            yf_symbol = symbol.replace('/', '')
            df = yf.download(yf_symbol, period='1d', interval='5m', progress=False)
            
        # If still empty, use fallback method
        if len(df) == 0:
            logger.warning(f"Could not fetch data for {symbol} using yfinance, using fallback")
            # Get current price from get_forex_price function
            current_price = await get_forex_price(symbol)
            price = float(current_price['price'])
            
            # Create historical sample data based on real current price
            df = pd.DataFrame({
                'Open': np.linspace(price * 0.998, price * 0.999, 50),
                'High': np.linspace(price * 1.001, price * 1.002, 50) + np.random.normal(0, price * 0.0001, 50),
                'Low': np.linspace(price * 0.997, price * 0.998, 50) - np.random.normal(0, price * 0.0001, 50),
                'Close': np.linspace(price * 0.999, price, 50) + np.random.normal(0, price * 0.0001, 50),
                'Volume': np.random.randint(1000, 2000, 50)
            })
            
            # Add timestamps
            df.index = pd.date_range(end=pd.Timestamp.now(), periods=len(df), freq='5min')
            
        # Ensure we have all required columns
        if 'Adj Close' in df.columns:
            df = df.drop('Adj Close', axis=1)
            
        return df
        
    except Exception as e:
        logger.error(f"Error fetching forex data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Technical Analysis Functions
def calculate_technical_indicators(df):
    """Calculate technical indicators using TA-Lib"""
    try:
        # Ensure all required columns exist and are numeric
        required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
        for col in required_columns:
            if col not in df.columns:
                raise ValueError(f"Required column {col} not found in dataframe")
            
            # Convert to numeric if needed
            if not pd.api.types.is_numeric_dtype(df[col]):
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Handle NaN values
        df = df.fillna(method='ffill').fillna(method='bfill')
        
        # Calculate indicators with error handling
        # RSI
        df['RSI'] = ta.momentum.rsi(df['Close'], window=14)
        
        # MACD
        df['MACD'] = ta.trend.macd_diff(df['Close'])
        df['MACD_Signal'] = ta.trend.macd_signal(df['Close'])
        
        # Moving Averages
        df['SMA_20'] = ta.trend.sma_indicator(df['Close'], window=20)
        df['SMA_50'] = ta.trend.sma_indicator(df['Close'], window=50)
        df['SMA_200'] = ta.trend.sma_indicator(df['Close'], window=200)
        
        # Stochastic
        df['Stochastic_K'] = ta.momentum.stoch(df['High'], df['Low'], df['Close'])
        df['Stochastic_D'] = ta.momentum.stoch_signal(df['High'], df['Low'], df['Close'])
        
        # ADX
        df['ADX'] = ta.trend.adx(df['High'], df['Low'], df['Close'])
        
        # ATR for volatility
        df['ATR'] = ta.volatility.average_true_range(df['High'], df['Low'], df['Close'])
        
        # Replace any NaN values that might have been introduced
        numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
        df[numeric_cols] = df[numeric_cols].fillna(method='ffill').fillna(method='bfill').fillna(0)
        
        logger.info(f"Successfully calculated technical indicators. Shape: {df.shape}")
    except Exception as e:
        logger.error(f"Error calculating technical indicators: {str(e)}")
        # Create default values for indicators to avoid breaking the analysis
        for indicator in ['RSI', 'MACD', 'MACD_Signal', 'SMA_20', 'SMA_50', 'SMA_200', 'Stochastic_K', 'Stochastic_D', 'ADX', 'ATR']:
            if indicator not in df.columns:
                df[indicator] = 50.0  # Neutral default value
    
    return df

def calculate_supertrend(df, period=10, multiplier=3):
    """Calculate Supertrend indicator"""
    hl2 = (df['High'] + df['Low']) / 2
    atr = ta.volatility.average_true_range(df['High'], df['Low'], df['Close'], window=period)
    
    upper_band = hl2 + (multiplier * atr)
    lower_band = hl2 - (multiplier * atr)
    
    supertrend = pd.Series(index=df.index)
    direction = pd.Series(index=df.index)
    
    for i in range(1, len(df.index)):
        if df['Close'][i] > upper_band[i-1]:
            direction[i] = 1
        elif df['Close'][i] < lower_band[i-1]:
            direction[i] = -1
        else:
            direction[i] = direction[i-1]
            
        if direction[i] == 1:
            supertrend[i] = lower_band[i]
        else:
            supertrend[i] = upper_band[i]
    
    return supertrend

def get_signal_strength(indicators):
    """Calculate trading signal strength based on multiple indicators"""
    signals = {
        'trend': 0,  # -1 for downtrend, 1 for uptrend
        'momentum': 0,  # -1 for oversold, 1 for overbought
        'volatility': 0,  # 0 for normal, 1 for high volatility
        'strength': 0  # Overall signal strength
    }
    
    # Trend Analysis
    if (indicators['SMA_20'] > indicators['SMA_50'] and 
        indicators['SMA_50'] > indicators['SMA_200']):
        signals['trend'] = 1
    elif (indicators['SMA_20'] < indicators['SMA_50'] and 
          indicators['SMA_50'] < indicators['SMA_200']):
        signals['trend'] = -1
        
    # Momentum Analysis
    if (indicators['RSI'] > 70 or 
        (indicators['Stochastic_K'] > 80 and indicators['Stochastic_D'] > 80)):
        signals['momentum'] = 1
    elif (indicators['RSI'] < 30 or 
          (indicators['Stochastic_K'] < 20 and indicators['Stochastic_D'] < 20)):
        signals['momentum'] = -1
        
    # Volatility Analysis
    bb_width = (indicators['Upper_Band'] - indicators['Lower_Band']) / indicators['Middle_Band']
    if bb_width > 0.05:  # High volatility threshold
        signals['volatility'] = 1
        
    # Calculate overall signal strength
    trend_weight = 0.4
    momentum_weight = 0.3
    volatility_weight = 0.3
    
    signals['strength'] = (
        abs(signals['trend']) * trend_weight +
        abs(signals['momentum']) * momentum_weight +
        signals['volatility'] * volatility_weight
    )
    
    return signals

async def fetch_forex_news(symbol: str):
    """Fetch and analyze forex related news from free sources with rate limiting"""
    news_data = []
    
    async with aiohttp.ClientSession() as session:
        for source_name, url in NEWS_SOURCES.items():
            try:
                await rate_limiter.wait_if_needed('RSS_FEEDS')
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
                async with session.get(url, headers=headers) as response:
                    if response.status == 200:
                        text = await response.text()
                        # Parse RSS feed and extract news
                        news_data.extend(await parse_news_feed(text, symbol))
            except Exception as e:
                logger.error(f"Error fetching news from {source_name}: {str(e)}")
                continue
    
    # Sort news by timestamp and remove duplicates
    news_data.sort(key=lambda x: x['timestamp'], reverse=True)
    seen = set()
    unique_news = []
    for item in news_data:
        if item['title'] not in seen:
            seen.add(item['title'])
            unique_news.append(item)
    
    return unique_news[:MAX_NEWS_ITEMS]

async def parse_news_feed(content: str, symbol: str):
    """Parse news feed and extract relevant information"""
    news_items = []
    try:
        feed = feedparser.parse(content)
        
        for entry in feed.entries[:10]:
            soup = BeautifulSoup(entry.description, 'html.parser')
            text = soup.get_text()
            
            if is_news_relevant(text, symbol):
                news_items.append({
                    'title': entry.title,
                    'summary': text[:200],
                    'url': entry.link,
                    'timestamp': entry.get('published', datetime.now().isoformat()),
                    'sentiment': analyze_news_sentiment(text),
                    'impact_score': calculate_news_impact(text, symbol)
                })
    except Exception as e:
        logger.error(f"Error parsing news feed: {str(e)}")
    
    return news_items

def is_news_relevant(text: str, symbol: str):
    """Check if news is relevant to the given symbol"""
    # Convert symbol format for better matching
    currency_map = {
        'EUR': ['Euro', 'EUR', 'Eurozone'],
        'USD': ['Dollar', 'USD', 'Fed', 'Federal Reserve'],
        'GBP': ['Pound', 'Sterling', 'GBP', 'Bank of England'],
        'JPY': ['Yen', 'JPY', 'Bank of Japan'],
        # Add more currencies as needed
    }
    
    symbol_parts = [s for s in [symbol[i:i+3] for i in (0, 3)] if s]
    keywords = []
    for part in symbol_parts:
        if part in currency_map:
            keywords.extend(currency_map[part])
    
    return any(keyword.lower() in text.lower() for keyword in keywords)

def analyze_news_sentiment(text: str):
    """Analyze sentiment of news text using NLTK"""
    sia = SentimentIntensityAnalyzer()
    sentiment_scores = sia.polarity_scores(text)
    
    # Convert sentiment scores to trading signal
    if sentiment_scores['compound'] >= 0.2:
        return {'score': sentiment_scores['compound'], 'signal': 'BULLISH'}
    elif sentiment_scores['compound'] <= -0.2:
        return {'score': sentiment_scores['compound'], 'signal': 'BEARISH'}
    else:
        return {'score': sentiment_scores['compound'], 'signal': 'NEUTRAL'}

def calculate_news_impact(text: str, symbol: str):
    """Calculate potential market impact of news"""
    impact_keywords = {
        'HIGH': ['rate decision', 'interest rate', 'federal reserve', 'ecb', 'bank of japan',
                'inflation', 'gdp', 'unemployment', 'recession', 'crisis'],
        'MEDIUM': ['trade balance', 'retail sales', 'manufacturing', 'pmi', 'economic growth',
                  'treasury yields', 'market sentiment'],
        'LOW': ['forecast', 'outlook', 'analysis', 'technical', 'prediction']
    }
    
    text_lower = text.lower()
    
    # Check for high impact keywords
    if any(keyword in text_lower for keyword in impact_keywords['HIGH']):
        return 0.8
    elif any(keyword in text_lower for keyword in impact_keywords['MEDIUM']):
        return 0.5
    elif any(keyword in text_lower for keyword in impact_keywords['LOW']):
        return 0.2
    return 0.1

# Initialize AI analyzer
ai_analyzer = AIMarketAnalyzer()
gemini_trader = GeminiTrader()

async def get_ai_analysis(symbol: str, timeframe: str = "1h"):
    """Get AI-powered market analysis"""
    try:
        # Fetch market data
        df = await fetch_forex_data(symbol)
        
        # Calculate technical indicators
        df = calculate_technical_indicators(df)
        
        # Fill NaN values with forward fill then backward fill
        df = df.fillna(method='ffill').fillna(method='bfill')
        
        if len(df) == 0:
            raise HTTPException(status_code=400, detail="Insufficient data for analysis")
        
        # Get latest values
        current_price = df['Close'].iloc[-1]
        
        # Prepare technical indicators for Gemini
        indicators = {
            'RSI': float(df['RSI'].iloc[-1]),
            'MACD': float(df['MACD'].iloc[-1]),
            'MACD_Signal': float(df['MACD_Signal'].iloc[-1]),
            'SMA_20': float(df['SMA_20'].iloc[-1]),
            'SMA_50': float(df['SMA_50'].iloc[-1]),
            'SMA_200': float(df['SMA_200'].iloc[-1]),
            'ATR': float(df['ATR'].iloc[-1]),
            'ADX': float(df['ADX'].iloc[-1])
        }
        
        # Determine market context
        market_context = {
            'trend': 'UPTREND' if indicators['SMA_20'] > indicators['SMA_50'] else 'DOWNTREND',
            'volatility': 'HIGH' if indicators['ATR'] > df['ATR'].mean() else 'LOW',
            'momentum': 'STRONG' if abs(indicators['RSI'] - 50) > 20 else 'WEAK'
        }
        
        # Get support and resistance levels
        support_resistance = {
            'support': [float(df['Low'].min()), float(df['Close'].quantile(0.25))],
            'resistance': [float(df['Close'].quantile(0.75)), float(df['High'].max())]
        }
        
        # Get Gemini analysis
        analysis = await gemini_trader.get_real_time_analysis(
            symbol,
            current_price,
            indicators,
            support_resistance,
            market_context,
            timeframe
        )
        
        return analysis
        
    except Exception as e:
        logger.error(f"Error in AI analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def analyze_candlestick_patterns(df):
    """Analyze candlestick patterns for the last week"""
    patterns = {}
    
    # Basic candlestick patterns
    patterns['doji'] = ta.momentum.doji(df['Open'], df['High'], df['Low'], df['Close'])
    patterns['engulfing'] = ta.momentum.engulfing(df['Open'], df['High'], df['Low'], df['Close'])
    patterns['hammer'] = ta.momentum.hammer(df['Open'], df['High'], df['Low'], df['Close'])
    patterns['shooting_star'] = ta.momentum.shooting_star(df['Open'], df['High'], df['Low'], df['Close'])
    patterns['morning_star'] = ta.momentum.morning_star(df['Open'], df['High'], df['Low'], df['Close'])
    patterns['evening_star'] = ta.momentum.evening_star(df['Open'], df['High'], df['Low'], df['Close'])
    
    # Convert to DataFrame for easier analysis
    pattern_df = pd.DataFrame(patterns)
    recent_patterns = pattern_df.tail(7)  # Last week's patterns
    
    return recent_patterns

def analyze_price_action(df):
    """Analyze price action patterns and momentum"""
    analysis = {
        'trends': [],
        'swings': [],
        'momentum_shifts': []
    }
    
    # Analyze last week's data
    recent_df = df.tail(7 * 24)  # 7 days of hourly data
    
    # Identify swing highs and lows
    for i in range(2, len(recent_df)-2):
        if recent_df['High'].iloc[i] > recent_df['High'].iloc[i-1] and \
           recent_df['High'].iloc[i] > recent_df['High'].iloc[i-2] and \
           recent_df['High'].iloc[i] > recent_df['High'].iloc[i+1] and \
           recent_df['High'].iloc[i] > recent_df['High'].iloc[i+2]:
            analysis['swings'].append({
                'type': 'swing_high',
                'price': recent_df['High'].iloc[i],
                'time': recent_df.index[i]
            })
        
        if recent_df['Low'].iloc[i] < recent_df['Low'].iloc[i-1] and \
           recent_df['Low'].iloc[i] < recent_df['Low'].iloc[i-2] and \
           recent_df['Low'].iloc[i] < recent_df['Low'].iloc[i+1] and \
           recent_df['Low'].iloc[i] < recent_df['Low'].iloc[i+2]:
            analysis['swings'].append({
                'type': 'swing_low',
                'price': recent_df['Low'].iloc[i],
                'time': recent_df.index[i]
            })
    
    # Analyze momentum shifts
    recent_df['momentum'] = recent_df['Close'] - recent_df['Open']
    recent_df['momentum_ma'] = recent_df['momentum'].rolling(window=12).mean()
    
    for i in range(1, len(recent_df)):
        if recent_df['momentum_ma'].iloc[i] > 0 and recent_df['momentum_ma'].iloc[i-1] <= 0:
            analysis['momentum_shifts'].append({
                'type': 'bullish_shift',
                'time': recent_df.index[i]
            })
        elif recent_df['momentum_ma'].iloc[i] < 0 and recent_df['momentum_ma'].iloc[i-1] >= 0:
            analysis['momentum_shifts'].append({
                'type': 'bearish_shift',
                'time': recent_df.index[i]
            })
    
    return analysis

class MultiModelPredictor:
    def __init__(self):
        self.lstm_model = self._build_lstm_model()
        self.gru_model = self._build_gru_model()
        self.transformer_model = self._build_transformer_model()
        self.scaler = MinMaxScaler()
        
    def _build_lstm_model(self):
        model = tf.keras.Sequential([
            tf.keras.layers.LSTM(100, return_sequences=True, input_shape=(60, 5)),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.LSTM(50, return_sequences=False),
            tf.keras.layers.Dense(25),
            tf.keras.layers.Dense(1)
        ])
        model.compile(optimizer='adam', loss='mean_squared_error')
        return model
    
    def _build_gru_model(self):
        model = tf.keras.Sequential([
            tf.keras.layers.GRU(100, return_sequences=True, input_shape=(60, 5)),
            tf.keras.layers.Dropout(0.2),
            tf.keras.layers.GRU(50, return_sequences=False),
            tf.keras.layers.Dense(25),
            tf.keras.layers.Dense(1)
        ])
        model.compile(optimizer='adam', loss='mean_squared_error')
        return model
    
    def _build_transformer_model(self):
        model = tf.keras.Sequential([
            tf.keras.layers.Input(shape=(60, 5)),
            tf.keras.layers.MultiHeadAttention(num_heads=2, key_dim=32),
            tf.keras.layers.GlobalAveragePooling1D(),
            tf.keras.layers.Dense(50, activation='relu'),
            tf.keras.layers.Dense(1)
        ])
        model.compile(optimizer='adam', loss='mean_squared_error')
        return model

    def prepare_data(self, df):
        features = ['Close', 'RSI', 'MACD', 'Upper_Band', 'Lower_Band']
        dataset = df[features].values
        dataset = self.scaler.fit_transform(dataset)
        
        X, y = [], []
        for i in range(60, len(dataset)):
            X.append(dataset[i-60:i])
            y.append(dataset[i, 0])
        return np.array(X), np.array(y)

    def ensemble_predict(self, X):
        lstm_pred = self.lstm_model.predict(X)
        gru_pred = self.gru_model.predict(X)
        transformer_pred = self.transformer_model.predict(X)
        
        # Weighted ensemble (can be adjusted based on model performance)
        ensemble_pred = (0.4 * lstm_pred + 0.3 * gru_pred + 0.3 * transformer_pred)
        return self.scaler.inverse_transform(ensemble_pred.reshape(-1, 1))

def find_support_levels(prices, window=20):
    """Find key support levels using local minima"""
    try:
        # Convert to numpy array if it's not already
        if isinstance(prices, pd.Series):
            prices = prices.values
            
        # Ensure we have enough data points
        if len(prices) < window * 2 + 1:
            # Not enough data, return simple min
            return [float(np.min(prices))]
        
        local_mins = []
        for i in range(window, len(prices) - window):
            if prices[i] == min(prices[i-window:i+window+1]):
                local_mins.append(float(prices[i]))
        
        # If no local minima found, use quartiles
        if not local_mins:
            q1 = float(np.percentile(prices, 25))
            min_price = float(np.min(prices))
            return [min_price, q1]
            
        return sorted(local_mins)[:3] if local_mins else [float(np.min(prices))]  # Return top 3 or the minimum price
    except Exception as e:
        logger.error(f"Error finding support levels: {str(e)}")
        # Return current price minus 0.5%
        current_price = float(prices[-1]) if len(prices) > 0 else 1.0
        return [current_price * 0.995]

def find_resistance_levels(prices, window=20):
    """Find key resistance levels using local maxima"""
    try:
        # Convert to numpy array if it's not already
        if isinstance(prices, pd.Series):
            prices = prices.values
            
        # Ensure we have enough data points
        if len(prices) < window * 2 + 1:
            # Not enough data, return simple max
            return [float(np.max(prices))]
        
        local_maxs = []
        for i in range(window, len(prices) - window):
            if prices[i] == max(prices[i-window:i+window+1]):
                local_maxs.append(float(prices[i]))
        
        # If no local maxima found, use quartiles
        if not local_maxs:
            q3 = float(np.percentile(prices, 75))
            max_price = float(np.max(prices))
            return [max_price, q3]
            
        return sorted(local_maxs, reverse=True)[:3] if local_maxs else [float(np.max(prices))]  # Return top 3 or the maximum price
    except Exception as e:
        logger.error(f"Error finding resistance levels: {str(e)}")
        # Return current price plus 0.5%
        current_price = float(prices[-1]) if len(prices) > 0 else 1.0
        return [current_price * 1.005]

# News API Integration using free RSS feeds
async def fetch_forex_news(symbol: str):
    """Fetch forex related news from free RSS feeds"""
    async with aiohttp.ClientSession() as session:
        # Using FX Empire's free RSS feed
        url = "https://www.fxempire.com/news/forex-news/feed"
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    text = await response.text()
                    # Parse RSS feed and return relevant news
                    # Implement RSS parsing logic here
                    return [{"title": "Sample news", "url": "https://example.com", "timestamp": datetime.now().isoformat()}]
        except Exception as e:
            return []

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.price_cache: Dict[str, Dict[str, Any]] = {}
        
    async def connect(self, websocket: WebSocket, symbol: str):
        if symbol not in self.active_connections:
            self.active_connections[symbol] = []
        self.active_connections[symbol].append(websocket)
    
    async def disconnect(self, websocket: WebSocket, symbol: str):
        if symbol in self.active_connections:
            try:
                self.active_connections[symbol].remove(websocket)
                if not self.active_connections[symbol]:
                    del self.active_connections[symbol]
            except ValueError:
                pass  # WebSocket was already removed
    
    async def broadcast(self, message: str, symbol: str):
        if symbol in self.active_connections:
            disconnected = []
            for connection in self.active_connections[symbol]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    print(f"Error broadcasting to client: {e}")
                    disconnected.append(connection)
            
            # Clean up disconnected clients
            for connection in disconnected:
                await self.disconnect(connection, symbol)

manager = ConnectionManager()

async def get_forex_price(symbol: str) -> Dict[str, Any]:
    """Get real-time forex price using yfinance"""
    try:
        # Convert symbol format for yfinance (e.g., EUR/USD to EURUSD=X)
        yf_symbol = f"{symbol.replace('/', '')}=X"
        ticker = yf.Ticker(yf_symbol)
        hist = ticker.history(period="1d", interval="1m").iloc[-1]
        
        price_data = {
            "symbol": symbol,
            "timestamp": datetime.now().isoformat(),
            "open": float(hist["Open"]),
            "high": float(hist["High"]),
            "low": float(hist["Low"]),
            "close": float(hist["Close"]),
            "volume": float(hist["Volume"])
        }
        
        # Add technical analysis
        df = ticker.history(period="1mo", interval="1h")
        analysis = technical_analyzer.analyze(df)
        if analysis:
            price_data["analysis"] = {
                "trend": analysis.trend,
                "strength": analysis.strength,
                "support": analysis.support,
                "resistance": analysis.resistance,
                "rsi": analysis.rsi,
                "macd": analysis.macd,
                "ma_signals": analysis.ma_signals,
                "patterns": analysis.patterns
            }
        
        return price_data
    except Exception as e:
        print(f"Error getting forex price for {symbol}: {e}")
        return None

async def price_feed():
    """Background task to fetch and broadcast forex prices"""
    while True:
        for symbol in manager.active_connections.keys():
            try:
                price_data = await get_forex_price(symbol)
                if price_data:
                    await manager.broadcast(json.dumps(price_data), symbol)
            except Exception as e:
                print(f"Error in price feed for {symbol}: {e}")
        await asyncio.sleep(5)  # Update every 5 seconds

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(price_feed())

@app.websocket("/ws/forex")
async def websocket_endpoint(websocket: WebSocket):
    symbol = None
    try:
        # Only accept the connection once
        await websocket.accept()
        
        while True:
            try:
                data = await websocket.receive_text()
                message = json.loads(data)
                
                if message["type"] == "subscribe":
                    if symbol:  # If already subscribed to a symbol, unsubscribe first
                        await manager.disconnect(websocket, symbol)
                    
                    symbol = message["symbol"]
                    await manager.connect(websocket, symbol)
                    
                    # Send initial price
                    price_data = await get_forex_price(symbol)
                    if price_data:
                        await websocket.send_text(json.dumps(price_data))
                
                elif message["type"] == "unsubscribe" and symbol:
                    await manager.disconnect(websocket, symbol)
                    symbol = None
                    
            except WebSocketDisconnect:
                if symbol:
                    await manager.disconnect(websocket, symbol)
                break
            except Exception as e:
                print(f"WebSocket error: {e}")
                if symbol:
                    await manager.disconnect(websocket, symbol)
                break
                
    except Exception as e:
        print(f"WebSocket error: {e}")
        if symbol:
            await manager.disconnect(websocket, symbol)

@app.get("/")
async def root():
    return {"message": "Forex Trading API"}

@app.get("/market/price/{symbol:path}")
async def get_market_price(symbol: str):
    try:
        # Convert symbol format for yfinance (e.g., EUR/USD to EURUSD=X)
        yf_symbol = f"{symbol.replace('/', '')}=X"
        ticker = yf.Ticker(yf_symbol)
        df = ticker.history(period="1mo", interval="1h")
        
        analysis = technical_analyzer.analyze(df)
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not available")
            
        return {
            "trend": analysis.trend,
            "strength": analysis.strength,
            "support": analysis.support,
            "resistance": analysis.resistance,
            "rsi": analysis.rsi,
            "macd": analysis.macd,
            "ma_signals": analysis.ma_signals,
            "patterns": analysis.patterns
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from pydantic import BaseModel

class MarketAnalysisRequest(BaseModel):
    symbol: str
    timeframe: str = "1h"

@app.get("/market/analysis/{symbol:path}")
@app.post("/market/analysis")
async def get_market_analysis(request: MarketAnalysisRequest = None, symbol: str = None, timeframe: str = "1h"):
    # Use request body for POST or path parameter for GET
    if request:
        symbol = request.symbol
        timeframe = request.timeframe
    try:
        analysis = await get_ai_analysis(symbol, timeframe)
        news = await fetch_forex_news(symbol)
        return {"analysis": analysis, "news": news}
    except Exception as e:
        logger.error(f"Error in market analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    if form_data.username not in users_db:
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    
    access_token = create_access_token(
        data={"sub": form_data.username}
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/register")
async def register(username: str, password: str):
    if username in users_db:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = pwd_context.hash(password)
    users_db[username] = {"username": username, "hashed_password": hashed_password}
    return {"message": "User created successfully"}

@app.get("/watchlist")
async def get_watchlist(user: str = Depends(oauth2_scheme)):
    return watchlist_db.get(user, [])

@app.post("/watchlist/add")
async def add_to_watchlist(symbol: str, user: str = Depends(oauth2_scheme)):
    if user not in watchlist_db:
        watchlist_db[user] = []
    if symbol not in watchlist_db[user]:
        watchlist_db[user].append(symbol)
    return {"message": "Symbol added to watchlist"}

@app.websocket("/ws/market")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            # Stream real-time forex data
            for symbol in ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD"]:
                price = await get_forex_price(symbol)
                if price:
                    await websocket.send_json({
                        "type": "market_update",
                        "data": {
                            "symbol": symbol,
                            "price": price,
                            "timestamp": datetime.now().isoformat()
                        }
                    })
            await asyncio.sleep(1)
    except WebSocketDisconnect:
        print("Client disconnected")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_historical_data(symbol: str, interval: str = "1h", limit: int = 100) -> List[Dict[str, Any]]:
    """Get historical forex data using yfinance"""
    try:
        # Convert symbol format for yfinance (e.g., EUR/USD to EURUSD=X)
        yf_symbol = f"{symbol.replace('/', '')}=X"
        ticker = yf.Ticker(yf_symbol)
        
        # Map intervals to appropriate periods to ensure enough data
        interval_to_period = {
            "1m": "1d",    # 1-minute data for 1 day
            "5m": "5d",    # 5-minute data for 5 days
            "15m": "5d",   # 15-minute data for 5 days
            "30m": "10d",  # 30-minute data for 10 days
            "1h": "30d",   # 1-hour data for 1 month
            "4h": "60d",   # 4-hour data for 2 months
            "1d": "90d"    # Daily data for 3 months
        }
        
        period = interval_to_period.get(interval, "30d")
        
        # Get historical data
        df = ticker.history(period=period, interval=interval)
        if df.empty:
            return []
            
        # Convert to list of OHLC dictionaries
        data = []
        for index, row in df.iterrows():
            data.append({
                "timestamp": index.isoformat(),
                "open": float(row["Open"]),
                "high": float(row["High"]),
                "low": float(row["Low"]),
                "close": float(row["Close"]),
                "volume": float(row["Volume"])
            })
        
        # Return only the requested number of data points
        return data[-limit:]
    except Exception as e:
        print(f"Error getting historical data for {symbol}: {e}")
        return []

@app.get("/market/history/{symbol:path}")
async def get_market_history(symbol: str, interval: str = "1h", limit: int = 100):
    try:
        data = await get_historical_data(symbol, interval, limit)
        if not data:
            raise HTTPException(status_code=404, detail="Historical data not available")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/market/order-book")
async def get_order_book(symbol: str):
    """Get order book data showing buy/sell percentages"""
    try:
        order_book_data = await order_book_analyzer.get_order_book_data(symbol)
        return order_book_data
    except Exception as e:
        logger.error(f"Error getting order book data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
