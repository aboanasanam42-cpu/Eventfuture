import React from 'react';
import { BotStatus } from '../bot/types';
import { Timer, Clock, ArrowRight, Zap } from 'lucide-react';

interface CycleCountdownProps {
  status: BotStatus | null;
  lang: 'ar' | 'en';
}

export const CycleCountdown: React.FC<CycleCountdownProps> = ({ status, lang }) => {
  const secondsRemaining = status?.cycleSecondsRemaining ?? 600;
  const progress = status?.cycleProgress ?? 0;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  // Calculate phase
  let phaseTextEn = 'Monitoring 15m Trend & Volatility';
  let phaseTextAr = 'مراقبة حركة المؤشرات والتقلبات على شارت 15 دقيقة';
  if (secondsRemaining <= 10) {
    phaseTextEn = '⚡ Cycle Trigger Window: Evaluating Entry Signal';
    phaseTextAr = '⚡ نافذة الدخول: حسم إشارة الشراء (أعلى / أقل)';
  } else if (status?.activeContract) {
    phaseTextEn = 'Active 10m Contract running towards TWAP expiry';
    phaseTextAr = 'العقد ساري نحو التسوية التلقائية بمتوسط السعر TWAP';
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Timer className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">
              {lang === 'ar' ? 'دورة الـ 10 دقائق (وحدة الزمن)' : '10-Minute Contract Cycle'}
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              {lang === 'ar' ? 'فترة التوقع والتسوية المحددة في MEXC' : 'Expiry interval for Event Futures'}
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-2xl font-black font-mono tracking-wider text-cyan-300">
            {formattedTime}
          </div>
          <div className="text-[10px] text-slate-500 font-mono uppercase">
            {lang === 'ar' ? 'متبقي للتسوية القادمة' : 'Time Remaining'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800 p-0.5">
        <div
          className="bg-gradient-to-r from-emerald-500 via-cyan-400 to-indigo-500 h-full rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-1.5 font-medium">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-slate-300">{lang === 'ar' ? phaseTextAr : phaseTextEn}</span>
        </div>
        <span className="font-mono text-slate-500">{progress}% {lang === 'ar' ? 'مكتمل' : 'elapsed'}</span>
      </div>
    </div>
  );
};
