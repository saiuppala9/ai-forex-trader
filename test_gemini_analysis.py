import os
import sys
from datetime import datetime, timedelta
import pandas as pd
from backend.gemini_trader import GeminiTrader
from backend.yahoo_data import YahooDataFetcher
from dotenv import load_dotenv



def test_gemini_analysis():
    load_dotenv()
    
    # Check for API key
    if not os.getenv('GEMINI_API_KEY'):
        print("Error: GEMINI_API_KEY not found in environment variables")
        print("Please set your Gemini API key first:")
        print("export GEMINI_API_KEY='your-api-key-here'")
        sys.exit(1)
    
    try:
        # Initialize data fetcher and trader
        yahoo = YahooDataFetcher()
        trader = GeminiTrader()
        
        # Test both timeframes
        timeframes = ['5m', '15m']
        
        # Get current EUR/USD price
        current_price = yahoo.get_current_price('EURUSD=X')
        print(f"\nCurrent EUR/USD Price:")
        print(f"Bid: {current_price['bid']:.5f}")
        print(f"Ask: {current_price['ask']:.5f}")
        print(f"Time: {current_price['time']}")
        
        for timeframe in timeframes:
            print(f"\nAnalyzing EUR/USD {timeframe} Chart")
            print("=" * 50)
            
            # Get real market data
            data = yahoo.get_forex_data('EURUSD=X', interval=timeframe)
            
            print(f"Analyzing {len(data)} candles of {timeframe} data")
            print(f"Time range: {data['timestamp'].iloc[0]} to {data['timestamp'].iloc[-1]}")
            print(f"Current price: {data['close'].iloc[-1]:.5f}")
            
            # Get analysis
            analysis = trader.analyze_chart(
                data,
                'EUR/USD',
                timeframe=timeframe
            )
            
            print("\nGemini Chart Analysis Results:")
            print("=" * 50)
            print(f"Currency Pair: EUR/USD")
            print(f"Timeframe: {timeframe}")
            print(f"Analysis Timestamp: {datetime.now()}")
            print("=" * 50)
            print(analysis)
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    test_gemini_analysis()
