from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from market_data import market_data
from ai_trader import ai_trader
from auth import get_current_active_user, User
from economic_calendar import economic_calendar
from backtesting import backtester
from performance_analytics import performance_analytics
import asyncio
import aiohttp
import feedparser
from datetime import datetime
import logging
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from websocket_server import ws_manager

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class WatchlistItem(BaseModel):
    symbol: str
    type: str  # FOREX, STOCK, COMMODITY
    name: str

class BacktestRequest(BaseModel):
    symbol: str
    start_date: datetime
    end_date: datetime
    timeframe: str = '1h'
    initial_balance: float = 10000
    position_size: float = 0.02
    max_positions: int = 5

class TradeRequest(BaseModel):
    symbol: str
    action: str  # BUY or SELL
    entry_price: float
    stop_loss: float
    target_price: float
    confidence: float
    risk_reward_ratio: float
    lot_size: Optional[float] = 0.1
    trade_note: Optional[str] = None

# In-memory watchlist storage (replace with database in production)
watchlists = {}

# For storing trade history
trade_history = {}

@app.post("/api/watchlist/add")
async def add_to_watchlist(item: WatchlistItem, current_user: User = Depends(get_current_active_user)):
    """Add an item to user's watchlist"""
    if current_user.username not in watchlists:
        watchlists[current_user.username] = []
    watchlists[current_user.username].append(item)
    return {"status": "success"}

@app.get("/api/watchlist")
async def get_watchlist(current_user: User = Depends(get_current_active_user)):
    """Get user's watchlist with live data"""
    if current_user.username not in watchlists:
        return []
    
    items = []
    for item in watchlists[current_user.username]:
        try:
            # Get live market data
            market_info = await market_data.fetch_market_data(
                item.symbol,
                item.type,
                timeframe='1m',
                limit=1
            )
            
            # Get AI analysis
            analysis = await ai_trader.analyze_market(item.symbol)
            
            items.append({
                "symbol": item.symbol,
                "name": item.name,
                "type": item.type,
                "market_data": market_info.to_dict('records')[0] if not market_info.empty else {},
                "analysis": analysis
            })
        except Exception as e:
            logger.error(f"Error fetching data for {item.symbol}: {str(e)}")
            continue
    
    return items

@app.delete("/api/watchlist/{symbol}")
async def remove_from_watchlist(symbol: str, current_user: User = Depends(get_current_active_user)):
    """Remove an item from user's watchlist"""
    if current_user.username in watchlists:
        watchlists[current_user.username] = [
            item for item in watchlists[current_user.username]
            if item.symbol != symbol
        ]
    return {"status": "success"}

@app.get("/api/market/{symbol}/analysis")
async def get_market_analysis(
    symbol: str,
    timeframe: Optional[str] = "1h",
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """Get detailed AI analysis for a symbol without authentication"""
    try:
        # Format symbol for analysis (remove / character if present)
        formatted_symbol = symbol.replace('/', '')
        
        # Get historical data for the symbol
        historical_data = await market_data.get_historical_data(formatted_symbol, timeframe)
        
        if not historical_data.empty:
            # Process the data for technical analysis
            df = historical_data.copy()
            
            # Calculate technical indicators
            df['SMA_20'] = df['Close'].rolling(window=20).mean()
            df['EMA_20'] = df['Close'].ewm(span=20, adjust=False).mean()
            df['RSI'] = 50 + (df['Close'].diff().rolling(window=14).mean() / df['Close'].diff().abs().rolling(window=14).mean() * 50)
            
            # Calculate Bollinger Bands
            sma_20 = df['Close'].rolling(window=20).mean()
            std_20 = df['Close'].rolling(window=20).std()
            df['BB_Upper'] = sma_20 + (std_20 * 2)
            df['BB_Lower'] = sma_20 - (std_20 * 2)
            
            # Analyze the market using AI
            analysis = await ai_trader.analyze_market(df)
            
            return analysis
        else:
            raise HTTPException(status_code=404, detail=f"No data found for {symbol}")
    except Exception as e:
        logger.error(f"Error analyzing {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/trade/execute")
async def execute_trade(
    trade_data: TradeRequest,
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """Execute a trade based on AI recommendation"""
    try:
        user_id = "demo_user" if current_user is None else current_user.username
        
        # Generate a unique trade ID
        trade_id = f"trade-{len(trade_history.get(user_id, [])) + 1:03d}"
        
        # For demo purposes, simulate a successful trade execution
        executed_price = trade_data.entry_price
        
        # Adjust price slightly to simulate market execution
        if trade_data.action == "BUY":
            # Buy at slightly higher price (simulate slippage)
            executed_price = round(executed_price * 1.0002, 5)
        else:
            # Sell at slightly lower price (simulate slippage)
            executed_price = round(executed_price * 0.9998, 5)
        
        # Create trade record
        trade_record = {
            "id": trade_id,
            "user_id": user_id,
            "symbol": trade_data.symbol,
            "action": trade_data.action,
            "entry_price": executed_price,
            "stop_loss": trade_data.stop_loss,
            "target_price": trade_data.target_price,
            "lot_size": trade_data.lot_size,
            "confidence": trade_data.confidence,
            "risk_reward_ratio": trade_data.risk_reward_ratio,
            "status": "OPEN",
            "timestamp": datetime.utcnow().isoformat(),
            "trade_note": trade_data.trade_note or f"AI-recommended {trade_data.action} trade",
            "ai_recommended": True
        }
        
        # Store trade in history
        if user_id not in trade_history:
            trade_history[user_id] = []
        
        trade_history[user_id].append(trade_record)
        
        # Return the executed trade details
        return {
            "trade_id": trade_id,
            "symbol": trade_data.symbol,
            "action": trade_data.action,
            "executed_price": executed_price,
            "status": "EXECUTED",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error executing trade: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analysis/performance")
async def get_performance_metrics(
    current_user: Optional[User] = Depends(get_current_active_user)
):
    """Get AI performance metrics"""
    try:
        user_id = "demo_user" if current_user is None else current_user.username
        
        # For demo purposes, use mock data
        # In a real implementation, this would analyze actual trade history
        
        # Generate mock performance metrics
        win_rate = 68.5
        avg_return = 0.42
        total_trades = 42
        profitable_trades = 29
        
        return {
            "win_rate": win_rate,
            "avg_return": avg_return,
            "total_trades": total_trades,
            "profitable_trades": profitable_trades,
            "by_symbol": {
                "EUR/USD": {
                    "win_rate": 72.3,
                    "avg_return": 0.51,
                    "total_trades": 15
                },
                "GBP/USD": {
                    "win_rate": 65.1,
                    "avg_return": 0.38,
                    "total_trades": 12
                },
                "XAU/USD": {
                    "win_rate": 59.2,
                    "avg_return": 0.75,
                    "total_trades": 8
                }
            },
            "historical_performance": [
                {"date": "2025-03", "win_rate": 64.2, "return": 3.2},
                {"date": "2025-02", "win_rate": 71.5, "return": 4.8},
                {"date": "2025-01", "win_rate": 58.3, "return": 2.5}
            ]
        }
    except Exception as e:
        logger.error(f"Error fetching performance metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/global-markets")
async def get_global_markets(current_user: User = Depends(get_current_active_user)):
    """Get live data for global markets"""
    try:
        # Get market data
        markets_data = await market_data.get_global_markets_data()
        
        # Get relevant news for each market
        news_data = {}
        async with aiohttp.ClientSession() as session:
            for region in markets_data.keys():
                news_data[region] = []
                
                # Define news sources based on region
                news_urls = {
                    'US': [
                        'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^GSPC,^DJI,^IXIC&region=US&lang=en-US',
                        'https://www.cnbc.com/id/100003114/device/rss/rss.html'
                    ],
                    'India': [
                        'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^NSEI,^BSESN&region=IN&lang=en-IN',
                        'https://www.moneycontrol.com/rss/marketreports.xml'
                    ],
                    'Europe': [
                        'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^STOXX50E,^GDAXI,^FTSE&region=EU&lang=en-GB',
                        'https://www.ft.com/markets?format=rss'
                    ],
                    'Asia': [
                        'https://feeds.finance.yahoo.com/rss/2.0/headline?s=^N225,000001.SS,^HSI&region=HK&lang=en-HK',
                        'https://asia.nikkei.com/rss/feed/markets'
                    ]
                }
                
                # Fetch news from each source
                for url in news_urls.get(region, []):
                    try:
                        async with session.get(url) as response:
                            if response.status == 200:
                                content = await response.text()
                                feed = feedparser.parse(content)
                                
                                # Get latest 5 news items
                                for entry in feed.entries[:5]:
                                    news_data[region].append({
                                        'title': entry.title,
                                        'link': entry.link,
                                        'published': entry.get('published', ''),
                                        'summary': entry.get('summary', '')
                                    })
                    except Exception as e:
                        logger.error(f"Error fetching news from {url}: {str(e)}")
                        continue
        
        return {
            'timestamp': datetime.utcnow().isoformat(),
            'markets': markets_data,
            'news': news_data
        }
        
    except Exception as e:
        logger.error(f"Error in global markets endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/market/{symbol}")
async def get_market_details(
    symbol: str,
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed market data for a specific symbol"""
    try:
        # Get market data
        data = await market_data.fetch_market_data(
            symbol=symbol,
            instrument_type='STOCKS',  # Default to stocks for indices
            timeframe='1h',
            limit=24  # Get last 24 hours of data
        )
        
        return {
            'symbol': symbol,
            'data': data.to_dict(orient='records'),
            'timestamp': datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error fetching market details for {symbol}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/economic-calendar")
async def get_economic_calendar(current_user: User = Depends(get_current_active_user)):
    """Get economic calendar data"""
    try:
        events = await economic_calendar.get_calendar_data()
        return events
    except Exception as e:
        logger.error(f"Error fetching economic calendar: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/backtest")
async def run_backtest(request: BacktestRequest, current_user: User = Depends(get_current_active_user)):
    """Run backtest simulation"""
    try:
        result = await backtester.run_backtest(
            symbol=request.symbol,
            start_date=request.start_date,
            end_date=request.end_date,
            timeframe=request.timeframe,
            initial_balance=request.initial_balance,
            position_size=request.position_size,
            max_positions=request.max_positions
        )
        return backtester.generate_report(result)
    except Exception as e:
        logger.error(f"Error running backtest: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/analytics/load-trades")
async def load_trades_for_analysis(trades: List[dict], current_user: User = Depends(get_current_active_user)):
    """Load trades into analytics engine"""
    try:
        performance_analytics.load_trades(trades)
        return {"status": "success"}
    except Exception as e:
        logger.error(f"Error loading trades: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/overall-metrics")
async def get_overall_metrics(current_user: User = Depends(get_current_active_user)):
    """Get overall performance metrics"""
    try:
        return performance_analytics.get_overall_metrics()
    except Exception as e:
        logger.error(f"Error getting overall metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/pattern-analysis")
async def get_pattern_analysis(current_user: User = Depends(get_current_active_user)):
    """Get trading pattern analysis"""
    try:
        return performance_analytics.get_pattern_analysis()
    except Exception as e:
        logger.error(f"Error getting pattern analysis: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/risk-metrics")
async def get_risk_metrics(current_user: User = Depends(get_current_active_user)):
    """Get risk-related metrics"""
    try:
        return performance_analytics.get_risk_metrics()
    except Exception as e:
        logger.error(f"Error getting risk metrics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/analytics/optimization-suggestions")
async def get_optimization_suggestions(current_user: User = Depends(get_current_active_user)):
    """Get strategy optimization suggestions"""
    try:
        return performance_analytics.get_optimization_suggestions()
    except Exception as e:
        logger.error(f"Error getting optimization suggestions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str):
    """WebSocket endpoint for real-time updates"""
    try:
        await ws_manager.connect(websocket, user_id)
        
        while True:
            try:
                # Receive and process messages
                message = await websocket.receive_json()
                
                if message['type'] == 'subscribe':
                    await ws_manager.subscribe(websocket, message['symbols'])
                elif message['type'] == 'unsubscribe':
                    await ws_manager.unsubscribe(websocket, message['symbols'])
                    
            except WebSocketDisconnect:
                await ws_manager.disconnect(websocket, user_id)
                break
            except Exception as e:
                logger.error(f"Error in websocket connection: {str(e)}")
                break
                
    except Exception as e:
        logger.error(f"Error establishing websocket connection: {str(e)}")
        raise
