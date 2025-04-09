from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List, Set
import asyncio
import json
import logging
from datetime import datetime
from market_data import market_data
from technical_analysis import technical_analyzer
import pandas as pd

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.user_subscriptions: Dict[WebSocket, Set[str]] = {}
        self.symbol_data: Dict[str, pd.DataFrame] = {}
        self.update_task = None
        self.analysis_cache = {}
        self.cache_duration = 60  # seconds
        self.last_analysis = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        """Connect a new client"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = set()
        self.active_connections[user_id].add(websocket)
        self.user_subscriptions[websocket] = set()

        # Start update task if not running
        if self.update_task is None:
            self.update_task = asyncio.create_task(self._periodic_updates())

    async def disconnect(self, websocket: WebSocket, user_id: str):
        """Disconnect a client"""
        if user_id in self.active_connections:
            self.active_connections[user_id].remove(websocket)
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

        if websocket in self.user_subscriptions:
            del self.user_subscriptions[websocket]

        # Stop update task if no connections
        if not self.active_connections and self.update_task:
            self.update_task.cancel()
            self.update_task = None

    async def subscribe(self, websocket: WebSocket, symbols: List[str]):
        """Subscribe to market updates for specific symbols"""
        self.user_subscriptions[websocket].update(symbols)
        
        # Initialize historical data for new symbols
        for symbol in symbols:
            if symbol not in self.symbol_data:
                data = await market_data.get_historical_data(symbol)
                if data is not None:
                    self.symbol_data[symbol] = data

    async def unsubscribe(self, websocket: WebSocket, symbols: List[str]):
        """Unsubscribe from market updates"""
        self.user_subscriptions[websocket].difference_update(symbols)

    async def _analyze_symbol(self, symbol: str, price_data: Dict) -> Dict:
        """Perform technical analysis for a symbol"""
        try:
            # Update symbol data with new price
            if symbol in self.symbol_data:
                df = self.symbol_data[symbol].copy()
                new_row = pd.DataFrame([{
                    'open': price_data['price'],
                    'high': price_data['price'],
                    'low': price_data['price'],
                    'close': price_data['price']
                }], index=[pd.Timestamp(price_data['timestamp'])])
                
                df = pd.concat([df, new_row]).sort_index()
                df = df.iloc[-200:]  # Keep last 200 rows for analysis
                self.symbol_data[symbol] = df
                
                # Perform technical analysis
                analysis = technical_analyzer.analyze(df)
                if analysis:
                    return {
                        'trend': analysis.trend,
                        'strength': analysis.strength,
                        'support': analysis.support,
                        'resistance': analysis.resistance,
                        'rsi': analysis.rsi,
                        'macd': analysis.macd,
                        'ma_signals': analysis.ma_signals,
                        'patterns': analysis.patterns
                    }
        except Exception as e:
            logger.error(f"Error analyzing {symbol}: {str(e)}")
        return None

    async def _periodic_updates(self):
        """Send periodic updates to all connected clients"""
        while True:
            try:
                # Get all unique symbols from subscriptions
                all_symbols = set()
                for subscriptions in self.user_subscriptions.values():
                    all_symbols.update(subscriptions)

                # Fetch market data for all symbols
                updates = {}
                for symbol in all_symbols:
                    try:
                        # Get market data
                        price_data = await market_data.get_live_forex_price(symbol)
                        if price_data:
                            # Get technical analysis
                            analysis = await self._analyze_symbol(symbol, price_data)
                            
                            updates[symbol] = {
                                'timestamp': datetime.utcnow().isoformat(),
                                'price_data': price_data,
                                'technical_analysis': analysis
                            }

                    except Exception as e:
                        logger.error(f"Error getting updates for {symbol}: {str(e)}")
                        continue

                # Send updates to subscribed clients
                for websocket, subscriptions in self.user_subscriptions.items():
                    if not subscriptions:
                        continue

                    # Filter updates for subscribed symbols
                    client_updates = {
                        symbol: data
                        for symbol, data in updates.items()
                        if symbol in subscriptions
                    }

                    if client_updates:
                        try:
                            await websocket.send_json({
                                'type': 'market_update',
                                'data': client_updates
                            })
                        except Exception as e:
                            logger.error(f"Error sending update: {str(e)}")
                            continue

                # Get and broadcast news updates
                try:
                    news = await market_data.get_forex_news(list(all_symbols))
                    if news:
                        for user_id, connections in self.active_connections.items():
                            for websocket in connections:
                                try:
                                    await websocket.send_json({
                                        'type': 'news_update',
                                        'data': news[:5]  # Send latest 5 news items
                                    })
                                except Exception as e:
                                    logger.error(f"Error sending news: {str(e)}")
                                    continue
                except Exception as e:
                    logger.error(f"Error fetching news: {str(e)}")

            except Exception as e:
                logger.error(f"Error in periodic updates: {str(e)}")

            await asyncio.sleep(5)  # Update every 5 seconds

# Global WebSocket manager instance
ws_manager = WebSocketManager()
