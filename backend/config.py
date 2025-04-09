"""Configuration settings for the AI Forex Trader"""

import os
from dotenv import load_dotenv

load_dotenv()

# Market Data Sources
MARKET_DATA_SOURCES = {
    'STOCKS': 'https://query1.finance.yahoo.com/v8/finance/chart',
    'CRYPTO': 'https://api.binance.com/api/v3/klines',
    'BACKUP': 'https://query2.finance.yahoo.com/v8/finance/chart'
}

# Instrument Types
INSTRUMENTS = {
    'FOREX': {
        'suffix': '=X',
        'source': 'YAHOO'
    },
    'STOCKS': {
        'suffix': '',
        'source': 'YAHOO'
    },
    'COMMODITIES': {
        'suffix': '',
        'source': 'YAHOO'
    },
    'CRYPTO': {
        'suffix': '',
        'source': 'BINANCE'
    }
}

# Timeframes
TIMEFRAMES = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '60m',
    '4h': '4h',
    'D': '1d',
    'W': '1wk',
    'M': '1mo'
}

# Rate Limits
RATE_LIMITS = {
    'YAHOO': {
        'requests_per_second': 2,
        'requests_per_minute': 100
    },
    'BINANCE': {
        'requests_per_second': 10,
        'requests_per_minute': 500
    }
}

# Redis Configuration
REDIS_CONFIG = {
    'host': 'localhost',
    'port': 6379,
    'db': 0,
    'decode_responses': True
}

# WebSocket Configuration
WEBSOCKET_CONFIG = {
    'host': 'localhost',
    'port': 8765
}

# Retry Configuration
MAX_RETRIES = 3
RETRY_DELAY = 1  # seconds

# Technical Analysis Settings
TECHNICAL_ANALYSIS = {
    'SMA_PERIODS': [20, 50, 200],
    'EMA_PERIODS': [9, 21, 55],
    'RSI_PERIOD': 14,
    'MACD': {
        'FAST_PERIOD': 12,
        'SLOW_PERIOD': 26,
        'SIGNAL_PERIOD': 9
    },
    'BOLLINGER_BANDS': {
        'PERIOD': 20,
        'STD_DEV': 2
    }
}

# Default Watchlist Settings
DEFAULT_WATCHLIST = {
    'FOREX': ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD'],
    'STOCKS': ['AAPL', 'GOOGL', 'MSFT', 'AMZN'],
    'COMMODITIES': ['GC=F', 'CL=F', 'SI=F'],
    'CRYPTO': ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']
}

# Market Data Configuration
MARKET_UPDATE_INTERVAL = 1  # seconds
HISTORY_FETCH_LIMIT = 1000  # candles
MAX_WATCHLIST_ITEMS = 50

# Cache Configuration
CACHE_TTL = 300  # seconds

# Error Handling
MAX_RETRIES = 3
RETRY_DELAY = 5  # seconds

# Chart Types
CHART_TYPES = [
    'candlestick',
    'line',
    'area',
    'bar'
]
