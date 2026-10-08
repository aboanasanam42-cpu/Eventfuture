import { Candle, BollingerBands, IndicatorAnalysis } from './types';

/**
 * Calculate Wilder's Relative Strength Index (RSI)
 * @param closes Array of closing prices
 * @param period Default 14
 */
export function calculateRSI(closes: number[], period = 14): number[] {
  if (closes.length <= period) {
    return Array(closes.length).fill(50);
  }

  const rsi: number[] = Array(closes.length).fill(50);
  let gains = 0;
  let losses = 0;

  // First period
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi[period] = 100 - (100 / (1 + rs));

  // Wilder smoothing for subsequent periods
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const currentGain = diff > 0 ? diff : 0;
    const currentLoss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const currentRs = avgGain / avgLoss;
      rsi[i] = 100 - (100 / (1 + currentRs));
    }
  }

  return rsi;
}

/**
 * Calculate Bollinger Bands
 * @param closes Array of closing prices
 * @param period Default 20
 * @param multiplier Standard deviation multiplier (default 2)
 */
export function calculateBollingerBands(
  closes: number[],
  period = 20,
  multiplier = 2
): BollingerBands {
  if (closes.length < period) {
    const last = closes[closes.length - 1] || 80000;
    return {
      upper: last * 1.01,
      middle: last,
      lower: last * 0.99,
      bandwidth: 0.02,
      percentB: 0.5,
    };
  }

  const slice = closes.slice(closes.length - period);
  const mean = slice.reduce((acc, val) => acc + val, 0) / period;

  const squaredDiffs = slice.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((acc, val) => acc + val, 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = mean + multiplier * stdDev;
  const lower = mean - multiplier * stdDev;
  const currentPrice = closes[closes.length - 1];

  const bandwidth = mean > 0 ? (upper - lower) / mean : 0;
  const percentB = upper !== lower ? (currentPrice - lower) / (upper - lower) : 0.5;

  return {
    upper,
    middle: mean,
    lower,
    bandwidth,
    percentB,
  };
}

/**
 * Analyze 15-minute candles to generate Event Futures 10m cycle signal
 */
export function analyzeMarket(candles: Candle[]): IndicatorAnalysis {
  if (!candles || candles.length < 20) {
    const defaultPrice = candles?.[candles.length - 1]?.close || 81280;
    return {
      rsi: 50,
      bollinger: {
        upper: defaultPrice * 1.005,
        middle: defaultPrice,
        lower: defaultPrice * 0.995,
        bandwidth: 0.01,
        percentB: 0.5,
      },
      signal: 'NEUTRAL',
      signalArabic: 'محايد',
      confidence: 50,
      rationale: 'Insufficient candle data to generate confirmed directional signal.',
      rationaleArabic: 'بيانات الشموع غير كافية لحساب المؤشرات بدقة.',
      lastClose: defaultPrice,
      candleTrend: 'FLAT',
    };
  }

  const closes = candles.map((c) => c.close);
  const rsiSeries = calculateRSI(closes, 14);
  const currentRsi = rsiSeries[rsiSeries.length - 1];
  const prevRsi = rsiSeries[rsiSeries.length - 2] ?? currentRsi;

  const bb = calculateBollingerBands(closes, 20, 2);
  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2] ?? lastCandle;

  // Candle trend
  const candleDiff = lastCandle.close - lastCandle.open;
  const candleTrend: 'BULLISH' | 'BEARISH' | 'FLAT' =
    candleDiff > 10 ? 'BULLISH' : candleDiff < -10 ? 'BEARISH' : 'FLAT';

  // Quantitative scoring (-100 to +100, where positive is Bullish / UP, negative is Bearish / DOWN)
  let score = 0;
  const reasonsEn: string[] = [];
  const reasonsAr: string[] = [];

  // 1. RSI Factor
  if (currentRsi <= 30) {
    score += 45;
    reasonsEn.push(`RSI oversold (${currentRsi.toFixed(1)} < 30) indicating strong bounce potential`);
    reasonsAr.push(`مؤشر RSI في منطقة تشبع بيعي (${currentRsi.toFixed(1)} < 30) مما يدعم الارتداد لأعلى`);
  } else if (currentRsi >= 70) {
    score -= 45;
    reasonsEn.push(`RSI overbought (${currentRsi.toFixed(1)} > 70) indicating exhaustion & pullback`);
    reasonsAr.push(`مؤشر RSI في منطقة تشبع شرائي (${currentRsi.toFixed(1)} > 70) مما يدعم الهبوط لأسفل`);
  } else if (currentRsi > 50 && prevRsi <= 50) {
    score += 25;
    reasonsEn.push(`RSI crossed above midline 50 with bullish momentum`);
    reasonsAr.push(`اختراق RSI لخط المنتصف 50 صعوداً بزخم إيجابي`);
  } else if (currentRsi < 50 && prevRsi >= 50) {
    score -= 25;
    reasonsEn.push(`RSI crossed below midline 50 with bearish pressure`);
    reasonsAr.push(`كسر RSI لخط المنتصف 50 هبوطاً بضغط بيعي`);
  } else if (currentRsi > 55) {
    score += 15;
    reasonsEn.push(`RSI positive bias (${currentRsi.toFixed(1)})`);
    reasonsAr.push(`ميل إيجابي لمؤشر RSI (${currentRsi.toFixed(1)})`);
  } else if (currentRsi < 45) {
    score -= 15;
    reasonsEn.push(`RSI negative bias (${currentRsi.toFixed(1)})`);
    reasonsAr.push(`ميل سلبي لمؤشر RSI (${currentRsi.toFixed(1)})`);
  }

  // 2. Bollinger Bands Factor
  if (bb.percentB <= 0.1) {
    score += 40;
    reasonsEn.push(`Price touching Lower Band (%b ${(bb.percentB * 100).toFixed(0)}%) expecting mean reversion`);
    reasonsAr.push(`السعر يلامس الحد السفلي لبولينجر باندز مرجحاً الارتداد نحو المتوسط`);
  } else if (bb.percentB >= 0.9) {
    score -= 40;
    reasonsEn.push(`Price touching Upper Band (%b ${(bb.percentB * 100).toFixed(0)}%) expecting rejection`);
    reasonsAr.push(`السعر يلامس الحد العلوي لبولينجر باندز مرجحاً الارتداد الهبوطي`);
  } else if (bb.percentB < 0.45 && lastCandle.close > lastCandle.open) {
    score += 20;
    reasonsEn.push(`Rebound from lower half of Bollinger Bands`);
    reasonsAr.push(`ارتداد صعودي من النصف السفلي لنطاق بولينجر`);
  } else if (bb.percentB > 0.55 && lastCandle.close < lastCandle.open) {
    score -= 20;
    reasonsEn.push(`Rejection from upper half of Bollinger Bands`);
    reasonsAr.push(`رفض هبوطي من النصف العلوي لنطاق بولينجر`);
  }

  // 3. 15m Candle Price Action
  if (candleTrend === 'BULLISH' && lastCandle.close > prevCandle.high) {
    score += 15;
    reasonsEn.push(`15m candle breakout above previous high`);
    reasonsAr.push(`شمعة الـ 15 دقيقة تخترق قمة الشمعة السابقة`);
  } else if (candleTrend === 'BEARISH' && lastCandle.close < prevCandle.low) {
    score -= 15;
    reasonsEn.push(`15m candle breakdown below previous low`);
    reasonsAr.push(`شمعة الـ 15 دقيقة تكسر قاع الشمعة السابقة`);
  }

  // Determine signal
  let signal: 'UP' | 'DOWN' | 'NEUTRAL' = 'NEUTRAL';
  let signalArabic: 'أعلى' | 'أقل' | 'محايد' = 'محايد';
  let confidence = 50;

  if (score >= 25) {
    signal = 'UP';
    signalArabic = 'أعلى';
    confidence = Math.min(95, 55 + Math.round((score / 100) * 40));
  } else if (score <= -25) {
    signal = 'DOWN';
    signalArabic = 'أقل';
    confidence = Math.min(95, 55 + Math.round((Math.abs(score) / 100) * 40));
  } else {
    // If neutral, tilt towards slight trend or stay neutral
    if (score > 10) {
      signal = 'UP';
      signalArabic = 'أعلى';
      confidence = 58;
    } else if (score < -10) {
      signal = 'DOWN';
      signalArabic = 'أقل';
      confidence = 58;
    } else {
      signal = 'NEUTRAL';
      signalArabic = 'محايد';
      confidence = 50;
    }
  }

  return {
    rsi: Number(currentRsi.toFixed(1)),
    bollinger: {
      upper: Number(bb.upper.toFixed(2)),
      middle: Number(bb.middle.toFixed(2)),
      lower: Number(bb.lower.toFixed(2)),
      bandwidth: Number((bb.bandwidth * 100).toFixed(2)),
      percentB: Number(bb.percentB.toFixed(3)),
    },
    signal,
    signalArabic,
    confidence,
    rationale: reasonsEn.join(' | ') || 'Indicators hovering around mean equilibrium.',
    rationaleArabic: reasonsAr.join(' | ') || 'المؤشرات تتداول قرب مناطق التوازن الحيادية.',
    lastClose: lastCandle.close,
    candleTrend,
  };
}
