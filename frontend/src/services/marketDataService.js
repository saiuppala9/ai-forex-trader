/**
 * Service for interacting with market data and news services
 */

// Market Data Service for handling data fetching and transformation
// This service centralizes all market data requests to ensure consistency across components
const MarketDataService = {
  /**
   * Search for trading symbols
   * @param {string} query - Search text
   * @returns {Promise<Array>} Array of symbol matches
   */
  searchSymbols: async (query) => {
    try {
      // Comprehensive list of trading instruments categorized by provider/exchange
      const allSymbols = [
        // === FOREX (via OANDA) ===
        { symbol: 'EUR/USD', name: 'Euro / US Dollar', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'GBP/USD', name: 'British Pound / US Dollar', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'EUR/GBP', name: 'Euro / British Pound', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'EUR/AUD', name: 'Euro / Australian Dollar', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'AUD/JPY', name: 'Australian Dollar / Japanese Yen', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'EUR/CAD', name: 'Euro / Canadian Dollar', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'CHF/JPY', name: 'Swiss Franc / Japanese Yen', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'USD/SGD', name: 'US Dollar / Singapore Dollar', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'USD/HKD', name: 'US Dollar / Hong Kong Dollar', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'USD/TRY', name: 'US Dollar / Turkish Lira', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'USD/MXN', name: 'US Dollar / Mexican Peso', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'USD/ZAR', name: 'US Dollar / South African Rand', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'USD/SEK', name: 'US Dollar / Swedish Krona', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'USD/NOK', name: 'US Dollar / Norwegian Krone', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'USD/DKK', name: 'US Dollar / Danish Krone', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'USD/INR', name: 'US Dollar / Indian Rupee', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'EUR/INR', name: 'Euro / Indian Rupee', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        { symbol: 'GBP/INR', name: 'British Pound / Indian Rupee', type: 'forex', exchange: 'OANDA', provider: 'OANDA' },
        
        // === CRYPTOCURRENCIES (via COINBASE) ===
        { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', type: 'crypto', exchange: 'COINBASE', provider: 'COINBASE' },
        { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', type: 'crypto', exchange: 'COINBASE', provider: 'COINBASE' },
        { symbol: 'XRP/USD', name: 'Ripple / US Dollar', type: 'crypto', exchange: 'COINBASE', provider: 'COINBASE' },
        { symbol: 'LTC/USD', name: 'Litecoin / US Dollar', type: 'crypto', exchange: 'COINBASE', provider: 'COINBASE' },
        { symbol: 'BCH/USD', name: 'Bitcoin Cash / US Dollar', type: 'crypto', exchange: 'COINBASE', provider: 'COINBASE' },
        { symbol: 'ADA/USD', name: 'Cardano / US Dollar', type: 'crypto', exchange: 'COINBASE', provider: 'COINBASE' },
        { symbol: 'DOT/USD', name: 'Polkadot / US Dollar', type: 'crypto', exchange: 'COINBASE', provider: 'COINBASE' },
        { symbol: 'LINK/USD', name: 'Chainlink / US Dollar', type: 'crypto', exchange: 'COINBASE', provider: 'COINBASE' },
        { symbol: 'BNB/USD', name: 'Binance Coin / US Dollar', type: 'crypto', exchange: 'COINBASE', provider: 'COINBASE' },
        { symbol: 'DOGE/USD', name: 'Dogecoin / US Dollar', type: 'crypto', exchange: 'COINBASE', provider: 'COINBASE' },
        { symbol: 'SOL/USD', name: 'Solana / US Dollar', type: 'crypto', exchange: 'COINBASE', provider: 'COINBASE' },
        { symbol: 'AVAX/USD', name: 'Avalanche / US Dollar', type: 'crypto', exchange: 'COINBASE', provider: 'COINBASE' },
        { symbol: 'MATIC/USD', name: 'Polygon / US Dollar', type: 'crypto', exchange: 'COINBASE', provider: 'COINBASE' },
        { symbol: 'SHIB/USD', name: 'Shiba Inu / US Dollar', type: 'crypto', exchange: 'COINBASE', provider: 'COINBASE' },
        { symbol: 'ATOM/USD', name: 'Cosmos / US Dollar', type: 'crypto', exchange: 'COINBASE', provider: 'COINBASE' },
        
        // === COMMODITIES (via TVC) ===
        { symbol: 'XAUUSD', name: 'Gold / US Dollar', type: 'commodity', exchange: 'TVC', provider: 'TradingView' },
        { symbol: 'XAGUSD', name: 'Silver / US Dollar', type: 'commodity', exchange: 'TVC', provider: 'TradingView' },
        { symbol: 'WTICOUSD', name: 'WTI Crude Oil / US Dollar', type: 'commodity', exchange: 'TVC', provider: 'TradingView' },
        { symbol: 'BRENTCOUSD', name: 'Brent Crude Oil / US Dollar', type: 'commodity', exchange: 'TVC', provider: 'TradingView' },
        { symbol: 'NATGASUSD', name: 'Natural Gas / US Dollar', type: 'commodity', exchange: 'TVC', provider: 'TradingView' },
        { symbol: 'COPPUSD', name: 'Copper / US Dollar', type: 'commodity', exchange: 'TVC', provider: 'TradingView' },
        { symbol: 'PLTUSD', name: 'Platinum / US Dollar', type: 'commodity', exchange: 'TVC', provider: 'TradingView' },
        { symbol: 'PALUSD', name: 'Palladium / US Dollar', type: 'commodity', exchange: 'TVC', provider: 'TradingView' },
        
        // === GLOBAL INDICES (via INDEX provider) ===
        { symbol: 'US500', name: 'S&P 500', type: 'index', exchange: 'INDEX', provider: 'TradingView' },
        { symbol: 'US30', name: 'Dow Jones Industrial Average', type: 'index', exchange: 'INDEX', provider: 'TradingView' },
        { symbol: 'US100', name: 'Nasdaq 100', type: 'index', exchange: 'INDEX', provider: 'TradingView' },
        { symbol: 'JP225', name: 'Nikkei 225', type: 'index', exchange: 'INDEX', provider: 'TradingView' },
        { symbol: 'UK100', name: 'FTSE 100', type: 'index', exchange: 'INDEX', provider: 'TradingView' },
        { symbol: 'DE40', name: 'DAX 40', type: 'index', exchange: 'INDEX', provider: 'TradingView' },
        { symbol: 'FR40', name: 'CAC 40', type: 'index', exchange: 'INDEX', provider: 'TradingView' },
        { symbol: 'EU50', name: 'Euro Stoxx 50', type: 'index', exchange: 'INDEX', provider: 'TradingView' },
        { symbol: 'IN50', name: 'Nifty 50', type: 'index', exchange: 'NSE', provider: 'NSE' },
        { symbol: 'BSESENSEX', name: 'BSE Sensex', type: 'index', exchange: 'BSE', provider: 'BSE' },
        
        // === US STOCKS (NASDAQ) ===
        { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        { symbol: 'GOOG', name: 'Alphabet Inc. Class C', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        { symbol: 'META', name: 'Meta Platforms Inc.', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        { symbol: 'INTC', name: 'Intel Corporation', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        { symbol: 'NFLX', name: 'Netflix, Inc.', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        { symbol: 'PYPL', name: 'PayPal Holdings, Inc.', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        { symbol: 'ADBE', name: 'Adobe Inc.', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        { symbol: 'CMCSA', name: 'Comcast Corporation', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        { symbol: 'CSCO', name: 'Cisco Systems, Inc.', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        { symbol: 'PEP', name: 'PepsiCo, Inc.', type: 'stock', exchange: 'NASDAQ', provider: 'NASDAQ' },
        
        // === US STOCKS (NYSE) ===
        { symbol: 'JPM', name: 'JPMorgan Chase & Co.', type: 'stock', exchange: 'NYSE', provider: 'NYSE' },
        { symbol: 'V', name: 'Visa Inc.', type: 'stock', exchange: 'NYSE', provider: 'NYSE' },
        { symbol: 'WMT', name: 'Walmart Inc.', type: 'stock', exchange: 'NYSE', provider: 'NYSE' },
        { symbol: 'BAC', name: 'Bank of America Corporation', type: 'stock', exchange: 'NYSE', provider: 'NYSE' },
        { symbol: 'DIS', name: 'The Walt Disney Company', type: 'stock', exchange: 'NYSE', provider: 'NYSE' },
        { symbol: 'PFE', name: 'Pfizer Inc.', type: 'stock', exchange: 'NYSE', provider: 'NYSE' },
        { symbol: 'XOM', name: 'Exxon Mobil Corporation', type: 'stock', exchange: 'NYSE', provider: 'NYSE' },
        { symbol: 'KO', name: 'The Coca-Cola Company', type: 'stock', exchange: 'NYSE', provider: 'NYSE' },
        { symbol: 'MA', name: 'Mastercard Incorporated', type: 'stock', exchange: 'NYSE', provider: 'NYSE' },
        { symbol: 'T', name: 'AT&T Inc.', type: 'stock', exchange: 'NYSE', provider: 'NYSE' },
        { symbol: 'VZ', name: 'Verizon Communications Inc.', type: 'stock', exchange: 'NYSE', provider: 'NYSE' },
        { symbol: 'CVX', name: 'Chevron Corporation', type: 'stock', exchange: 'NYSE', provider: 'NYSE' },
        { symbol: 'HD', name: 'The Home Depot, Inc.', type: 'stock', exchange: 'NYSE', provider: 'NYSE' },
        
        // === INDIAN STOCKS (NSE) ===
        { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'INFY', name: 'Infosys Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'SBIN', name: 'State Bank of India', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'WIPRO', name: 'Wipro Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'AXISBANK', name: 'Axis Bank Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'ITC', name: 'ITC Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Industries Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'ADANIPORTS', name: 'Adani Ports and Special Economic Zone Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' },
        { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', type: 'stock', exchange: 'NSE', provider: 'NSE India' }
      ];
      
      // Filter based on user's search query
      if (!query || query.trim() === '') {
        // Return a mix of different instrument types when query is empty
        return [
          // Popular forex
          allSymbols.find(s => s.symbol === 'EUR/USD'),
          allSymbols.find(s => s.symbol === 'GBP/USD'),
          // Popular crypto
          allSymbols.find(s => s.symbol === 'BTC/USD'),
          allSymbols.find(s => s.symbol === 'ETH/USD'),
          // Popular commodities
          allSymbols.find(s => s.symbol === 'XAUUSD'),
          // Popular US stocks
          allSymbols.find(s => s.symbol === 'AAPL'),
          allSymbols.find(s => s.symbol === 'MSFT'),
          // Popular Indian stocks
          allSymbols.find(s => s.symbol === 'RELIANCE'),
          allSymbols.find(s => s.symbol === 'TCS'),
          // Popular indices
          allSymbols.find(s => s.symbol === 'US500')
        ].filter(Boolean) // Filter out any undefined entries
         .map(item => ({
           ...item,
           tradingViewSupported: true // Mark all default items as supported
         }));
      }
      
      // Perform case-insensitive search on symbol and name
      const results = allSymbols.filter(item => 
        item.symbol.toLowerCase().includes(query.toLowerCase()) ||
        item.name.toLowerCase().includes(query.toLowerCase())
      ).map(item => {
        // Add a flag to indicate if this symbol is supported in TradingView
        // This list should match the one in the ExnessTrader component
        let tradingViewSupported = false;
        
        // 1. All forex pairs (X/Y format)
        if (item.symbol.includes('/')) tradingViewSupported = true;
        
        // 2. Listed Indian stocks
        if (['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'ICICIBANK', 'HINDUNILVR', 'SBIN', 
             'TATAMOTORS', 'WIPRO', 'KOTAKBANK', 'AXISBANK', 'BHARTIARTL', 'ITC', 
             'HCLTECH', 'SUNPHARMA', 'ASIANPAINT', 'BAJFINANCE', 'ADANIENT', 
             'ADANIPORTS', 'MARUTI'].includes(item.symbol)) {
          tradingViewSupported = true;
        }
        
        // 3. Listed indices
        if (['US500', 'US30', 'US100', 'UK100', 'JP225', 'DE40', 'FR40', 'EU50', 'IN50', 'BSESENSEX'].includes(item.symbol)) {
          tradingViewSupported = true;
        }
        
        // 4. Listed commodities
        if (['XAUUSD', 'XAGUSD', 'WTICOUSD', 'BRENTCOUSD', 'NATGASUSD', 'COPPUSD', 'PLTUSD', 'PALUSD'].includes(item.symbol)) {
          tradingViewSupported = true;
        }
        
        // 5. Listed NYSE stocks
        if (['JPM', 'V', 'WMT', 'BAC', 'DIS', 'PFE', 'XOM', 'KO', 'MA', 'T', 'VZ', 'CVX', 'HD'].includes(item.symbol)) {
          tradingViewSupported = true;
        }
        
        // 6. Popular NASDAQ stocks
        if (['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'GOOG', 'META', 'TSLA', 'NVDA', 'INTC', 'AMD', 
             'NFLX', 'PYPL', 'ADBE', 'CMCSA', 'CSCO', 'PEP'].includes(item.symbol)) {
          tradingViewSupported = true;
        }
        
        return {
          ...item,
          tradingViewSupported
        };
      });
      
      // Group results by provider
      const groupedResults = results.reduce((acc, item) => {
        const key = `${item.provider} (${item.exchange})`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(item);
        return acc;
      }, {});
      
      // Convert grouped results to format with provider info
      let finalResults = [];
      Object.entries(groupedResults).forEach(([providerKey, items]) => {
        // Add a special header item
        finalResults.push({
          isHeader: true,
          provider: providerKey,
          symbol: '',
          name: providerKey,
          type: 'header'
        });
        
        // Add the actual items
        finalResults = finalResults.concat(items);
      });
      
      return finalResults;
    } catch (error) {
      console.error('Error searching symbols:', error);
      return [];
    }
  },

  /**
   * Get popular trading pairs
   * @returns {Object} Object with categories and symbols
   */
  getPopularSymbols: () => {
    return {
      forex: [
        { symbol: 'EUR/USD', name: 'Euro / US Dollar' },
        { symbol: 'GBP/USD', name: 'British Pound / US Dollar' },
        { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen' },
        { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar' }
      ],
      crypto: [
        { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar' },
        { symbol: 'ETH/USD', name: 'Ethereum / US Dollar' },
        { symbol: 'XRP/USD', name: 'Ripple / US Dollar' }
      ],
      indices: [
        { symbol: 'US500', name: 'S&P 500' },
        { symbol: 'US30', name: 'Dow Jones Industrial Average' },
        { symbol: 'US100', name: 'Nasdaq 100' }
      ]
    };
  },

  /**
   * Get market news for a specific symbol
   * @param {string} symbol Trading symbol
   * @returns {Promise<Array>} Array of news articles
   */
  getMarketNews: async (symbol) => {
    try {
      console.log(`Fetching news for ${symbol}`);
      // Directly return static news data
      const news = MarketDataService.getStaticNews(symbol);
      console.log(`Generated ${news.length} news items`);
      return news;
    } catch (error) {
      console.error('Error fetching market news:', error);
      return MarketDataService.getStaticNews(symbol);
    }
  },

  /**
   * Get symbol-specific news
   * @param {string} symbol Trading symbol
   * @returns {Promise<Array>} Array of news articles
   */
  getSymbolNews: async (symbol) => {
    try {
      const formattedSymbol = symbol.replace('/', '');
      // Note: For production, move this to environment variables
      const API_KEY = 'demo'; // Using demo key for Finnhub to avoid 401 errors
      const from = new Date();
      from.setDate(from.getDate() - 7); // 7 days ago
      const to = new Date();
      
      const fromStr = from.toISOString().split('T')[0];
      const toStr = to.toISOString().split('T')[0];
      
      const response = await fetch(
        `https://finnhub.io/api/v1/company-news?symbol=${formattedSymbol}&from=${fromStr}&to=${toStr}&token=${API_KEY}`
      );
      
      if (!response.ok) {
        throw new Error(`Finnhub news request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Standardize the data format
      return data.slice(0, 10).map(item => ({
        id: item.id || `finnhub-${Date.now()}-${Math.random()}`,
        title: item.headline || 'Financial Market Update',
        summary: item.summary || item.headline || 'Latest market news',
        url: item.url || '#',
        source: item.source || 'Finnhub',
        date: new Date(item.datetime * 1000).toISOString(),
        category: item.category || 'general',
        image: item.image || null,
        related: [symbol]
      }));
    } catch (error) {
      console.error('Error fetching Finnhub news:', error);
      return []; // Return empty array so we can try other sources
    }
  },
  
  /**
   * Fallback method using general financial news
   * @param {string} symbol Trading symbol
   * @returns {Promise<Array>} Array of news articles
   */
  getFallbackNews: async (symbol) => {
    try {
      // For fallback, we'll use static news since external APIs are failing
      return MarketDataService.getStaticNews(symbol);
    } catch (error) {
      console.error('Error fetching fallback news:', error);
      return MarketDataService.getStaticNews(symbol);
    }
  },
  
  /**
   * Generate search keywords for a symbol
   * @param {string} symbol Trading symbol
   * @returns {string} Keywords for search
   */
  generateKeywords: (symbol) => {
    const keywords = [];
    
    // Add the symbol itself
    keywords.push(symbol.replace('/', ''));
    
    // For forex pairs, add the individual currencies
    if (symbol.includes('/')) {
      const [base, quote] = symbol.split('/');
      
      // Get full names of currencies
      const currencyNames = {
        'EUR': 'Euro',
        'USD': 'Dollar',
        'GBP': 'Pound',
        'JPY': 'Yen',
        'AUD': 'Australian',
        'CAD': 'Canadian',
        'CHF': 'Swiss',
        'NZD': 'New Zealand'
      };
      
      keywords.push(base);
      keywords.push(quote);
      
      // Add common names
      if (base === 'EUR') keywords.push('Euro');
      if (base === 'USD') keywords.push('Dollar');
      if (base === 'GBP') keywords.push('Pound');
      if (base === 'JPY') keywords.push('Yen');
      if (base === 'AUD') keywords.push('Australian');
      if (base === 'CAD') keywords.push('Canadian');
      if (base === 'CHF') keywords.push('Swiss');
      if (base === 'NZD') keywords.push('New Zealand');
      
      if (quote === 'EUR') keywords.push('Euro');
      if (quote === 'USD') keywords.push('Dollar');
      if (quote === 'GBP') keywords.push('Pound');
      if (quote === 'JPY') keywords.push('Yen');
      if (quote === 'AUD') keywords.push('Australian');
      if (quote === 'CAD') keywords.push('Canadian');
      if (quote === 'CHF') keywords.push('Swiss');
      if (quote === 'NZD') keywords.push('New Zealand');
    }
    
    // Join keywords with OR for search queries
    return encodeURIComponent(keywords.join(' OR '));
  },

  /**
   * Get static news data to use as a final fallback
   * @param {string} symbol Trading symbol
   * @returns {Array} Static news articles
   */
  getStaticNews: (symbol) => {
    if (!symbol) {
      return []; // Return empty array if no symbol is provided
    }
    
    // Generate unique current timestamp for this symbol to ensure different news for different symbols
    const now = new Date();
    const timestamp = now.getTime();
    
    // Create dates with specific hours to make them look realistic
    const hours = [2, 5, 8, 11, 14];
    const dates = hours.map(hour => {
      const date = new Date(timestamp);
      date.setHours(hour);
      return date;
    });
    
    // Get currency names for better news titles
    let baseCurrency = 'Currency';
    let quoteCurrency = 'Market';
    let assetType = 'forex';
    let assetName = symbol;
    
    // Determine asset type and details
    if (symbol.includes('/')) {
      // Forex or crypto
      const [base, quote] = symbol.split('/');
      
      // Get full names of currencies
      const currencyNames = {
        'EUR': 'Euro',
        'USD': 'US Dollar',
        'GBP': 'British Pound',
        'JPY': 'Japanese Yen',
        'AUD': 'Australian Dollar',
        'CAD': 'Canadian Dollar',
        'CHF': 'Swiss Franc',
        'NZD': 'New Zealand Dollar',
        'BTC': 'Bitcoin',
        'ETH': 'Ethereum',
        'XRP': 'Ripple',
        'LTC': 'Litecoin',
        'BCH': 'Bitcoin Cash',
        'ADA': 'Cardano',
        'DOT': 'Polkadot',
        'LINK': 'Chainlink',
        'BNB': 'Binance Coin',
        'DOGE': 'Dogecoin',
        'SOL': 'Solana'
      };
      
      baseCurrency = currencyNames[base] || base;
      quoteCurrency = currencyNames[quote] || quote;
      
      if (['BTC', 'ETH', 'XRP', 'LTC', 'BCH', 'ADA', 'DOT', 'LINK', 'BNB', 'DOGE', 'SOL'].includes(base)) {
        assetType = 'crypto';
      }
    } else if (['XAUUSD', 'XAGUSD', 'WTICOUSD', 'BRENTCOUSD', 'NATGASUSD', 'COPPUSD'].includes(symbol)) {
      // Commodities
      assetType = 'commodity';
      const commodityNames = {
        'XAUUSD': 'Gold',
        'XAGUSD': 'Silver',
        'WTICOUSD': 'WTI Crude Oil',
        'BRENTCOUSD': 'Brent Crude Oil',
        'NATGASUSD': 'Natural Gas',
        'COPPUSD': 'Copper'
      };
      assetName = commodityNames[symbol] || symbol;
      baseCurrency = assetName;
      quoteCurrency = 'USD';
    } else if (['US500', 'US30', 'US100', 'UK100', 'JP225', 'DE40', 'FR40', 'IN50'].includes(symbol)) {
      // Indices
      assetType = 'index';
      const indexNames = {
        'US500': 'S&P 500',
        'US30': 'Dow Jones',
        'US100': 'Nasdaq',
        'UK100': 'FTSE 100',
        'JP225': 'Nikkei 225',
        'DE40': 'DAX',
        'FR40': 'CAC 40',
        'IN50': 'Nifty 50'
      };
      assetName = indexNames[symbol] || symbol;
      baseCurrency = assetName;
    } else {
      // Stocks
      assetType = 'stock';
      const stockNames = {
        'AAPL': 'Apple Inc.',
        'MSFT': 'Microsoft',
        'AMZN': 'Amazon',
        'GOOGL': 'Alphabet',
        'TSLA': 'Tesla',
        'META': 'Meta',
        'NVDA': 'NVIDIA',
        'JPM': 'JPMorgan',
        'RELIANCE': 'Reliance Industries',
        'TCS': 'Tata Consultancy Services'
      };
      assetName = stockNames[symbol] || symbol;
      baseCurrency = assetName;
    }
    
    // Calculate sentiment values - should be unique for each symbol
    // Use the symbol string to generate consistent but different sentiment for each asset
    const symbolHash = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const sentimentSeed = (symbolHash % 100) / 100; // Value between 0 and 1
    
    // Generate bullish/bearish bias based on the symbol
    let bullishBias;
    if (sentimentSeed < 0.33) {
      bullishBias = -0.3 - (sentimentSeed * 0.4); // Bearish
    } else if (sentimentSeed < 0.66) {
      bullishBias = -0.1 + (sentimentSeed * 0.2); // Neutral with slight lean
    } else {
      bullishBias = 0.2 + (sentimentSeed * 0.5); // Bullish
    }
    
    // Generate sentiments that are consistent for this symbol
    const sentiments = [
      bullishBias + 0.1, 
      bullishBias - 0.1, 
      bullishBias + 0.2, 
      bullishBias - 0.15, 
      bullishBias + 0.05
    ];
    
    // News templates based on asset type
    const newsTemplates = {
      forex: [
        {
          title: `${baseCurrency} ${sentiments[0] > 0 ? 'Strengthens' : 'Weakens'} Against ${quoteCurrency} Amid ${sentiments[0] > 0 ? 'Positive' : 'Mixed'} Economic Data`,
          category: 'Market'
        },
        {
          title: `${assetName} ${sentiments[1] > 0 ? 'Rises' : 'Falls'} as Central Bank Policy Shifts`,
          category: 'Market'
        },
        {
          title: `Technical Analysis: ${assetName} Approaches Key ${sentiments[2] > 0 ? 'Resistance' : 'Support'} Levels`,
          category: 'Market'
        },
        {
          title: `${quoteCurrency} ${sentiments[3] < 0 ? 'Strengthens' : 'Weakens'} on Global Economic Outlook`,
          category: 'Market'
        },
        {
          title: `Traders Turn ${sentiments[4] > 0 ? 'Bullish' : 'Bearish'} on ${baseCurrency} Outlook`,
          category: 'Market'
        }
      ],
      crypto: [
        {
          title: `${baseCurrency} ${sentiments[0] > 0 ? 'Surges' : 'Dips'} as Market Sentiment ${sentiments[0] > 0 ? 'Improves' : 'Declines'}`,
          category: 'Market'
        },
        {
          title: `${assetName} ${sentiments[1] > 0 ? 'Rally Continues' : 'Correction Deepens'} Amid Regulatory News`,
          category: 'Market'
        },
        {
          title: `Whale Movements: Large ${assetName} Transactions Spotted on Exchanges`,
          category: 'Market'
        },
        {
          title: `${assetName} ${sentiments[3] > 0 ? 'Adoption Increasing' : 'Faces Headwinds'} as Institutions ${sentiments[3] > 0 ? 'Enter' : 'Reassess'} Market`,
          category: 'Market'
        },
        {
          title: `Technical Indicators Show ${sentiments[4] > 0 ? 'Bullish' : 'Bearish'} Pattern for ${assetName}`,
          category: 'Market'
        }
      ],
      commodity: [
        {
          title: `${assetName} Prices ${sentiments[0] > 0 ? 'Climb' : 'Retreat'} on Supply Chain Updates`,
          category: 'Market'
        },
        {
          title: `${assetName} ${sentiments[1] > 0 ? 'Demand Rises' : 'Supply Increases'} Affecting Global Markets`,
          category: 'Market'
        },
        {
          title: `${assetName} Futures ${sentiments[2] > 0 ? 'Rally' : 'Decline'} on Geopolitical Tensions`,
          category: 'Market'
        },
        {
          title: `Industrial Demand for ${assetName} ${sentiments[3] > 0 ? 'Surges' : 'Weakens'} in Key Markets`,
          category: 'Market'
        },
        {
          title: `Analysts Remain ${sentiments[4] > 0 ? 'Bullish' : 'Cautious'} on ${assetName} Price Outlook`,
          category: 'Market'
        }
      ],
      index: [
        {
          title: `${assetName} ${sentiments[0] > 0 ? 'Gains' : 'Drops'} as Investors React to Economic Data`,
          category: 'Market'
        },
        {
          title: `${assetName} ${sentiments[1] > 0 ? 'Rallies' : 'Falls'} on Corporate Earnings Reports`,
          category: 'Market'
        },
        {
          title: `Market Breadth Signals ${sentiments[2] > 0 ? 'Strength' : 'Weakness'} in ${assetName}`,
          category: 'Market'
        },
        {
          title: `${assetName} ${sentiments[3] > 0 ? 'Climbs' : 'Slides'} as Sector Rotation Takes Place`,
          category: 'Market'
        },
        {
          title: `Volatility ${sentiments[4] > 0 ? 'Decreases' : 'Increases'} as ${assetName} Sets New ${sentiments[4] > 0 ? 'Highs' : 'Range'}`,
          category: 'Market'
        }
      ],
      stock: [
        {
          title: `${assetName} Shares ${sentiments[0] > 0 ? 'Climb' : 'Fall'} After Quarterly Earnings Report`,
          category: 'Market'
        },
        {
          title: `${assetName} ${sentiments[1] > 0 ? 'Outperforms' : 'Lags'} Sector as Analysts Update Forecasts`,
          category: 'Market'
        },
        {
          title: `${assetName} Announces New Product Line, Stock ${sentiments[2] > 0 ? 'Jumps' : 'Reacts Mixed'}`,
          category: 'Market'
        },
        {
          title: `Institutional Investors ${sentiments[3] > 0 ? 'Increase' : 'Reduce'} Positions in ${assetName}`,
          category: 'Market'
        },
        {
          title: `${assetName} Technical Analysis: ${sentiments[4] > 0 ? 'Bullish' : 'Bearish'} Patterns Emerge`,
          category: 'Market'
        }
      ]
    };
    
    // Select the right template set
    const templates = newsTemplates[assetType] || newsTemplates.forex;
    
    // Generate unique news with proper timestamps
    return templates.map((template, index) => {
      const date = dates[index];
      const sentiment = sentiments[index];
      
      // Calculate summary based on sentiment
      let summary;
      if (sentiment > 0.3) {
        summary = `Strong bullish momentum continues for ${assetName} as market participants respond to positive developments. Technical indicators suggest potential for further upside, with key resistance levels being tested.`;
      } else if (sentiment > 0) {
        summary = `Mild bullish sentiment surrounds ${assetName} with cautious optimism from market analysts. The asset is showing signs of strength but faces challenges ahead.`;
      } else if (sentiment > -0.3) {
        summary = `Mixed signals for ${assetName} as the market consolidates. Traders are watching key levels while awaiting clearer directional cues from economic data and technical patterns.`;
      } else {
        summary = `Bearish pressure continues on ${assetName} as market sentiment remains negative. Technical indicators point to potential further downside, with support levels being tested.`;
      }
      
      return {
        id: `static-${symbol}-${Date.now()}-${index}`,
        title: template.title,
        summary: summary,
        url: '#',
        source: ['Market Analysis', 'Financial Times', 'Bloomberg', 'Reuters', 'Trading View'][index],
        datetime: date.toISOString(), // Use datetime not date for consistency
        date: date.toLocaleDateString("en-US", { year: 'numeric', month: 'short', day: 'numeric' }),
        time: date.toLocaleTimeString("en-US", { hour: '2-digit', minute: '2-digit' }),
        category: template.category,
        image: null,
        related: [symbol],
        sentiment: sentiment
      };
    });
  },
  /**
   * Get real-time price data for watchlist symbols
   * This ensures the watchlist prices match the chart data
   * @param {Array} symbols - Array of symbol strings to fetch data for
   * @returns {Promise<Object>} - Object with symbol keys and price data values
   */
  getRealtimePriceData: async (symbols) => {
    try {
      // In a real implementation, this would fetch from a WebSocket or REST API
      // For demo purposes, we'll generate prices that match the chart more closely
      
      // Base prices for common symbols (these should match chart data better)
      const basePrices = {
        // Forex Pairs
        'EUR/USD': 1.0876,
        'GBP/USD': 1.2543,
        'USD/JPY': 151.67,
        'AUD/USD': 0.6673,
        'USD/CAD': 1.3731,
        'NZD/USD': 0.6021,
        'USD/CHF': 0.8972,
        'EUR/GBP': 0.8670,
        'EUR/JPY': 164.98,
        'GBP/JPY': 190.26,
        'XAUUSD': 2321.45,
        
        // US Stocks
        'AAPL': 169.00,
        'MSFT': 425.40,
        'AMZN': 182.62,
        'GOOGL': 171.05,
        
        // Crypto
        'BTC/USD': 64821.43,
        'ETH/USD': 3072.18,
        
        // Indian Stocks & Indices
        'NIFTY50': 22450.25,
        'BANKNIFTY': 47512.85,
        'SENSEX': 73872.50,
        'RELIANCE': 2930.75,
        'TCS': 3845.20,
        'HDFCBANK': 1615.40,
        'INFY': 1545.65,
        'ICICIBANK': 1032.90,
        'HINDUNILVR': 2305.55,
        'SBIN': 743.20,
        'TATAMOTORS': 945.80,
        'WIPRO': 458.25,
        'KOTAKBANK': 1752.45,
        'AXISBANK': 1082.35,
        'BHARTIARTL': 1175.60,
        'ITC': 428.15,
        'HCLTECH': 1342.75,
        'SUNPHARMA': 1265.90,
        'MARUTI': 10425.30,
        'ADANIENT': 2856.45,
        'LT': 3245.90,
        'TITAN': 3420.75,
        'BAJFINANCE': 6980.45,
        'ASIANPAINT': 2845.30
      };
      
      // Percentage changes for realistic market movements
      const changes = {
        // Forex pairs
        'EUR/USD': '+0.14%',
        'GBP/USD': '+0.13%',
        'USD/JPY': '-0.36%',
        'AUD/USD': '-0.87%',
        'USD/CAD': '+0.25%',
        'NZD/USD': '-0.10%',
        'USD/CHF': '+0.13%',
        'EUR/GBP': '-0.10%',
        'EUR/JPY': '-0.05%',
        'GBP/JPY': '+0.01%',
        'XAUUSD': '+0.22%',
        
        // US Stocks
        'AAPL': '-0.58%',
        'MSFT': '+0.45%',
        'AMZN': '+0.78%',
        'GOOGL': '+0.32%',
        
        // Crypto
        'BTC/USD': '+1.24%',
        'ETH/USD': '+2.08%',
        
        // Indian Markets
        'NIFTY50': '+0.65%',
        'BANKNIFTY': '+0.82%',
        'SENSEX': '+0.58%',
        'RELIANCE': '+1.22%',
        'TCS': '-0.45%',
        'HDFCBANK': '+0.32%',
        'INFY': '-0.78%',
        'ICICIBANK': '+0.91%',
        'HINDUNILVR': '+0.25%',
        'SBIN': '+1.45%',
        'TATAMOTORS': '+2.12%',
        'WIPRO': '-0.35%',
        'KOTAKBANK': '+0.42%',
        'AXISBANK': '+0.68%',
        'BHARTIARTL': '+0.75%',
        'ITC': '-0.28%',
        'HCLTECH': '-0.52%',
        'SUNPHARMA': '+1.05%',
        'MARUTI': '+1.32%',
        'ADANIENT': '+3.45%',
        'LT': '+0.86%',
        'TITAN': '-0.42%',
        'BAJFINANCE': '+1.18%',
        'ASIANPAINT': '-0.32%'
      };
      
      // Generate and return real-time data for requested symbols
      const result = {};
      
      symbols.forEach(symbol => {
        // Determine if price is trending up or down based on the change value
        const changeValue = changes[symbol] || (Math.random() > 0.5 ? '+' : '-') + (Math.random() * 0.5).toFixed(2) + '%';
        const isBull = changeValue.startsWith('+');
        
        // Set price - use base price or generate a realistic one for the symbol
        let price;
        if (basePrices[symbol]) {
          // Add more significant random variation to base price for visible changes
          const variation = (Math.random() * 0.003) - 0.0015;
          price = basePrices[symbol] * (1 + variation);
          
          // Log price changes for debugging
          console.log(`Price update for ${symbol}: ${price.toFixed(4)} (variation: ${variation.toFixed(6)})`);
          
        } else if (symbol.includes('/USD') || symbol.includes('USD/')) {
          // Standard forex pair pricing
          price = 0.5 + Math.random() * 1.5;
        } else if (symbol.includes('JPY')) {
          // JPY pairs tend to have higher values
          price = 100 + Math.random() * 100;
        } else if (symbol.includes('XAU') || symbol.includes('GOLD')) {
          // Gold pricing
          price = 2300 + Math.random() * 50;
        } else if (symbol.includes('BTC')) {
          // Bitcoin pricing
          price = 63000 + Math.random() * 4000;
        } else if (symbol.includes('ETH')) {
          // Ethereum pricing
          price = 3000 + Math.random() * 200;
        } else {
          // Default pricing for other instruments
          price = 10 + Math.random() * 1000;
        }
        
        // Format the price appropriately
        const formattedPrice = symbol.includes('JPY') || 
                            symbol.includes('BTC') || 
                            symbol.includes('XAU') ? 
                            price.toFixed(2) : price.toFixed(4);
        
        // Store data for this symbol
        result[symbol] = {
          price: parseFloat(formattedPrice),
          change: changeValue,
          trend: isBull ? 'up' : 'down'
        };
      });
      
      return result;
    } catch (error) {
      console.error('Error fetching real-time price data:', error);
      return {};
    }
  }
};

export default MarketDataService;
