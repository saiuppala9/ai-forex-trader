import requests
import pandas as pd
from datetime import datetime, timedelta
import pytz
import os

class OandaDataFetcher:
    def __init__(self):
        self.api_key = os.getenv('OANDA_API_KEY')
        if not self.api_key:
            raise ValueError("OANDA_API_KEY environment variable not set")
            
        self.account_id = os.getenv('OANDA_ACCOUNT_ID')
        if not self.account_id:
            raise ValueError("OANDA_ACCOUNT_ID environment variable not set")
            
        self.base_url = "https://api-fxpractice.oanda.com/v3"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
    def get_current_price(self, symbol='EUR_USD'):
        """Get current price from OANDA"""
        endpoint = f"{self.base_url}/accounts/{self.account_id}/pricing"
        params = {
            "instruments": symbol
        }
        
        response = requests.get(endpoint, headers=self.headers, params=params)
        if response.status_code != 200:
            raise Exception(f"Failed to get price: {response.text}")
            
        data = response.json()
        price = data['prices'][0]
        
        return {
            'bid': float(price['bids'][0]['price']),
            'ask': float(price['asks'][0]['price']),
            'time': pd.to_datetime(price['time'])
        }
        
    def get_ohlcv_data(self, symbol='EUR_USD', timeframe='5M', count=100):
        """Get historical OHLCV data from OANDA"""
        # Convert timeframe to OANDA format
        timeframe_map = {
            '5m': 'M5',
            '15m': 'M15',
            '30m': 'M30',
            '1h': 'H1',
            '4h': 'H4',
            '1d': 'D'
        }
        
        granularity = timeframe_map.get(timeframe.lower())
        if not granularity:
            raise ValueError(f"Invalid timeframe: {timeframe}")
            
        endpoint = f"{self.base_url}/instruments/{symbol}/candles"
        params = {
            "count": count,
            "granularity": granularity,
            "price": "MBA"  # Midpoint, Bid and Ask
        }
        
        response = requests.get(endpoint, headers=self.headers, params=params)
        if response.status_code != 200:
            raise Exception(f"Failed to get candles: {response.text}")
            
        data = response.json()
        
        # Convert to DataFrame
        candles = []
        for candle in data['candles']:
            candles.append({
                'timestamp': pd.to_datetime(candle['time']),
                'open': float(candle['mid']['o']),
                'high': float(candle['mid']['h']),
                'low': float(candle['mid']['l']),
                'close': float(candle['mid']['c']),
                'volume': int(candle['volume'])
            })
            
        df = pd.DataFrame(candles)
        return df
