"""
Enhanced Gemini AI Forex Trading Analysis Module
This version properly handles the Gemini response format and integrates it with the frontend
"""

import os
import json
from datetime import datetime
import random

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    print("Gemini AI not available. google.generativeai package is not installed.")

# Current EUR/USD price
CURRENT_PRICE = 1.13950

class GeminiTraderAnalysis:
    """Handles Gemini AI analysis for forex trading"""
    
    def __init__(self, api_key=None):
        """Initialize the Gemini trader analysis module"""
        self.api_key = api_key or os.getenv('GEMINI_API_KEY')
        
        if not GEMINI_AVAILABLE:
            print("Warning: google.generativeai package not installed")
            return
            
        if not self.api_key:
            print("Warning: No GEMINI_API_KEY provided")
            return
            
        # Configure Gemini API
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel('gemini-1.5-pro')
        
    def get_analysis(self, symbol="EUR/USD", timeframe="15m"):
        """Get AI analysis for the specified forex pair"""
        if not GEMINI_AVAILABLE or not self.api_key:
            return self.get_simulated_analysis(symbol, timeframe)
            
        try:
            # Get market data
            market_data = self.get_market_data(symbol)
            
            # Create prompt for Gemini
            prompt = self.create_analysis_prompt(symbol, timeframe, market_data)
            
            print(f"Requesting Gemini analysis for {symbol} on {timeframe} timeframe...")
            # Get response from Gemini
            response = self.model.generate_content(prompt)
            
            # Parse the response
            try:
                # Extract JSON from response text
                analysis_text = response.text.strip()
                if analysis_text.startswith('```json'):
                    analysis_text = analysis_text.replace('```json', '', 1)
                if analysis_text.endswith('```'):
                    analysis_text = analysis_text[:-3]
                    
                analysis_data = json.loads(analysis_text.strip())
                print("Successfully parsed Gemini response!")
                
                # Convert to standard format
                formatted_analysis = self.format_analysis_for_frontend(analysis_data, symbol, timeframe)
                return formatted_analysis
                
            except Exception as e:
                print(f"Error parsing Gemini response: {str(e)}")
                print("\nRaw response:\n", response.text)
                return self.get_simulated_analysis(symbol, timeframe)
        
        except Exception as e:
            print(f"Error with Gemini AI: {str(e)}")
            return self.get_simulated_analysis(symbol, timeframe)
    
    def create_analysis_prompt(self, symbol, timeframe, market_data):
        """Create the prompt for Gemini API"""
        return f"""
        You are an expert forex trader and analyst. Analyze the {symbol} currency pair on the {timeframe} timeframe and provide comprehensive trading insights.
        
        Current market data:
        - Current price: {market_data['price']}
        - High: {market_data['high']}
        - Low: {market_data['low']}
        - Spread: {market_data['ask'] - market_data['bid']}
        - Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        
        Please provide the following in JSON format:
        1. "Signal": either "BUY", "SELL", or "NEUTRAL"
        2. "Confidence": a number between 0-100
        3. "Analysis": detailed market analysis of current conditions (150-200 words)
        4. "Entry points": specific price levels to enter trades for both Buy and Sell
        5. "Stop loss levels": recommended stop loss prices for both directions
        6. "Take profit targets": multiple take profit levels (TP1, TP2)
        7. "Support/Resistance": key price levels to watch
        8. "Key indicators": what technical indicators are showing (RSI, MACD, etc.)
        9. "Market sentiment": overall market mood and expectations
        10. "Risk assessment": evaluation of trade risk
        
        Format your response as valid JSON only, with no additional text before or after.
        """
    
    def get_market_data(self, symbol):
        """Get market data for the symbol"""
        # This would normally be fetched from a real market data source
        base_price = self.get_base_price(symbol)
        return {
            'price': base_price,
            'high': base_price * 1.002,
            'low': base_price * 0.998,
            'bid': base_price * 0.9999,
            'ask': base_price * 1.0001
        }
    
    def get_base_price(self, symbol):
        """Get the base price for a symbol"""
        # Add more currency pairs as needed
        prices = {
            'EUR/USD': 1.13950,
            'GBP/USD': 1.31025,
            'USD/JPY': 148.77,
            'AUD/USD': 0.68240
        }
        return prices.get(symbol, 1.0)
    
    def format_analysis_for_frontend(self, ai_data, symbol, timeframe):
        """Format the AI analysis in a way the frontend expects"""
        try:
            # Extract the signal
            signal = ai_data.get('Signal', 'NEUTRAL')
            
            # Determine if it's bullish based on signal
            is_bullish = signal == "BUY"
            is_bearish = signal == "SELL"
            is_neutral = signal == "NEUTRAL"
            
            # Format for frontend
            if is_neutral:
                # Handle neutral case - use a combination of buy and sell
                buy_entry = float(ai_data.get('Entry points', {}).get('Buy', 0))
                sell_entry = float(ai_data.get('Entry points', {}).get('Sell', 0))
                
                if buy_entry > 0:
                    entry_price = buy_entry
                    entry_type = "BUY"
                    stop_loss = float(ai_data.get('Stop loss levels', {}).get('Buy', entry_price * 0.997))
                    take_profit = float(ai_data.get('Take profit targets', {}).get('TP1', {}).get('Buy', entry_price * 1.003))
                else:
                    entry_price = sell_entry
                    entry_type = "SELL" 
                    stop_loss = float(ai_data.get('Stop loss levels', {}).get('Sell', entry_price * 1.003))
                    take_profit = float(ai_data.get('Take profit targets', {}).get('TP1', {}).get('Sell', entry_price * 0.997))
            else:
                # Handle directional case
                if is_bullish:
                    entry_price = float(ai_data.get('Entry points', {}).get('Buy', 0))
                    stop_loss = float(ai_data.get('Stop loss levels', {}).get('Buy', entry_price * 0.997))
                    take_profit = float(ai_data.get('Take profit targets', {}).get('TP1', {}).get('Buy', entry_price * 1.003))
                    entry_type = "BUY"
                else:
                    entry_price = float(ai_data.get('Entry points', {}).get('Sell', 0))
                    stop_loss = float(ai_data.get('Stop loss levels', {}).get('Sell', entry_price * 1.003))
                    take_profit = float(ai_data.get('Take profit targets', {}).get('TP1', {}).get('Sell', entry_price * 0.997))
                    entry_type = "SELL"
            
            # Extract support and resistance levels
            support_levels = ai_data.get('Support/Resistance', {}).get('Support', [])
            resistance_levels = ai_data.get('Support/Resistance', {}).get('Resistance', [])
            
            # Handle indicators
            indicators = []
            for name, value in ai_data.get('Key indicators', {}).items():
                signal_val = 'buy' if 'bullish' in value.lower() else 'sell' if 'bearish' in value.lower() else 'neutral'
                indicators.append({
                    'name': name,
                    'value': value,
                    'signal': signal_val
                })
            
            # Create the formatted response
            return {
                'symbol': symbol,
                'timeframe': timeframe,
                'signal': entry_type,
                'confidence': ai_data.get('Confidence', 50),
                'analysis': ai_data.get('Analysis', ''),
                'timestamp': datetime.now().isoformat(),
                
                # Trade setup
                'tradeSetup': {
                    'entryPrice': str(entry_price),
                    'stopLoss': str(stop_loss),
                    'takeProfit': str(take_profit),
                    'entryReason': f"{entry_type} setup based on {timeframe} timeframe analysis",
                    'riskRewardRatio': "1:2", # Can be calculated more precisely 
                    'riskPercentage': "1%" # Can be calculated more precisely
                },
                
                # Technical data
                'technicalData': {
                    'supportLevels': support_levels,
                    'resistanceLevels': resistance_levels,
                    'indicators': indicators
                },
                
                # Extra info
                'marketSentiment': ai_data.get('Market sentiment', ''),
                'riskAssessment': ai_data.get('Risk assessment', ''),
                'volatilityAssessment': 'Moderate',
                'expectedDuration': '1-4 hours'
            }
        except Exception as e:
            print(f"Error formatting analysis: {str(e)}")
            # Fallback to simulated analysis
            return self.get_simulated_analysis(symbol, timeframe)
    
    def get_simulated_analysis(self, symbol, timeframe):
        """Generate simulated analysis when Gemini is unavailable"""
        print("Generating simulated analysis...")
        
        current_price = self.get_base_price(symbol)
        
        # Determine trend based on symbol
        is_bullish = symbol in ["EUR/USD", "GBP/USD"]
        
        # Generate analysis based on trend
        if is_bullish:
            signal = "BUY"
            confidence = random.randint(60, 85)
            analysis = f"{symbol} shows bullish momentum on the {timeframe} chart. Price action has formed a series of higher lows, with strong buying pressure evident in recent candles. The pair has broken above the {current_price-0.002:.5f} resistance level, which now acts as support. The RSI indicator is at 62, showing moderate bullish momentum without being overbought. MACD histogram is positive and expanding, confirming the uptrend."
            entry_price = current_price * 0.9998
            stop_loss = entry_price * 0.997
            take_profit = entry_price * 1.003
            entry_reason = f"Buy setup on {timeframe} chart: bullish pattern at {entry_price:.5f} with confirmed support"
        else:
            signal = "SELL"
            confidence = random.randint(55, 80)
            analysis = f"{symbol} is showing bearish momentum on the {timeframe} timeframe. The price has recently rejected the {current_price+0.003:.5f} resistance level and is now forming lower highs. The RSI indicator at 38 reflects increasing selling pressure. The 20-period EMA is crossing below the 50-period EMA, generating a bearish signal. Volume analysis confirms higher participation during recent bearish moves."
            entry_price = current_price * 1.0002
            stop_loss = entry_price * 1.003
            take_profit = entry_price * 0.997
            entry_reason = f"Sell setup on {timeframe} chart: bearish pattern at {entry_price:.5f} with confirmed resistance"
        
        # Format the simulated analysis
        return {
            'symbol': symbol,
            'timeframe': timeframe,
            'signal': signal,
            'confidence': confidence,
            'analysis': analysis,
            'timestamp': datetime.now().isoformat(),
            
            # Trade setup
            'tradeSetup': {
                'entryPrice': f"{entry_price:.5f}",
                'stopLoss': f"{stop_loss:.5f}",
                'takeProfit': f"{take_profit:.5f}",
                'entryReason': entry_reason,
                'riskRewardRatio': "1:2", 
                'riskPercentage': "1%"
            },
            
            # Technical data
            'technicalData': {
                'supportLevels': [f"{current_price-0.005:.5f}", f"{current_price-0.010:.5f}"],
                'resistanceLevels': [f"{current_price+0.005:.5f}", f"{current_price+0.010:.5f}"],
                'indicators': [
                    {
                        'name': 'RSI', 
                        'value': is_bullish and "Bullish (62)" or "Bearish (38)",
                        'signal': is_bullish and 'buy' or 'sell'
                    },
                    {
                        'name': 'MACD', 
                        'value': is_bullish and "Positive and expanding" or "Negative and expanding",
                        'signal': is_bullish and 'buy' or 'sell'
                    }
                ]
            },
            
            # Extra info
            'marketSentiment': is_bullish and "Moderately bullish" or "Moderately bearish",
            'riskAssessment': "Moderate risk. Proper position sizing recommended.",
            'volatilityAssessment': 'Moderate',
            'expectedDuration': '1-4 hours'
        }


if __name__ == "__main__":
    print("=== EUR/USD 15m Gemini AI Analysis Test ===")
    
    # Try to get the API key from environment or use provided one
    api_key = os.getenv('GEMINI_API_KEY')
    
    # Initialize the trader
    trader = GeminiTraderAnalysis(api_key)
    
    # Get analysis
    analysis = trader.get_analysis("EUR/USD", "15m")
    
    # Pretty print the analysis
    print("\n=== Analysis Results ===")
    print(f"Symbol: {analysis['symbol']} ({analysis['timeframe']})")
    print(f"Signal: {analysis['signal']}")
    print(f"Confidence: {analysis['confidence']}%")
    
    print("\nAnalysis:")
    print(analysis['analysis'])
    
    print("\nTrade Setup:")
    trade_setup = analysis['tradeSetup']
    print(f"  Entry: {trade_setup['entryPrice']}")
    print(f"  Stop Loss: {trade_setup['stopLoss']}")
    print(f"  Take Profit: {trade_setup['takeProfit']}")
    print(f"  Risk/Reward: {trade_setup['riskRewardRatio']}")
    print(f"  Entry Reason: {trade_setup['entryReason']}")
    
    print("\nSupport/Resistance:")
    tech_data = analysis['technicalData']
    # Convert any numeric values to strings
    support_levels = [str(level) for level in tech_data['supportLevels']]
    resistance_levels = [str(level) for level in tech_data['resistanceLevels']]
    print(f"  Support: {', '.join(support_levels)}")
    print(f"  Resistance: {', '.join(resistance_levels)}")
    
    print("\nIndicators:")
    for indicator in tech_data['indicators']:
        print(f"  {indicator['name']}: {indicator['value']} ({indicator['signal']})")
    
    print(f"\nMarket Sentiment: {analysis['marketSentiment']}")
    print(f"Risk Assessment: {analysis['riskAssessment']}")
    print(f"Volatility: {analysis['volatilityAssessment']}")
    print(f"Expected Duration: {analysis['expectedDuration']}")
    
    # Save full analysis to file
    with open('gemini_analysis_formatted.json', 'w') as f:
        json.dump(analysis, f, indent=2)
    print("\nFull analysis saved to gemini_analysis_formatted.json")
