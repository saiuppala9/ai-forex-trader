from typing import Dict, Optional
from datetime import datetime, timedelta
import asyncio
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

class RateLimiter:
    def __init__(self):
        self.request_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self.last_reset: Dict[str, datetime] = defaultdict(lambda: datetime.now())
        self.locks: Dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
        
        # Rate limits per source
        self.limits = {
            'investing.com': {'requests': 30, 'window': 60},  # 30 requests per minute
            'forexfactory.com': {'requests': 20, 'window': 60},  # 20 requests per minute
            'marketwatch.com': {'requests': 25, 'window': 60},  # 25 requests per minute
            'fxstreet.com': {'requests': 20, 'window': 60},  # 20 requests per minute
            'dailyfx.com': {'requests': 25, 'window': 60},  # 25 requests per minute
            'default': {'requests': 10, 'window': 60}  # Default limit
        }

    async def acquire(self, source: str, ip: Optional[str] = None) -> bool:
        """
        Try to acquire a rate limit slot for the given source and IP
        Returns True if successful, False if rate limit exceeded
        """
        try:
            async with self.locks[source]:
                now = datetime.now()
                key = f"{source}:{ip}" if ip else source
                
                # Get rate limit for this source
                limit = self.limits.get(source, self.limits['default'])
                
                # Reset counters if window has passed
                if (now - self.last_reset[key]).total_seconds() >= limit['window']:
                    self.request_counts[key].clear()
                    self.last_reset[key] = now
                
                # Check if limit exceeded
                if self.request_counts[key]['count'] >= limit['requests']:
                    logger.warning(f"Rate limit exceeded for {source}")
                    return False
                
                # Increment counter
                self.request_counts[key]['count'] += 1
                return True
                
        except Exception as e:
            logger.error(f"Error in rate limiter: {str(e)}")
            return False

    async def wait_if_needed(self, source: str, ip: Optional[str] = None) -> None:
        """
        Wait until a rate limit slot becomes available
        """
        while not await self.acquire(source, ip):
            await asyncio.sleep(1)

# Global rate limiter instance
rate_limiter = RateLimiter()
