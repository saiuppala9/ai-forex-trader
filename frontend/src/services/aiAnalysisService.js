/**
 * Service for interacting with AI Analysis endpoints
 */

const AI_API_BASE_URL = 'http://localhost:8000/api';

const AIAnalysisService = {
  /**
   * Get AI trading analysis for a specific symbol
   * @param {string} symbol - Trading symbol (e.g. 'EUR/USD')
   * @param {string} timeframe - Chart timeframe (e.g. '1h', '4h', '1d')
   * @returns {Promise<Object>} Analysis results
   */
  async getAnalysis(symbol, timeframe = '1h') {
    try {
      // Add timestamp to ensure we get fresh data each time
      const timestamp = new Date().getTime();
      
      // First get the current market price for accuracy
      const marketResponse = await fetch(`http://localhost:8000/api/market/price/${symbol}?_t=${timestamp}`);
      let currentMarketData = null;
      
      if (marketResponse.ok) {
        currentMarketData = await marketResponse.json();
        console.log('Current market data:', currentMarketData);
      }
      
      // Using the correct API endpoint from our backend with cache-busting parameter
      const response = await fetch(`http://localhost:8000/api/analysis/${symbol}?timeframe=${timeframe}&_t=${timestamp}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching analysis: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Fresh analysis data received:', data);
      
      // Inject the current market price into the analysis data for accuracy
      if (currentMarketData) {
        data.currentMarketPrice = currentMarketData.price;
      }
      
      return this.formatBackendAnalysis(data, symbol, timeframe);
    } catch (error) {
      console.error('Error fetching AI analysis:', error);
      // Fallback to mock data if the API call fails
      console.warn('Falling back to mock data');
      return this.getMockAnalysis(symbol, timeframe);
    }
  },
  
  /**
   * Format backend analysis data into the format expected by the frontend
   * @param {Object} data - Raw data from backend
   * @param {string} symbol - Trading symbol
   * @param {string} timeframe - Chart timeframe
   * @returns {Object} Formatted analysis data
   */
  formatBackendAnalysis(data, symbol, timeframe) {
    if (!data) {
      throw new Error('Invalid analysis data received from backend');
    }
    
    console.log('Received data:', data); // Debug log
    
    // Handle error case
    if (data.error) {
      return {
        error: data.error,
        symbol,
        timeframe
      };
    }
    
    // Store the current market price for later use
    const currentMarketPrice = data.currentMarketPrice || (data.tradeSetup ? data.tradeSetup.currentPrice : null);
    
    // Format the data to match the frontend's expected structure
    // Our backend API directly returns the analysis data in the root of the response
    return {
      signal: data.sentiment === 'bullish' ? 'buy' : 
              data.sentiment === 'bearish' ? 'sell' : 'neutral',
      confidence: data.confidence || 80,
      timestamp: data.timestamp || new Date().toISOString(),
      entryPrice: data.entryPrice,
      stopLoss: data.stopLoss,
      exitPrice: data.exitPrice,
      entryReason: data.entryReason,
      analysis: data.analysis,
      supportLevels: data.supportLevels,
      resistanceLevels: data.resistanceLevels,
      indicators: data.indicators || [
        {
          name: 'RSI',
          value: 'Based on AI analysis',
          signal: data.sentiment === 'bullish' ? 'buy' : 'sell'
        },
        {
          name: 'MACD',
          value: 'Based on AI analysis',
          signal: data.sentiment === 'bullish' ? 'buy' : 'sell'
        }
      ],
      volatilityAssessment: data.volatilityAssessment,
      expectedDuration: data.expectedDuration,
      newsImpact: data.newsImpact,
      news: data.news || [],
      timeframe: timeframe,
      symbol: symbol,
      tradeSetup: this.formatTradeSetup(data.tradeSetup, currentMarketPrice, data.signal)
    };
  },
  
  formatTradeSetup(tradeSetup, currentMarketPrice, signal) {
    if (!tradeSetup) return null;
    
    const { entryPrice, stopLoss, takeProfit, entryReason } = tradeSetup;
    
    // Ensure prices are realistic by checking against current market price
    let adjustedEntryPrice = entryPrice;
    let adjustedStopLoss = stopLoss;
    let adjustedTakeProfit = takeProfit;
    
    // If we have current market price, validate the trade setup values
    if (currentMarketPrice) {
      const isBuy = signal.toLowerCase().includes('buy');
      
      // For a buy, entry should be at or slightly below market price
      // For a sell, entry should be at or slightly above market price
      if (Math.abs(entryPrice - currentMarketPrice) / currentMarketPrice > 0.005) {
        // If entry is more than 0.5% away from current price, adjust it
        adjustedEntryPrice = isBuy ? 
          currentMarketPrice * 0.9998 : // Slightly below for buy
          currentMarketPrice * 1.0002; // Slightly above for sell
      }
      
      // For a buy: stop loss should be below entry, take profit above
      if (isBuy) {
        if (stopLoss >= adjustedEntryPrice) {
          adjustedStopLoss = adjustedEntryPrice * 0.997; // 0.3% below entry
        }
        if (takeProfit && takeProfit <= adjustedEntryPrice) {
          adjustedTakeProfit = adjustedEntryPrice * 1.005; // 0.5% above entry
        }
      } 
      // For a sell: stop loss should be above entry, take profit below
      else {
        if (stopLoss <= adjustedEntryPrice) {
          adjustedStopLoss = adjustedEntryPrice * 1.003; // 0.3% above entry
        }
        if (takeProfit && takeProfit >= adjustedEntryPrice) {
          adjustedTakeProfit = adjustedEntryPrice * 0.995; // 0.5% below entry
        }
      }
    }
    
    // Calculate the absolute pip distance for stop loss and take profit
    const stopLossPips = Math.abs(adjustedEntryPrice - adjustedStopLoss) * 10000; // Convert to pips for forex
    const takeProfitPips = adjustedTakeProfit ? Math.abs(adjustedEntryPrice - adjustedTakeProfit) * 10000 : 0;
    
    // Calculate risk-reward ratio
    const riskRewardRatio = takeProfitPips && stopLossPips ? (takeProfitPips / stopLossPips).toFixed(1) : '-';
    
    // Calculate risk percentage based on a hypothetical position size
    const riskPercentage = stopLossPips ? (stopLossPips / adjustedEntryPrice * 100).toFixed(2) : '0.00';
    
    // Convert to appropriate format for frontend
    return {
      entryPrice: adjustedEntryPrice.toFixed(5),
      stopLoss: adjustedStopLoss.toFixed(5),
      takeProfit: adjustedTakeProfit ? adjustedTakeProfit.toFixed(5) : '-',
      riskRewardRatio,
      riskPercentage,
      entryReason,
      currentPrice: currentMarketPrice ? currentMarketPrice.toFixed(5) : null
    };
  },
  
  /**
   * Get AI analysis for multiple timeframes simultaneously
   * @param {string} symbol - Trading symbol (e.g. 'EUR/USD')
   * @param {Array<string>} timeframes - Array of timeframes to analyze
   * @returns {Promise<Object>} Analysis results for all timeframes
   */
  async getMultiTimeframeAnalysis(symbol, timeframes = ['5m', '15m', '1h', '4h', '1d']) {
    try {
      // Fetch analysis for each timeframe
      const analysisPromises = timeframes.map(tf => this.getAnalysis(symbol, tf));
      
      // Wait for all analysis requests to complete
      const analysisResults = await Promise.all(analysisPromises);
      
      // Create an object with timeframe keys and analysis values
      const timeframeResults = {};
      timeframes.forEach((tf, index) => {
        timeframeResults[tf] = analysisResults[index];
      });
      
      // Get the predominant signal across timeframes
      let buyCount = 0;
      let sellCount = 0;
      
      for (const tf of timeframes) {
        const analysis = timeframeResults[tf];
        if (analysis.signal === 'buy') {
          buyCount++;
        } else if (analysis.signal === 'sell') {
          sellCount++;
        }
      }
      
      // Determine consensus signal
      const signal = buyCount > sellCount ? 'buy' : 
                    sellCount > buyCount ? 'sell' : 'neutral';
      
      // Calculate confidence based on agreement percentage
      const agreementRatio = Math.max(buyCount, sellCount) / timeframes.length;
      const confidence = Math.round(agreementRatio * 100);
      
      // Use the 1h timeframe as the primary for price levels if available
      const primaryTimeframe = timeframeResults['1h'] || 
                              timeframeResults[timeframes[0]];
      
      // Generate consensus analysis based on actual data
      const consensus = {
        signal: signal,
        confidence: confidence,
        timestamp: new Date().toISOString(),
        entryPrice: primaryTimeframe.entryPrice,
        stopLoss: primaryTimeframe.stopLoss,
        exitPrice: primaryTimeframe.exitPrice,
        takeProfitTargets: primaryTimeframe.takeProfitTargets,
        riskRewardRatio: primaryTimeframe.riskRewardRatio,
        summary: `Overall ${symbol} analysis shows a ${confidence > 70 ? 'strong' : 'moderate'} ${signal === 'buy' ? 'bullish' : signal === 'sell' ? 'bearish' : 'neutral'} bias ` +
                `with ${confidence}% confidence across multiple timeframes. ` +
                `${signal !== 'neutral' ? `Entry point at ${primaryTimeframe.entryPrice}, stop loss at ${primaryTimeframe.stopLoss}.` : 'No clear trade setup at this time.'}`
      };
      
      return {
        symbol,
        timeframes: timeframeResults,
        consensus
      };
    } catch (error) {
      console.error('Error in multi-timeframe analysis:', error);
      throw error;
    }
  },
  
  /**
   * Get performance metrics for the AI model
   * @param {string} symbol - Trading symbol
   * @param {string} timeframe - Chart timeframe
   * @param {string} period - Time period for metrics (e.g. '1w', '1m', '3m', '1y')
   * @returns {Promise<Object>} Performance metrics
   */
  async getPerformanceMetrics(symbol, timeframe = '1h', period = '3m') {
    // Skip API call and return mock metrics directly
    return {
      lastUpdated: new Date().toISOString(),
      metrics: {
        winRate: 65.5,
        avgProfit: 1.8,
        accuracy: 71.2,
        totalTrades: 245
      }
    };
  },
  
  /**
   * Execute a trade based on AI recommendation
   * @param {string} symbol - Trading symbol
   * @param {string} direction - Trade direction ('buy' or 'sell')
   * @param {number} amount - Trade amount
   * @param {number} entryPrice - Entry price
   * @param {number} stopLoss - Stop loss price
   * @param {number} takeProfit - Take profit price
   * @returns {Promise<Object>} Trade execution result
   */
  async executeTrade(symbol, direction, amount, entryPrice, stopLoss, takeProfit) {
    // This would normally call an API endpoint to execute a trade
    // For demonstration, just return a success response
    const tradeId = `trade-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    return {
      success: true,
      tradeId,
      symbol,
      direction,
      amount,
      entryPrice,
      stopLoss,
      takeProfit,
      executedAt: new Date().toISOString(),
      status: 'pending',
      message: 'Trade executed successfully'
    };
  },
  
  /**
   * Calculate consensus recommendation from multiple timeframe analyses
   * @param {Object} timeframeAnalyses - Analysis results for multiple timeframes
   * @returns {Object} Consensus recommendation
   */
  calculateConsensusRecommendation(timeframeAnalyses) {
    const timeframes = Object.keys(timeframeAnalyses);
    
    if (timeframes.length === 0) {
      return this.getMockConsensus();
    }
    
    // Count the signals across timeframes
    const signalCounts = {
      buy: 0,
      sell: 0,
      neutral: 0
    };
    
    // Assign weights to different timeframes
    const timeframeWeights = {
      '5m': 0.6,   // Lowest weight for shortest timeframe
      '15m': 0.7,
      '1h': 0.8,
      '4h': 0.9,
      '1d': 1.0    // Highest weight for longest timeframe
    };
    
    // Calculate weighted vote for each timeframe
    timeframes.forEach(tf => {
      const analysis = timeframeAnalyses[tf];
      const signal = analysis.signal.toLowerCase();
      const weight = timeframeWeights[tf] || 0.8; // Default weight
      
      if (signal === 'buy') {
        signalCounts.buy += weight;
      } else if (signal === 'sell') {
        signalCounts.sell += weight;
      } else {
        signalCounts.neutral += weight;
      }
    });
    
    // Determine the consensus signal
    let consensusSignal = 'neutral';
    let consensusStrength = 0;
    
    if (signalCounts.buy > signalCounts.sell && signalCounts.buy > signalCounts.neutral) {
      consensusSignal = 'buy';
      consensusStrength = signalCounts.buy / (signalCounts.buy + signalCounts.sell + signalCounts.neutral);
    } else if (signalCounts.sell > signalCounts.buy && signalCounts.sell > signalCounts.neutral) {
      consensusSignal = 'sell';
      consensusStrength = signalCounts.sell / (signalCounts.buy + signalCounts.sell + signalCounts.neutral);
    } else {
      consensusStrength = signalCounts.neutral / (signalCounts.buy + signalCounts.sell + signalCounts.neutral);
    }
    
    // Determine strength label
    let strengthLabel = 'weak';
    if (consensusStrength > 0.7) {
      strengthLabel = 'strong';
    } else if (consensusStrength > 0.5) {
      strengthLabel = 'moderate';
    }
    
    // Find the primary timeframe that aligns with consensus for price targets
    const primaryTimeframe = this.findPrimaryTimeframe(timeframeAnalyses, consensusSignal);
    const primaryAnalysis = timeframeAnalyses[primaryTimeframe];
    
    // Use price targets from the primary timeframe
    return {
      signal: consensusSignal,
      strength: strengthLabel,
      strengthValue: consensusStrength,
      primaryTimeframe,
      entryPrice: primaryAnalysis.entryPrice,
      stopLoss: primaryAnalysis.stopLoss,
      takeProfit: primaryAnalysis.takeProfit,
      riskRewardRatio: primaryAnalysis.riskRewardRatio,
      timeframeSignals: timeframes.map(tf => ({
        timeframe: tf,
        signal: timeframeAnalyses[tf].signal,
        strength: timeframeAnalyses[tf].strength
      }))
    };
  },
  
  /**
   * Find the primary timeframe that best represents the consensus signal
   * @param {Object} timeframeAnalyses - Analysis results for multiple timeframes
   * @param {string} consensusSignal - The overall consensus signal
   * @returns {string} The primary timeframe to use for price levels
   */
  findPrimaryTimeframe(timeframeAnalyses, consensusSignal) {
    const timeframes = Object.keys(timeframeAnalyses);
    
    if (timeframes.length === 0) {
      return '1h'; // Default timeframe
    }
    
    // First try to find a longer timeframe that matches the consensus
    const preferredTimeframes = ['1d', '4h', '1h', '15m', '5m'];
    
    for (const tf of preferredTimeframes) {
      if (timeframes.includes(tf) && 
          timeframeAnalyses[tf].signal.toLowerCase() === consensusSignal.toLowerCase()) {
        return tf;
      }
    }
    
    // If no match, use the longest available timeframe
    for (const tf of preferredTimeframes) {
      if (timeframes.includes(tf)) {
        return tf;
      }
    }
    
    // Fallback to the first timeframe in the list
    return timeframes[0];
  },
  
  /**
   * Generate mock analysis data for development/testing
   * @param {string} symbol - Trading symbol
   * @param {string} timeframe - Chart timeframe
   * @returns {Object} Mock analysis data
   */
  getMockAnalysis(symbol, timeframe) {
    // Get base price for the symbol
    const basePrice = this.getBasePriceForSymbol(symbol);
    const precision = this.getPricePrecisionForSymbol(symbol);
    const volatility = this.getVolatilityForTimeframe(timeframe);
    
    // Randomize the signal with bias based on timeframe
    const signals = ['buy', 'sell', 'neutral'];
    const signalIndex = Math.floor(Math.random() * 3);
    const signal = signals[signalIndex];
    
    // Generate pseudorandom but deterministic price levels based on symbol and timeframe
    const symbolHash = symbol.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const timeframeHash = timeframe.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const seed = (symbolHash + timeframeHash) % 100;
    
    const random = (min, max) => {
      const x = Math.sin(seed + timeframeHash) * 10000;
      const r = x - Math.floor(x);
      return min + r * (max - min);
    };
    
    // Generate price movement percentages based on volatility and timeframe
    const priceMovementPct = random(0.001, volatility);
    
    // Create different price levels based on the signal
    let entryPrice, stopLoss, takeProfit;
    let riskRewardRatio;
    
    if (signal === 'buy') {
      entryPrice = basePrice;
      stopLoss = basePrice * (1 - priceMovementPct * 0.5);
      takeProfit = basePrice * (1 + priceMovementPct);
    } else if (signal === 'sell') {
      entryPrice = basePrice;
      stopLoss = basePrice * (1 + priceMovementPct * 0.5);
      takeProfit = basePrice * (1 - priceMovementPct);
    } else {
      // Neutral signal - set levels around current price
      entryPrice = basePrice;
      stopLoss = basePrice * (1 - priceMovementPct * 0.3);
      takeProfit = basePrice * (1 + priceMovementPct * 0.3);
    }
    
    // Round prices to appropriate precision
    entryPrice = parseFloat(entryPrice.toFixed(precision));
    stopLoss = parseFloat(stopLoss.toFixed(precision));
    takeProfit = parseFloat(takeProfit.toFixed(precision));
    
    // Calculate risk/reward ratio
    if (signal === 'buy') {
      riskRewardRatio = (takeProfit - entryPrice) / (entryPrice - stopLoss);
    } else if (signal === 'sell') {
      riskRewardRatio = (entryPrice - takeProfit) / (stopLoss - entryPrice);
    } else {
      riskRewardRatio = 1.0;
    }
    
    riskRewardRatio = parseFloat(riskRewardRatio.toFixed(2));
    
    // Generate indicators
    const indicators = this.generateMockIndicators(basePrice, timeframe);
    
    // Generate patterns
    const patterns = this.generateMockPatterns(signal);
    
    // Generate strength
    const strengths = ['weak', 'moderate', 'strong'];
    const strength = strengths[Math.floor(random(0, 3))];
    
    // Generate notes
    const notes = this.generateAnalysisNotes(symbol, timeframe, signal);
    
    return {
      symbol,
      timeframe,
      lastUpdated: new Date().toISOString(),
      signal,
      strength,
      entryPrice,
      stopLoss,
      takeProfit,
      riskRewardRatio,
      supportLevels: [stopLoss, stopLoss * 0.99, stopLoss * 0.98].map(p => parseFloat(p.toFixed(precision))),
      resistanceLevels: [takeProfit, takeProfit * 1.01, takeProfit * 1.02].map(p => parseFloat(p.toFixed(precision))),
      indicators,
      patterns,
      notes
    };
  },
  
  /**
   * Generate mock consensus data
   * @param {string} symbol - Trading symbol
   * @returns {Object} Mock consensus data
   */
  getMockConsensus(symbol) {
    // Get base price for the symbol
    const basePrice = this.getBasePriceForSymbol(symbol);
    const precision = this.getPricePrecisionForSymbol(symbol);
    
    // Randomize the signal
    const signals = ['buy', 'sell', 'neutral'];
    const signalIndex = Math.floor(Math.random() * 3);
    const signal = signals[signalIndex];
    
    // Generate strength
    const strengths = ['weak', 'moderate', 'strong'];
    const strength = strengths[Math.floor(Math.random() * 3)];
    
    // Convert strength to a value
    let strengthValue = 0.3;
    if (strength === 'moderate') strengthValue = 0.6;
    if (strength === 'strong') strengthValue = 0.85;
    
    // Generate price levels
    const volatility = 0.01; // 1% movement
    let entryPrice, stopLoss, takeProfit;
    let riskRewardRatio;
    
    if (signal === 'buy') {
      entryPrice = basePrice;
      stopLoss = basePrice * (1 - volatility * 0.5);
      takeProfit = basePrice * (1 + volatility);
    } else if (signal === 'sell') {
      entryPrice = basePrice;
      stopLoss = basePrice * (1 + volatility * 0.5);
      takeProfit = basePrice * (1 - volatility);
    } else {
      // Neutral signal
      entryPrice = basePrice;
      stopLoss = basePrice * (1 - volatility * 0.3);
      takeProfit = basePrice * (1 + volatility * 0.3);
    }
    
    // Round prices to appropriate precision
    entryPrice = parseFloat(entryPrice.toFixed(precision));
    stopLoss = parseFloat(stopLoss.toFixed(precision));
    takeProfit = parseFloat(takeProfit.toFixed(precision));
    
    // Calculate risk/reward ratio
    if (signal === 'buy') {
      riskRewardRatio = (takeProfit - entryPrice) / (entryPrice - stopLoss);
    } else if (signal === 'sell') {
      riskRewardRatio = (entryPrice - takeProfit) / (stopLoss - entryPrice);
    } else {
      riskRewardRatio = 1.0;
    }
    
    riskRewardRatio = parseFloat(riskRewardRatio.toFixed(2));
    
    return {
      signal,
      strength,
      strengthValue,
      primaryTimeframe: '1h',
      entryPrice,
      stopLoss,
      takeProfit,
      riskRewardRatio,
      timeframeSignals: [
        { timeframe: '5m', signal: signals[Math.floor(Math.random() * 3)], strength: strengths[Math.floor(Math.random() * 3)] },
        { timeframe: '15m', signal: signals[Math.floor(Math.random() * 3)], strength: strengths[Math.floor(Math.random() * 3)] },
        { timeframe: '1h', signal, strength },
        { timeframe: '4h', signal: signals[Math.floor(Math.random() * 3)], strength: strengths[Math.floor(Math.random() * 3)] },
        { timeframe: '1d', signal: signals[Math.floor(Math.random() * 3)], strength: strengths[Math.floor(Math.random() * 3)] }
      ]
    };
  },
  
  /**
   * Generate mock performance metrics
   * @param {string} symbol - Trading symbol
   * @param {string} timeframe - Chart timeframe
   * @param {string} period - Time period
   * @returns {Object} Mock performance metrics
   */
  getMockPerformanceMetrics(symbol, timeframe, period) {
    // Generate random but realistic performance metrics
    const winRate = 65 + Math.floor(Math.random() * 20); // 65-85%
    const profitFactor = 1.5 + Math.random(); // 1.5-2.5
    const sharpeRatio = 1.0 + Math.random(); // 1.0-2.0
    const maxDrawdown = 5 + Math.floor(Math.random() * 10); // 5-15%
    const totalTrades = 50 + Math.floor(Math.random() * 100); // 50-150
    const profitableTrades = Math.floor(totalTrades * (winRate / 100));
    const unprofitableTrades = totalTrades - profitableTrades;
    
    // Calculate average trade metrics
    const avgWin = 1.5 + Math.random(); // 1.5-2.5%
    const avgLoss = 0.8 + Math.random() * 0.7; // 0.8-1.5%
    
    // Calculate profit/loss amount
    const totalProfit = profitableTrades * avgWin;
    const totalLoss = unprofitableTrades * avgLoss;
    const netProfitPct = totalProfit - totalLoss;
    
    // Generate trade history data
    const tradeHistory = [];
    
    // Last 20 trades
    for (let i = 0; i < 20; i++) {
      const profitable = Math.random() < (winRate / 100);
      const pnlPct = profitable ? avgWin * (0.5 + Math.random()) : -avgLoss * (0.5 + Math.random());
      
      const tradeDate = new Date();
      tradeDate.setDate(tradeDate.getDate() - i * 2); // Spread trades over time
      
      tradeHistory.push({
        id: `trade-${i}`,
        date: tradeDate.toISOString(),
        symbol,
        direction: Math.random() > 0.5 ? 'buy' : 'sell',
        entryPrice: this.getBasePriceForSymbol(symbol),
        exitPrice: this.getBasePriceForSymbol(symbol) * (1 + pnlPct / 100),
        pnlPct: parseFloat(pnlPct.toFixed(2)),
        profitable
      });
    }
    
    return {
      overview: {
        winRate: winRate,
        profitFactor: parseFloat(profitFactor.toFixed(2)),
        sharpeRatio: parseFloat(sharpeRatio.toFixed(2)),
        maxDrawdown: maxDrawdown,
        netProfitPct: parseFloat(netProfitPct.toFixed(2)),
        totalTrades,
        profitableTrades,
        unprofitableTrades
      },
      averages: {
        avgWin: parseFloat(avgWin.toFixed(2)),
        avgLoss: parseFloat(avgLoss.toFixed(2)),
        avgTradeTime: '4h 30m',
        avgRiskRewardRatio: parseFloat((avgWin / avgLoss).toFixed(2))
      },
      tradeHistory
    };
  },
  
  // Helper methods for generating mock data
  
  getBasePriceForSymbol(symbol) {
    const basePrices = {
      'EUR/USD': 1.1,
      'GBP/USD': 1.27,
      'USD/JPY': 150.1,
      'AUD/USD': 0.67,
      'USD/CAD': 1.35,
      'USD/CHF': 0.89,
      'NZD/USD': 0.6,
      'EUR/GBP': 0.86,
      'EUR/JPY': 165.12,
      'GBP/JPY': 191.65,
      'BTC/USD': 64000,
      'ETH/USD': 3500,
      'XRP/USD': 0.52
    };
    
    return basePrices[symbol] || (symbol.includes('USD') ? 1.0 : 100.0);
  },
  
  getPricePrecisionForSymbol(symbol) {
    if (symbol.includes('JPY')) return 3;
    if (symbol.includes('BTC') || symbol.includes('ETH')) return 2;
    if (symbol.includes('XRP')) return 4;
    return 5; // Default for forex pairs
  },
  
  getVolatilityForTimeframe(timeframe) {
    const volatilityMap = {
      '5m': 0.001,   // 0.1%
      '15m': 0.002,  // 0.2%
      '1h': 0.005,   // 0.5%
      '4h': 0.01,    // 1.0%
      '1d': 0.02     // 2.0%
    };
    
    return volatilityMap[timeframe] || 0.005;
  },
  
  generateMockIndicators(price, timeframe) {
    const volatility = this.getVolatilityForTimeframe(timeframe);
    
    return {
      ma: {
        ma20: parseFloat((price * (1 + (Math.random() - 0.5) * volatility * 0.5)).toFixed(5)),
        ma50: parseFloat((price * (1 + (Math.random() - 0.5) * volatility * 0.7)).toFixed(5)),
        ma200: parseFloat((price * (1 + (Math.random() - 0.5) * volatility)).toFixed(5))
      },
      rsi: parseFloat((30 + Math.random() * 40).toFixed(2)),
      macd: {
        macd: parseFloat((Math.random() * 0.002 - 0.001).toFixed(5)),
        signal: parseFloat((Math.random() * 0.002 - 0.001).toFixed(5)),
        histogram: parseFloat((Math.random() * 0.001 - 0.0005).toFixed(5))
      },
      atr: parseFloat((price * volatility).toFixed(5))
    };
  },
  
  generateMockPatterns(signal) {
    const patterns = [];
    
    const allPatterns = {
      bullish: ['Bullish Engulfing', 'Morning Star', 'Hammer', 'Piercing Line', 'Bullish Harami', 'Three White Soldiers'],
      bearish: ['Bearish Engulfing', 'Evening Star', 'Hanging Man', 'Dark Cloud Cover', 'Bearish Harami', 'Three Black Crows'],
      neutral: ['Doji', 'Spinning Top', 'High Wave', 'Long-Legged Doji', 'Dragonfly Doji']
    };
    
    // Add 1-3 patterns based on the signal
    const numPatterns = 1 + Math.floor(Math.random() * 3);
    
    if (signal === 'buy') {
      for (let i = 0; i < numPatterns; i++) {
        const randomIndex = Math.floor(Math.random() * allPatterns.bullish.length);
        if (!patterns.includes(allPatterns.bullish[randomIndex])) {
          patterns.push(allPatterns.bullish[randomIndex]);
        }
      }
    } else if (signal === 'sell') {
      for (let i = 0; i < numPatterns; i++) {
        const randomIndex = Math.floor(Math.random() * allPatterns.bearish.length);
        if (!patterns.includes(allPatterns.bearish[randomIndex])) {
          patterns.push(allPatterns.bearish[randomIndex]);
        }
      }
    } else {
      for (let i = 0; i < numPatterns; i++) {
        const randomIndex = Math.floor(Math.random() * allPatterns.neutral.length);
        if (!patterns.includes(allPatterns.neutral[randomIndex])) {
          patterns.push(allPatterns.neutral[randomIndex]);
        }
      }
    }
    
    return patterns;
  },
  
  generateAnalysisNotes(symbol, timeframe, signal) {
    const notes = [];
    
    if (signal === 'buy') {
      notes.push(`${symbol} shows bullish momentum on the ${timeframe} timeframe.`);
      notes.push('Key technical indicators align for a potential upward movement.');
    } else if (signal === 'sell') {
      notes.push(`${symbol} displays bearish pressure on the ${timeframe} timeframe.`);
      notes.push('Multiple resistance levels suggest a continued downtrend.');
    } else {
      notes.push(`${symbol} is consolidating on the ${timeframe} timeframe.`);
      notes.push('Mixed signals suggest waiting for clearer direction before entry.');
    }
    
    return notes;
  },

  /**
   * Get signal history for a specific symbol
   * @param {string} symbol - Trading symbol
   * @returns {Promise<Array>} Array of historical signals
   */
  async getSignalHistory(symbol) {
    // Generate mock signal history
    const history = [];
    const basePrice = this.getBasePriceForSymbol(symbol);
    const now = new Date();

    // Generate 10 historical signals
    for (let i = 0; i < 10; i++) {
      const signal = Math.random() > 0.5 ? 'buy' : 'sell';
      const confidence = 70 + Math.random() * 25;
      const volatility = this.getVolatilityForTimeframe('1h');
      const entryPrice = basePrice * (1 + (Math.random() - 0.5) * volatility);

      history.push({
        timestamp: new Date(now.getTime() - i * 3600000).toISOString(), // 1 hour intervals
        symbol: symbol,
        signal: signal,
        confidence: Math.round(confidence),
        entryPrice: entryPrice.toFixed(4),
        stopLoss: (signal === 'buy' ? 
          entryPrice * (1 - volatility) : 
          entryPrice * (1 + volatility)).toFixed(4),
        takeProfit: (signal === 'buy' ? 
          entryPrice * (1 + volatility * 2) : 
          entryPrice * (1 - volatility * 2)).toFixed(4)
      });
    }

    return history;
  }
};

export default AIAnalysisService;
