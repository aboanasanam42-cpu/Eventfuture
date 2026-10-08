import React, { useState } from 'react';
import { BotStatus } from '../bot/types';
import { Play, Pause, AlertOctagon, RotateCcw, DollarSign, Shield, Zap, TrendingUp, TrendingDown } from 'lucide-react';

interface OrderPanelProps {
  status: BotStatus | null;
  lang: 'ar' | 'en';
  onManualTrade: (direction: 'UP' | 'DOWN') => void;
  onUpdateConfig: (config: { tradeAmount?: number; tradingMode?: 'simulation' | 'live'; autoTrade?: boolean }) => void;
  onResetRisk: () => void;
}

export const OrderPanel: React.FC<OrderPanelProps> = ({
  status,
  lang,
  onManualTrade,
  onUpdateConfig,
  onResetRisk,
}) => {
  const [stakeAmount, setStakeAmount] = useState<number>(3.0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const payoutRate = 0.8; // 80%
  const settlementAmount = (stakeAmount * 1.8).toFixed(2); // 5.40 USDT
  const netProfit = (stakeAmount * payoutRate).toFixed(2); // 2.40 USDT

  const isHalted = status?.isEmergencyHalted ?? false;
  const isSim = status?.tradingMode !== 'live';

  const handleTrade = async (dir: 'UP' | 'DOWN') => {
    setIsSubmitting(true);
    try {
      await onManualTrade(dir);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
      {/* Title & Mode */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white">
              {lang === 'ar' ? 'محاكي العقود وإدارة المخاطر' : 'Contract Simulator & Risk Controller'}
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              {lang === 'ar' ? 'محاكاة دورة 10 دقائق (BTCUSDT) — دون أوامر حقيقية' : '10-Minute Paper Simulation — no real orders'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => onUpdateConfig({ tradingMode: 'simulation' })}
              className={`px-3 py-1 rounded-lg transition ${
                isSim ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20' : 'text-slate-400 hover:text-white'
              }`}
            >
              {lang === 'ar' ? 'محاكاة (Paper)' : 'Simulation'}
            </button>
            <button
              type="button"
              disabled
              title={lang === 'ar' ? 'التداول الحقيقي غير متاح حتى توثيق واجهة عقود الأحداث' : 'Unavailable until MEXC documents an Event Futures order API'}
              className="px-3 py-1 rounded-lg text-slate-600 cursor-not-allowed"
            >
              {lang === 'ar' ? 'الحقيقي غير متاح' : 'Live unavailable'}
            </button>
          </div>
        </div>

        {/* Stake Configuration (Matching user's manual: 3 USDT amount -> 5.4 USDT settlement) */}
        <div className="my-4 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300 font-mono">
              {lang === 'ar' ? 'المبلغ (USDT)' : 'Contract Amount (USDT)'}
            </label>
            <div className="text-[11px] text-slate-500 font-mono">
              {lang === 'ar' ? 'افتراض المحاكاة: 80% فقط' : 'Simulation assumption: 80% only'}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-slate-500 font-mono text-sm">$</span>
              <input
                type="number"
                step="0.5"
                min="1"
                value={stakeAmount}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 1;
                  setStakeAmount(val);
                  onUpdateConfig({ tradeAmount: val });
                }}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 text-white font-mono font-bold text-lg rounded-xl pl-7 pr-3 py-2 outline-none transition"
              />
            </div>

            {/* Quick Stake Preset Buttons */}
            <div className="flex items-center gap-1.5">
              {[3, 5, 10].map((preset) => (
                <button
                  key={preset}
                  onClick={() => {
                    setStakeAmount(preset);
                    onUpdateConfig({ tradeAmount: preset });
                  }}
                  className={`px-2.5 py-2 rounded-xl text-xs font-mono font-bold border transition ${
                    stakeAmount === preset
                      ? 'bg-slate-800 border-cyan-500 text-cyan-400'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          {/* Mathematical Payout Preview (Exact from screenshot OCR page 5) */}
          <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 font-mono text-xs">
            <div>
              <div className="text-slate-500 text-[10px]">{lang === 'ar' ? 'إجمالي افتراضي بالمحاكاة' : 'Simulated Settlement Total'}</div>
              <div className="text-sm font-bold text-emerald-400">
                ${settlementAmount} USDT
              </div>
            </div>
            <div>
              <div className="text-slate-500 text-[10px]">{lang === 'ar' ? 'ربح افتراضي عند الفوز' : 'Simulated Win Profit (+80%)'}</div>
              <div className="text-sm font-bold text-cyan-400">
                +${netProfit} USDT
              </div>
            </div>
          </div>
        </div>

        {/* Execution Buttons: أعلى (UP) in Green, أقل (DOWN) in Red (Exact styling from MEXC mobile screenshot) */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <button
            onClick={() => handleTrade('UP')}
            disabled={isHalted || isSubmitting || Boolean(status?.activeContract)}
            className="group relative bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white py-3 px-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1 shadow-lg shadow-emerald-950/40 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5" />
              <span>{lang === 'ar' ? 'أعلى' : 'UP (Call)'}</span>
            </div>
            <span className="text-[10px] text-emerald-200 font-mono font-normal">
              {lang === 'ar' ? `دفع أعلى 80% • $${settlementAmount}` : `80% Return • $${settlementAmount}`}
            </span>
          </button>

          <button
            onClick={() => handleTrade('DOWN')}
            disabled={isHalted || isSubmitting || Boolean(status?.activeContract)}
            className="group relative bg-rose-600 hover:bg-rose-500 active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none text-white py-3 px-4 rounded-xl font-bold flex flex-col items-center justify-center gap-1 shadow-lg shadow-rose-950/40 transition cursor-pointer"
          >
            <div className="flex items-center gap-2 text-lg">
              <TrendingDown className="w-5 h-5" />
              <span>{lang === 'ar' ? 'أقل' : 'DOWN (Put)'}</span>
            </div>
            <span className="text-[10px] text-rose-200 font-mono font-normal">
              {lang === 'ar' ? `دفع أقل 80% • $${settlementAmount}` : `80% Return • $${settlementAmount}`}
            </span>
          </button>
        </div>
      </div>

      {/* Risk Management & Circuit Breaker Status */}
      <div className={`mt-3 p-3.5 rounded-xl border transition ${
        isHalted
          ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          : 'bg-slate-950 border-slate-800 text-slate-300'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className={`w-4 h-4 ${isHalted ? 'text-rose-400 animate-bounce' : 'text-emerald-400'}`} />
            <span className="text-xs font-bold font-mono">
              {lang === 'ar' ? 'قواعد إدارة رأس المال والحد اليومي' : 'Capital Protection Rules'}
            </span>
          </div>

          {isHalted && (
            <button
              onClick={onResetRisk}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-500 hover:bg-rose-400 text-slate-950 transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{lang === 'ar' ? 'إعادة ضبط الدرع' : 'Reset Breaker'}</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-400">{lang === 'ar' ? 'الخسائر المتتالية:' : 'Consec Streak:'}</span>
            <span className={`font-bold ${status?.consecutiveLosses ? 'text-amber-400' : 'text-slate-200'}`}>
              {status?.consecutiveLosses || 0} / 3
            </span>
          </div>

          <div className="flex items-center justify-between bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800/80">
            <span className="text-slate-400">{lang === 'ar' ? 'الربح اليومي PnL:' : 'Daily PnL:'}</span>
            <span className={`font-bold ${(status?.dailyPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(status?.dailyPnl || 0) >= 0 ? '+' : ''}${status?.dailyPnl?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>

        {isHalted && (
          <div className="mt-2 text-xs text-rose-300 bg-rose-900/30 p-2 rounded-lg border border-rose-800/50 flex items-start gap-1.5">
            <AlertOctagon className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong>{lang === 'ar' ? 'توقف التداول الآلي لحماية المحفظة:' : 'Trading Halted:'}</strong>{' '}
              {status?.haltReason || (lang === 'ar' ? 'تم الوصول لحد الخسائر المتتالية (3 صفقات)' : 'Max loss limit reached')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
