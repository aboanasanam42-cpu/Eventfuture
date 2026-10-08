import React from 'react';
import { ContractTrade } from '../bot/types';
import { ArrowUpRight, ArrowDownRight, CheckCircle2, XCircle, Clock, Percent, DollarSign } from 'lucide-react';

interface TradesTableProps {
  trades: ContractTrade[];
  lang: 'ar' | 'en';
}

export const TradesTable: React.FC<TradesTableProps> = ({ trades, lang }) => {
  const settledTrades = trades.filter((t) => t.status === 'WON' || t.status === 'LOST');
  const wonCount = settledTrades.filter((t) => t.status === 'WON').length;
  const lostCount = settledTrades.filter((t) => t.status === 'LOST').length;
  const winRate = settledTrades.length > 0 ? Math.round((wonCount / settledTrades.length) * 100) : 0;
  const totalPnl = settledTrades.reduce((acc, t) => acc + (t.pnl || 0), 0);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 pb-4 border-b border-slate-800">
        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
          <div className="text-[10px] text-slate-500 uppercase font-mono">{lang === 'ar' ? 'إجمالي الصفقات' : 'Total Trades'}</div>
          <div className="text-lg font-bold text-white font-mono mt-0.5">{settledTrades.length}</div>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
          <div className="text-[10px] text-slate-500 uppercase font-mono">{lang === 'ar' ? 'نسبة الفوز' : 'Win Rate'}</div>
          <div className="text-lg font-bold text-cyan-400 font-mono mt-0.5">{winRate}%</div>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
          <div className="text-[10px] text-slate-500 uppercase font-mono">{lang === 'ar' ? 'الصفقات الرابحة / الخاسرة' : 'Won / Lost'}</div>
          <div className="text-lg font-bold font-mono mt-0.5">
            <span className="text-emerald-400">{wonCount}W</span>
            <span className="text-slate-500 mx-1">/</span>
            <span className="text-rose-400">{lostCount}L</span>
          </div>
        </div>

        <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
          <div className="text-[10px] text-slate-500 uppercase font-mono">{lang === 'ar' ? 'صافي الربح التراكمي' : 'Net Realized PnL'}</div>
          <div className={`text-lg font-bold font-mono mt-0.5 ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)} USDT
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left font-mono text-xs">
          <thead>
            <tr className="text-slate-500 border-b border-slate-800 text-[11px]">
              <th className="pb-2 font-medium">{lang === 'ar' ? 'معرف العقد' : 'ID & Time'}</th>
              <th className="pb-2 font-medium">{lang === 'ar' ? 'الاتجاه' : 'Direction'}</th>
              <th className="pb-2 font-medium">{lang === 'ar' ? 'سعر الدخول' : 'Entry Price'}</th>
              <th className="pb-2 font-medium">{lang === 'ar' ? 'سعر التسوية (TWAP)' : 'Settle Price'}</th>
              <th className="pb-2 font-medium">{lang === 'ar' ? 'المبلغ' : 'Stake'}</th>
              <th className="pb-2 font-medium text-right">{lang === 'ar' ? 'النتيجة (USDT)' : 'PnL'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {settledTrades.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-slate-500">
                  {lang === 'ar' ? 'لا توجد صفقات مكتملة بعد. ستظهر هنا بمجرد اكتمال دورة الـ 10 دقائق.' : 'No completed contracts yet. They will appear here at the end of each 10m cycle.'}
                </td>
              </tr>
            ) : (
              settledTrades.map((t) => {
                const isWon = t.status === 'WON';
                const timeStr = new Date(t.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                return (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-2.5 text-slate-300">
                      <div>{t.id}</div>
                      <div className="text-[10px] text-slate-500">{timeStr}</div>
                    </td>
                    <td className="py-2.5">
                      <span className={`inline-flex items-center gap-1 font-bold ${t.direction === 'UP' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {t.direction === 'UP' ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        <span>{t.direction} ({t.directionArabic})</span>
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-300">${t.entryPrice.toFixed(2)}</td>
                    <td className="py-2.5 text-slate-300">
                      {t.settlementPrice ? `$${t.settlementPrice.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 text-slate-400">${t.amount.toFixed(2)}</td>
                    <td className="py-2.5 text-right font-bold">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded ${isWon ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        {isWon ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        <span>{isWon ? `+$${t.pnl?.toFixed(2)}` : `-$${Math.abs(t.pnl || 3).toFixed(2)}`}</span>
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
