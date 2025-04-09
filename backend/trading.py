import asyncio
from typing import Dict, List, Optional, Union
from datetime import datetime, timedelta
import pandas as pd
import logging
from .utils.error_handler import error_handler, ErrorCode
from .utils.technical_analysis import technical_analyzer
from .market_data import market_data
from .utils.database import db

logger = logging.getLogger(__name__)

class TradingEngine:
    def __init__(self):
        self.active_trades: Dict[str, Dict] = {}
        self.pending_orders: Dict[str, Dict] = {}
        self.trade_history: List[Dict] = []
        self.risk_per_trade = 0.02  # 2% risk per trade
        self.max_trades = 5  # Maximum concurrent trades
        
    async def analyze_symbol(
        self,
        symbol: str,
        timeframe: str = '1h'
    ) -> Dict:
        """Analyze a symbol and generate trading signals"""
        try:
            # Get market data
            market_data_result = await market_data.get_forex_data(symbol)
            if not market_data_result:
                raise error_handler.handle_market_data_error(
                    Exception(f"No data available for {symbol}")
                )
            
            # Convert to DataFrame for technical analysis
            df = pd.DataFrame([market_data_result])
            
            # Get technical analysis
            analysis = technical_analyzer.analyze(df, timeframe)
            if not analysis:
                raise error_handler.handle_analysis_error(
                    Exception(f"Analysis failed for {symbol}")
                )
            
            # Get latest news that might affect this symbol
            news = await market_data.get_forex_news()
            relevant_news = [
                n for n in news 
                if symbol.split('/')[0] in n['title'] or 
                symbol.split('/')[1] in n['title']
            ][:5]
            
            return {
                'symbol': symbol,
                'timestamp': datetime.now().isoformat(),
                'market_data': market_data_result,
                'technical_analysis': analysis.__dict__,
                'relevant_news': relevant_news,
                'trade_recommendation': {
                    'action': analysis.direction,
                    'confidence': analysis.confidence,
                    'entry_price': analysis.entry_price,
                    'stop_loss': analysis.stop_loss,
                    'take_profit': analysis.take_profit
                }
            }
            
        except Exception as e:
            logger.error(f"Error analyzing symbol {symbol}: {str(e)}")
            raise

    async def place_trade(
        self,
        user_id: int,
        symbol: str,
        direction: str,
        size: float,
        entry_price: Optional[float] = None,
        stop_loss: Optional[float] = None,
        take_profit: Optional[float] = None
    ) -> Dict:
        """Place a new trade"""
        try:
            # Validate inputs
            if direction not in ['buy', 'sell']:
                raise error_handler.handle_trading_error(
                    Exception("Invalid direction. Must be 'buy' or 'sell'")
                )
            
            if size <= 0:
                raise error_handler.handle_trading_error(
                    Exception("Size must be greater than 0")
                )
            
            # Check if maximum trades reached
            user_trades = [t for t in self.active_trades.values() if t['user_id'] == user_id]
            if len(user_trades) >= self.max_trades:
                raise error_handler.handle_trading_error(
                    Exception(f"Maximum number of trades ({self.max_trades}) reached")
                )
            
            # Get current market data
            market_data_result = await market_data.get_forex_data(symbol)
            if not market_data_result:
                raise error_handler.handle_market_data_error(
                    Exception(f"No data available for {symbol}")
                )
            
            current_price = market_data_result['price']
            
            # Use current price if entry price not specified
            entry_price = entry_price or current_price
            
            # Calculate stop loss and take profit if not provided
            if not stop_loss or not take_profit:
                df = pd.DataFrame([market_data_result])
                analysis = technical_analyzer.analyze(df)
                if analysis:
                    stop_loss = stop_loss or analysis.stop_loss
                    take_profit = take_profit or analysis.take_profit
                else:
                    # Default to 2% stop loss and 3% take profit
                    stop_loss = entry_price * (0.98 if direction == 'buy' else 1.02)
                    take_profit = entry_price * (1.03 if direction == 'buy' else 0.97)
            
            # Create trade object
            trade_id = f"trade_{symbol}_{datetime.now().timestamp()}"
            trade = {
                'id': trade_id,
                'user_id': user_id,
                'symbol': symbol,
                'direction': direction,
                'size': size,
                'entry_price': entry_price,
                'current_price': current_price,
                'stop_loss': stop_loss,
                'take_profit': take_profit,
                'status': 'open',
                'pnl': 0.0,
                'entry_time': datetime.now().isoformat(),
                'last_update': datetime.now().isoformat()
            }
            
            # Save trade
            self.active_trades[trade_id] = trade
            await db.save_trade(user_id, trade)
            
            # Start monitoring trade
            asyncio.create_task(self._monitor_trade(trade_id))
            
            return trade
            
        except Exception as e:
            logger.error(f"Error placing trade: {str(e)}")
            raise

    async def close_trade(
        self,
        user_id: int,
        trade_id: str,
        price: Optional[float] = None
    ) -> Dict:
        """Close an existing trade"""
        try:
            if trade_id not in self.active_trades:
                raise error_handler.handle_trading_error(
                    Exception(f"Trade {trade_id} not found")
                )
            
            trade = self.active_trades[trade_id]
            
            # Verify user owns the trade
            if trade['user_id'] != user_id:
                raise error_handler.handle_trading_error(
                    Exception("Unauthorized to close this trade")
                )
            
            # Get current price if not provided
            if not price:
                market_data_result = await market_data.get_forex_data(trade['symbol'])
                if not market_data_result:
                    raise error_handler.handle_market_data_error(
                        Exception(f"No data available for {trade['symbol']}")
                    )
                price = market_data_result['price']
            
            # Calculate PnL
            if trade['direction'] == 'buy':
                pnl = (price - trade['entry_price']) * trade['size']
            else:
                pnl = (trade['entry_price'] - price) * trade['size']
            
            # Update trade
            trade['status'] = 'closed'
            trade['exit_price'] = price
            trade['exit_time'] = datetime.now().isoformat()
            trade['pnl'] = pnl
            
            # Move to history
            self.trade_history.append(trade)
            del self.active_trades[trade_id]
            
            # Save to database
            await db.save_trade(user_id, trade)
            
            return trade
            
        except Exception as e:
            logger.error(f"Error closing trade: {str(e)}")
            raise

    async def get_active_trades(self, user_id: int) -> List[Dict]:
        """Get all active trades for a user"""
        try:
            return [
                trade for trade in self.active_trades.values()
                if trade['user_id'] == user_id
            ]
        except Exception as e:
            logger.error(f"Error getting active trades: {str(e)}")
            raise

    async def get_trade_history(
        self,
        user_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        symbol: Optional[str] = None
    ) -> List[Dict]:
        """Get trade history with optional filters"""
        try:
            return await db.get_trading_history(
                user_id,
                start_date,
                end_date,
                symbol
            )
        except Exception as e:
            logger.error(f"Error getting trade history: {str(e)}")
            raise

    async def _monitor_trade(self, trade_id: str):
        """Monitor an active trade for stop loss/take profit"""
        try:
            while trade_id in self.active_trades:
                trade = self.active_trades[trade_id]
                
                # Get current price
                market_data_result = await market_data.get_forex_data(trade['symbol'])
                if not market_data_result:
                    await asyncio.sleep(1)
                    continue
                
                current_price = market_data_result['price']
                trade['current_price'] = current_price
                
                # Check stop loss/take profit
                if trade['direction'] == 'buy':
                    if current_price <= trade['stop_loss']:
                        await self.close_trade(trade['user_id'], trade_id, current_price)
                        logger.info(f"Stop loss triggered for trade {trade_id}")
                        break
                    elif current_price >= trade['take_profit']:
                        await self.close_trade(trade['user_id'], trade_id, current_price)
                        logger.info(f"Take profit triggered for trade {trade_id}")
                        break
                else:  # sell
                    if current_price >= trade['stop_loss']:
                        await self.close_trade(trade['user_id'], trade_id, current_price)
                        logger.info(f"Stop loss triggered for trade {trade_id}")
                        break
                    elif current_price <= trade['take_profit']:
                        await self.close_trade(trade['user_id'], trade_id, current_price)
                        logger.info(f"Take profit triggered for trade {trade_id}")
                        break
                
                # Update PnL
                if trade['direction'] == 'buy':
                    trade['pnl'] = (current_price - trade['entry_price']) * trade['size']
                else:
                    trade['pnl'] = (trade['entry_price'] - current_price) * trade['size']
                
                trade['last_update'] = datetime.now().isoformat()
                
                await asyncio.sleep(1)  # Check every second
                
        except Exception as e:
            logger.error(f"Error monitoring trade {trade_id}: {str(e)}")
            if trade_id in self.active_trades:
                trade = self.active_trades[trade_id]
                try:
                    await self.close_trade(trade['user_id'], trade_id)
                except:
                    pass

# Global instance
trading_engine = TradingEngine()
