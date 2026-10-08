import React from 'react';
import { BotStatus } from '../bot/types';
import { Activity, ShieldCheck, ShieldAlert, Cpu, Terminal as TerminalIcon, Globe2, ExternalLink } from 'lucide-react';

interface HeaderProps {
  status: BotStatus | null;
  lang: 'ar' | 'en';
  setLang: (l: 'ar' | 'en') => void;
  onOpenDeploy: () => void;
  onOpenApiModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  status,
  lang,
  setLang,
  onOpenDeploy,
  onOpenApiModal,
}) => {
  const isUp = (status?.priceChange24h || 0) >= 0;

  return (
    <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Left: Brand & Symbol */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-slate-950 font-bold text-xl">
            M
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-base text-white tracking-wide">
                MEXC Event Futures
              </h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono font-medium border border-emerald-500/30">
                10m Cycles
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              BTCUSDT • {lang === 'ar' ? 'العقود الآجلة للأحداث (مؤشرات 15 دقيقة)' : 'Binary 10m Expiry (15m Indicators)'}
            </p>
          </div>
        </div>

        {/* Center: Live Price & 24h Stats */}
        <div className="flex items-center gap-6 bg-slate-950/60 px-4 py-1.5 rounded-xl border border-slate-800/80">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-mono">
              {lang === 'ar' ? 'سعر المؤشر الفوري' : 'Live Index Price'}
            </div>
            <div className="font-mono text-lg font-bold text-white flex items-center gap-1.5">
              <span>${status ? status.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 2 }) : '81,281.0'}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                {isUp ? '+' : ''}{((status?.priceChange24h || 0) * 100).toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="hidden sm:block border-l border-slate-800 pl-4 text-xs font-mono space-y-0.5">
            <div className="text-slate-400 flex items-center justify-between gap-3">
              <span>24h High:</span>
              <span className="text-slate-200">${status?.high24h?.toLocaleString() || '83,606.5'}</span>
            </div>
            <div className="text-slate-400 flex items-center justify-between gap-3">
              <span>24h Low:</span>
              <span className="text-slate-200">${status?.low24h?.toLocaleString() || '80,832.2'}</span>
            </div>
          </div>
        </div>

        {/* Right: Engine Status & Actions */}
        <div className="flex items-center gap-3">
          {/* Mode Pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-800 bg-slate-950">
            <span className={`w-2 h-2 rounded-full animate-pulse ${status?.tradingMode === 'live' ? 'bg-amber-400' : 'bg-cyan-400'}`} />
            <span className="text-slate-300 capitalize">
              {status?.tradingMode === 'live' ? (lang === 'ar' ? 'حقيقي (MEXC Live)' : 'Live API') : (lang === 'ar' ? 'محاكاة دقيقة' : 'Simulation')}
            </span>
          </div>

          {/* Risk Breaker Status */}
          {status?.isEmergencyHalted ? (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'حماية رأس المال نشطة' : 'Halted'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'درع المخاطر آمن' : 'Safe'}</span>
            </div>
          )}

          {/* API Key Modal Button */}
          <button
            onClick={onOpenApiModal}
            className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
            title="Configure MEXC API Credentials"
          >
            {lang === 'ar' ? 'مفاتيح API' : 'MEXC Keys'}
          </button>

          {/* Deploy / GitHub Modal Button */}
          <button
            onClick={onOpenDeploy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-cyan-400 hover:opacity-95 rounded-lg shadow-md shadow-emerald-500/20 transition cursor-pointer"
          >
            <TerminalIcon className="w-3.5 h-3.5" />
            <span>{lang === 'ar' ? 'نشر Railway & GitHub' : 'Deploy Railway'}</span>
          </button>

          {/* Lang Toggle */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            className="px-2 py-1 text-xs font-mono text-slate-400 hover:text-slate-200 bg-slate-800/80 rounded-lg border border-slate-700"
          >
            {lang === 'ar' ? 'EN' : 'عربي'}
          </button>
        </div>
      </div>
    </header>
  );
};
