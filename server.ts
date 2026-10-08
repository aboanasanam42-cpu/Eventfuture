import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { TradingEngine } from './src/bot/trading-engine';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

// Initialize Trading Engine
const engine = new TradingEngine({
  symbol: process.env.SYMBOL || 'BTCUSDT',
  tradeAmount: parseFloat(process.env.TRADE_AMOUNT_USDT || '3.0'),
  cycleMinutes: parseInt(process.env.CYCLE_DURATION_MINUTES || '10', 10),
  maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS_USDT || '9.0'),
  maxConsecutiveLosses: parseInt(process.env.MAX_CONSECUTIVE_LOSSES || '3', 10),
  tradingMode: (process.env.TRADING_MODE || 'simulation') as 'simulation' | 'live',
  mexcApiKey: process.env.MEXC_API_KEY || '',
  mexcApiSecret: process.env.MEXC_SECRET_KEY || process.env.MEXC_API_SECRET || '',
  autoTrade: true,
});

// Start trading background worker loop
engine.start();

// API Endpoints
app.get('/api/status', (_req: Request, res: Response) => {
  res.json(engine.getStatus());
});

app.get('/api/market', (_req: Request, res: Response) => {
  const status = engine.getStatus();
  const candles = engine.getCandles();
  res.json({
    symbol: status.symbol,
    currentPrice: status.currentPrice,
    indexPrice: status.indexPrice,
    indicators: status.indicators,
    candles,
  });
});

app.get('/api/trades', (_req: Request, res: Response) => {
  res.json(engine.getTrades());
});

app.get('/api/logs', (_req: Request, res: Response) => {
  res.json(engine.getLogs());
});

app.post('/api/config', (req: Request, res: Response) => {
  const { tradeAmount, cycleMinutes, maxDailyLoss, maxConsecutiveLosses, tradingMode, autoTrade } = req.body;
  engine.updateConfig({
    ...(tradeAmount !== undefined && { tradeAmount: Number(tradeAmount) }),
    ...(cycleMinutes !== undefined && { cycleMinutes: Number(cycleMinutes) }),
    ...(maxDailyLoss !== undefined && { maxDailyLoss: Number(maxDailyLoss) }),
    ...(maxConsecutiveLosses !== undefined && { maxConsecutiveLosses: Number(maxConsecutiveLosses) }),
    ...(tradingMode !== undefined && { tradingMode }),
    ...(autoTrade !== undefined && { autoTrade: Boolean(autoTrade) }),
  });
  res.json({ success: true, config: engine.getConfig() });
});

app.post('/api/credentials', async (req: Request, res: Response) => {
  const { mexcApiKey, mexcApiSecret } = req.body;
  engine.updateConfig({ mexcApiKey, mexcApiSecret });
  const testRes = await engine.getClient().testConnection();
  res.json({
    success: testRes.success,
    message: testRes.message,
    balance: testRes.balance,
  });
});

app.post('/api/reset-risk', (_req: Request, res: Response) => {
  engine.resetRiskState();
  res.json({ success: true, message: 'Risk controller & circuit breaker have been reset.' });
});

app.post('/api/manual-trade', async (req: Request, res: Response) => {
  const { direction } = req.body;
  if (direction !== 'UP' && direction !== 'DOWN') {
    return res.status(400).json({ error: 'Direction must be UP or DOWN' });
  }
  const trade = await engine.executeCycleTrade(direction, true);
  if (!trade) {
    return res.status(400).json({ error: 'Trade could not be executed. Check circuit breaker or active trade.' });
  }
  res.json({ success: true, trade });
});

app.get('/api/download-archive', (_req: Request, res: Response) => {
  const archivePath = path.resolve(__dirname, 'mexc-event-trading-bot.tar.gz');
  res.download(archivePath, 'mexc-event-trading-bot.tar.gz');
});

app.get('/api/deployment-info', (_req: Request, res: Response) => {
  res.json({
    gitCommands: [
      'git add .',
      'git commit -m "Deploy MEXC Event Futures 10m Trading Bot to Railway"',
      'git branch -M main',
      '# Add your GitHub repository:',
      'git remote add origin https://github.com/YOUR_USERNAME/mexc-event-trading-bot.git',
      'git push -u origin main',
    ],
    railwayEnvVars: [
      { key: 'MEXC_API_KEY', desc: 'Your MEXC API Key (from MEXC API Management)' },
      { key: 'MEXC_API_SECRET', desc: 'Your MEXC API Secret Key' },
      { key: 'SYMBOL', desc: 'Trading Pair (default: BTCUSDT)' },
      { key: 'TRADE_AMOUNT_USDT', desc: 'Position size per trade (default: 3.0)' },
      { key: 'CYCLE_DURATION_MINUTES', desc: 'Expiry interval in minutes (default: 10)' },
      { key: 'TIMEFRAME_INDICATOR', desc: 'Candlestick indicator timeframe (default: 15m)' },
      { key: 'MAX_DAILY_LOSS_USDT', desc: 'Maximum daily loss limit before stopping (default: 9.0)' },
      { key: 'MAX_CONSECUTIVE_LOSSES', desc: 'Consecutive loss streak halt trigger (default: 3)' },
      { key: 'TRADING_MODE', desc: 'Trading mode: "simulation" or "live"' },
    ],
  });
});

// Vite middleware in dev or static files in production
async function setupViteOrStatic() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT} [mode: ${isProduction ? 'production' : 'development'}]`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Failed to start server:', err);
});
