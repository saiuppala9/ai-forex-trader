import axios from 'axios';

/**
 * Alternative search function that uses multiple sources to find symbols
 * @param {string} query - Search term
 * @returns {Promise<Array>} - Array of matching symbols
 */
const searchSymbolsAlternative = async (query) => {
  try {
    // Try multiple exchanges and sources
    const results = [];
    
    // 1. Try Forex pairs (Major and minor pairs)
    const forexPairs = [
      // Major pairs
      { symbol: 'EUR/USD', name: 'Euro / US Dollar', exchange: 'OANDA' },
      { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', exchange: 'OANDA' },
      { symbol: 'GBP/USD', name: 'British Pound / US Dollar', exchange: 'OANDA' },
      { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', exchange: 'OANDA' },
      { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', exchange: 'OANDA' },
      { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', exchange: 'OANDA' },
      { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', exchange: 'OANDA' },
      
      // Minor pairs
      { symbol: 'EUR/GBP', name: 'Euro / British Pound', exchange: 'OANDA' },
      { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', exchange: 'OANDA' },
      { symbol: 'EUR/CHF', name: 'Euro / Swiss Franc', exchange: 'OANDA' },
      { symbol: 'EUR/AUD', name: 'Euro / Australian Dollar', exchange: 'OANDA' },
      { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', exchange: 'OANDA' },
      { symbol: 'GBP/CHF', name: 'British Pound / Swiss Franc', exchange: 'OANDA' },
      { symbol: 'AUD/JPY', name: 'Australian Dollar / Japanese Yen', exchange: 'OANDA' },
      { symbol: 'AUD/NZD', name: 'Australian Dollar / New Zealand Dollar', exchange: 'OANDA' },
      { symbol: 'AUD/CAD', name: 'Australian Dollar / Canadian Dollar', exchange: 'OANDA' },
      { symbol: 'CAD/JPY', name: 'Canadian Dollar / Japanese Yen', exchange: 'OANDA' },
      { symbol: 'CHF/JPY', name: 'Swiss Franc / Japanese Yen', exchange: 'OANDA' },
      { symbol: 'NZD/JPY', name: 'New Zealand Dollar / Japanese Yen', exchange: 'OANDA' },
      { symbol: 'NZD/CAD', name: 'New Zealand Dollar / Canadian Dollar', exchange: 'OANDA' },
      
      // Exotic pairs
      { symbol: 'USD/SGD', name: 'US Dollar / Singapore Dollar', exchange: 'OANDA' },
      { symbol: 'USD/HKD', name: 'US Dollar / Hong Kong Dollar', exchange: 'OANDA' },
      { symbol: 'USD/TRY', name: 'US Dollar / Turkish Lira', exchange: 'OANDA' },
      { symbol: 'USD/MXN', name: 'US Dollar / Mexican Peso', exchange: 'OANDA' },
      { symbol: 'USD/ZAR', name: 'US Dollar / South African Rand', exchange: 'OANDA' },
      { symbol: 'USD/NOK', name: 'US Dollar / Norwegian Krone', exchange: 'OANDA' },
      { symbol: 'USD/SEK', name: 'US Dollar / Swedish Krona', exchange: 'OANDA' },
      { symbol: 'USD/DKK', name: 'US Dollar / Danish Krone', exchange: 'OANDA' },
    ];
    
    // 2. Try Cryptocurrencies (Top 20)
    const cryptoPairs = [
      { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', exchange: 'BINANCE' },
      { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', exchange: 'BINANCE' },
      { symbol: 'BNB/USD', name: 'Binance Coin / US Dollar', exchange: 'BINANCE' },
      { symbol: 'SOL/USD', name: 'Solana / US Dollar', exchange: 'BINANCE' },
      { symbol: 'XRP/USD', name: 'Ripple / US Dollar', exchange: 'BINANCE' },
      { symbol: 'ADA/USD', name: 'Cardano / US Dollar', exchange: 'BINANCE' },
      { symbol: 'AVAX/USD', name: 'Avalanche / US Dollar', exchange: 'BINANCE' },
      { symbol: 'DOGE/USD', name: 'Dogecoin / US Dollar', exchange: 'BINANCE' },
      { symbol: 'DOT/USD', name: 'Polkadot / US Dollar', exchange: 'BINANCE' },
      { symbol: 'SHIB/USD', name: 'Shiba Inu / US Dollar', exchange: 'BINANCE' },
      { symbol: 'TRX/USD', name: 'TRON / US Dollar', exchange: 'BINANCE' },
      { symbol: 'LINK/USD', name: 'Chainlink / US Dollar', exchange: 'BINANCE' },
      { symbol: 'MATIC/USD', name: 'Polygon / US Dollar', exchange: 'BINANCE' },
      { symbol: 'UNI/USD', name: 'Uniswap / US Dollar', exchange: 'BINANCE' },
      { symbol: 'ATOM/USD', name: 'Cosmos / US Dollar', exchange: 'BINANCE' },
      { symbol: 'LTC/USD', name: 'Litecoin / US Dollar', exchange: 'BINANCE' },
      { symbol: 'NEAR/USD', name: 'NEAR Protocol / US Dollar', exchange: 'BINANCE' },
      { symbol: 'FTM/USD', name: 'Fantom / US Dollar', exchange: 'BINANCE' },
      { symbol: 'ALGO/USD', name: 'Algorand / US Dollar', exchange: 'BINANCE' },
      { symbol: 'XLM/USD', name: 'Stellar / US Dollar', exchange: 'BINANCE' },
    ];
    
    // 3. Try Commodities
    const commodities = [
      { symbol: 'XAUUSD', name: 'Gold Spot / US Dollar', exchange: 'OANDA' },
      { symbol: 'XAGUSD', name: 'Silver Spot / US Dollar', exchange: 'OANDA' },
      { symbol: 'WTIUSD', name: 'WTI Crude Oil / US Dollar', exchange: 'OANDA' },
      { symbol: 'BRENTUSD', name: 'Brent Crude Oil / US Dollar', exchange: 'OANDA' },
      { symbol: 'NATGAS', name: 'Natural Gas', exchange: 'NYMEX' },
      { symbol: 'COPPER', name: 'Copper Futures', exchange: 'COMEX' },
      { symbol: 'PLATINUM', name: 'Platinum', exchange: 'NYMEX' },
      { symbol: 'PALLADIUM', name: 'Palladium', exchange: 'NYMEX' },
      { symbol: 'WHEAT', name: 'Wheat Futures', exchange: 'CBOT' },
      { symbol: 'CORN', name: 'Corn Futures', exchange: 'CBOT' },
      { symbol: 'SOYBEAN', name: 'Soybean Futures', exchange: 'CBOT' },
      { symbol: 'COFFEE', name: 'Coffee Futures', exchange: 'ICE' },
      { symbol: 'SUGAR', name: 'Sugar Futures', exchange: 'ICE' },
      { symbol: 'COTTON', name: 'Cotton Futures', exchange: 'ICE' },
    ];
    
    // 4. Try Major Indices
    const indices = [
      { symbol: 'SPX500', name: 'S&P 500', exchange: 'US' },
      { symbol: 'NDX100', name: 'Nasdaq 100', exchange: 'US' },
      { symbol: 'US30', name: 'Dow Jones Industrial Average', exchange: 'US' },
      { symbol: 'R2000', name: 'Russell 2000', exchange: 'US' },
      { symbol: 'UK100', name: 'FTSE 100', exchange: 'UK' },
      { symbol: 'DE40', name: 'DAX 40', exchange: 'XETRA' },
      { symbol: 'FR40', name: 'CAC 40', exchange: 'EURONEXT' },
      { symbol: 'EU50', name: 'Euro Stoxx 50', exchange: 'EUREX' },
      { symbol: 'JP225', name: 'Nikkei 225', exchange: 'TSE' },
      { symbol: 'HK50', name: 'Hang Seng', exchange: 'HKEX' },
      { symbol: 'CN50', name: 'China A50', exchange: 'SGX' },
      { symbol: 'AUS200', name: 'ASX 200', exchange: 'ASX' },
    ];
    
    // 5. Try most popular US stocks
    const popularStocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
      { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', exchange: 'NASDAQ' },
      { symbol: 'GOOG', name: 'Alphabet Inc. Class C', exchange: 'NASDAQ' },
      { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ' },
      { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
      { symbol: 'BRK.A', name: 'Berkshire Hathaway Inc. Class A', exchange: 'NYSE' },
      { symbol: 'BRK.B', name: 'Berkshire Hathaway Inc. Class B', exchange: 'NYSE' },
      { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE' },
      { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE' },
      { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE' },
      { symbol: 'PG', name: 'Procter & Gamble Co.', exchange: 'NYSE' },
      { symbol: 'MA', name: 'Mastercard Inc.', exchange: 'NYSE' },
      { symbol: 'HD', name: 'Home Depot Inc.', exchange: 'NYSE' },
      { symbol: 'BAC', name: 'Bank of America Corp.', exchange: 'NYSE' },
      { symbol: 'PFE', name: 'Pfizer Inc.', exchange: 'NYSE' },
      { symbol: 'DIS', name: 'Walt Disney Co.', exchange: 'NYSE' },
      { symbol: 'ADBE', name: 'Adobe Inc.', exchange: 'NASDAQ' },
      { symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ' },
      { symbol: 'CRM', name: 'Salesforce Inc.', exchange: 'NYSE' },
      { symbol: 'CSCO', name: 'Cisco Systems Inc.', exchange: 'NASDAQ' },
      { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ' },
      { symbol: 'AMD', name: 'Advanced Micro Devices Inc.', exchange: 'NASDAQ' },
      { symbol: 'QCOM', name: 'Qualcomm Inc.', exchange: 'NASDAQ' },
      { symbol: 'PYPL', name: 'PayPal Holdings Inc.', exchange: 'NASDAQ' },
      { symbol: 'CMCSA', name: 'Comcast Corporation', exchange: 'NASDAQ' },
      { symbol: 'PEP', name: 'PepsiCo Inc.', exchange: 'NASDAQ' },
      { symbol: 'COST', name: 'Costco Wholesale Corporation', exchange: 'NASDAQ' },
      { symbol: 'ABT', name: 'Abbott Laboratories', exchange: 'NYSE' },
      { symbol: 'TMO', name: 'Thermo Fisher Scientific Inc.', exchange: 'NYSE' },
      { symbol: 'MRK', name: 'Merck & Co. Inc.', exchange: 'NYSE' },
      { symbol: 'AVGO', name: 'Broadcom Inc.', exchange: 'NASDAQ' },
      { symbol: 'ACN', name: 'Accenture plc', exchange: 'NYSE' },
      { symbol: 'NKE', name: 'Nike Inc.', exchange: 'NYSE' },
      { symbol: 'DHR', name: 'Danaher Corporation', exchange: 'NYSE' },
      { symbol: 'VZ', name: 'Verizon Communications Inc.', exchange: 'NYSE' },
      { symbol: 'UNH', name: 'UnitedHealth Group Inc.', exchange: 'NYSE' },
    ];
    
    // Combine all asset classes
    const allInstruments = [
      ...forexPairs,
      ...cryptoPairs,
      ...commodities,
      ...indices,
      ...popularStocks,
    ];
    
    // Filter by the query
    const filteredResults = allInstruments.filter(item => 
      item.symbol.toLowerCase().includes(query.toLowerCase()) ||
      item.name.toLowerCase().includes(query.toLowerCase())
    );
    
    // Format the results
    return filteredResults.map(item => ({
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchange,
      type: getInstrumentType(item.symbol),
      fullSymbol: `${item.exchange}:${item.symbol.replace('/', '')}`,
      country: '',
    }));
  } catch (error) {
    console.error('Error in alternative search:', error);
    return [];
  }
};

/**
 * Helper function to determine instrument type based on symbol
 */
const getInstrumentType = (symbol) => {
  if (symbol.includes('/')) return 'forex';
  if (['XAUUSD', 'XAGUSD', 'WTIUSD', 'BRENTUSD', 'NATGAS'].includes(symbol)) return 'commodity';
  if (['SPX500', 'NDX100', 'US30', 'UK100', 'JP225'].some(idx => symbol.includes(idx))) return 'index';
  if (symbol.length <= 5 && !symbol.includes('/')) return 'stock';
  return 'unknown';
};

/**
 * Service for fetching market data from various sources
 */
const MarketDataService = {
  /**
   * Search for symbols across all markets using TradingView's search API
   * @param {string} query - Search term
   * @returns {Promise<Array>} - Array of matching symbols
   */
  searchSymbols: async (query) => {
    if (!query || query.length < 2) return [];
    
    try {
      // Use TradingView's symbol search API with expanded parameters
      const response = await axios.get('https://symbol-search.tradingview.com/symbol_search/', {
        params: {
          text: query,
          hl: 1, // Highlight matches
          exchange: '', // All exchanges
          lang: 'en',
          domain: 'production',
          sort_by_country: true,
          type: '', // All types
          search_type: '', // All search types
          offset: 0,
          limit: 100, // Increase limit to get more results
        }
      });
      
      // Process and format the results
      if (!response.data || response.data.length === 0) {
        // Try an alternative approach if no results
        return await searchSymbolsAlternative(query);
      }
      
      return response.data.map(item => ({
        symbol: item.symbol,
        name: item.description,
        exchange: item.exchange,
        type: item.type,
        fullSymbol: `${item.exchange}:${item.symbol}`,
        country: item.country || '',
      }));
    } catch (error) {
      console.error('Error searching for symbols:', error);
      // Try alternative search as fallback
      return await searchSymbolsAlternative(query);
    }
  },
  
  /**
   * Get popular symbols for each market category
   * @returns {Promise<Object>} - Object with market categories and popular symbols
   */
  getPopularSymbols: async () => {
    // Return popular predefined symbols by category
    return {
      forex: [
        { symbol: 'EUR/USD', name: 'Euro / US Dollar', fullSymbol: 'OANDA:EURUSD' },
        { symbol: 'GBP/USD', name: 'British Pound / US Dollar', fullSymbol: 'OANDA:GBPUSD' },
        { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', fullSymbol: 'OANDA:USDJPY' },
        { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', fullSymbol: 'OANDA:USDCHF' },
        { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', fullSymbol: 'OANDA:AUDUSD' },
      ],
      stocks: [
        { symbol: 'AAPL', name: 'Apple Inc.', fullSymbol: 'NASDAQ:AAPL' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', fullSymbol: 'NASDAQ:MSFT' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', fullSymbol: 'NASDAQ:GOOGL' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', fullSymbol: 'NASDAQ:AMZN' },
        { symbol: 'META', name: 'Meta Platforms Inc.', fullSymbol: 'NASDAQ:META' },
      ],
      crypto: [
        { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', fullSymbol: 'COINBASE:BTCUSD' },
        { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', fullSymbol: 'COINBASE:ETHUSD' },
        { symbol: 'XRP/USD', name: 'Ripple / US Dollar', fullSymbol: 'BITFINEX:XRPUSD' },
        { symbol: 'DOGE/USD', name: 'Dogecoin / US Dollar', fullSymbol: 'BINANCE:DOGEUSD' },
        { symbol: 'ADA/USD', name: 'Cardano / US Dollar', fullSymbol: 'BINANCE:ADAUSD' },
      ],
      commodities: [
        { symbol: 'XAUUSD', name: 'Gold Spot', fullSymbol: 'OANDA:XAUUSD' },
        { symbol: 'XAGUSD', name: 'Silver Spot', fullSymbol: 'OANDA:XAGUSD' },
        { symbol: 'WTIUSD', name: 'WTI Crude Oil', fullSymbol: 'TVC:USOIL' },
        { symbol: 'BRENTUSD', name: 'Brent Crude Oil', fullSymbol: 'TVC:UKOIL' },
        { symbol: 'NATGAS', name: 'Natural Gas', fullSymbol: 'NYMEX:NG' },
      ],
    };
  },
  
  /**
   * Search for market symbols
   * @param {string} query Search query
   * @returns {Promise<Array>} Array of symbol objects
   */
  async searchSymbols(query) {
    try {
      // TradingView API search parameters
      const params = new URLSearchParams({
        text: query,
        exchange: '',
        lang: 'en',
        search_type: '',
        hl: 'true',
        country: 'US',
        domain: 'production',
        sort_by_country: 'US',
      });
      
      const response = await fetch('https://symbol-search.tradingview.com/symbol_search/v3/?' + params.toString() + '&limit=30');
      
      if (!response.ok) {
        throw new Error(`Symbol search failed: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process and return results
      if (data && data.symbols) {
        return data.symbols.map(item => ({
          symbol: item.symbol,
          name: item.description,
          exchange: item.exchange,
          type: item.type
        }));
      }
      
      // Fallback search if TradingView search fails or returns no results
      return this.fallbackSearch(query);
    } catch (error) {
      console.error('Error searching symbols:', error);
      // Fallback to local search
      return this.fallbackSearch(query);
    }
  },
  
  /**
   * Fallback search for symbols when API fails
   * @param {string} query Search query
   * @returns {Array} Filtered array of symbols
   */
  fallbackSearch(query) {
    if (!query || query.length < 2) return [];
    
    const normalizedQuery = query.toUpperCase();
    
    // Filter popular symbols that match the query
    const filtered = Object.entries(this.getPopularSymbols())
      .filter(([category, symbols]) => 
        symbols.some(s => 
          s.symbol.toUpperCase().includes(normalizedQuery) || 
          s.name.toUpperCase().includes(normalizedQuery)
        )
      )
      .flatMap(([category, symbols]) => 
        symbols.filter(s => 
          s.symbol.toUpperCase().includes(normalizedQuery) || 
          s.name.toUpperCase().includes(normalizedQuery)
        )
      );
    
    return filtered.slice(0, 15); // Limit results
  },
  
  /**
   * Get a list of popular trading symbols by category
   * @returns {Object} Object with categories and their symbols
   */
  getPopularSymbols() {
    return {
      forex: [
        { symbol: 'EUR/USD', name: 'Euro / US Dollar', exchange: 'FOREX' },
        { symbol: 'GBP/USD', name: 'British Pound / US Dollar', exchange: 'FOREX' },
        { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', exchange: 'FOREX' },
        { symbol: 'AUD/USD', name: 'Australian Dollar / US Dollar', exchange: 'FOREX' },
        { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', exchange: 'FOREX' },
        { symbol: 'NZD/USD', name: 'New Zealand Dollar / US Dollar', exchange: 'FOREX' },
        { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', exchange: 'FOREX' },
        { symbol: 'EUR/GBP', name: 'Euro / British Pound', exchange: 'FOREX' },
        { symbol: 'EUR/JPY', name: 'Euro / Japanese Yen', exchange: 'FOREX' },
        { symbol: 'GBP/JPY', name: 'British Pound / Japanese Yen', exchange: 'FOREX' },
      ],
      crypto: [
        { symbol: 'BTC/USD', name: 'Bitcoin / US Dollar', exchange: 'CRYPTO' },
        { symbol: 'ETH/USD', name: 'Ethereum / US Dollar', exchange: 'CRYPTO' },
        { symbol: 'XRP/USD', name: 'Ripple / US Dollar', exchange: 'CRYPTO' },
        { symbol: 'BCH/USD', name: 'Bitcoin Cash / US Dollar', exchange: 'CRYPTO' },
        { symbol: 'LTC/USD', name: 'Litecoin / US Dollar', exchange: 'CRYPTO' },
        { symbol: 'ADA/USD', name: 'Cardano / US Dollar', exchange: 'CRYPTO' },
        { symbol: 'DOT/USD', name: 'Polkadot / US Dollar', exchange: 'CRYPTO' },
        { symbol: 'LINK/USD', name: 'Chainlink / US Dollar', exchange: 'CRYPTO' },
        { symbol: 'BNB/USD', name: 'Binance Coin / US Dollar', exchange: 'CRYPTO' },
        { symbol: 'SOL/USD', name: 'Solana / US Dollar', exchange: 'CRYPTO' },
      ],
      commodities: [
        { symbol: 'XAUUSD', name: 'Gold / US Dollar', exchange: 'COMMODITIES' },
        { symbol: 'XAGUSD', name: 'Silver / US Dollar', exchange: 'COMMODITIES' },
        { symbol: 'WTICOUSD', name: 'Crude Oil WTI / US Dollar', exchange: 'COMMODITIES' },
        { symbol: 'BRENTCMDUSD', name: 'Brent Crude Oil / US Dollar', exchange: 'COMMODITIES' },
        { symbol: 'NATGASUSD', name: 'Natural Gas / US Dollar', exchange: 'COMMODITIES' },
        { symbol: 'COPPERCMDUSD', name: 'Copper / US Dollar', exchange: 'COMMODITIES' },
        { symbol: 'XPTUSD', name: 'Platinum / US Dollar', exchange: 'COMMODITIES' },
        { symbol: 'XPDUSD', name: 'Palladium / US Dollar', exchange: 'COMMODITIES' },
      ],
      stocks: [
        { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ' },
        { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', exchange: 'NASDAQ' },
        { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ' },
        { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ' },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
        { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE' },
        { symbol: 'BAC', name: 'Bank of America Corporation', exchange: 'NYSE' },
        { symbol: 'DIS', name: 'The Walt Disney Company', exchange: 'NYSE' },
      ],
    };
  },

  /**
   * Get symbol-specific news
   * @param {string} symbol Trading symbol
   * @returns {Promise<Array>} Array of news objects
   */
  async getSymbolNews(symbol) {
    try {
      // Convert symbols with slashes to the format expected by news APIs
      const formattedSymbol = symbol.replace('/', '');
      
      // Try Finnhub API first (requires API key)
      const FINNHUB_API_KEY = 'cvr1e9pr01qp88co31igcvr1e9pr01qp88co31j0';
      const response = await fetch(`https://finnhub.io/api/v1/company-news?symbol=${formattedSymbol}&from=2025-01-01&to=2025-04-10&token=${FINNHUB_API_KEY}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          return data.map(item => ({
            ...item,
            datetime: new Date(item.datetime * 1000).toLocaleString(),
            symbol: symbol
          }));
        }
      }
      
      // Fallback to more general category-based news if symbol-specific news is not available
      return this.getFallbackNews(symbol);
    } catch (error) {
      console.error(`Error fetching news for ${symbol}:`, error);
      return this.getFallbackNews(symbol);
    }
  },
  
  /**
   * Get fallback news when symbol-specific news is not available
   * @param {string} symbol Trading symbol
   * @returns {Promise<Array>} Array of news objects
   */
  async getFallbackNews(symbol) {
    try {
      // Determine the appropriate category based on symbol
      let category = 'forex';
      
      if (symbol.includes('/USD') || symbol.includes('BTC') || symbol.includes('ETH')) {
        category = 'crypto';
      } else if (['XAUUSD', 'XAGUSD', 'WTICOUSD'].some(s => symbol.includes(s))) {
        category = 'general';
      } else if (!/\//.test(symbol)) {
        category = 'general';  // Likely a stock
      }
      
      const FINNHUB_API_KEY = 'cvr1e9pr01qp88co31igcvr1e9pr01qp88co31j0';
      const response = await fetch(`https://finnhub.io/api/v1/news?category=${category}&token=${FINNHUB_API_KEY}`);
      
      if (response.ok) {
        const data = await response.json();
        
        if (Array.isArray(data) && data.length > 0) {
          return data.map(item => ({
            ...item,
            datetime: new Date(item.datetime * 1000).toLocaleString()
          }));
        }
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching fallback news:', error);
      return [];
    }
  }
};

export default MarketDataService;
