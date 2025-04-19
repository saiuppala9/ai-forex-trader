"""
Gemini AI Test Script for EUR/USD 15m Analysis
This standalone script tests the Gemini API for forex analysis
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

def get_gemini_analysis():
    """Get live analysis from Gemini API for EUR/USD on 15m timeframe"""
    
    if not GEMINI_AVAILABLE:
        print("Error: Gemini AI package not available")
        return get_simulated_analysis()
    
    # Check if GEMINI_API_KEY is set
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set")
        return get_simulated_analysis()
    
    try:
        # Configure Gemini API
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        # Market data
        market_data = {
            'price': CURRENT_PRICE,
            'high': CURRENT_PRICE * 1.002,
            'low': CURRENT_PRICE * 0.998,
            'bid': CURRENT_PRICE * 0.9999,
            'ask': CURRENT_PRICE * 1.0001
        }
        
        # Create prompt for Gemini
        prompt = f"""
        You are an expert forex trader and analyst. Analyze the EUR/USD currency pair on the 15-minute timeframe and provide comprehensive trading insights.
        
        Current market data:
        - Current price: {market_data['price']}
        - High: {market_data['high']}
        - Low: {market_data['low']}
        - Spread: {market_data['ask'] - market_data['bid']}
        - Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        
        Please provide the following in JSON format:
        1. Signal: either 'BUY', 'SELL', or 'NEUTRAL'
        2. Confidence: a number between 0-100
        3. Analysis: detailed market analysis of current conditions (150-200 words)
        4. Entry points: specific price levels to enter trades
        5. Stop loss levels: recommended stop loss prices
        6. Take profit targets: multiple take profit levels
        7. Support/Resistance: key price levels to watch
        8. Key indicators: what technical indicators are showing
        9. Market sentiment: overall market mood and expectations
        10. Risk assessment: evaluation of trade risk
        
        Format your response as valid JSON only, with no additional text before or after.
        """
        
        print("Sending request to Gemini AI...")
        # Get response from Gemini
        response = model.generate_content(prompt)
        
        # Parse the response
        try:
            # Extract JSON from response text
            analysis_text = response.text.strip()
            if analysis_text.startswith('```json'):
                analysis_text = analysis_text.replace('```json', '', 1)
            if analysis_text.endswith('```'):
                analysis_text = analysis_text[:-3]
                
            analysis_data = json.loads(analysis_text.strip())
            print("\nSuccessfully parsed Gemini response!")
            return analysis_data
        except Exception as e:
            print(f"Error parsing Gemini response: {str(e)}")
            print("\nRaw response:\n", response.text)
            return get_simulated_analysis()
    
    except Exception as e:
        print(f"Error with Gemini AI: {str(e)}")
        return get_simulated_analysis()

def get_simulated_analysis():
    """Generate simulated analysis when Gemini is unavailable"""
    print("Generating simulated analysis...")
    
    # Determine trend
    is_bullish = True  # Current EUR/USD trend
    
    # Generate analysis based on trend
    if is_bullish:
        signal = "BUY"
        confidence = random.randint(60, 85)
        analysis = f"EUR/USD shows bullish momentum on the 15-minute chart. Price action has formed a series of higher lows, with strong buying pressure evident in recent candles. The pair has broken above the {CURRENT_PRICE-0.002:.5f} resistance level, which now acts as support. The RSI indicator is at 62, showing moderate bullish momentum without being overbought. MACD histogram is positive and expanding, confirming the uptrend."
        entry_point = CURRENT_PRICE * 0.9998
        stop_loss = entry_point * 0.997
        take_profit1 = entry_point * 1.003
        take_profit2 = entry_point * 1.006
    else:
        signal = "SELL"
        confidence = random.randint(55, 80)
        analysis = f"EUR/USD is showing bearish momentum on the 15-minute timeframe. The price has recently rejected the {CURRENT_PRICE+0.003:.5f} resistance level and is now forming lower highs. The RSI indicator at 38 reflects increasing selling pressure. The 20-period EMA is crossing below the 50-period EMA, generating a bearish signal. Volume analysis confirms higher participation during recent bearish moves."
        entry_point = CURRENT_PRICE * 1.0002
        stop_loss = entry_point * 1.003
        take_profit1 = entry_point * 0.997
        take_profit2 = entry_point * 0.994
    
    # Format the simulated analysis
    return {
        "signal": signal,
        "confidence": confidence,
        "analysis": analysis,
        "entry_points": [f"{entry_point:.5f}"],
        "stop_loss_levels": [f"{stop_loss:.5f}"],
        "take_profit_targets": [f"{take_profit1:.5f}", f"{take_profit2:.5f}"],
        "support_resistance": {
            "support": [f"{CURRENT_PRICE-0.005:.5f}", f"{CURRENT_PRICE-0.010:.5f}"],
            "resistance": [f"{CURRENT_PRICE+0.005:.5f}", f"{CURRENT_PRICE+0.010:.5f}"]
        },
        "key_indicators": {
            "RSI": is_bullish and "Bullish (62)" or "Bearish (38)",
            "MACD": is_bullish and "Positive and expanding" or "Negative and expanding",
            "Moving Averages": is_bullish and "Price above 20 EMA" or "Price below 20 EMA",
            "Bollinger Bands": is_bullish and "Price near upper band" or "Price approaching lower band"
        },
        "market_sentiment": is_bullish and "Moderately bullish" or "Moderately bearish",
        "risk_assessment": {
            "risk_reward_ratio": "1:2",
            "probability": f"{confidence}%",
            "market_volatility": "Moderate"
        }
    }

if __name__ == "__main__":
    print("=== EUR/USD 15m Gemini AI Analysis Test ===")
    analysis = get_gemini_analysis()
    
    # Pretty print the analysis
    print("\n=== Analysis Results ===")
    print(f"Signal: {analysis.get('signal', 'N/A')}")
    print(f"Confidence: {analysis.get('confidence', 'N/A')}%")
    print("\nAnalysis:")
    print(analysis.get('analysis', 'No analysis available'))
    
    print("\nEntry Points:", ", ".join(analysis.get('entry_points', ['N/A'])))
    print("Stop Loss Levels:", ", ".join(analysis.get('stop_loss_levels', ['N/A'])))
    print("Take Profit Targets:", ", ".join(analysis.get('take_profit_targets', ['N/A'])))
    
    print("\nSupport/Resistance:")
    support_res = analysis.get('support_resistance', {})
    print("  Support:", ", ".join(support_res.get('support', ['N/A'])))
    print("  Resistance:", ", ".join(support_res.get('resistance', ['N/A'])))
    
    print("\nKey Indicators:")
    indicators = analysis.get('key_indicators', {})
    for indicator, value in indicators.items():
        print(f"  {indicator}: {value}")
    
    print(f"\nMarket Sentiment: {analysis.get('market_sentiment', 'N/A')}")
    
    print("\nRisk Assessment:")
    risk = analysis.get('risk_assessment', {})
    for factor, value in risk.items():
        print(f"  {factor}: {value}")
    
    # Save full analysis to file
    with open('gemini_analysis.json', 'w') as f:
        json.dump(analysis, f, indent=2)
    print("\nFull analysis saved to gemini_analysis.json")
