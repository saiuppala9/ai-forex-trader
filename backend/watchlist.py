import asyncio
import json
from typing import Dict, List, Optional
import aioredis
from datetime import datetime

from config import (
    REDIS_URL,
    CACHE_TTL,
    MAX_WATCHLIST_ITEMS,
    INSTRUMENTS
)

from market_data import market_data

class WatchlistHandler:
    def __init__(self):
        self.redis = None
        self.watchlists = {}
        self.active_streams = set()
        
    async def init(self):
        """Initialize Redis connection"""
        self.redis = await aioredis.from_url(REDIS_URL)
        
    async def add_to_watchlist(
        self,
        user_id: str,
        symbol: str,
        instrument_type: str
    ) -> Dict:
        """Add an instrument to user's watchlist"""
        
        watchlist_key = f"watchlist:{user_id}"
        
        # Get current watchlist
        watchlist = await self.redis.get(watchlist_key)
        watchlist = json.loads(watchlist) if watchlist else []
        
        # Check if symbol already exists
        if any(item['symbol'] == symbol for item in watchlist):
            return {'status': 'error', 'message': 'Symbol already in watchlist'}
            
        # Check watchlist size limit
        if len(watchlist) >= MAX_WATCHLIST_ITEMS:
            return {'status': 'error', 'message': 'Watchlist full'}
            
        # Validate symbol
        if not self._validate_symbol(symbol, instrument_type):
            return {'status': 'error', 'message': 'Invalid symbol'}
            
        # Add to watchlist
        watchlist.append({
            'symbol': symbol,
            'instrument_type': instrument_type,
            'added_at': datetime.now().isoformat()
        })
        
        # Save to Redis
        await self.redis.set(
            watchlist_key,
            json.dumps(watchlist),
            ex=CACHE_TTL
        )
        
        # Start streaming if not already active
        if symbol not in self.active_streams:
            asyncio.create_task(self._stream_market_data(symbol, instrument_type))
            self.active_streams.add(symbol)
            
        return {'status': 'success', 'message': 'Added to watchlist'}
        
    async def remove_from_watchlist(
        self,
        user_id: str,
        symbol: str
    ) -> Dict:
        """Remove an instrument from user's watchlist"""
        
        watchlist_key = f"watchlist:{user_id}"
        
        # Get current watchlist
        watchlist = await self.redis.get(watchlist_key)
        if not watchlist:
            return {'status': 'error', 'message': 'Watchlist empty'}
            
        watchlist = json.loads(watchlist)
        
        # Remove symbol
        watchlist = [item for item in watchlist if item['symbol'] != symbol]
        
        # Save to Redis
        await self.redis.set(
            watchlist_key,
            json.dumps(watchlist),
            ex=CACHE_TTL
        )
        
        # Stop streaming if no other users watching
        if not await self._is_symbol_watched(symbol):
            self.active_streams.remove(symbol)
            
        return {'status': 'success', 'message': 'Removed from watchlist'}
        
    async def get_watchlist(self, user_id: str) -> List[Dict]:
        """Get user's watchlist with latest data"""
        
        watchlist_key = f"watchlist:{user_id}"
        watchlist = await self.redis.get(watchlist_key)
        
        if not watchlist:
            return []
            
        watchlist = json.loads(watchlist)
        
        # Fetch latest data for each symbol
        for item in watchlist:
            latest_key = f"market_data:{item['symbol']}:latest"
            latest_data = await self.redis.get(latest_key)
            
            if latest_data:
                item['latest_data'] = json.loads(latest_data)
                
        return watchlist
        
    def _validate_symbol(self, symbol: str, instrument_type: str) -> bool:
        """Validate if symbol exists in configured instruments"""
        
        if instrument_type not in INSTRUMENTS:
            return False
            
        instrument_config = INSTRUMENTS[instrument_type]
        
        if 'pairs' in instrument_config:
            return symbol in instrument_config['pairs']
        elif 'symbols' in instrument_config:
            return symbol in instrument_config['symbols']
        elif instrument_type == 'STOCKS':
            return (
                symbol in instrument_config['indices'] or
                symbol in instrument_config['popular_stocks']
            )
            
        return False
        
    async def _is_symbol_watched(self, symbol: str) -> bool:
        """Check if any user is watching this symbol"""
        
        async for key in self.redis.scan_iter("watchlist:*"):
            watchlist = await self.redis.get(key)
            if watchlist:
                watchlist = json.loads(watchlist)
                if any(item['symbol'] == symbol for item in watchlist):
                    return True
                    
        return False
        
    async def _stream_market_data(self, symbol: str, instrument_type: str):
        """Stream market data for a symbol"""
        
        while symbol in self.active_streams:
            try:
                # Fetch latest data
                data = await market_data.fetch_market_data(
                    symbol=symbol,
                    instrument_type=instrument_type,
                    timeframe='1m',
                    limit=1
                )
                
                # Save latest data to Redis
                latest_data = {
                    'symbol': symbol,
                    'price': data['Close'].iloc[-1],
                    'change': float(data['Close'].pct_change().iloc[-1]),
                    'volume': float(data['Volume'].iloc[-1]),
                    'timestamp': datetime.now().isoformat()
                }
                
                await self.redis.set(
                    f"market_data:{symbol}:latest",
                    json.dumps(latest_data),
                    ex=CACHE_TTL
                )
                
                # Store historical data
                await self.redis.zadd(
                    f"market_data:{symbol}:history",
                    {json.dumps(latest_data): datetime.now().timestamp()}
                )
                
                # Keep only last 1000 points
                await self.redis.zremrangebyrank(
                    f"market_data:{symbol}:history",
                    0,
                    -1001
                )
                
            except Exception as e:
                print(f"Error streaming {symbol}: {str(e)}")
                
            await asyncio.sleep(1)  # Update every second

# Global watchlist handler instance
watchlist = WatchlistHandler()
