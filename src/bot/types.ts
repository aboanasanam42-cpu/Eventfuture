export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  percentB: number;
}

export interface IndicatorAnalysis {
  rsi: number;
  bollinger: BollingerBands;
  signal: 'UP' | 'DOWN' | 'NEUTRAL';
  signalArabic: 'أعلى' | 'أقل' | 'محايد';
  confidence: number; // 0 - 100
  rationale: string;
  rationaleArabic: string;
  lastClose: number;
  candleTrend: 'BULLISH' | 'BEARISH' | 'FLAT';
}

export interface ContractTrade {
  id: string;
  symbol: string;
  cycleMinutes: number;
  direction: 'UP' | 'DOWN';
  directionArabic: 'أعلى' | 'أقل';
  amount: number; // e.g. 3.0 USDT
  payoutPercent: number; // e.g. 80%
  expectedReturn: number; // e.g. 5.4 USDT
  entryPrice: number;
  entryTime: number;
  expiryTime: number;
  settlementPrice?: number;
  pnl?: number; // +2.4 or -3.0
  status: 'OPEN' | 'SETTLING' | 'WON' | 'LOST';
  mode: 'simulation' | 'live';
  orderId?: string;
  error?: string;
}

export interface BotConfig {
  symbol: string;
  tradeAmount: number;
  cycleMinutes: number;
  timeframe: string;
  maxDailyLoss: number;
  maxConsecutiveLosses: number;
  tradingMode: 'simulation' | 'live';
  mexcApiKey?: string;
  mexcApiSecret?: string;
  autoTrade: boolean;
}

export interface BotStatus {
  isRunning: boolean;
  tradingMode: 'simulation' | 'live';
  symbol: string;
  currentPrice: number;
  indexPrice: number;
  priceChange24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  lastUpdated: number;
  cycleSecondsRemaining: number;
  cycleProgress: number; // 0 - 100
  activeContract: ContractTrade | null;
  dailyPnl: number;
  consecutiveLosses: number;
  isEmergencyHalted: boolean;
  haltReason?: string;
  totalTrades: number;
  wonTrades: number;
  lostTrades: number;
  winRate: number;
  indicators: IndicatorAnalysis | null;
  hasApiKeys: boolean;
  apiConnected: boolean;
}

export interface BotLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  category: 'STRATEGY' | 'EXECUTION' | 'RISK' | 'API' | 'SYSTEM';
}
