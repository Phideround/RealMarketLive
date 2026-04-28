# RealMarketLive 📊

**Real-time market intelligence terminal** — A professional, information-dense dashboard for monitoring live market data.

> ⚠️ **This is NOT a trading platform.** RealMarketLive is purely an informational tool for market monitoring. No buy/sell execution, no portfolio management, no broker integrations.

## 🎯 Overview

RealMarketLive is a terminal-style market intelligence dashboard built with Next.js 14, designed for traders, analysts, and market enthusiasts who need real-time data visualization without trading execution capabilities.

### Key Features

✅ **Real-time Market Data**
- Live WebSocket price feeds
- Multi-timeframe candlestick charts
- Tick-by-tick transaction stream

✅ **Market Intelligence**
- Automated signal generation (informational only)
- Volatility and spread analysis
- Session high/low tracking
- VWAP calculations

✅ **Professional Interface**
- Terminal/cyberpunk aesthetic
- Bloomberg Terminal-style density
- 4-panel layout (no scrolling)
- Keyboard shortcuts for power users
- Neon color scheme (green/red/yellow)

✅ **System Monitoring**
- WebSocket connection status
- Real-time latency tracking
- API health indicator
- Comprehensive system logs

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       HEADER                                │
│  Title | WS Status | Latency | Server Time | API Health    │
├──────────────┬─────────────────────────┬────────────────────┤
│              │                         │                    │
│   Symbol     │    Live Chart          │    Tick Stream    │
│   Matrix     │  (Candlesticks)        │   (Terminal Feed) │
│              │                         │                    │
│              │  - M1, M5, M15, H1,    │  [HH:MM:SS] SYM ↑ │
│              │    H4, D1 timeframes   │  [HH:MM:SS] SYM ↓ │
│              │  - OHLC data          │  (Auto-scroll)     │
│              │  - Volume bars        │                    │
│              │  - VWAP overlay       │                    │
│              │  - Session range      │                    │
├──────────────┴─────────────────────────┴────────────────────┤
│                    BOTTOM PANEL (Tabbed)                     │
│  ◉ Signals  | ▪ Logs  | ◆ Stats                            │
│                                                              │
│  • Signal Direction (BUY/SELL/NEUTRAL)                      │
│  • Confidence Scores                                        │
│  • System Logs (WS, reconnect, health)                     │
│  • Market Stats (spread, volatility, tick rate)            │
└──────────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router) + React 19
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **Real-time**: WebSocket (native)
- **Charts**: Canvas (custom implementation)
- **Fonts**: JetBrains Mono

## 📦 Installation

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

1. **Clone or extract the project**

```bash
cd realmarketlive
```

2. **Install dependencies**

```bash
npm install
```

3. **Configure API credentials**

Copy `.env.example` to `.env.local` and add your API key:

```bash
cp .env.example .env.local
```

Then edit `.env.local`:

```env
NEXT_PUBLIC_API_KEY=your-realmarketapi-key-here
NEXT_PUBLIC_API_URL=https://api.realmarketapi.com
NEXT_PUBLIC_WS_URL=wss://api.realmarketapi.com
```

### Running the Application

**Development Mode:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

**Production Build:**

```bash
npm run build
npm start
```

**Linting:**

```bash
npm run lint
```

## 🎮 Usage

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| **1-6** | Switch timeframe (M1, M5, M15, H1, H4, D1) |
| **S** | Cycle to next symbol |
| **L** | Jump to Logs tab |
| **T** | Jump to Stats tab |
| **G** | Jump to Signals tab |

### Panel Navigation

- **Left Panel**: Click symbol to focus on it; heat glow indicates recent price movement
- **Center Panel**: Candlestick chart with overlays (VWAP, session high/low)
- **Right Panel**: Auto-scrolling tick feed with real-time updates
- **Bottom Panel**: Three tabbed sections (Signals, Logs, Stats)

### Interface Elements

**Header Row**
- Title with live indicator
- WebSocket status (◆ LIVE / ◇ DISCONNECTED)
- Network latency in milliseconds
- UTC server time
- API health status (● = ok, ◐ = degraded, ○ = error)

**Signal Panel**
- Current symbol signal (BUY/SELL/NEUTRAL with confidence %)
- All active signals across symbols
- Reasoning for each signal
- **Note**: Signals are informational—not trading recommendations

**System Logs**
- WebSocket connection events
- Reconnection attempts
- API health checks
- Error messages
- Clear button to reset history

**Market Stats**
- Spread tracker
- Average volatility
- Momentum (5-period)
- Volatility spikes count
- Session high/low
- Tick rate (ticks/second)
- Top volatility symbols

## 📡 Data Integration

### WebSocket Feeds

**Price Feed** (`/price`)
```javascript
{
  "SymbolCode": "XAUUSD",
  "OpenPrice": 5168.43,
  "ClosePrice": 5174.00,
  "HighPrice": 5176.85,
  "LowPrice": 5165.20,
  "Bid": 5173.75,
  "Ask": 5174.25,
  "Volume": 1249.33,
  "OpenTime": "2026-03-11T09:20:00Z"
}
```

**Candles Feed** (`/candles`)
```javascript
[
  {
    "SymbolCode": "XAUUSD",
    "OpenPrice": 5174.00,
    "ClosePrice": 5176.00,
    "HighPrice": 5178.50,
    "LowPrice": 5173.20,
    "Volume": 1312.10,
    "OpenTime": "2026-03-11T09:21:00Z"
  },
  // ... up to 100 candles (newest first)
]
```

### REST Endpoints

**Symbol List** (`GET /api/v1/symbol`)
```javascript
{
  "Symbols": ["XAUUSD", "EURUSD", "GBPUSD", "BTCUSD", "ETHUSD", ...]
}
```

**Health Check** (`GET /api/v1/health`)
```javascript
{
  "status": "ok",
  "timestamp": "2026-03-08T09:25:00Z"
}
```

### Connection Features

- ✅ **Auto-reconnect**: Exponential backoff (up to 10 attempts)
- ✅ **Heartbeat**: 30-second ping to detect stale connections
- ✅ **Data buffering**: Prevents UI lag with smart throttling
- ✅ **Latency tracking**: Real-time network metrics

## 🧠 Signal Generation

Signals are generated based on:

1. **Candle Patterns**: Open/close positioning, body size
2. **Momentum Analysis**: Multi-candle trend confirmation
3. **Volatility Adjustment**: Higher confidence on volatile moves
4. **Confidence Scoring**: 0-100% based on multiple factors

> ⚠️ **DISCLAIMER**: Signals are informational tools only. They do NOT constitute financial advice. Always conduct independent research before any decisions.

## 📊 State Management (Zustand)

The app uses four main stores:

### `market.ts`
- Current symbol & timeframe
- Price data by symbol
- Candle history
- Available symbols
- Tick history (up to 200 ticks)

### `connection.ts`
- WebSocket connection status
- Latency metrics
- Server time
- API health status
- System logs (up to 100)
- Tick frequency calculation

### `signals.ts`
- Current signals by symbol
- Signal history (up to 50)
- Signal confidence & direction

### `ui.ts`
- Active bottom panel tab
- Heat intensity effects (for flash glow)
- Keyboard shortcuts enabled flag

## 🎨 Design Philosophy

**Terminal Aesthetic**
- Dark background (#0a0a0a)
- Green text for positive direction (#00ff00)
- Red text for negative direction (#ff0000)
- Yellow for neutral/system messages (#ffff00)
- Monospace font (JetBrains Mono)

**Information Density**
- Four-panel layout optimized for 1920x1080 (responsive to smaller screens)
- No unnecessary padding or whitespace
- Quick-scan formatting
- Keyboard-first interaction

**Performance**
- Canvas rendering for charts (lightweight)
- Optimized re-renders with React 19
- Debounced WebSocket updates
- Efficient Zustand store subscriptions

## 🚀 Future Extensions

Designed for easy expansion:

- 📰 **News Feed**: Macro events, market news aggregation
- 🔗 **Correlation Matrix**: Symbol relationships (XAUUSD vs BTCUSD vs DXY)
- 📊 **Technical Indicators**: RSI, MACD, Bollinger Bands (read-only)
- 🔔 **Alerts**: Price levels, volatility spikes, anomalies
- 🤖 **AI Insights**: Trend summaries, anomaly detection
- 🧪 **Strategy Tester**: Visual backtesting (no execution)
- 🌍 **Multi-Market**: Add support for stocks, crypto, forex, commodities
- 📈 **Portfolio Tracking**: Multi-symbol performance comparison

## 📝 Project Structure

```
realmarketlive/
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Root layout
│   │   ├── page.tsx            # Home page
│   │   └── globals.css         # Global styles
│   │
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── SymbolMatrix.tsx
│   │   ├── LiveChart.tsx
│   │   ├── TickStream.tsx
│   │   ├── SignalPanel.tsx
│   │   ├── SystemLogPanel.tsx
│   │   ├── MarketStatsPanel.tsx
│   │   ├── BottomPanel.tsx
│   │   └── TerminalLayout.tsx
│   │
│   ├── store/
│   │   ├── market.ts           # Market data store
│   │   ├── connection.ts       # Connection status store
│   │   ├── signals.ts          # Signals store
│   │   └── ui.ts               # UI state store
│   │
│   ├── lib/
│   │   ├── api.ts              # API utilities & endpoints
│   │   └── signals.ts          # Signal detection logic
│   │
│   └── hooks/
│       ├── useWebSocket.ts     # WebSocket connection hook
│       └── useInitializeMarket.ts # Market initialization
│
├── public/                      # Static assets
├── .env.example                # Environment template
├── .gitignore
├── .eslintrc.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

## ⚖️ Compliance & Legal

**Disclaimers**

- This product is **NOT a trading platform** and does not support order execution
- Signals and analytics are **informational only** and not financial advice
- Always conduct independent research before making financial decisions
- Market data is provided as-is; verify accuracy before reliance
- The developer assumes no liability for market losses or data inaccuracies

## 🤝 Contributing

This is a foundation project. Feel free to extend it:

- Add new indicators
- Integrate additional data sources
- Enhance charting capabilities
- Improve signal algorithms
- Add localization support

## 📄 License

This project is provided as-is for educational and professional use.

---

**Status**: Active Development | **Last Updated**: April 2026 | **Version**: 0.1.0
