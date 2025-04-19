import MetaTrader5 as mt5
import pandas as pd
import pytz
from datetime import datetime
import logging

class MT5DataFetcher:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Initialize MT5 connection
        if not mt5.initialize():
            self.logger.error("MT5 initialization failed")
            raise Exception(f"MT5 initialization failed. Error: {mt5.last_error()}")
            
    def __del__(self):
        mt5.shutdown()
        
    def get_ohlcv_data(self, symbol='EURUSD', timeframe='5m', num_candles=100):
        """Get OHLCV data from MT5"""
        # Convert timeframe string to MT5 timeframe constant
        timeframe_map = {
            '1m': mt5.TIMEFRAME_M1,
            '5m': mt5.TIMEFRAME_M5,
            '15m': mt5.TIMEFRAME_M15,
            '30m': mt5.TIMEFRAME_M30,
            '1h': mt5.TIMEFRAME_H1,
            '4h': mt5.TIMEFRAME_H4,
            '1d': mt5.TIMEFRAME_D1
        }
        
        mt5_timeframe = timeframe_map.get(timeframe)
        if mt5_timeframe is None:
            raise ValueError(f"Invalid timeframe: {timeframe}")
            
        # Get current UTC time
        utc_now = datetime.now(pytz.UTC)
        
        # Get the candles
        rates = mt5.copy_rates_from(symbol, mt5_timeframe, utc_now, num_candles)
        if rates is None:
            raise Exception(f"Failed to get data for {symbol}. Error: {mt5.last_error()}")
            
        # Convert to pandas DataFrame
        df = pd.DataFrame(rates)
        
        # Convert time in seconds into datetime
        df['time'] = pd.to_datetime(df['time'], unit='s')
        
        # Rename columns to match our format
        df = df.rename(columns={
            'time': 'timestamp',
            'open': 'open',
            'high': 'high',
            'low': 'low',
            'close': 'close',
            'tick_volume': 'volume'
        })
        
        return df
        
    def get_current_price(self, symbol='EURUSD'):
        """Get current bid/ask prices"""
        symbol_info = mt5.symbol_info_tick(symbol)
        if symbol_info is None:
            raise Exception(f"Failed to get price for {symbol}. Error: {mt5.last_error()}")
            
        return {
            'bid': symbol_info.bid,
            'ask': symbol_info.ask,
            'last': symbol_info.last,
            'time': pd.to_datetime(symbol_info.time, unit='s')
        }
