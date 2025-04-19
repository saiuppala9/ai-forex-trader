import requests
import pandas as pd
from datetime import datetime, timedelta
import pytz

class AlphaVantageDataFetcher:
    def __init__(self, api_key):
        self.api_key = api_key
        self.base_url = "https://www.alphavantage.co/query"
        
    def get_forex_data(self, from_currency='EUR', to_currency='USD', interval='5min'):
        """Get forex data from Alpha Vantage"""
        params = {
            'function': 'FX_INTRADAY',
            'from_symbol': from_currency,
            'to_symbol': to_currency,
            'interval': interval,
            'apikey': self.api_key,
            'outputsize': 'compact'  # Returns latest 100 data points
        }
        
        response = requests.get(self.base_url, params=params)
        if response.status_code != 200:
            raise Exception(f"Failed to get data: {response.text}")
            
        data = response.json()
        
        # Extract time series data
        time_series_key = f"Time Series FX ({interval})"
        if time_series_key not in data:
            raise Exception(f"No data found in response: {data}")
            
        # Convert to DataFrame
        df = pd.DataFrame.from_dict(data[time_series_key], orient='index')
        
        # Rename columns
        df = df.rename(columns={
            '1. open': 'open',
            '2. high': 'high',
            '3. low': 'low',
            '4. close': 'close'
        })
        
        # Convert string values to float
        for col in ['open', 'high', 'low', 'close']:
            df[col] = pd.to_numeric(df[col])
            
        # Add timestamp column
        df['timestamp'] = pd.to_datetime(df.index)
        
        # Sort by timestamp
        df = df.sort_values('timestamp')
        
        # Add volume (Alpha Vantage forex data doesn't include volume)
        df['volume'] = 0
        
        return df
        
    def get_current_price(self, from_currency='EUR', to_currency='USD'):
        """Get current forex price"""
        params = {
            'function': 'CURRENCY_EXCHANGE_RATE',
            'from_currency': from_currency,
            'to_currency': to_currency,
            'apikey': self.api_key
        }
        
        response = requests.get(self.base_url, params=params)
        if response.status_code != 200:
            raise Exception(f"Failed to get price: {response.text}")
            
        data = response.json()
        
        # Extract current price data
        exchange_rate = data.get('Realtime Currency Exchange Rate', {})
        if not exchange_rate:
            raise Exception(f"No exchange rate data found in response: {data}")
            
        return {
            'bid': float(exchange_rate.get('8. Bid Price', 0)),
            'ask': float(exchange_rate.get('9. Ask Price', 0)),
            'time': pd.to_datetime(exchange_rate.get('6. Last Refreshed'))
        }
