from textblob import TextBlob
from typing import List, Dict, Any
import json
import os
import google.generativeai as genai

class AIMarketAnalyzer:
    def __init__(self):
        # Initialize Google Generative AI
        genai.configure(api_key=os.getenv('GOOGLE_API_KEY'))
        self.model = genai.GenerativeModel('gemini-pro')
    
    def analyze_sentiment(self, text: str) -> Dict:
        analysis = TextBlob(text)
        polarity = analysis.sentiment.polarity
        
        # Convert polarity to label
        if polarity > 0.1:
            label = 'positive'
        elif polarity < -0.1:
            label = 'negative'
        else:
            label = 'neutral'
            
        return {
            'label': label,
            'score': abs(polarity)
        }
    
    async def analyze_market_data(self, 
                                symbol: str, 
                                technical_indicators: Dict[str, float],
                                price_data: Dict[str, float],
                                news_data: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyze market data using AI models to generate predictions and insights
        """
        # Prepare market context
        market_context = self._prepare_market_context(symbol, technical_indicators, price_data, news_data)
        
        # Get sentiment analysis for news
        news_sentiments = []
        for news in news_data[:5]:  # Analyze latest 5 news items
            sentiment = self.analyze_sentiment(news['text'])
            news_sentiments.append({
                'score': sentiment['score'],
                'label': sentiment['label']
            })
        
        # Generate market analysis using Gemini Pro
        analysis_prompt = f"""
        Analyze the following forex market data for {symbol}:
        
        Technical Indicators:
        RSI: {technical_indicators.get('RSI')}
        MACD: {technical_indicators.get('MACD')}
        SMA_20: {technical_indicators.get('SMA_20')}
        Current Price: {price_data.get('current_price')}
        
        Recent News Sentiment: {json.dumps(news_sentiments)}
        
        Provide:
        1. Market direction prediction
        2. Key support and resistance levels
        3. Risk assessment
        4. Trading recommendation
        """
        
        analysis_result = await self._generate_analysis(analysis_prompt)
        
        # Combine all insights
        return {
            'market_sentiment': self._aggregate_sentiment(news_sentiments),
            'technical_analysis': analysis_result,
            'confidence_score': self._calculate_confidence(
                technical_indicators,
                news_sentiments,
                analysis_result
            )
        }
    
    def _prepare_market_context(self, 
                              symbol: str, 
                              technical_indicators: Dict[str, float],
                              price_data: Dict[str, float],
                              news_data: List[Dict[str, Any]]) -> str:
        """Prepare market context for AI analysis"""
        context = {
            'symbol': symbol,
            'indicators': technical_indicators,
            'price_data': price_data,
            'recent_news': [n['title'] for n in news_data[:5]]
        }
        return json.dumps(context)
    
    async def _generate_analysis(self, prompt: str) -> Dict[str, Any]:
        """Generate market analysis using Gemini Pro"""
        response = await self.model.generate_content_async(prompt)
        analysis_text = response.text
        
        # Parse the response to extract key information
        analysis_lines = analysis_text.split('\n')
        analysis_result = {
            'direction': 'neutral',
            'strength': 0.5,
            'support_levels': [],
            'resistance_levels': [],
            'risk_assessment': 'moderate',
            'recommendation': '',
            'raw_analysis': analysis_text
        }
        
        for line in analysis_lines:
            line = line.lower().strip()
            if 'direction' in line or 'prediction' in line:
                if 'bullish' in line:
                    analysis_result['direction'] = 'bullish'
                    analysis_result['strength'] = 0.7 if 'strong' in line else 0.6
                elif 'bearish' in line:
                    analysis_result['direction'] = 'bearish'
                    analysis_result['strength'] = 0.7 if 'strong' in line else 0.6
            elif 'support' in line and ':' in line:
                try:
                    level = float(line.split(':')[1].strip().split()[0])
                    analysis_result['support_levels'].append(level)
                except (ValueError, IndexError):
                    pass
            elif 'resistance' in line and ':' in line:
                try:
                    level = float(line.split(':')[1].strip().split()[0])
                    analysis_result['resistance_levels'].append(level)
                except (ValueError, IndexError):
                    pass
            elif 'risk' in line:
                if 'high' in line:
                    analysis_result['risk_assessment'] = 'high'
                elif 'low' in line:
                    analysis_result['risk_assessment'] = 'low'
            elif 'recommend' in line:
                analysis_result['recommendation'] = line
        
        return analysis_result
    
    def _aggregate_sentiment(self, sentiments: List[Dict[str, float]]) -> float:
        """Aggregate sentiment scores"""
        if not sentiments:
            return 0.0
        
        # Calculate weighted average based on sentiment scores
        total_score = 0.0
        total_weight = 0.0
        
        for sentiment in sentiments:
            score = sentiment['score']
            # Convert sentiment label to direction (-1 for negative, 0 for neutral, 1 for positive)
            direction = -1 if sentiment['label'] == 'negative' else (1 if sentiment['label'] == 'positive' else 0)
            total_score += score * direction
            total_weight += score
        
        return total_score / total_weight if total_weight > 0 else 0.0
    
    def _calculate_confidence(self,
                            technical_indicators: Dict[str, float],
                            sentiments: List[Dict[str, float]],
                            analysis_result: Dict[str, Any]) -> float:
        """Calculate overall confidence score"""
        # Technical analysis confidence
        rsi = technical_indicators.get('RSI', 50)
        macd = technical_indicators.get('MACD', 0)
        
        # RSI confidence (higher near overbought/oversold levels)
        rsi_confidence = min(abs(rsi - 50) / 30.0, 1.0)
        
        # MACD confidence (based on signal strength)
        macd_confidence = min(abs(macd) / 2.0, 1.0)
        
        tech_confidence = (rsi_confidence + macd_confidence) / 2
        
        # Sentiment confidence
        sentiment_confidence = abs(self._aggregate_sentiment(sentiments))
        
        # Analysis confidence from Gemini Pro
        analysis_confidence = analysis_result.get('strength', 0.5)
        
        # Risk assessment factor
        risk_factor = 0.8 if analysis_result.get('risk_assessment') == 'low' else \
                     (0.4 if analysis_result.get('risk_assessment') == 'high' else 0.6)
        
        # Weighted average with risk adjustment
        base_confidence = (0.4 * tech_confidence + 
                         0.3 * sentiment_confidence + 
                         0.3 * analysis_confidence)
        
        return base_confidence * risk_factor
