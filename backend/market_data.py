import aiohttp
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
import json
import asyncio
from typing import Dict, List, Optional, Union, Any
from utils.rate_limiter import rate_limiter
import os
from dotenv import load_dotenv
from functools import wraps

load_dotenv()

logger = logging.getLogger(__name__)

def error_handler(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            logger.error(f"Error in {func.__name__}: {str(e)}")
            return None
    return wrapper

class MarketDataHandler:
    def __init__(self):
        self.api_keys = {
            'ALPHA_VANTAGE': os.getenv('ALPHA_VANTAGE_API_KEY'),
            'FINNHUB': os.getenv('FINNHUB_API_KEY')
        }
        
        self.base_urls = {
            'ALPHA_VANTAGE': 'https://www.alphavantage.co/query',
            'FINNHUB': 'https://finnhub.io/api/v1'
        }
        
        self.cache = {}
        self.cache_duration = 60  # seconds
        self.last_update = {}
        self.session = None
        
    async def _get_session(self) -> aiohttp.ClientSession:
        """Get or create aiohttp session"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession()
        return self.session

    @error_handler
    async def get_live_forex_price(self, symbol: str) -> Dict:
        """Get real-time forex price from Alpha Vantage"""
        session = await self._get_session()
        url = self.base_urls['ALPHA_VANTAGE']
        
        # Split symbol (e.g., EUR/USD to EUR and USD)
        from_currency, to_currency = symbol.split('/')
        
        params = {
            'function': 'CURRENCY_EXCHANGE_RATE',
            'from_currency': from_currency,
            'to_currency': to_currency,
            'apikey': self.api_keys['ALPHA_VANTAGE']
        }
        
        async with session.get(url, params=params) as response:
            if response.status == 200:
                data = await response.json()
                if 'Realtime Currency Exchange Rate' in data:
                    rate_data = data['Realtime Currency Exchange Rate']
                    return {
                        'symbol': symbol,
                        'price': float(rate_data['5. Exchange Rate']),
                        'bid': float(rate_data['5. Exchange Rate']),
                        'ask': float(rate_data['5. Exchange Rate']),
                        'timestamp': rate_data['6. Last Refreshed']
                    }
            logger.error(f"Error fetching forex price: {await response.text()}")
            return None

    @error_handler
    async def get_historical_data(self, symbol: str, interval: str = '1d') -> pd.DataFrame:
        """Get historical forex data from Alpha Vantage (daily)"""
        session = await self._get_session()
        url = self.base_urls['ALPHA_VANTAGE']
        
        from_currency, to_currency = symbol.split('/')
        
        params = {
            'function': 'FX_DAILY',
            'from_symbol': from_currency,
            'to_symbol': to_currency,
            'apikey': self.api_keys['ALPHA_VANTAGE'],
            'outputsize': 'compact'  # Last 100 data points
        }
        
        async with session.get(url, params=params) as response:
            if response.status == 200:
                data = await response.json()
                if 'Time Series FX (Daily)' in data:
                    df = pd.DataFrame.from_dict(data['Time Series FX (Daily)'], orient='index')
                    df.index = pd.to_datetime(df.index)
                    df.columns = ['open', 'high', 'low', 'close']
                    df = df.astype(float)
                    return df
            logger.error(f"Error fetching historical data: {await response.text()}")
            return None

    @error_handler
    async def get_forex_news(self, symbols: List[str] = None) -> List[Dict]:
        """Get market news from Finnhub"""
        session = await self._get_session()
        url = f"{self.base_urls['FINNHUB']}/news"
        
        params = {
            'category': 'general',  # Use general category instead of forex
            'token': self.api_keys['FINNHUB']
        }
        
        async with session.get(url, params=params) as response:
            if response.status == 200:
                news = await response.json()
                if symbols:
                    # Filter news for specific symbols or currency names
                    currency_names = [s.replace('/', '') for s in symbols] + [s.split('/')[0] for s in symbols] + [s.split('/')[1] for s in symbols]
                    return [n for n in news if any(curr in n['headline'].upper() for curr in currency_names)]
                return news[:10]  # Return latest 10 news items
            logger.error(f"Error fetching news: {await response.text()}")
            return []

    async def close(self):
        """Close the aiohttp session"""
        if self.session and not self.session.closed:
            await self.session.close()

# Global instance
market_data = MarketDataHandler()
