import React from 'react';
import { IndicatorAnalysis } from '../bot/types';
import { ArrowUpRight, ArrowDownRight, Minus, Sparkles, AlertCircle, Compass } from 'lucide-react';

interface SignalCardProps {
  indicators: IndicatorAnalysis | null;
  lang: 'ar' | 'en';
}

export const SignalCard: React.FC<SignalCardProps> = ({ indicators, lang }) => {
  if (!indicators) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-4" />
        <div className="h-10 bg-slate-800 rounded w-2/3" />
      </div>
    );
  }

  const isUp = indicators.signal === 'UP';
  const isDown = indicators.signal === 'DOWN';

  return (
    <div className={`rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden shadow-xl ${
      isUp
        ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40 shadow-emerald-950/20'
        : isDown
        ? 'bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/40 shadow-rose-950/20'
        : 'bg-slate-900 border-slate-800'
    }`}>
      {/* Background Glow */}
      <div className={`absolute top-0 right-0 w-36 h-36 rounded-full blur-3xl pointer-events-none ${
        isUp ? 'bg-emerald-500/10' : isDown ? 'bg-rose-500/10' : 'bg-slate-700/10'
      }`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${
            isUp ? 'bg-emerald-500/20 text-emerald-400' : isDown ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400'
          }`}>
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {lang === 'ar' ? 'إشارة استراتيجية الـ 10 دقائق' : '10m Strategy Direction Signal'}
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              {lang === 'ar' ? 'خوارزمية الإجماع: RSI + بولينجر باندز' : 'Consensus: 15m RSI & Bollinger Bands'}
            </p>
          </div>
        </div>

        {/* Confidence Badge */}
        <div className="text-right">
          <div className="text-xs font-mono font-semibold text-slate-300">
            {indicators.confidence}% {lang === 'ar' ? 'ثقة' : 'Confidence'}
          </div>
          <div className="w-20 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full rounded-full ${isUp ? 'bg-emerald-400' : isDown ? 'bg-rose-400' : 'bg-slate-500'}`}
              style={{ width: `${indicators.confidence}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Signal Display */}
      <div className="flex items-center gap-4 my-4 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center font-bold text-2xl shadow-lg ${
          isUp
            ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
            : isDown
            ? 'bg-rose-500 text-white shadow-rose-500/30'
            : 'bg-slate-800 text-slate-400'
        }`}>
          {isUp ? <ArrowUpRight className="w-8 h-8 stroke-[2.5]" /> : isDown ? <ArrowDownRight className="w-8 h-8 stroke-[2.5]" /> : <Minus className="w-8 h-8" />}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-2xl font-black tracking-wide ${
              isUp ? 'text-emerald-400' : isDown ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {lang === 'ar' ? indicators.signalArabic : indicators.signal}
            </span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              {indicators.signal === 'UP' ? 'CALL (شراء صعود)' : indicators.signal === 'DOWN' ? 'PUT (شراء هبوط)' : 'HOLD'}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 leading-relaxed">
            {lang === 'ar' ? indicators.rationaleArabic : indicators.rationale}
          </p>
        </div>
      </div>

      {/* Indicator Metrics Cards */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 font-mono text-xs">
          <div className="text-slate-500 text-[10px] uppercase">{lang === 'ar' ? 'مؤشر القوة النسبية' : 'RSI Indicator (14)'}</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base font-bold text-white">{indicators.rsi}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
              indicators.rsi >= 70 ? 'bg-rose-500/20 text-rose-400' : indicators.rsi <= 30 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-300'
            }`}>
              {indicators.rsi >= 70 ? (lang === 'ar' ? 'تشبع شرائي' : 'Overbought') : indicators.rsi <= 30 ? (lang === 'ar' ? 'تشبع بيعي' : 'Oversold') : (lang === 'ar' ? 'حيادي' : 'Neutral')}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60 font-mono text-xs">
          <div className="text-slate-500 text-[10px] uppercase">{lang === 'ar' ? 'موقع السعر داخل النطاق' : 'Bollinger Position %b'}</div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-base font-bold text-white">{(indicators.bollinger.percentB * 100).toFixed(0)}%</span>
            <span className="text-[10px] text-slate-400">
              {indicators.bollinger.percentB < 0.2 ? (lang === 'ar' ? 'قرب القاع' : 'Lower Band') : indicators.bollinger.percentB > 0.8 ? (lang === 'ar' ? 'قرب القمة' : 'Upper Band') : (lang === 'ar' ? 'قرب الوسط' : 'Mid Band')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
