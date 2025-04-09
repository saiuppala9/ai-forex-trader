/**
 * Service for interacting with AI analysis endpoints
 */
const API_BASE_URL = 'http://localhost:8000/api';

const AiAnalysisService = {
  /**
   * Get AI analysis for a specific symbol
   * @param {string} symbol - Trading symbol (e.g., 'EUR/USD')
   * @returns {Promise<Object>} Analysis results
   */
  async getAnalysis(symbol) {
    try {
      // Format symbol for API
      const formattedSymbol = symbol.replace('/', '');
      const response = await fetch(`${API_BASE_URL}/analysis/${formattedSymbol}`);
      
      if (!response.ok) {
        throw new Error(`Analysis API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
      // Return default/fallback analysis data
      return {
        trend: 'NEUTRAL',
        confidence: 0,
        entry_price: 0,
        target_price: 0,
        stop_loss: 0,
        support: 0,
        resistance: 0,
        risk_reward_ratio: 0,
        patterns: [],
        sentiment: 0,
        indicators: {
          RSI: 50,
          SMA_20: 0,
          EMA_20: 0,
          BB_Position: 0.5
        }
      };
    }
  },

  /**
   * Execute a trade based on AI recommendation
   * @param {Object} tradeData - Trade parameters
   * @returns {Promise<Object>} Trade execution result
   */
  async executeTrade(tradeData) {
    try {
      const response = await fetch(`${API_BASE_URL}/trade/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tradeData),
      });
      
      if (!response.ok) {
        throw new Error(`Trade execution error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error executing trade:', error);
      throw error;
    }
  },

  /**
   * Get historical performance of AI predictions
   * @returns {Promise<Object>} Historical performance stats
   */
  async getPerformanceMetrics() {
    try {
      const response = await fetch(`${API_BASE_URL}/analysis/performance`);
      
      if (!response.ok) {
        throw new Error(`Performance API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
      return {
        win_rate: 0,
        avg_return: 0,
        total_trades: 0,
        profitable_trades: 0
      };
    }
  }
};

export default AiAnalysisService;
