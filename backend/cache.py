import aioredis
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any

from config import REDIS_URL, CACHE_TTL

class Cache:
    def __init__(self):
        self.redis = None
        
    async def connect(self):
        """Connect to Redis"""
        self.redis = await aioredis.from_url(REDIS_URL)
        
    async def close(self):
        """Close Redis connection"""
        if self.redis:
            await self.redis.close()
            
    async def set_news(self, symbol: str, news_data: List[Dict[str, Any]]):
        """Cache news data for a symbol"""
        key = f"news:{symbol}"
        value = {
            'timestamp': datetime.now().isoformat(),
            'data': news_data
        }
        await self.redis.set(key, json.dumps(value), ex=CACHE_TTL)
        
    async def get_news(self, symbol: str) -> Optional[List[Dict[str, Any]]]:
        """Get cached news data for a symbol"""
        key = f"news:{symbol}"
        data = await self.redis.get(key)
        if data:
            cached = json.loads(data)
            cached_time = datetime.fromisoformat(cached['timestamp'])
            if datetime.now() - cached_time < timedelta(seconds=CACHE_TTL):
                return cached['data']
        return None
        
    async def set_market_data(self, symbol: str, timeframe: str, data: Dict[str, Any]):
        """Cache market data for a symbol and timeframe"""
        key = f"market:{symbol}:{timeframe}"
        value = {
            'timestamp': datetime.now().isoformat(),
            'data': data
        }
        await self.redis.set(key, json.dumps(value), ex=CACHE_TTL)
        
    async def get_market_data(self, symbol: str, timeframe: str) -> Optional[Dict[str, Any]]:
        """Get cached market data for a symbol and timeframe"""
        key = f"market:{symbol}:{timeframe}"
        data = await self.redis.get(key)
        if data:
            cached = json.loads(data)
            cached_time = datetime.fromisoformat(cached['timestamp'])
            if datetime.now() - cached_time < timedelta(seconds=CACHE_TTL):
                return cached['data']
        return None
        
    async def set_analysis(self, symbol: str, analysis: Dict[str, Any]):
        """Cache analysis results for a symbol"""
        key = f"analysis:{symbol}"
        value = {
            'timestamp': datetime.now().isoformat(),
            'data': analysis
        }
        await self.redis.set(key, json.dumps(value), ex=CACHE_TTL)
        
    async def get_analysis(self, symbol: str) -> Optional[Dict[str, Any]]:
        """Get cached analysis for a symbol"""
        key = f"analysis:{symbol}"
        data = await self.redis.get(key)
        if data:
            cached = json.loads(data)
            cached_time = datetime.fromisoformat(cached['timestamp'])
            if datetime.now() - cached_time < timedelta(seconds=CACHE_TTL):
                return cached['data']
        return None

# Global cache instance
cache = Cache()
