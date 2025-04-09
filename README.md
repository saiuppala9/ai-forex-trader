# AI Forex Trading System

An advanced AI-powered Forex trading platform with real-time market analysis and intelligent trade recommendations.

## Features

- Secure user authentication system
- Interactive TradingView charts integration
- Real-time market data and live trading
- AI-powered trade analysis and recommendations
- Custom watchlist for Forex pairs, commodities, and stocks
- Live news feed for selected instruments
- Economic calendar and events tracking
- Multi-timeframe analysis
- Real-time support and resistance levels
- Automated entry, target, and stop-loss recommendations

## Tech Stack

### Frontend
- React.js
- TradingView Charting Library
- Material-UI
- Redux for state management
- WebSocket for real-time updates

### Backend
- Python FastAPI
- SQLite database for storage
- JWT authentication
- WebSockets for real-time price updates
- TensorFlow for AI analysis

## Current Implementation

- Real-time market search with TradingView API
- Dynamic chart rendering with TradingView widget integration
- Watchlist management with localStorage persistence
- Comprehensive symbol search across forex, stocks, crypto, commodities
- Responsive dark-themed UI built with Material-UI
- Python backend with SQLite database
- REST API for market data and analysis

## Getting Started

### Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at [http://localhost:3000](http://localhost:3000)

### Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create a virtual environment (optional but recommended):
```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Start the backend server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

The backend API will be available at [http://localhost:8000](http://localhost:8000)
The API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs)

## API Integration
- Market Data: TradingView API
- News Feed: Financial News API
- AI Model: Custom TensorFlow model with external API integration

## Security
- JWT-based authentication
- Rate limiting
- Data encryption
- Secure WebSocket connections

## License

MIT
