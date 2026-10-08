import crypto from 'crypto';
import { Candle } from './types';

export interface MexcTicker {
  symbol: string;
  lastPrice: number;
  fairPrice: number;
  indexPrice: number;
  riseFallRate: number;
  high24Price: number;
  lower24Price: number;
  volume24: number;
  timestamp: number;
}

export class MexcClient {
  private apiKey: string;
  private apiSecret: string;
  private contractBaseUrl = 'https://contract.mexc.com';
  private spotBaseUrl = 'https://api.mexc.com';
  private connectionVerified = false;

  constructor(apiKey = '', apiSecret = '') {
    this.apiKey = apiKey.trim();
    this.apiSecret = apiSecret.trim();
  }

  public setCredentials(apiKey: string, apiSecret: string) {
    this.apiKey = apiKey.trim();
    this.apiSecret = apiSecret.trim();
  }

  public hasCredentials(): boolean {
    return Boolean(this.apiKey && this.apiSecret);
  }

  public isConnected(): boolean {
    return this.connectionVerified;
  }

  /**
   * Generate MEXC HMAC SHA256 Signature
   */
  private generateSignature(paramStr: string, timestamp: number): string {
    if (!this.apiSecret) return '';
    // MEXC Contract v1 sign format: apiKey + timestamp + paramStr (or secret hashing)
    const signString = `${this.apiKey}${timestamp}${paramStr}`;
    return crypto.createHmac('sha256', this.apiSecret).update(signString).digest('hex');
  }

  /**
   * Fetch 15-minute Candlesticks for BTCUSDT
   */
  public async fetch15mCandles(symbol = 'BTCUSDT', limit = 100): Promise<Candle[]> {
    const formattedContractSymbol = symbol.includes('_') ? symbol : `${symbol.replace('USDT', '')}_USDT`;

    // Strategy 1: Try MEXC Contract v1 API
    try {
      const url = `${this.contractBaseUrl}/api/v1/contract/kline/${formattedContractSymbol}?interval=Min15&limit=${limit}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const json = (await res.json()) as any;
        if (json.success && json.data) {
          const times: number[] = json.data.time || [];
          const opens: number[] = json.data.open || [];
          const highs: number[] = json.data.high || [];
          const lows: number[] = json.data.low || [];
          const closes: number[] = json.data.close || [];
          const vols: number[] = json.data.vol || [];

          const candles: Candle[] = [];
          for (let i = 0; i < times.length; i++) {
            candles.push({
              time: times[i] * 1000,
              open: Number(opens[i]),
              high: Number(highs[i]),
              low: Number(lows[i]),
              close: Number(closes[i]),
              volume: Number(vols[i] || 0),
            });
          }
          if (candles.length >= 20) {
            return candles.sort((a, b) => a.time - b.time);
          }
        }
      }
    } catch {
      // Fall through to Strategy 2
    }

    // Strategy 2: Fallback to MEXC Global Spot/Derivatives Klines (Standard format: [time, open, high, low, close, vol, ...])
    try {
      const rawSymbol = symbol.replace('_', '');
      const spotUrl = `${this.spotBaseUrl}/api/v3/klines?symbol=${rawSymbol}&interval=15m&limit=${limit}`;
      const res = await fetch(spotUrl, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const data = (await res.json()) as any[];
        if (Array.isArray(data) && data.length >= 20) {
          return data.map((item) => ({
            time: Number(item[0]),
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
            volume: parseFloat(item[5] || '0'),
          }));
        }
      }
    } catch {
      // Fall through to synthetic generation if offline
    }

    throw new Error('Unable to fetch at least 20 live MEXC candles from contract or spot endpoints; trading data is unavailable.');
  }

  /**
   * Fetch Real-Time Index & Fair Ticker
   */
  public async fetchTicker(symbol = 'BTCUSDT'): Promise<MexcTicker> {
    const formattedContractSymbol = symbol.includes('_') ? symbol : `${symbol.replace('USDT', '')}_USDT`;

    try {
      const url = `${this.contractBaseUrl}/api/v1/contract/ticker?symbol=${formattedContractSymbol}`;
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (res.ok) {
        const json = (await res.json()) as any;
        if (json.success && json.data) {
          const d = json.data;
          const lastPrice = Number(d.lastPrice ?? d.fairPrice);
          if (!Number.isFinite(lastPrice) || lastPrice <= 0) {
            throw new Error('Invalid live contract ticker response');
          }
          return {
            symbol,
            lastPrice,
            fairPrice: Number(d.fairPrice ?? lastPrice),
            indexPrice: Number(d.indexPrice ?? lastPrice),
            riseFallRate: Number(d.riseFallRate ?? 0),
            high24Price: Number(d.high24Price ?? lastPrice),
            lower24Price: Number(d.lower24Price ?? lastPrice),
            volume24: Number(d.volume24 ?? 0),
            timestamp: Date.now(),
          };
        }
      }
    } catch {
      // Fall through to spot
    }

    try {
      const rawSymbol = symbol.replace('_', '');
      const res = await fetch(`${this.spotBaseUrl}/api/v3/ticker/24hr?symbol=${rawSymbol}`);
      if (res.ok) {
        const d = (await res.json()) as any;
        const last = Number(d.lastPrice);
        if (!Number.isFinite(last) || last <= 0) {
          throw new Error('Invalid live spot ticker response');
        }
        return {
          symbol,
          lastPrice: last,
          fairPrice: last,
          indexPrice: last,
          riseFallRate: Number(d.priceChangePercent ?? 0) / 100,
          high24Price: Number(d.highPrice ?? last),
          lower24Price: Number(d.lowPrice ?? last),
          volume24: Number(d.volume ?? 0),
          timestamp: Date.now(),
        };
      }
    } catch {
      // Fallback
    }

    throw new Error('Unable to fetch a valid live MEXC contract or spot ticker; no synthetic price will be used.');
  }

  /**
   * Verify API credentials connectivity
   */
  public async testConnection(): Promise<{ success: boolean; message: string; balance?: number }> {
    this.connectionVerified = false;
    if (!this.hasCredentials()) {
      return { success: false, message: 'Missing API Key or API Secret' };
    }

    try {
      const timestamp = Date.now();
      const signature = this.generateSignature('', timestamp);

      const url = `${this.contractBaseUrl}/api/v1/private/account/assets`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'ApiKey': this.apiKey,
          'Request-Time': timestamp.toString(),
          'Signature': signature,
          'Content-Type': 'application/json',
        },
      });

      const json = (await res.json()) as any;
      if (json.success) {
        this.connectionVerified = true;
        const usdtAsset = json.data?.find((a: any) => a.currency === 'USDT');
        return {
          success: true,
          message: 'MEXC API Connected Successfully!',
          balance: usdtAsset ? Number(usdtAsset.availableBalance) : undefined,
        };
      } else {
        this.connectionVerified = false;
        return {
          success: false,
          message: json.message || `MEXC API error code ${json.code}`,
        };
      }
    } catch (err: any) {
      this.connectionVerified = false;
      return {
        success: false,
        message: err.message || 'Network error connecting to MEXC endpoint',
      };
    }
  }

  /**
   * Submit 10-Minute Event Futures Order (or standard contract order)
   */
  /**
   * Event Futures execution is intentionally disabled.
   *
   * The currently documented MEXC Futures API exposes standard contract orders,
   * but this project targets fixed-expiry event contracts and must not treat a
   * standard perpetual-futures order as an equivalent product. The previously
   * used /api/v1/private/event/order/create endpoint is not present in the
   * official Futures API reference, so submitting to it would be unverified.
   */
  public async executeEventTrade(_params: {
    symbol: string;
    direction: 'UP' | 'DOWN';
    amount: number;
    durationMinutes: number;
  }): Promise<{ success: boolean; orderId?: string; error?: string }> {
    return {
      success: false,
      error: 'Live Event Futures execution is disabled: the required event-order endpoint is not documented by MEXC. No real order was submitted. Simulation only.',
    };
  }
}
