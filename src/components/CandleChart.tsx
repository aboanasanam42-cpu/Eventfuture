import React, { useState } from 'react';
import { Candle, IndicatorAnalysis } from '../bot/types';
import { BarChart3, TrendingUp, Layers } from 'lucide-react';

interface CandleChartProps {
  candles: Candle[];
  indicators: IndicatorAnalysis | null;
  lang: 'ar' | 'en';
}

export const CandleChart: React.FC<CandleChartProps> = ({ candles, indicators, lang }) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!candles || candles.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-[420px] flex items-center justify-center text-slate-500 font-mono text-sm">
        {lang === 'ar' ? 'جاري تحميل بيانات الشموع من MEXC...' : 'Loading 15m Candles from MEXC API...'}
      </div>
    );
  }

  // Display last 35 candles for clean viewing
  const displayCandles = candles.slice(-35);
  const count = displayCandles.length;

  // Chart dimensions
  const chartHeight = 240;
  const rsiHeight = 90;
  const totalSvgHeight = 350;
  const width = 720;
  const paddingRight = 65;
  const paddingLeft = 15;
  const chartWidth = width - paddingRight - paddingLeft;

  // Find min/max price for scaling
  const highs = displayCandles.map((c) => c.high);
  const lows = displayCandles.map((c) => c.low);

  let minPrice = Math.min(...lows);
  let maxPrice = Math.max(...highs);

  // Expand with Bollinger bands if available
  if (indicators) {
    minPrice = Math.min(minPrice, indicators.bollinger.lower * 0.999);
    maxPrice = Math.max(maxPrice, indicators.bollinger.upper * 1.001);
  }

  const priceRange = maxPrice - minPrice || 100;
  const candleSlotWidth = chartWidth / count;
  const candleBodyWidth = Math.max(4, candleSlotWidth * 0.65);

  const priceToY = (price: number) => {
    return chartHeight - ((price - minPrice) / priceRange) * (chartHeight - 30) - 15;
  };

  const rsiToY = (rsiVal: number) => {
    // RSI scale: 0 to 100 mapped to rsiHeight
    const top = chartHeight + 20;
    return top + rsiHeight - (rsiVal / 100) * rsiHeight;
  };

  const hoveredCandle = hoverIndex !== null ? displayCandles[hoverIndex] : displayCandles[displayCandles.length - 1];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-sm text-white font-mono">BTCUSDT 15m</span>
            <span className="text-xs text-slate-400 font-mono ml-2">
              (Bollinger Bands 20,2 + RSI 14)
            </span>
          </div>
        </div>

        {/* OHLC Values display */}
        {hoveredCandle && (
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <span className="text-slate-400">O: <span className="text-slate-200">${hoveredCandle.open.toFixed(1)}</span></span>
            <span className="text-slate-400">H: <span className="text-emerald-400">${hoveredCandle.high.toFixed(1)}</span></span>
            <span className="text-slate-400">L: <span className="text-rose-400">${hoveredCandle.low.toFixed(1)}</span></span>
            <span className="text-slate-400">C: <span className={hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400' : 'text-rose-400'}>${hoveredCandle.close.toFixed(1)}</span></span>
          </div>
        )}
      </div>

      {/* SVG Chart Area */}
      <div className="relative w-full overflow-hidden flex-1 select-none">
        <svg
          viewBox={`0 0 ${width} ${totalSvgHeight}`}
          className="w-full h-auto"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id="bbAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="rsiAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Grid lines on main chart */}
          {[0.25, 0.5, 0.75].map((pct, i) => {
            const y = chartHeight * pct;
            const p = maxPrice - (pct * priceRange);
            return (
              <g key={`grid-${i}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#334155"
                  strokeDasharray="3 3"
                  strokeWidth="0.75"
                />
                <text
                  x={width - paddingRight + 6}
                  y={y + 4}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  ${p.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Bollinger Bands Indicators */}
          {indicators && (
            <g>
              {/* Upper Band */}
              <line
                x1={paddingLeft}
                y1={priceToY(indicators.bollinger.upper)}
                x2={width - paddingRight}
                y2={priceToY(indicators.bollinger.upper)}
                stroke="#06b6d4"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
              <text
                x={width - paddingRight + 6}
                y={priceToY(indicators.bollinger.upper) + 3}
                fill="#06b6d4"
                fontSize="9"
                fontFamily="monospace"
              >
                BB Top: ${indicators.bollinger.upper.toFixed(0)}
              </text>

              {/* Middle SMA */}
              <line
                x1={paddingLeft}
                y1={priceToY(indicators.bollinger.middle)}
                x2={width - paddingRight}
                y2={priceToY(indicators.bollinger.middle)}
                stroke="#f59e0b"
                strokeWidth="1"
              />

              {/* Lower Band */}
              <line
                x1={paddingLeft}
                y1={priceToY(indicators.bollinger.lower)}
                x2={width - paddingRight}
                y2={priceToY(indicators.bollinger.lower)}
                stroke="#a855f7"
                strokeWidth="1.2"
                strokeDasharray="4 4"
              />
              <text
                x={width - paddingRight + 6}
                y={priceToY(indicators.bollinger.lower) + 3}
                fill="#a855f7"
                fontSize="9"
                fontFamily="monospace"
              >
                BB Low: ${indicators.bollinger.lower.toFixed(0)}
              </text>
            </g>
          )}

          {/* Candlesticks */}
          {displayCandles.map((c, i) => {
            const xCenter = paddingLeft + i * candleSlotWidth + candleSlotWidth / 2;
            const openY = priceToY(c.open);
            const closeY = priceToY(c.close);
            const highY = priceToY(c.high);
            const lowY = priceToY(c.low);
            const isBull = c.close >= c.open;
            const bodyTop = Math.min(openY, closeY);
            const bodyHeight = Math.max(2, Math.abs(closeY - openY));

            const isHovered = hoverIndex === i;

            return (
              <g
                key={`candle-${c.time}-${i}`}
                onMouseEnter={() => setHoverIndex(i)}
                className="cursor-pointer"
              >
                {/* Wick */}
                <line
                  x1={xCenter}
                  y1={highY}
                  x2={xCenter}
                  y2={lowY}
                  stroke={isBull ? '#10b981' : '#f43f5e'}
                  strokeWidth="1.5"
                />
                {/* Body */}
                <rect
                  x={xCenter - candleBodyWidth / 2}
                  y={bodyTop}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={isBull ? '#10b981' : '#f43f5e'}
                  rx="1"
                  opacity={isHovered ? 1 : 0.9}
                />
              </g>
            );
          })}

          {/* RSI Sub-Panel Divider */}
          <line
            x1={paddingLeft}
            y1={chartHeight + 10}
            x2={width}
            y2={chartHeight + 10}
            stroke="#1e293b"
            strokeWidth="1.5"
          />

          <text
            x={paddingLeft}
            y={chartHeight + 22}
            fill="#94a3b8"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            RSI (14): {indicators?.rsi || 50}
          </text>

          {/* RSI 70 Overbought Line */}
          <line
            x1={paddingLeft}
            y1={rsiToY(70)}
            x2={width - paddingRight}
            y2={rsiToY(70)}
            stroke="#f43f5e"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />
          <text
            x={width - paddingRight + 6}
            y={rsiToY(70) + 3}
            fill="#f43f5e"
            fontSize="8"
            fontFamily="monospace"
          >
            70 OB
          </text>

          {/* RSI 50 Midline */}
          <line
            x1={paddingLeft}
            y1={rsiToY(50)}
            x2={width - paddingRight}
            y2={rsiToY(50)}
            stroke="#475569"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />

          {/* RSI 30 Oversold Line */}
          <line
            x1={paddingLeft}
            y1={rsiToY(30)}
            x2={width - paddingRight}
            y2={rsiToY(30)}
            stroke="#10b981"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />
          <text
            x={width - paddingRight + 6}
            y={rsiToY(30) + 3}
            fill="#10b981"
            fontSize="8"
            fontFamily="monospace"
          >
            30 OS
          </text>

          {/* Dynamic RSI Level Bar for last candle */}
          {indicators && (
            <circle
              cx={width - paddingRight - 15}
              cy={rsiToY(indicators.rsi)}
              r="4"
              fill={indicators.rsi >= 70 ? '#f43f5e' : indicators.rsi <= 30 ? '#10b981' : '#38bdf8'}
            />
          )}
        </svg>
      </div>

      {/* Indicator Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs font-mono text-slate-400 mt-2 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" />
            <span>BB Upper (${indicators?.bollinger.upper.toFixed(1)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
            <span>BB Mid (${indicators?.bollinger.middle.toFixed(1)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-purple-400 inline-block" />
            <span>BB Lower (${indicators?.bollinger.lower.toFixed(1)})</span>
          </div>
        </div>

        <div className="text-slate-400">
          <span>%b: <strong className="text-cyan-400">{((indicators?.bollinger.percentB || 0.5) * 100).toFixed(0)}%</strong></span>
          <span className="mx-2">•</span>
          <span>BW: <strong className="text-slate-300">{indicators?.bollinger.bandwidth || 0}%</strong></span>
        </div>
      </div>
    </div>
  );
};
