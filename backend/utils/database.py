import sqlite3
from typing import Dict, List, Optional, Any
import json
import logging
from datetime import datetime
import asyncio
from contextlib import asynccontextmanager

logger = logging.getLogger(__name__)

class Database:
    def __init__(self, db_path: str = "forex_trader.db"):
        self.db_path = db_path
        self.lock = asyncio.Lock()
        self._init_db()

    def _init_db(self):
        """Initialize database tables"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.cursor()

                # Users table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    email TEXT UNIQUE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    last_login TIMESTAMP
                )
                """)

                # User settings table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_settings (
                    user_id INTEGER PRIMARY KEY,
                    settings TEXT NOT NULL,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
                """)

                # Watchlists table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS watchlists (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    name TEXT NOT NULL,
                    symbols TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id),
                    UNIQUE(user_id, name)
                )
                """)

                # Trading history table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS trading_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    symbol TEXT NOT NULL,
                    position_type TEXT NOT NULL,
                    entry_price REAL NOT NULL,
                    exit_price REAL,
                    size REAL NOT NULL,
                    pnl REAL,
                    entry_time TIMESTAMP NOT NULL,
                    exit_time TIMESTAMP,
                    status TEXT NOT NULL,
                    strategy TEXT,
                    notes TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
                """)

                # User preferences table
                cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_preferences (
                    user_id INTEGER PRIMARY KEY,
                    chart_preferences TEXT,
                    trading_preferences TEXT,
                    notification_settings TEXT,
                    ui_settings TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
                """)

                conn.commit()

        except Exception as e:
            logger.error(f"Error initializing database: {str(e)}")
            raise

    @asynccontextmanager
    async def get_connection(self):
        """Get database connection with async lock"""
        async with self.lock:
            conn = sqlite3.connect(self.db_path)
            try:
                yield conn
                conn.commit()
            except Exception as e:
                conn.rollback()
                raise
            finally:
                conn.close()

    async def save_user_settings(
        self,
        user_id: int,
        settings: Dict[str, Any]
    ) -> bool:
        """Save user settings"""
        try:
            async with self.get_connection() as conn:
                cursor = conn.cursor()
                settings_json = json.dumps(settings)
                
                cursor.execute("""
                INSERT INTO user_settings (user_id, settings, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    settings = excluded.settings,
                    updated_at = CURRENT_TIMESTAMP
                """, (user_id, settings_json))
                
                return True
                
        except Exception as e:
            logger.error(f"Error saving user settings: {str(e)}")
            return False

    async def get_user_settings(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user settings"""
        try:
            async with self.get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute(
                    "SELECT settings FROM user_settings WHERE user_id = ?",
                    (user_id,)
                )
                
                result = cursor.fetchone()
                return json.loads(result[0]) if result else None
                
        except Exception as e:
            logger.error(f"Error getting user settings: {str(e)}")
            return None

    async def save_watchlist(
        self,
        user_id: int,
        name: str,
        symbols: List[str]
    ) -> bool:
        """Save watchlist"""
        try:
            async with self.get_connection() as conn:
                cursor = conn.cursor()
                symbols_json = json.dumps(symbols)
                
                cursor.execute("""
                INSERT INTO watchlists (user_id, name, symbols, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, name) DO UPDATE SET
                    symbols = excluded.symbols,
                    updated_at = CURRENT_TIMESTAMP
                """, (user_id, name, symbols_json))
                
                return True
                
        except Exception as e:
            logger.error(f"Error saving watchlist: {str(e)}")
            return False

    async def get_watchlists(self, user_id: int) -> List[Dict[str, Any]]:
        """Get all watchlists for a user"""
        try:
            async with self.get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                SELECT name, symbols, created_at, updated_at
                FROM watchlists
                WHERE user_id = ?
                ORDER BY name
                """, (user_id,))
                
                watchlists = []
                for row in cursor.fetchall():
                    watchlists.append({
                        'name': row[0],
                        'symbols': json.loads(row[1]),
                        'created_at': row[2],
                        'updated_at': row[3]
                    })
                
                return watchlists
                
        except Exception as e:
            logger.error(f"Error getting watchlists: {str(e)}")
            return []

    async def save_trade(
        self,
        user_id: int,
        trade_data: Dict[str, Any]
    ) -> bool:
        """Save trade to history"""
        try:
            async with self.get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                INSERT INTO trading_history (
                    user_id, symbol, position_type, entry_price,
                    exit_price, size, pnl, entry_time, exit_time,
                    status, strategy, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id,
                    trade_data['symbol'],
                    trade_data['position_type'],
                    trade_data['entry_price'],
                    trade_data.get('exit_price'),
                    trade_data['size'],
                    trade_data.get('pnl'),
                    trade_data['entry_time'],
                    trade_data.get('exit_time'),
                    trade_data['status'],
                    trade_data.get('strategy'),
                    trade_data.get('notes')
                ))
                
                return True
                
        except Exception as e:
            logger.error(f"Error saving trade: {str(e)}")
            return False

    async def get_trading_history(
        self,
        user_id: int,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        symbol: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get trading history with filters"""
        try:
            async with self.get_connection() as conn:
                cursor = conn.cursor()
                
                query = "SELECT * FROM trading_history WHERE user_id = ?"
                params = [user_id]
                
                if start_date:
                    query += " AND entry_time >= ?"
                    params.append(start_date.isoformat())
                
                if end_date:
                    query += " AND entry_time <= ?"
                    params.append(end_date.isoformat())
                
                if symbol:
                    query += " AND symbol = ?"
                    params.append(symbol)
                
                query += " ORDER BY entry_time DESC LIMIT ?"
                params.append(limit)
                
                cursor.execute(query, params)
                
                columns = [description[0] for description in cursor.description]
                trades = []
                
                for row in cursor.fetchall():
                    trades.append(dict(zip(columns, row)))
                
                return trades
                
        except Exception as e:
            logger.error(f"Error getting trading history: {str(e)}")
            return []

    async def save_preferences(
        self,
        user_id: int,
        preferences: Dict[str, Any]
    ) -> bool:
        """Save user preferences"""
        try:
            async with self.get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                INSERT INTO user_preferences (
                    user_id,
                    chart_preferences,
                    trading_preferences,
                    notification_settings,
                    ui_settings,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id) DO UPDATE SET
                    chart_preferences = excluded.chart_preferences,
                    trading_preferences = excluded.trading_preferences,
                    notification_settings = excluded.notification_settings,
                    ui_settings = excluded.ui_settings,
                    updated_at = CURRENT_TIMESTAMP
                """, (
                    user_id,
                    json.dumps(preferences.get('chart_preferences', {})),
                    json.dumps(preferences.get('trading_preferences', {})),
                    json.dumps(preferences.get('notification_settings', {})),
                    json.dumps(preferences.get('ui_settings', {}))
                ))
                
                return True
                
        except Exception as e:
            logger.error(f"Error saving preferences: {str(e)}")
            return False

    async def get_preferences(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user preferences"""
        try:
            async with self.get_connection() as conn:
                cursor = conn.cursor()
                
                cursor.execute("""
                SELECT
                    chart_preferences,
                    trading_preferences,
                    notification_settings,
                    ui_settings,
                    updated_at
                FROM user_preferences
                WHERE user_id = ?
                """, (user_id,))
                
                row = cursor.fetchone()
                if not row:
                    return None
                
                return {
                    'chart_preferences': json.loads(row[0]) if row[0] else {},
                    'trading_preferences': json.loads(row[1]) if row[1] else {},
                    'notification_settings': json.loads(row[2]) if row[2] else {},
                    'ui_settings': json.loads(row[3]) if row[3] else {},
                    'updated_at': row[4]
                }
                
        except Exception as e:
            logger.error(f"Error getting preferences: {str(e)}")
            return None

# Global database instance
db = Database()
