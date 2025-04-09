import pandas as pd
import numpy as np
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging
from scipy import stats
from dataclasses import dataclass
import json

logger = logging.getLogger(__name__)

@dataclass
class Trade:
    entry_time: datetime
    exit_time: datetime
    symbol: str
    position_type: str
    entry_price: float
    exit_price: float
    pnl: float
    size: float
    stop_loss: float
    target_price: float
    exit_reason: str

class PerformanceAnalytics:
    def __init__(self):
        self.trades_df = None
        self.daily_stats = None
        self.monthly_stats = None

    def load_trades(self, trades: List[Dict]) -> None:
        """Load trades into analytics engine"""
        try:
            # Convert trades to Trade objects
            trade_objects = []
            for t in trades:
                trade_objects.append(Trade(
                    entry_time=datetime.fromisoformat(t['entry_time']),
                    exit_time=datetime.fromisoformat(t['exit_time']) if t['exit_time'] else None,
                    symbol=t['symbol'],
                    position_type=t['type'],
                    entry_price=float(t['entry_price']),
                    exit_price=float(t['exit_price']) if t['exit_price'] else None,
                    pnl=float(t['pnl']),
                    size=float(t.get('size', 0)),
                    stop_loss=float(t['stop_loss']),
                    target_price=float(t['target_price']),
                    exit_reason=t['exit_reason']
                ))

            # Convert to DataFrame
            self.trades_df = pd.DataFrame([vars(t) for t in trade_objects])
            
            if not self.trades_df.empty:
                # Convert times to datetime
                self.trades_df['entry_time'] = pd.to_datetime(self.trades_df['entry_time'])
                self.trades_df['exit_time'] = pd.to_datetime(self.trades_df['exit_time'])
                
                # Add derived columns
                self.trades_df['duration'] = (
                    self.trades_df['exit_time'] - self.trades_df['entry_time']
                ).dt.total_seconds() / 3600  # Convert to hours
                
                self.trades_df['risk_reward'] = np.where(
                    self.trades_df['position_type'] == 'long',
                    (self.trades_df['target_price'] - self.trades_df['entry_price']) /
                    (self.trades_df['entry_price'] - self.trades_df['stop_loss']),
                    (self.trades_df['entry_price'] - self.trades_df['target_price']) /
                    (self.trades_df['stop_loss'] - self.trades_df['entry_price'])
                )
                
                # Calculate daily and monthly stats
                self._calculate_time_based_stats()
        
        except Exception as e:
            logger.error(f"Error loading trades: {str(e)}")
            raise

    def _calculate_time_based_stats(self) -> None:
        """Calculate daily and monthly statistics"""
        try:
            # Daily stats
            daily_trades = self.trades_df.set_index('exit_time').resample('D')
            self.daily_stats = pd.DataFrame({
                'pnl': daily_trades['pnl'].sum(),
                'trades': daily_trades['pnl'].count(),
                'win_rate': daily_trades.apply(
                    lambda x: (x['pnl'] > 0).mean() * 100 if len(x) > 0 else 0
                )
            }).fillna(0)

            # Monthly stats
            monthly_trades = self.trades_df.set_index('exit_time').resample('M')
            self.monthly_stats = pd.DataFrame({
                'pnl': monthly_trades['pnl'].sum(),
                'trades': monthly_trades['pnl'].count(),
                'win_rate': monthly_trades.apply(
                    lambda x: (x['pnl'] > 0).mean() * 100 if len(x) > 0 else 0
                )
            }).fillna(0)

        except Exception as e:
            logger.error(f"Error calculating time-based stats: {str(e)}")
            raise

    def get_overall_metrics(self) -> Dict:
        """Calculate overall performance metrics"""
        try:
            if self.trades_df is None or self.trades_df.empty:
                return {}

            total_trades = len(self.trades_df)
            winning_trades = (self.trades_df['pnl'] > 0).sum()
            losing_trades = (self.trades_df['pnl'] < 0).sum()

            # Calculate key metrics
            total_pnl = self.trades_df['pnl'].sum()
            win_rate = (winning_trades / total_trades * 100) if total_trades > 0 else 0
            
            # Profit Factor
            gross_profit = self.trades_df[self.trades_df['pnl'] > 0]['pnl'].sum()
            gross_loss = abs(self.trades_df[self.trades_df['pnl'] < 0]['pnl'].sum())
            profit_factor = gross_profit / gross_loss if gross_loss != 0 else float('inf')

            # Risk-adjusted return metrics
            returns = self.trades_df['pnl'].values
            if len(returns) > 1:
                sharpe_ratio = np.sqrt(252) * (np.mean(returns) / np.std(returns)) if np.std(returns) != 0 else 0
                sortino_ratio = np.sqrt(252) * (np.mean(returns) / np.std(returns[returns < 0])) if np.std(returns[returns < 0]) != 0 else 0
            else:
                sharpe_ratio = sortino_ratio = 0

            # Maximum drawdown
            cumulative = np.cumsum(returns)
            running_max = np.maximum.accumulate(cumulative)
            drawdown = running_max - cumulative
            max_drawdown = np.max(drawdown) if len(drawdown) > 0 else 0

            # Average trade metrics
            avg_winner = self.trades_df[self.trades_df['pnl'] > 0]['pnl'].mean() if winning_trades > 0 else 0
            avg_loser = self.trades_df[self.trades_df['pnl'] < 0]['pnl'].mean() if losing_trades > 0 else 0
            
            # Calculate trade duration statistics
            avg_duration = self.trades_df['duration'].mean()
            max_duration = self.trades_df['duration'].max()
            min_duration = self.trades_df['duration'].min()

            return {
                'summary': {
                    'total_trades': total_trades,
                    'winning_trades': int(winning_trades),
                    'losing_trades': int(losing_trades),
                    'win_rate': round(win_rate, 2),
                    'profit_factor': round(profit_factor, 2),
                    'total_pnl': round(total_pnl, 2),
                    'sharpe_ratio': round(sharpe_ratio, 2),
                    'sortino_ratio': round(sortino_ratio, 2),
                    'max_drawdown': round(max_drawdown, 2),
                    'avg_winner': round(avg_winner, 2),
                    'avg_loser': round(avg_loser, 2),
                    'avg_duration_hours': round(avg_duration, 2),
                    'max_duration_hours': round(max_duration, 2),
                    'min_duration_hours': round(min_duration, 2)
                },
                'time_analysis': {
                    'daily': self.daily_stats.to_dict(orient='index'),
                    'monthly': self.monthly_stats.to_dict(orient='index')
                }
            }

        except Exception as e:
            logger.error(f"Error calculating overall metrics: {str(e)}")
            raise

    def get_pattern_analysis(self) -> Dict:
        """Analyze trading patterns and behaviors"""
        try:
            if self.trades_df is None or self.trades_df.empty:
                return {}

            # Time-based patterns
            hour_performance = self.trades_df.groupby(
                self.trades_df['entry_time'].dt.hour
            )['pnl'].agg(['mean', 'count', 'sum'])

            day_performance = self.trades_df.groupby(
                self.trades_df['entry_time'].dt.day_name()
            )['pnl'].agg(['mean', 'count', 'sum'])

            # Position type analysis
            position_analysis = self.trades_df.groupby('position_type').agg({
                'pnl': ['count', 'mean', 'sum'],
                'duration': 'mean'
            }).round(2)

            # Exit reason analysis
            exit_analysis = self.trades_df.groupby('exit_reason').agg({
                'pnl': ['count', 'mean', 'sum']
            }).round(2)

            # Risk-reward analysis
            risk_reward_corr = stats.pearsonr(
                self.trades_df['risk_reward'],
                self.trades_df['pnl']
            )[0]

            # Duration analysis
            duration_corr = stats.pearsonr(
                self.trades_df['duration'],
                self.trades_df['pnl']
            )[0]

            return {
                'time_patterns': {
                    'hourly': hour_performance.to_dict(orient='index'),
                    'daily': day_performance.to_dict(orient='index')
                },
                'position_analysis': position_analysis.to_dict(orient='index'),
                'exit_analysis': exit_analysis.to_dict(orient='index'),
                'correlations': {
                    'risk_reward_pnl': round(risk_reward_corr, 2),
                    'duration_pnl': round(duration_corr, 2)
                }
            }

        except Exception as e:
            logger.error(f"Error in pattern analysis: {str(e)}")
            raise

    def get_risk_metrics(self) -> Dict:
        """Calculate risk-related metrics"""
        try:
            if self.trades_df is None or self.trades_df.empty:
                return {}

            # Calculate Value at Risk (VaR)
            returns = self.trades_df['pnl'].values
            var_95 = np.percentile(returns, 5)  # 95% VaR
            var_99 = np.percentile(returns, 1)  # 99% VaR

            # Calculate Expected Shortfall (CVaR)
            cvar_95 = returns[returns <= var_95].mean()
            cvar_99 = returns[returns <= var_99].mean()

            # Risk per trade metrics
            avg_risk_per_trade = abs(
                self.trades_df['entry_price'] - self.trades_df['stop_loss']
            ).mean()

            # Risk-reward ratio statistics
            rr_ratios = self.trades_df['risk_reward']
            
            return {
                'var_metrics': {
                    'var_95': round(var_95, 2),
                    'var_99': round(var_99, 2),
                    'cvar_95': round(cvar_95, 2),
                    'cvar_99': round(cvar_99, 2)
                },
                'risk_per_trade': round(avg_risk_per_trade, 5),
                'risk_reward_stats': {
                    'mean': round(rr_ratios.mean(), 2),
                    'median': round(rr_ratios.median(), 2),
                    'std': round(rr_ratios.std(), 2),
                    'min': round(rr_ratios.min(), 2),
                    'max': round(rr_ratios.max(), 2)
                }
            }

        except Exception as e:
            logger.error(f"Error calculating risk metrics: {str(e)}")
            raise

    def get_optimization_suggestions(self) -> Dict:
        """Generate strategy optimization suggestions"""
        try:
            if self.trades_df is None or self.trades_df.empty:
                return {}

            suggestions = []
            warnings = []

            # Analyze win rate
            win_rate = (self.trades_df['pnl'] > 0).mean() * 100
            if win_rate < 40:
                warnings.append("Low win rate suggests entry criteria may need refinement")
            
            # Analyze risk-reward
            avg_rr = self.trades_df['risk_reward'].mean()
            if avg_rr < 1.5:
                warnings.append("Risk-reward ratio is below recommended 1.5:1")
            
            # Analyze time patterns
            hour_performance = self.trades_df.groupby(
                self.trades_df['entry_time'].dt.hour
            )['pnl'].mean()
            
            best_hours = hour_performance[hour_performance > hour_performance.mean()]
            worst_hours = hour_performance[hour_performance < hour_performance.mean()]
            
            if not best_hours.empty:
                suggestions.append(
                    f"Consider focusing on trading during hours: {', '.join(map(str, best_hours.index))}"
                )
            
            if not worst_hours.empty:
                suggestions.append(
                    f"Consider avoiding trading during hours: {', '.join(map(str, worst_hours.index))}"
                )
            
            # Analyze position duration
            duration_corr = stats.pearsonr(
                self.trades_df['duration'],
                self.trades_df['pnl']
            )[0]
            
            if abs(duration_corr) > 0.3:
                if duration_corr > 0:
                    suggestions.append(
                        "Consider holding profitable trades longer as there's a positive correlation with duration"
                    )
                else:
                    suggestions.append(
                        "Consider tightening stops as longer trades tend to be less profitable"
                    )
            
            # Analyze position types
            position_performance = self.trades_df.groupby('position_type')['pnl'].mean()
            if len(position_performance) > 1:
                better_side = position_performance.idxmax()
                if position_performance.max() > 2 * position_performance.min():
                    suggestions.append(
                        f"Strategy shows better performance on {better_side} positions"
                    )
            
            return {
                'suggestions': suggestions,
                'warnings': warnings
            }

        except Exception as e:
            logger.error(f"Error generating optimization suggestions: {str(e)}")
            raise

# Global analytics instance
performance_analytics = PerformanceAnalytics()
