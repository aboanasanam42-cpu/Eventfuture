import React, { useEffect, useState } from 'react';
import { ContractTrade, BotStatus } from '../bot/types';
import { Timer, ArrowUpRight, ArrowDownRight, Award, AlertCircle } from 'lucide-react';

interface ActiveContractCardProps {
  contract: ContractTrade;
  currentPrice: number;
  lang: 'ar' | 'en';
}

export const ActiveContractCard: React.FC<ActiveContractCardProps> = ({ contract, currentPrice, lang }) => {
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.round((contract.expiryTime - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [contract.expiryTime]);

  const priceDiff = currentPrice - contract.entryPrice;
  const isWinning = (contract.direction === 'UP' && priceDiff > 0) || (contract.direction === 'DOWN' && priceDiff < 0);

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const formattedCountdown = `${mins}:${String(secs).padStart(2, '0')}`;

  return (
    <div className={`p-4 rounded-2xl border transition-all duration-300 shadow-xl ${
      isWinning
        ? 'bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border-emerald-500/50'
        : 'bg-gradient-to-r from-rose-950/60 via-slate-900 to-slate-900 border-rose-500/50'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isWinning ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 ${isWinning ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </span>
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            {lang === 'ar' ? 'عقد أحداث نشط (10 دقائق)' : 'Active 10m Event Contract'}
          </span>
          <span className="text-[11px] font-mono text-slate-400">#{contract.id}</span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-cyan-300">
          <Timer className="w-3.5 h-3.5" />
          <span>{formattedCountdown} {lang === 'ar' ? 'حتى التسوية' : 'to Settle'}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/70 p-3 rounded-xl border border-slate-800/80 font-mono text-xs">
        <div>
          <div className="text-slate-500 text-[10px] uppercase">{lang === 'ar' ? 'الاتجاه المتوقع' : 'Direction'}</div>
          <div className={`font-bold text-sm flex items-center gap-1 mt-0.5 ${contract.direction === 'UP' ? 'text-emerald-400' : 'text-rose-400'}`}>
            {contract.direction === 'UP' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
            <span>{contract.direction} ({contract.directionArabic})</span>
          </div>
        </div>

        <div>
          <div className="text-slate-500 text-[10px] uppercase">{lang === 'ar' ? 'سعر الدخول (Index)' : 'Entry Price'}</div>
          <div className="font-bold text-sm text-white mt-0.5">
            ${contract.entryPrice.toFixed(2)}
          </div>
        </div>

        <div>
          <div className="text-slate-500 text-[10px] uppercase">{lang === 'ar' ? 'السعر الحالي (المقارن)' : 'Live / TWAP Price'}</div>
          <div className={`font-bold text-sm mt-0.5 ${priceDiff >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ${currentPrice.toFixed(2)}
          </div>
        </div>

        <div>
          <div className="text-slate-500 text-[10px] uppercase">{lang === 'ar' ? 'الحالة اللحظية' : 'Live Status'}</div>
          <div className={`font-bold text-sm mt-0.5 flex items-center gap-1 ${isWinning ? 'text-emerald-400' : 'text-rose-400'}`}>
            {isWinning ? <Award className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{isWinning ? (lang === 'ar' ? 'رابح (+2.40$)' : 'IN THE MONEY (+$2.40)') : (lang === 'ar' ? 'خاسر (-3.00$)' : 'OUT OF MONEY (-$3.00)')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
