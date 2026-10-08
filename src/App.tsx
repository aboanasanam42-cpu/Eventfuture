import React, { useState, useEffect } from 'react';
import { BotStatus, Candle, ContractTrade, BotLog, IndicatorAnalysis } from './bot/types';
import { Header } from './components/Header';
import { CycleCountdown } from './components/CycleCountdown';
import { CandleChart } from './components/CandleChart';
import { SignalCard } from './components/SignalCard';
import { OrderPanel } from './components/OrderPanel';
import { ActiveContractCard } from './components/ActiveContractCard';
import { TradesTable } from './components/TradesTable';
import { LogsViewer } from './components/LogsViewer';
import { DeploymentModal } from './components/DeploymentModal';
import { ApiCredentialsModal } from './components/ApiCredentialsModal';
import {
  Activity,
  History,
  Terminal as TerminalIcon,
  HelpCircle,
  TrendingUp,
  AlertTriangle,
  Play,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

export default function App() {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [trades, setTrades] = useState<ContractTrade[]>([]);
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [activeBottomTab, setActiveBottomTab] = useState<'trades' | 'logs' | 'strategy_guide'>('trades');

  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [isApiModalOpen, setIsApiModalOpen] = useState(false);

  // Poll server state every 2 seconds
  const fetchAllData = async () => {
    try {
      const [resStatus, resMarket, resTrades, resLogs] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/market'),
        fetch('/api/trades'),
        fetch('/api/logs'),
      ]);

      if (resStatus.ok) {
        const s = await resStatus.json();
        setStatus(s);
      }
      if (resMarket.ok) {
        const m = await resMarket.json();
        if (m.candles) setCandles(m.candles);
      }
      if (resTrades.ok) {
        const t = await resTrades.json();
        setTrades(t);
      }
      if (resLogs.ok) {
        const l = await resLogs.json();
        setLogs(l);
      }
    } catch {
      // In standalone client preview or before server is fully initialized
    }
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleManualTrade = async (direction: 'UP' | 'DOWN') => {
    try {
      const res = await fetch('/api/manual-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      if (res.ok) {
        await fetchAllData();
      }
    } catch (err) {
      console.error('Failed to trigger manual trade:', err);
    }
  };

  const handleUpdateConfig = async (newConfig: any) => {
    try {
      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      await fetchAllData();
    } catch (err) {
      console.error('Failed to update config:', err);
    }
  };

  const handleResetRisk = async () => {
    try {
      await fetch('/api/reset-risk', { method: 'POST' });
      await fetchAllData();
    } catch (err) {
      console.error('Failed to reset risk state:', err);
    }
  };

  const handleSaveCredentials = async (key: string, secret: string) => {
    const res = await fetch('/api/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mexcApiKey: key, mexcApiSecret: secret }),
    });
    const json = await res.json();
    await fetchAllData();
    return json;
  };

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950"
    >
      {/* Top Navigation */}
      <Header
        status={status}
        lang={lang}
        setLang={setLang}
        onOpenDeploy={() => setIsDeployModalOpen(true)}
        onOpenApiModal={() => setIsApiModalOpen(true)}
      />

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 flex-1 space-y-6">
        {/* Active Contract Alert (if one is currently open in the 10m cycle) */}
        {status?.activeContract && (
          <ActiveContractCard
            contract={status.activeContract}
            currentPrice={status.currentPrice}
            lang={lang}
          />
        )}

        {/* Top Quantitative Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              {lang === 'ar' ? 'الربح اليومي (Daily PnL)' : 'Daily Realized PnL'}
            </div>
            <div className={`text-xl font-bold mt-1 ${(status?.dailyPnl || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {(status?.dailyPnl || 0) >= 0 ? '+' : ''}${status?.dailyPnl?.toFixed(2) || '0.00'} USDT
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {lang === 'ar' ? 'حد الخسارة اليومي: -$9.00' : 'Max Daily Loss Limit: -$9.00'}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              {lang === 'ar' ? 'نسبة الفوز (Win Rate)' : 'Strategy Win Rate'}
            </div>
            <div className="text-xl font-bold text-cyan-400 mt-1">
              {status?.winRate || 0}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {status?.wonTrades || 0} {lang === 'ar' ? 'ربح' : 'Wins'} / {status?.lostTrades || 0} {lang === 'ar' ? 'خسارة' : 'Losses'}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              {lang === 'ar' ? 'درع الخسائر المتتالية' : 'Loss Streak Guard'}
            </div>
            <div className={`text-xl font-bold mt-1 ${status?.consecutiveLosses ? 'text-amber-400' : 'text-slate-200'}`}>
              {status?.consecutiveLosses || 0} / 3
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {lang === 'ar' ? 'توقف فوري عند 3 خسائر' : 'Circuit breaker halts at 3'}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider">
              {lang === 'ar' ? 'حالة التداول الآلي 24/7' : 'Auto 24/7 Worker'}
            </div>
            <div className="text-xl font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{status?.isRunning ? (lang === 'ar' ? 'يعمل بنشاط' : 'Active') : (lang === 'ar' ? 'متوقف' : 'Paused')}</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {lang === 'ar' ? 'تنفيذ كل 10 دقائق بالضبط' : 'Executes exactly every 10m'}
            </div>
          </div>
        </div>

        {/* Main Workstation Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: 15m Candlestick Chart & Signal Analysis (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <CandleChart
              candles={candles}
              indicators={status?.indicators || null}
              lang={lang}
            />

            <SignalCard
              indicators={status?.indicators || null}
              lang={lang}
            />
          </div>

          {/* Right Column: Order Execution Panel & 10m Cycle Countdown (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <CycleCountdown
              status={status}
              lang={lang}
            />

            <OrderPanel
              status={status}
              lang={lang}
              onManualTrade={handleManualTrade}
              onUpdateConfig={handleUpdateConfig}
              onResetRisk={handleResetRisk}
            />
          </div>
        </div>

        {/* Bottom Section: Tabs for Trades, Live Logs, and Strategy Guide */}
        <div className="pt-4">
          <div className="flex border-b border-slate-800 gap-6 font-mono text-xs mb-4">
            <button
              onClick={() => setActiveBottomTab('trades')}
              className={`pb-3 font-bold flex items-center gap-2 transition cursor-pointer border-b-2 ${
                activeBottomTab === 'trades'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-4 h-4" />
              <span>{lang === 'ar' ? 'سجل الصفقات المغلقة (Trades)' : 'Closed Contracts History'}</span>
            </button>

            <button
              onClick={() => setActiveBottomTab('logs')}
              className={`pb-3 font-bold flex items-center gap-2 transition cursor-pointer border-b-2 ${
                activeBottomTab === 'logs'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <TerminalIcon className="w-4 h-4" />
              <span>{lang === 'ar' ? 'شاشة الأوامر وسجلات البوت (Terminal)' : 'Real-Time Bot Logs'}</span>
            </button>

            <button
              onClick={() => setActiveBottomTab('strategy_guide')}
              className={`pb-3 font-bold flex items-center gap-2 transition cursor-pointer border-b-2 ${
                activeBottomTab === 'strategy_guide'
                  ? 'border-cyan-400 text-cyan-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>{lang === 'ar' ? 'دليل عقود الأحداث MEXC وقواعد المخاطرة' : 'Strategy & Risk Guide'}</span>
            </button>
          </div>

          {activeBottomTab === 'trades' && (
            <TradesTable trades={trades} lang={lang} />
          )}

          {activeBottomTab === 'logs' && (
            <LogsViewer logs={logs} lang={lang} />
          )}

          {activeBottomTab === 'strategy_guide' && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 text-xs text-slate-300 leading-relaxed font-sans">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📘</span>
                <span>{lang === 'ar' ? 'شرح آلية التداول على عقود الأحداث (Event Futures) وإدارة المخاطر' : 'MEXC Event Futures Mechanism & Risk Blueprint'}</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono text-xs pt-2">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-cyan-400 font-bold mb-1">
                    1. {lang === 'ar' ? 'حساب الربح والخسارة' : 'Payout Math'}
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {lang === 'ar'
                      ? 'مبلغ الصفقة: 3.00$ • العائد: 80% • في حال الفوز: تسترد 3$ + 2.40$ أرباح (المجموع 5.40$) • في حال الخسارة: تخسر 3.00$.'
                      : 'Stake: $3.00 • Payout: 80% • If Win: Return $5.40 (+$2.40 net profit) • If Loss: -$3.00 stake.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-amber-400 font-bold mb-1">
                    2. {lang === 'ar' ? 'قاعدة الـ 3 صفقات متتالية' : 'Consecutive Loss Rule'}
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {lang === 'ar'
                      ? 'تجنب فخ الانتقام: التوقف فوراً عن التداول إذا خسرت 3 صفقات متتالية (خسارة 9$) لحماية المحفظة وتجنب التداول العاطفي.'
                      : 'Anti-revenge mechanism: Automatically halts bot after 3 consecutive losses ($9 total) to prevent emotional drawdowns.'}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <div className="text-emerald-400 font-bold mb-1">
                    3. {lang === 'ar' ? 'سعر الدخول والتسوية (TWAP)' : 'Index & TWAP Settlement'}
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {lang === 'ar'
                      ? 'سعر الدخول هو Fair Index Price المشترك بين المنصات. التسوية تحسب بمتوسط السعر المرجح زمنياً (TWAP) لتجنب فتائل الشموع اللحظية.'
                      : 'Entry is Fair Index Price across major exchanges. Expiry uses TWAP to eliminate last-second price spike manipulation.'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Deployment Hub Modal */}
      <DeploymentModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
        lang={lang}
      />

      {/* API Key Modal */}
      <ApiCredentialsModal
        isOpen={isApiModalOpen}
        onClose={() => setIsApiModalOpen(false)}
        lang={lang}
        onSaveCredentials={handleSaveCredentials}
      />
    </div>
  );
}
