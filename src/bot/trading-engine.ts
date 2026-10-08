import {
  BotConfig,
  BotLog,
  BotStatus,
  Candle,
  ContractTrade,
  IndicatorAnalysis,
} from './types';
import { MexcClient, MexcTicker } from './mexc-client';
import { analyzeMarket } from './indicators';

export class TradingEngine {
  private config: BotConfig;
  private client: MexcClient;
  private logs: BotLog[] = [];
  private trades: ContractTrade[] = [];
  private candles: Candle[] = [];
  private currentTicker: MexcTicker | null = null;
  private currentIndicators: IndicatorAnalysis | null = null;
  private activeContract: ContractTrade | null = null;

  private isRunning = false;
  private timer: NodeJS.Timeout | null = null;
  private cycleTimer: NodeJS.Timeout | null = null;

  // Risk metrics
  private dailyPnl = 0;
  private consecutiveLosses = 0;
  private isEmergencyHalted = false;
  private haltReason = '';
  private lastResetDay = new Date().getUTCDate();
  private lastDataErrorLogAt = 0;

  constructor(initialConfig: Partial<BotConfig> = {}) {
    const requestedMode = String(initialConfig.tradingMode || process.env.TRADING_MODE || 'simulation').toLowerCase();
    this.config = {
      symbol: initialConfig.symbol || process.env.SYMBOL || 'BTCUSDT',
      tradeAmount: initialConfig.tradeAmount || parseFloat(process.env.TRADE_AMOUNT_USDT || '3.0'),
      cycleMinutes: initialConfig.cycleMinutes || parseInt(process.env.CYCLE_DURATION_MINUTES || '10', 10),
      timeframe: initialConfig.timeframe || process.env.TIMEFRAME_INDICATOR || '15m',
      maxDailyLoss: initialConfig.maxDailyLoss || parseFloat(process.env.MAX_DAILY_LOSS_USDT || '9.0'),
      maxConsecutiveLosses: initialConfig.maxConsecutiveLosses || parseInt(process.env.MAX_CONSECUTIVE_LOSSES || '3', 10),
      // This app models fixed-expiry Event Futures; MEXC's documented order API is for standard futures.
      // Keep the engine simulation-only until the exact event product is officially supported.
      tradingMode: 'simulation',
      mexcApiKey: initialConfig.mexcApiKey || process.env.MEXC_API_KEY || '',
      mexcApiSecret: initialConfig.mexcApiSecret || process.env.MEXC_SECRET_KEY || process.env.MEXC_API_SECRET || '',
      autoTrade: initialConfig.autoTrade ?? true,
    };

    this.client = new MexcClient(this.config.mexcApiKey, this.config.mexcApiSecret);
    this.addLog('SYSTEM', 'info', `Initialized MEXC Event Futures simulator for ${this.config.symbol} (${this.config.cycleMinutes}m cycles)`);
    if (requestedMode === 'live') {
      this.addLog('API', 'error', 'TRADING_MODE=live was blocked. This repository targets fixed-expiry event contracts, but only standard futures order endpoints are documented by MEXC. No real orders will be sent.');
    }
    this.addLog('RISK', 'info', `Risk Rules: Max consecutive losses = ${this.config.maxConsecutiveLosses}, Daily loss limit = ${this.config.maxDailyLoss}`);
  }

  public getClient(): MexcClient {
    return this.client;
  }

  public updateConfig(newConfig: Partial<BotConfig>) {
    const requestedLive = newConfig.tradingMode === 'live';
    const safeConfig = { ...newConfig, ...(requestedLive ? { tradingMode: 'simulation' as const } : {}) };
    this.config = { ...this.config, ...safeConfig, tradingMode: 'simulation' };
    if (newConfig.mexcApiKey !== undefined || newConfig.mexcApiSecret !== undefined) {
      this.client.setCredentials(this.config.mexcApiKey || '', this.config.mexcApiSecret || '');
    }
    if (requestedLive) {
      this.addLog('API', 'error', 'Live Event Futures mode is disabled because the event-order endpoint is not documented by MEXC. Continuing in simulation; no real order was sent.');
    }
    this.addLog('SYSTEM', 'info', `Bot configuration updated: Mode=${this.config.tradingMode}, AutoTrade=${this.config.autoTrade}, Stake=${this.config.tradeAmount}`);
  }

  public getConfig(): BotConfig {
    return { ...this.config };
  }

  public resetRiskState() {
    this.isEmergencyHalted = false;
    this.haltReason = '';
    this.consecutiveLosses = 0;
    this.dailyPnl = 0;
    this.addLog('RISK', 'success', 'Circuit breaker reset manually. Automated trading resumed.');
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.addLog('SYSTEM', 'success', `Trading engine started in ${this.config.tradingMode.toUpperCase()} mode.`);

    // Initial tick
    this.tick();

    // High frequency price & status update loop (every 3 seconds)
    this.timer = setInterval(() => {
      this.tick();
    }, 3000);

    // Precise 10-minute cycle monitor (checked every second)
    this.cycleTimer = setInterval(() => {
      this.evaluateCycleTick();
    }, 1000);
  }

  public stop() {
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    if (this.cycleTimer) clearInterval(this.cycleTimer);
    this.timer = null;
    this.cycleTimer = null;
    this.addLog('SYSTEM', 'warn', 'Trading engine paused.');
  }

  private addLog(category: BotLog['category'], level: BotLog['level'], message: string) {
    const log: BotLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      category,
      level,
      message,
    };
    this.logs.unshift(log);
    if (this.logs.length > 250) {
      this.logs.pop();
    }
    console.log(`[${log.timestamp}] [${category}] [${level.toUpperCase()}]: ${message}`);
  }

  /**
   * Main periodic update: fetches ticker, 15m candles, and updates indicators
   */
  private async tick() {
    // Check midnight UTC reset for daily PnL
    const currentDay = new Date().getUTCDate();
    if (currentDay !== this.lastResetDay) {
      this.lastResetDay = currentDay;
      this.dailyPnl = 0;
      this.consecutiveLosses = 0;
      if (this.isEmergencyHalted && this.haltReason.includes('Daily')) {
        this.isEmergencyHalted = false;
        this.haltReason = '';
        this.addLog('RISK', 'info', 'New UTC trading day reached. Daily PnL reset.');
      }
    }

    try {
      // 1. Fetch Ticker
      const ticker = await this.client.fetchTicker(this.config.symbol);
      this.currentTicker = ticker;

      // 2. Fetch 15m Candles
      const candles = await this.client.fetch15mCandles(this.config.symbol, 60);
      this.candles = candles;

      // 3. Analyze 15m Indicators
      const indicators = analyzeMarket(candles);
      this.currentIndicators = indicators;
    } catch (err: any) {
      // Never retain stale prices or candles when live market data cannot be fetched.
      this.currentTicker = null;
      this.currentIndicators = null;
      this.candles = [];
      const now = Date.now();
      if (now - this.lastDataErrorLogAt >= 30000) {
        const message = err instanceof Error ? err.message : String(err);
        this.addLog('API', 'error', `Live market data unavailable; new trades are paused. ${message}`);
        this.lastDataErrorLogAt = now;
      }
    }
  }

  /**
   * Precise 1-second evaluator for 10-minute cycle boundaries & settlements
   */
  private async evaluateCycleTick() {
    const now = Date.now();
    const cycleMs = this.config.cycleMinutes * 60 * 1000;
    const currentPrice = this.currentTicker?.lastPrice;
    if (!Number.isFinite(currentPrice) || currentPrice === undefined || currentPrice <= 0) {
      return; // Wait for a verified live ticker; never settle on a fabricated price.
    }

    // 1. Check active contract settlement
    if (this.activeContract && this.activeContract.status === 'OPEN') {
      if (now >= this.activeContract.expiryTime) {
        await this.settleActiveContract(currentPrice);
      }
    }

    // 2. Check 10-minute cycle trigger for next trade
    const secondsInCycle = Math.floor((now % cycleMs) / 1000);
    const cycleTotalSeconds = this.config.cycleMinutes * 60;
    const secondsRemaining = cycleTotalSeconds - secondsInCycle;

    // If no active contract, autoTrade enabled, not halted, and at the start of a cycle (first 5 seconds of the 10m window)
    if (
      this.isRunning &&
      this.config.autoTrade &&
      !this.activeContract &&
      !this.isEmergencyHalted &&
      secondsInCycle <= 5
    ) {
      if (this.currentIndicators && this.currentIndicators.signal !== 'NEUTRAL') {
        await this.executeCycleTrade(this.currentIndicators.signal);
      }
    }
  }

  /**
   * Execute a 10-minute cycle trade
   */
  public async executeCycleTrade(direction: 'UP' | 'DOWN', isManual = false): Promise<ContractTrade | null> {
    if (this.isEmergencyHalted) {
      this.addLog('RISK', 'error', `Trade rejected: Circuit breaker is ACTIVE (${this.haltReason})`);
      return null;
    }

    if (this.activeContract && this.activeContract.status === 'OPEN') {
      this.addLog('EXECUTION', 'warn', `Trade rejected: An existing 10m contract (${this.activeContract.id}) is already active.`);
      return null;
    }

    if (this.config.tradingMode !== 'simulation') {
      this.addLog('API', 'error', 'Live Event Futures execution is disabled. No order was sent.');
      return null;
    }
    const currentPrice = this.currentTicker?.lastPrice;
    if (!Number.isFinite(currentPrice) || currentPrice === undefined || currentPrice <= 0) {
      this.addLog('API', 'error', 'Trade skipped because no valid live MEXC ticker is available.');
      return null;
    }
    const now = Date.now();
    const cycleMs = this.config.cycleMinutes * 60 * 1000;
    const expiryTime = now + cycleMs;
    const directionArabic = direction === 'UP' ? 'أعلى' : 'أقل';

    const trade: ContractTrade = {
      id: `EVT-${Date.now().toString(36).toUpperCase()}`,
      symbol: this.config.symbol,
      cycleMinutes: this.config.cycleMinutes,
      direction,
      directionArabic,
      amount: this.config.tradeAmount,
      payoutPercent: 80,
      expectedReturn: Number((this.config.tradeAmount * 1.8).toFixed(2)), // 3 * 1.8 = 5.4 USDT
      entryPrice: currentPrice,
      entryTime: now,
      expiryTime,
      status: 'OPEN',
      mode: this.config.tradingMode,
    };

    this.activeContract = trade;
    this.trades.unshift(trade);

    const initiator = isManual ? 'Manual execution' : 'Automated 10m strategy cycle';
    this.addLog(
      'EXECUTION',
      'success',
      `[${initiator}] Opened contract ${trade.id}: Direction ${direction} (${directionArabic}) | Entry: $${currentPrice.toFixed(2)} | Stake: $${trade.amount} USDT | Expiry: ${this.config.cycleMinutes}m`
    );

    return trade;
  }

  /**
   * Settle an active contract at expiration
   */
  private async settleActiveContract(settlementPrice: number) {
    if (!this.activeContract) return;

    const contract = this.activeContract;
    contract.settlementPrice = settlementPrice;
    contract.status = 'SETTLING';

    const priceDiff = settlementPrice - contract.entryPrice;
    let won = false;

    if (contract.direction === 'UP' && priceDiff > 0) {
      won = true;
    } else if (contract.direction === 'DOWN' && priceDiff < 0) {
      won = true;
    }

    if (won) {
      // 80% net profit: +2.40 USDT on $3.00 stake
      const netProfit = Number((contract.amount * (contract.payoutPercent / 100)).toFixed(2));
      contract.status = 'WON';
      contract.pnl = netProfit;
      this.dailyPnl += netProfit;
      this.consecutiveLosses = 0; // Reset streak

      this.addLog(
        'EXECUTION',
        'success',
        `Contract ${contract.id} WON! Entry: $${contract.entryPrice.toFixed(2)} -> Settle: $${settlementPrice.toFixed(2)} (${contract.direction} ${contract.directionArabic}). Net Profit: +$${netProfit.toFixed(2)} USDT`
      );
    } else {
      // Loss: -3.00 USDT
      const loss = contract.amount;
      contract.status = 'LOST';
      contract.pnl = -loss;
      this.dailyPnl -= loss;
      this.consecutiveLosses += 1;

      this.addLog(
        'EXECUTION',
        'warn',
        `Contract ${contract.id} LOST. Entry: $${contract.entryPrice.toFixed(2)} -> Settle: $${settlementPrice.toFixed(2)} (${contract.direction} ${contract.directionArabic}). Loss: -$${loss.toFixed(2)} USDT (Streak: ${this.consecutiveLosses})`
      );

      // Check Risk Rules from PDF Manual
      if (this.consecutiveLosses >= this.config.maxConsecutiveLosses) {
        this.isEmergencyHalted = true;
        this.haltReason = `Hit limit of ${this.consecutiveLosses} consecutive losses (Rule: تجنب فخ الانتقام والتداول العاطفي)`;
        this.addLog('RISK', 'error', `CIRCUIT BREAKER TRIGGERED: ${this.haltReason}. Trading paused immediately to protect capital.`);
      } else if (this.dailyPnl <= -this.config.maxDailyLoss) {
        this.isEmergencyHalted = true;
        this.haltReason = `Hit max daily loss limit of -$${this.config.maxDailyLoss.toFixed(2)} USDT`;
        this.addLog('RISK', 'error', `CIRCUIT BREAKER TRIGGERED: ${this.haltReason}. Trading paused for the day.`);
      }
    }

    this.activeContract = null;
  }

  public getStatus(): BotStatus {
    const now = Date.now();
    const cycleMs = this.config.cycleMinutes * 60 * 1000;
    const cycleTotalSeconds = this.config.cycleMinutes * 60;
    const secondsInCycle = Math.floor((now % cycleMs) / 1000);
    const cycleSecondsRemaining = cycleTotalSeconds - secondsInCycle;
    const cycleProgress = Math.min(100, Math.floor((secondsInCycle / cycleTotalSeconds) * 100));

    const won = this.trades.filter((t) => t.status === 'WON').length;
    const lost = this.trades.filter((t) => t.status === 'LOST').length;
    const total = won + lost;
    const winRate = total > 0 ? Math.round((won / total) * 100) : 0;

    return {
      isRunning: this.isRunning,
      tradingMode: this.config.tradingMode,
      symbol: this.config.symbol,
      currentPrice: this.currentTicker?.lastPrice || 0,
      indexPrice: this.currentTicker?.indexPrice || 0,
      priceChange24h: this.currentTicker?.riseFallRate || 0,
      high24h: this.currentTicker?.high24Price || 0,
      low24h: this.currentTicker?.lower24Price || 0,
      volume24h: this.currentTicker?.volume24 || 0,
      lastUpdated: this.currentTicker?.timestamp || 0,
      cycleSecondsRemaining,
      cycleProgress,
      activeContract: this.activeContract,
      dailyPnl: Number(this.dailyPnl.toFixed(2)),
      consecutiveLosses: this.consecutiveLosses,
      isEmergencyHalted: this.isEmergencyHalted,
      haltReason: this.haltReason,
      totalTrades: total,
      wonTrades: won,
      lostTrades: lost,
      winRate,
      indicators: this.currentIndicators,
      hasApiKeys: this.client.hasCredentials(),
      apiConnected: this.client.isConnected(),
    };
  }

  public getCandles(): Candle[] {
    return this.candles;
  }

  public getTrades(): ContractTrade[] {
    return this.trades;
  }

  public getLogs(): BotLog[] {
    return this.logs;
  }
}
