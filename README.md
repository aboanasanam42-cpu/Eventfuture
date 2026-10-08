# MEXC Event Futures 10-Minute Quantitative Trading Bot
### بوت التداول الكمي الآلي لعقود الأحداث MEXC (العقود الآجلة للأحداث - دورة 10 دقائق)

Production-ready automated real-time trading system for **MEXC Event Futures (BTCUSDT)** executing on **10-minute expiry cycles** guided by **15-minute RSI & Bollinger Bands** quantitative indicators with automated risk management.

---

## 📊 Strategy Architecture (آلية العمل والاستراتيجية)

As documented in the official MEXC Event Futures framework:
1. **Underlying Asset & Interval:** BTC/USDT on 10-Minute expiry cycles.
2. **Analysis Timeframe:** 15-Minute Candlestick chart (`15m`).
3. **Quantitative Consensus:**
   - **RSI (14 Period):** Detects overbought ($RSI \ge 70$) for `DOWN (أقل)` reversal, and oversold ($RSI \le 30$) for `UP (أعلى)` bounce.
   - **Bollinger Bands (20, 2):** Detects band touches (%b $\le 0.15$ for Mean Reversion `UP`, and %b $\ge 0.85$ for Rejection `DOWN`).
4. **Order Execution:**
   - Fixed Position Stake: **3.00 USDT** per contract.
   - Fixed Return Ratio: **80% Payout** (Gross Return: **5.40 USDT**, Net Profit: **+2.40 USDT** on win, **-3.00 USDT** on loss).
5. **Strict Risk Management (إدارة رأس المال وحماية المحفظة):**
   - **Consecutive Loss Safety:** Stops trading immediately after **3 consecutive losses** (saving capital from revenge trading / "تجنب فخ الانتقام والتداول العاطفي").
   - **Max Daily Loss Limit:** Default **$9.00 USDT** per 24h trading day (resets at 00:00 UTC).

---

## 🚀 Quick Deployment to Railway & GitHub

### Step 1: Push to your GitHub Repository

Run these commands in your project terminal:

```bash
# 1. Initialize and stage all files
git add .
git commit -m "feat: complete MEXC 10m Event Futures trading bot with risk controller"

# 2. Set default branch to main
git branch -M main

# 3. Link your GitHub repository (replace with your repo URL)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/mexc-event-trading-bot.git

# 4. Push code to GitHub
git push -u origin main
```

---

### Step 2: Deploy on Railway (24/7 Cloud Background Worker)

1. Go to [Railway.app](https://railway.app/) and sign in with GitHub.
2. Click **+ New Project** -> **Deploy from GitHub repo**.
3. Select your repository `mexc-event-trading-bot`.
4. Railway will automatically detect `railway.json` / `Dockerfile` / `package.json`.
5. Under **Variables**, add your environment variables:

| Variable | Recommended Value | Description |
|---|---|---|
| `MEXC_API_KEY` | `your_mexc_key` | MEXC Contract API Key |
| `MEXC_API_SECRET` | `your_mexc_secret` | MEXC Contract API Secret |
| `SYMBOL` | `BTCUSDT` | Asset Symbol |
| `TRADE_AMOUNT_USDT` | `3.0` | Fixed Position Size in USDT |
| `CYCLE_DURATION_MINUTES` | `10` | Event Contract Expiry Duration |
| `TIMEFRAME_INDICATOR` | `15m` | Candlestick Indicator Timeframe |
| `MAX_DAILY_LOSS_USDT` | `9.0` | Daily Loss Limit Circuit Breaker |
| `MAX_CONSECUTIVE_LOSSES` | `3` | Maximum Consecutive Losses Allowed |
| `TRADING_MODE` | `simulation` or `live` | Simulation (Safe Paper) or Live |
| `PORT` | `3000` | Server HTTP Port |

Railway will automatically build, deploy, and keep the process running 24/7!

---

## 📁 Repository Structure

```
├── bot.py                     # Standalone Python 3 background worker
├── requirements.txt           # Python dependencies (requests, numpy, python-dotenv)
├── server.ts                  # Express full-stack API server & worker host
├── package.json               # Node.js dependencies & scripts
├── railway.json               # Railway deployment configuration
├── Dockerfile                 # Production multi-stage Docker container
├── Procfile                   # Process file (web / worker)
├── src/
│   ├── bot/
│   │   ├── indicators.ts      # Quantitative math (RSI, Bollinger Bands, signals)
│   │   ├── mexc-client.ts     # MEXC Contract & Spot REST API client with HMAC-SHA256
│   │   ├── trading-engine.ts  # 10m cycle controller, order state, risk engine
│   │   ├── standalone-worker.ts # Headless CLI background worker
│   │   └── types.ts           # TypeScript interfaces & domain types
│   ├── components/            # Real-time UI Dashboard & Terminal
│   ├── App.tsx                # Quantitative Trading Terminal
│   └── main.tsx
└── vite.config.ts
```

---

## 💻 Running Locally

### Option A: Node.js / TypeScript Full Terminal
```bash
npm install
npm run dev
# Terminal UI opens at http://localhost:3000
```

### Option B: Headless Background Worker (Node.js)
```bash
npm run worker
```

### Option C: Python Background Worker
```bash
pip install -r requirements.txt
python bot.py
```
