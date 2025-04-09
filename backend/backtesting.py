import pandas as pd
import numpy as np
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timedelta
import logging
from market_data import market_data
from ai_trader import ai_trader

logger = logging.getLogger(__name__)

class Position:
    def __init__(self, symbol: str, entry_price: float, stop_loss: float, 
                 target_price: float, size: float, entry_time: datetime,
                 position_type: str):
        self.symbol = symbol
        self.entry_price = entry_price
        self.stop_loss = stop_loss
        self.target_price = target_price
        self.size = size
        self.entry_time = entry_time
        self.position_type = position_type  # 'long' or 'short'
        self.exit_price = None
        self.exit_time = None
        self.pnl = 0
        self.exit_reason = None

    def calculate_pnl(self, exit_price: float) -> float:
        """Calculate position P&L"""
        price_diff = exit_price - self.entry_price if self.position_type == 'long' else self.entry_price - exit_price
        return price_diff * self.size

    def close_position(self, exit_price: float, exit_time: datetime, reason: str):
        """Close the position and calculate P&L"""
        self.exit_price = exit_price
        self.exit_time = exit_time
        self.exit_reason = reason
        self.pnl = self.calculate_pnl(exit_price)

class BacktestResult:
    def __init__(self):
        self.total_trades = 0
        self.winning_trades = 0
        self.losing_trades = 0
        self.total_pnl = 0
        self.max_drawdown = 0
        self.win_rate = 0
        self.profit_factor = 0
        self.avg_win = 0
        self.avg_loss = 0
        self.largest_win = 0
        self.largest_loss = 0
        self.positions: List[Position] = []
        self.equity_curve: List[float] = []
        self.drawdown_curve: List[float] = []
        self.trade_durations: List[timedelta] = []

    def calculate_metrics(self):
        """Calculate trading metrics"""
        if not self.positions:
            return

        # Calculate basic metrics
        self.total_trades = len(self.positions)
        self.winning_trades = len([p for p in self.positions if p.pnl > 0])
        self.losing_trades = len([p for p in self.positions if p.pnl < 0])
        self.total_pnl = sum(p.pnl for p in self.positions)
        
        # Calculate win rate
        self.win_rate = (self.winning_trades / self.total_trades) * 100 if self.total_trades > 0 else 0
        
        # Calculate profit factor
        total_gains = sum(p.pnl for p in self.positions if p.pnl > 0)
        total_losses = abs(sum(p.pnl for p in self.positions if p.pnl < 0))
        self.profit_factor = total_gains / total_losses if total_losses > 0 else float('inf')
        
        # Calculate average wins and losses
        winning_trades = [p.pnl for p in self.positions if p.pnl > 0]
        losing_trades = [p.pnl for p in self.positions if p.pnl < 0]
        self.avg_win = np.mean(winning_trades) if winning_trades else 0
        self.avg_loss = np.mean(losing_trades) if losing_trades else 0
        self.largest_win = max(winning_trades) if winning_trades else 0
        self.largest_loss = min(losing_trades) if losing_trades else 0
        
        # Calculate trade durations
        self.trade_durations = [
            p.exit_time - p.entry_time for p in self.positions if p.exit_time
        ]
        
        # Calculate equity curve and drawdown
        cumulative_pnl = np.cumsum([p.pnl for p in self.positions])
        self.equity_curve = cumulative_pnl.tolist()
        
        # Calculate drawdown
        running_max = np.maximum.accumulate(cumulative_pnl)
        drawdown = running_max - cumulative_pnl
        self.drawdown_curve = drawdown.tolist()
        self.max_drawdown = np.max(drawdown)

class Backtester:
    def __init__(self):
        self.market_data = market_data
        self.ai_trader = ai_trader
        self.initial_balance = 10000  # Default $10,000
        self.position_size = 0.02  # 2% risk per trade
        self.max_positions = 5  # Maximum concurrent positions

    async def run_backtest(
        self,
        symbol: str,
        start_date: datetime,
        end_date: datetime,
        timeframe: str = '1h',
        initial_balance: float = 10000,
        position_size: float = 0.02,
        max_positions: int = 5
    ) -> BacktestResult:
        """Run backtest simulation"""
        try:
            # Update parameters
            self.initial_balance = initial_balance
            self.position_size = position_size
            self.max_positions = max_positions
            
            # Initialize result
            result = BacktestResult()
            
            # Get historical data
            df = await self.market_data.fetch_market_data(
                symbol=symbol,
                instrument_type='FOREX',
                timeframe=timeframe,
                start_date=start_date,
                end_date=end_date
            )
            
            if df.empty:
                raise ValueError(f"No data available for {symbol}")
            
            # Initialize simulation variables
            balance = self.initial_balance
            open_positions: List[Position] = []
            
            # Iterate through each candle
            for i in range(1, len(df)):
                current_time = df.index[i]
                current_price = df['Close'].iloc[i]
                
                # Check open positions for exits
                for position in open_positions[:]:
                    # Check stop loss
                    if (position.position_type == 'long' and current_price <= position.stop_loss) or \
                       (position.position_type == 'short' and current_price >= position.stop_loss):
                        position.close_position(current_price, current_time, 'stop_loss')
                        open_positions.remove(position)
                        result.positions.append(position)
                        balance += position.pnl
                        continue
                    
                    # Check take profit
                    if (position.position_type == 'long' and current_price >= position.target_price) or \
                       (position.position_type == 'short' and current_price <= position.target_price):
                        position.close_position(current_price, current_time, 'take_profit')
                        open_positions.remove(position)
                        result.positions.append(position)
                        balance += position.pnl
                        continue
                
                # Skip if max positions reached
                if len(open_positions) >= self.max_positions:
                    continue
                
                # Get analysis for current candle
                analysis = await self.ai_trader.analyze_market(df.iloc[:i+1])
                
                # Check for entry signals
                if analysis['confidence'] >= 0.7:  # High confidence threshold
                    position_type = 'long' if analysis['trend'] == 'BULLISH' else 'short'
                    
                    # Calculate position size
                    risk_amount = balance * self.position_size
                    price_diff = abs(current_price - analysis['stop_loss'])
                    position_size = risk_amount / price_diff if price_diff > 0 else 0
                    
                    if position_size > 0:
                        # Open new position
                        position = Position(
                            symbol=symbol,
                            entry_price=current_price,
                            stop_loss=analysis['stop_loss'],
                            target_price=analysis['target_price'],
                            size=position_size,
                            entry_time=current_time,
                            position_type=position_type
                        )
                        open_positions.append(position)
            
            # Close any remaining positions at the last price
            last_time = df.index[-1]
            last_price = df['Close'].iloc[-1]
            for position in open_positions:
                position.close_position(last_price, last_time, 'end_of_test')
                result.positions.append(position)
                balance += position.pnl
            
            # Calculate final metrics
            result.calculate_metrics()
            return result
            
        except Exception as e:
            logger.error(f"Error in backtest: {str(e)}")
            raise

    def generate_report(self, result: BacktestResult) -> Dict:
        """Generate detailed backtest report"""
        try:
            avg_duration = np.mean([
                d.total_seconds() / 3600  # Convert to hours
                for d in result.trade_durations
            ]) if result.trade_durations else 0
            
            return {
                'summary': {
                    'total_trades': result.total_trades,
                    'winning_trades': result.winning_trades,
                    'losing_trades': result.losing_trades,
                    'win_rate': round(result.win_rate, 2),
                    'profit_factor': round(result.profit_factor, 2),
                    'total_pnl': round(result.total_pnl, 2),
                    'max_drawdown': round(result.max_drawdown, 2),
                    'avg_win': round(result.avg_win, 2),
                    'avg_loss': round(result.avg_loss, 2),
                    'largest_win': round(result.largest_win, 2),
                    'largest_loss': round(result.largest_loss, 2),
                    'avg_trade_duration_hours': round(avg_duration, 2)
                },
                'trades': [
                    {
                        'entry_time': p.entry_time.isoformat(),
                        'exit_time': p.exit_time.isoformat() if p.exit_time else None,
                        'symbol': p.symbol,
                        'type': p.position_type,
                        'entry_price': round(p.entry_price, 5),
                        'exit_price': round(p.exit_price, 5) if p.exit_price else None,
                        'stop_loss': round(p.stop_loss, 5),
                        'target_price': round(p.target_price, 5),
                        'pnl': round(p.pnl, 2),
                        'exit_reason': p.exit_reason
                    }
                    for p in result.positions
                ],
                'equity_curve': result.equity_curve,
                'drawdown_curve': result.drawdown_curve
            }
            
        except Exception as e:
            logger.error(f"Error generating report: {str(e)}")
            raise

# Global backtester instance
backtester = Backtester()
