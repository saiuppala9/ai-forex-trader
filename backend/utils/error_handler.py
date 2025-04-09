from typing import Dict, Any, Optional, Type
from fastapi import HTTPException
import logging
from datetime import datetime
import traceback
import json
import aiohttp
from enum import Enum

logger = logging.getLogger(__name__)

class ErrorCode(Enum):
    # Authentication Errors (1000-1099)
    INVALID_CREDENTIALS = 1000
    TOKEN_EXPIRED = 1001
    INVALID_TOKEN = 1002
    UNAUTHORIZED = 1003
    
    # Market Data Errors (1100-1199)
    DATA_SOURCE_ERROR = 1100
    SYMBOL_NOT_FOUND = 1101
    INVALID_TIMEFRAME = 1102
    NO_DATA_AVAILABLE = 1103
    
    # Trading Errors (1200-1299)
    INSUFFICIENT_BALANCE = 1200
    INVALID_ORDER = 1201
    ORDER_FAILED = 1202
    POSITION_NOT_FOUND = 1203
    
    # Analysis Errors (1300-1399)
    ANALYSIS_FAILED = 1300
    INVALID_PARAMETERS = 1301
    INSUFFICIENT_DATA = 1302
    
    # Rate Limiting Errors (1400-1499)
    RATE_LIMIT_EXCEEDED = 1400
    TOO_MANY_REQUESTS = 1401
    
    # External API Errors (1500-1599)
    API_ERROR = 1500
    CONNECTION_ERROR = 1501
    TIMEOUT_ERROR = 1502
    
    # Database Errors (1600-1699)
    DB_CONNECTION_ERROR = 1600
    DB_QUERY_ERROR = 1601
    
    # System Errors (1900-1999)
    INTERNAL_ERROR = 1900
    MAINTENANCE_MODE = 1901

class TradingException(HTTPException):
    def __init__(
        self,
        error_code: ErrorCode,
        detail: str,
        status_code: int = 400,
        headers: Optional[Dict[str, str]] = None
    ):
        self.error_code = error_code
        self.timestamp = datetime.utcnow().isoformat()
        self.traceback = traceback.format_exc()
        
        super().__init__(
            status_code=status_code,
            detail={
                'error_code': error_code.value,
                'message': detail,
                'timestamp': self.timestamp
            },
            headers=headers
        )
        
        # Log the error
        logger.error(f"Error {error_code.value}: {detail}\n{self.traceback}")

class ErrorHandler:
    def __init__(self):
        self.error_counts: Dict[ErrorCode, int] = {code: 0 for code in ErrorCode}
        self.last_errors: Dict[ErrorCode, datetime] = {}

    def handle_http_error(self, status_code: int, detail: str) -> TradingException:
        """Handle HTTP errors"""
        if status_code == 401:
            return TradingException(
                ErrorCode.UNAUTHORIZED,
                "Unauthorized access",
                status_code
            )
        elif status_code == 404:
            return TradingException(
                ErrorCode.SYMBOL_NOT_FOUND,
                detail or "Resource not found",
                status_code
            )
        elif status_code == 429:
            return TradingException(
                ErrorCode.RATE_LIMIT_EXCEEDED,
                "Rate limit exceeded",
                status_code
            )
        elif status_code >= 500:
            return TradingException(
                ErrorCode.API_ERROR,
                "External API error",
                status_code
            )
        else:
            return TradingException(
                ErrorCode.INTERNAL_ERROR,
                detail or "Unknown error",
                status_code
            )

    def handle_market_data_error(self, error: Exception) -> TradingException:
        """Handle market data related errors"""
        if isinstance(error, aiohttp.ClientError):
            return TradingException(
                ErrorCode.CONNECTION_ERROR,
                "Failed to connect to data source",
                503
            )
        elif isinstance(error, asyncio.TimeoutError):
            return TradingException(
                ErrorCode.TIMEOUT_ERROR,
                "Data source request timed out",
                504
            )
        else:
            return TradingException(
                ErrorCode.DATA_SOURCE_ERROR,
                str(error),
                500
            )

    def handle_trading_error(self, error: Exception) -> TradingException:
        """Handle trading related errors"""
        if "insufficient balance" in str(error).lower():
            return TradingException(
                ErrorCode.INSUFFICIENT_BALANCE,
                "Insufficient balance for trade",
                400
            )
        elif "invalid order" in str(error).lower():
            return TradingException(
                ErrorCode.INVALID_ORDER,
                "Invalid order parameters",
                400
            )
        else:
            return TradingException(
                ErrorCode.ORDER_FAILED,
                str(error),
                500
            )

    def handle_analysis_error(self, error: Exception) -> TradingException:
        """Handle analysis related errors"""
        if "insufficient data" in str(error).lower():
            return TradingException(
                ErrorCode.INSUFFICIENT_DATA,
                "Not enough data for analysis",
                400
            )
        elif "invalid parameters" in str(error).lower():
            return TradingException(
                ErrorCode.INVALID_PARAMETERS,
                "Invalid analysis parameters",
                400
            )
        else:
            return TradingException(
                ErrorCode.ANALYSIS_FAILED,
                str(error),
                500
            )

    async def handle_error(
        self,
        error: Exception,
        error_type: Optional[str] = None
    ) -> TradingException:
        """Main error handling method"""
        try:
            if isinstance(error, HTTPException):
                return self.handle_http_error(error.status_code, str(error.detail))
            
            if error_type == "market_data":
                return self.handle_market_data_error(error)
            elif error_type == "trading":
                return self.handle_trading_error(error)
            elif error_type == "analysis":
                return self.handle_analysis_error(error)
            else:
                return TradingException(
                    ErrorCode.INTERNAL_ERROR,
                    str(error),
                    500
                )
                
        except Exception as e:
            logger.error(f"Error in error handler: {str(e)}")
            return TradingException(
                ErrorCode.INTERNAL_ERROR,
                "Internal server error",
                500
            )

    def log_error(self, error: TradingException) -> None:
        """Log error details"""
        try:
            # Update error counts
            self.error_counts[error.error_code] += 1
            self.last_errors[error.error_code] = datetime.utcnow()
            
            # Log detailed error information
            error_details = {
                'error_code': error.error_code.value,
                'message': error.detail,
                'timestamp': error.timestamp,
                'traceback': error.traceback,
                'count': self.error_counts[error.error_code]
            }
            
            logger.error(f"Error details: {json.dumps(error_details, indent=2)}")
            
        except Exception as e:
            logger.error(f"Error logging error: {str(e)}")

# Global error handler instance
error_handler = ErrorHandler()
