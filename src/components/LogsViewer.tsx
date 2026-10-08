import React, { useState } from 'react';
import { BotLog } from '../bot/types';
import { Terminal, Filter, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface LogsViewerProps {
  logs: BotLog[];
  lang: 'ar' | 'en';
}

export const LogsViewer: React.FC<LogsViewerProps> = ({ logs, lang }) => {
  const [filter, setFilter] = useState<string>('ALL');

  const filteredLogs = filter === 'ALL' ? logs : logs.filter((l) => l.category === filter);

  const getLevelBadge = (level: BotLog['level']) => {
    switch (level) {
      case 'success':
        return <span className="text-emerald-400 font-bold">[SUCCESS]</span>;
      case 'warn':
        return <span className="text-amber-400 font-bold">[WARN]</span>;
      case 'error':
        return <span className="text-rose-400 font-bold">[ERROR]</span>;
      default:
        return <span className="text-cyan-400">[INFO]</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col h-[340px]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">
              {lang === 'ar' ? 'سجل العمليات اللحظي (Terminal Logs)' : 'Real-Time Bot Execution Logs'}
            </h3>
            <p className="text-[11px] text-slate-400 font-mono">
              {lang === 'ar' ? 'تتبع فحص الشموع، قرارات الاستراتيجية، وأوامر MEXC' : 'Background worker operations & API events'}
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 font-mono text-[10px]">
          {['ALL', 'STRATEGY', 'EXECUTION', 'RISK', 'API'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-2 py-0.5 rounded-md border transition cursor-pointer ${
                filter === cat
                  ? 'bg-slate-800 border-cyan-500 text-cyan-400 font-bold'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Terminal Viewport */}
      <div className="flex-1 mt-3 overflow-y-auto bg-slate-950 rounded-xl p-3 border border-slate-800/80 font-mono text-xs space-y-1.5 select-text">
        {filteredLogs.length === 0 ? (
          <div className="text-slate-500 py-6 text-center">
            {lang === 'ar' ? 'لا توجد سجلات في هذا التصنيف' : 'No logs recorded for this category yet.'}
          </div>
        ) : (
          filteredLogs.map((log) => (
            <div key={log.id} className="leading-relaxed hover:bg-slate-900/50 px-1 py-0.5 rounded flex items-start gap-2">
              <span className="text-slate-500 shrink-0 text-[11px]">{log.timestamp.substring(11)}</span>
              <span className="text-slate-400 text-[10px] px-1 rounded bg-slate-900 border border-slate-800 uppercase shrink-0">
                {log.category}
              </span>
              <span className="shrink-0 text-[11px]">{getLevelBadge(log.level)}</span>
              <span className="text-slate-200 break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
