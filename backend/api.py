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
from typing import List, Optional
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

# In-memory watchlist storage (replace with database in production)
watchlists = {}

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
    current_user: User = Depends(get_current_active_user)
):
    """Get detailed AI analysis for a symbol"""
    try:
        analysis = await ai_trader.analyze_market(symbol)
        return {
            "symbol": symbol,
            "timestamp": datetime.utcnow().isoformat(),
            "analysis": analysis
        }
    except Exception as e:
        logger.error(f"Error analyzing {symbol}: {str(e)}")
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
