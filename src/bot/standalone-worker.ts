import dotenv from 'dotenv';
dotenv.config();

import { TradingEngine } from './trading-engine';

console.log('====================================================');
console.log(' MEXC EVENT FUTURES 10-MINUTE QUANTITATIVE WORKER   ');
console.log(' Symbol: BTCUSDT | Timeframe: 15m RSI + Bollinger   ');
console.log(' Platform Target: Railway / Linux Worker 24/7       ');
console.log('====================================================');

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

engine.start();

// Pretty CLI status print every 15 seconds
setInterval(() => {
  const status = engine.getStatus();
  const ind = status.indicators;
  const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

  console.log(`\n[${now}] === MEXC Worker Heartbeat ===`);
  console.log(`BTC/USDT Price: $${status.currentPrice.toFixed(2)} | Mode: ${status.tradingMode.toUpperCase()}`);
  if (ind) {
    console.log(`Indicators: RSI(14)=${ind.rsi} | BB Lower=$${ind.bollinger.lower.toFixed(1)} Upper=$${ind.bollinger.upper.toFixed(1)} | %b=${(ind.bollinger.percentB * 100).toFixed(1)}%`);
    console.log(`Signal: [${ind.signal} (${ind.signalArabic})] Conf: ${ind.confidence}% | ${ind.rationale}`);
  }
  console.log(`Cycle: ${Math.floor(status.cycleSecondsRemaining / 60)}m ${status.cycleSecondsRemaining % 60}s remaining until next 10m interval`);
  console.log(`Risk: Daily PnL: $${status.dailyPnl} | Consec Losses: ${status.consecutiveLosses}/${3} | Halted: ${status.isEmergencyHalted ? 'YES (' + status.haltReason + ')' : 'NO'}`);
  if (status.activeContract) {
    console.log(`ACTIVE 10m CONTRACT: [${status.activeContract.id}] ${status.activeContract.direction} @ $${status.activeContract.entryPrice.toFixed(2)} -> Closes in ${Math.round((status.activeContract.expiryTime - Date.now()) / 1000)}s`);
  }
}, 15000);

// Graceful shutdown
const shutdown = (signal: string) => {
  console.log(`\nReceived ${signal}. Gracefully stopping MEXC worker...`);
  engine.stop();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
