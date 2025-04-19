import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import pytz

class YahooDataFetcher:
    def __init__(self):
        pass
        
    def get_forex_data(self, symbol='EURUSD=X', interval='5m', period='1d'):
        """Get forex data from Yahoo Finance"""
        try:
            # Get data from Yahoo Finance
            ticker = yf.Ticker(symbol)
            df = ticker.history(period=period, interval=interval)
            
            # Reset index to make Datetime a column
            df = df.reset_index()
            
            # Rename columns to match our format
            df = df.rename(columns={
                'Datetime': 'timestamp',
                'Open': 'open',
                'High': 'high',
                'Low': 'low',
                'Close': 'close',
                'Volume': 'volume'
            })
            
            # Handle missing volume for forex
            if 'volume' not in df.columns:
                df['volume'] = 0
                
            # Convert timezone-aware timestamps to UTC
            df['timestamp'] = pd.to_datetime(df['timestamp']).dt.tz_localize(None)
            
            return df
            
        except Exception as e:
            raise Exception(f"Failed to get data from Yahoo Finance: {str(e)}")
            
    def get_current_price(self, symbol='EURUSD=X'):
        """Get current forex price"""
        try:
            ticker = yf.Ticker(symbol)
            
            # Get current price info
            info = ticker.info
            price = info.get('regularMarketPrice', 0)
            time = datetime.now(pytz.UTC)
            
            # Yahoo Finance doesn't provide bid/ask for forex
            # Using a small spread for demonstration
            spread = 0.0002  # 2 pips
            
            return {
                'bid': price - spread/2,
                'ask': price + spread/2,
                'time': time
            }
            
        except Exception as e:
            raise Exception(f"Failed to get current price from Yahoo Finance: {str(e)}")
            
    def convert_timeframe(self, timeframe):
        """Convert our timeframe format to Yahoo Finance format"""
        timeframe_map = {
            '1m': '1m',
            '5m': '5m',
            '15m': '15m',
            '30m': '30m',
            '1h': '1h',
            '4h': '4h',
            '1d': '1d'
        }
        return timeframe_map.get(timeframe, timeframe)
