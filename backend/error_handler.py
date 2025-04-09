import logging
from typing import Optional, Dict, Any
from functools import wraps
import asyncio
from config import MAX_RETRIES, RETRY_DELAY

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class APIError(Exception):
    """Custom exception for API errors"""
    def __init__(self, message: str, source: str, status_code: Optional[int] = None):
        self.message = message
        self.source = source
        self.status_code = status_code
        super().__init__(self.message)

def handle_api_error(func):
    """Decorator to handle API errors with retries"""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        retries = 0
        last_error = None
        
        while retries < MAX_RETRIES:
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                last_error = e
                retries += 1
                
                if retries < MAX_RETRIES:
                    logger.warning(f"Error in {func.__name__}, attempt {retries}/{MAX_RETRIES}: {str(e)}")
                    await asyncio.sleep(RETRY_DELAY * retries)  # Exponential backoff
                else:
                    logger.error(f"Failed to execute {func.__name__} after {MAX_RETRIES} attempts: {str(e)}")
                    
        # If all retries failed, raise the last error
        raise last_error
    
    return wrapper

def log_api_error(error: Exception, context: Dict[str, Any]):
    """Log API errors with context"""
    logger.error(f"API Error: {str(error)}")
    logger.error(f"Context: {context}")
    
    if isinstance(error, APIError):
        logger.error(f"Source: {error.source}")
        if error.status_code:
            logger.error(f"Status Code: {error.status_code}")

class ErrorResponse:
    """Standard error response format"""
    @staticmethod
    def create(error: Exception, context: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        response = {
            "error": True,
            "message": str(error),
            "type": error.__class__.__name__
        }
        
        if context:
            response["context"] = context
            
        if isinstance(error, APIError):
            response["source"] = error.source
            if error.status_code:
                response["status_code"] = error.status_code
                
        return response
