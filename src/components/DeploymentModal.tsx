import React, { useState } from 'react';
import { X, Copy, Check, Terminal, ExternalLink, Download, FileCode, Server, Shield, Layers } from 'lucide-react';

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
}

export const DeploymentModal: React.FC<DeploymentModalProps> = ({ isOpen, onClose, lang }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'git' | 'railway' | 'files'>('git');
  const [selectedFile, setSelectedFile] = useState<string>('railway.json');

  if (!isOpen) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const gitSnippet = `# 1. Ensure git is initialized and changes staged
git add .
git commit -m "feat: MEXC Event Futures 10m quantitative trading bot"

# 2. Rename default branch to main
git branch -M main

# 3. Connect your GitHub repository (replace with your repo URL)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/mexc-event-bot.git

# 4. Push directly to GitHub
git push -u origin main`;

  const envVars = [
    { key: 'MEXC_API_KEY', val: 'your_mexc_key_here', desc: 'MEXC API Key (from MEXC API Management)' },
    { key: 'MEXC_SECRET_KEY', val: 'your_mexc_secret_here', desc: 'MEXC Secret Key (also supports MEXC_API_SECRET)' },
    { key: 'SYMBOL', val: 'BTCUSDT', desc: 'Target Pair (default: BTCUSDT)' },
    { key: 'TRADE_AMOUNT_USDT', val: '3.0', desc: 'Fixed stake per 10m contract (USDT)' },
    { key: 'CYCLE_DURATION_MINUTES', val: '10', desc: 'Event Futures contract cycle in minutes' },
    { key: 'TIMEFRAME_INDICATOR', val: '15m', desc: 'Candlestick analysis chart timeframe' },
    { key: 'MAX_DAILY_LOSS_USDT', val: '9.0', desc: 'Max daily loss circuit breaker threshold' },
    { key: 'MAX_CONSECUTIVE_LOSSES', val: '3', desc: 'Streak breaker (3 consecutive losses)' },
    { key: 'TRAILING_TP_ENABLED', val: 'false', desc: 'Trailing Take-Profit enabled' },
    { key: 'PYTHONUNBUFFERED', val: '1', desc: 'Ensure Python logs stream immediately in Railway' },
    { key: 'TRADING_MODE', val: 'simulation', desc: '"simulation" only; Event Futures live orders are disabled' },
    { key: 'PORT', val: '3000', desc: 'Port provided by Railway ($PORT)' },
  ];

  const fileContents: Record<string, string> = {
    'railway.json': `{\n  "$schema": "https://railway.app/railway.schema.json",\n  "build": {\n    "builder": "NIXPACKS",\n    "buildCommand": "npm run build"\n  },\n  "deploy": {\n    "startCommand": "npm start",\n    "healthcheckPath": "/api/status",\n    "healthcheckTimeout": 120,\n    "restartPolicyType": "ON_FAILURE",\n    "restartPolicyMaxRetries": 10\n  }\n}`,
    'Dockerfile': `FROM node:20-alpine AS builder\nWORKDIR /app\nCOPY package.json tsconfig.json vite.config.ts ./\nRUN npm install\nCOPY . .\nRUN npm run build\n\nFROM node:20-alpine AS runner\nWORKDIR /app\nENV NODE_ENV=production\nENV PORT=3000\nCOPY package.json ./\nRUN npm install --omit=dev && npm install -g tsx\nCOPY --from=builder /app/dist ./dist\nCOPY --from=builder /app/src ./src\nCOPY --from=builder /app/server.ts ./server.ts\nCOPY --from=builder /app/tsconfig.json ./tsconfig.json\nEXPOSE 3000\nCMD ["tsx", "server.ts"]`,
    'Procfile': `web: npm start\nworker: npm run worker\nworker-py: python3 bot.py`,
    'requirements.txt': `requests>=2.31.0\npython-dotenv>=1.0.0`,
    'bot.py': `# Standalone Python 3 worker for MEXC Event Futures 10m cycles\n# Run with: python3 bot.py\n# See full bot.py in the project root!`,
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {lang === 'ar' ? 'مركز النشر والتشغيل: GitHub & Railway 24/7' : 'Deployment Center: GitHub & Railway 24/7'}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {lang === 'ar' ? 'أوامر Git الجاهزة، إعدادات خادم السحابة، وملفات التكوين' : 'Ready-to-use Git commands & cloud worker configurations'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 gap-4 font-mono text-xs">
          <button
            onClick={() => setActiveTab('git')}
            className={`py-3 border-b-2 font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'git'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Terminal className="w-4 h-4" />
            <span>1. {lang === 'ar' ? 'أوامر GitHub Push' : 'Push to GitHub'}</span>
          </button>

          <button
            onClick={() => setActiveTab('railway')}
            className={`py-3 border-b-2 font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'railway'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>2. {lang === 'ar' ? 'إعدادات Railway 24/7' : 'Railway 24/7 Setup'}</span>
          </button>

          <button
            onClick={() => setActiveTab('files')}
            className={`py-3 border-b-2 font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'files'
                ? 'border-purple-400 text-purple-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>3. {lang === 'ar' ? 'ملفات التكوين الجاهزة' : 'Config Files'}</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {activeTab === 'git' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200">
                <div className="flex-1">
                  {lang === 'ar'
                    ? 'قم بنسخ هذه الأوامر وتشغيلها في سطر الأوامر (Terminal) لدفع كافة ملفات المشروع والمؤشرات وإعدادات Railway مباشرة إلى مستودع GitHub الخاص بك:'
                    : 'Copy and execute these exact commands in your terminal to push all bot files, indicator algorithms, and Railway config files directly to your GitHub repo:'}
                </div>
                <a
                  href="/api/download-archive"
                  download="mexc-event-trading-bot.tar.gz"
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold transition shadow-md shadow-cyan-500/20"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'تحميل أرشيف المشروع الكامل' : 'Download Complete Archive'}</span>
                </a>
              </div>

              <div className="relative bg-slate-950 rounded-2xl p-4 border border-slate-800 font-mono text-xs">
                <button
                  onClick={() => copyToClipboard(gitSnippet, 'git-all')}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer text-xs"
                >
                  {copiedKey === 'git-all' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === 'git-all' ? (lang === 'ar' ? 'تم النسخ!' : 'Copied!') : (lang === 'ar' ? 'نسخ الكل' : 'Copy All')}</span>
                </button>
                <pre className="text-slate-300 overflow-x-auto leading-relaxed pt-2">
                  {gitSnippet}
                </pre>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 text-xs space-y-2">
                <div className="font-bold text-white flex items-center gap-2">
                  <span>💡</span>
                  <span>{lang === 'ar' ? 'ملاحظة هامة للمصادقة في GitHub:' : 'GitHub Authentication Tip:'}</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  {lang === 'ar'
                    ? 'عندما تطلب منك أداة Git كلمة المرور، استخدم GitHub Personal Access Token (PAT) وليس كلمة سر الحساب العادية.'
                    : 'When Git prompts for your password, use a GitHub Personal Access Token (PAT) with "repo" permissions instead of your account password.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'railway' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-200">
                <div>
                  <div className="font-bold text-sm text-white">{lang === 'ar' ? 'نشر تلقائي خلال دقيقة واحدة على Railway' : 'One-Click Railway Cloud Deployment'}</div>
                  <div className="text-slate-300 mt-1">
                    {lang === 'ar'
                      ? 'اختر Deploy from GitHub Repo وحدد مستودعك. سيكتشف Railway ملف railway.json تلقائياً.'
                      : 'Select "Deploy from GitHub Repo" and choose your repo. Railway automatically detects railway.json.'}
                  </div>
                </div>
                <a
                  href="https://railway.app/new"
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg transition"
                >
                  <span>Railway.app</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-300 font-mono mb-2 uppercase">
                  {lang === 'ar' ? 'متغيرات البيئة المطلوبة (Environment Variables):' : 'Required Environment Variables on Railway:'}
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950">
                  <table className="w-full text-left font-mono text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 text-[11px] bg-slate-900/40">
                        <th className="p-3">Variable Key</th>
                        <th className="p-3">Value</th>
                        <th className="p-3">Description</th>
                        <th className="p-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {envVars.map((v) => (
                        <tr key={v.key} className="hover:bg-slate-800/30">
                          <td className="p-3 font-bold text-cyan-400">{v.key}</td>
                          <td className="p-3 text-slate-300">{v.val}</td>
                          <td className="p-3 text-slate-400 text-[11px]">{v.desc}</td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => copyToClipboard(`${v.key}=${v.val}`, v.key)}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] transition cursor-pointer"
                            >
                              {copiedKey === v.key ? 'Copied!' : 'Copy'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                {Object.keys(fileContents).map((fname) => (
                  <button
                    key={fname}
                    onClick={() => setSelectedFile(fname)}
                    className={`px-3 py-1.5 rounded-xl border transition cursor-pointer ${
                      selectedFile === fname
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {fname}
                  </button>
                ))}
              </div>

              <div className="relative bg-slate-950 rounded-2xl p-4 border border-slate-800 font-mono text-xs">
                <button
                  onClick={() => copyToClipboard(fileContents[selectedFile], `file-${selectedFile}`)}
                  className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer text-xs"
                >
                  {copiedKey === `file-${selectedFile}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey === `file-${selectedFile}` ? 'Copied!' : 'Copy File Content'}</span>
                </button>
                <div className="text-[11px] text-slate-500 mb-2">// File: /{selectedFile}</div>
                <pre className="text-slate-300 overflow-x-auto leading-relaxed pt-2 max-h-[300px]">
                  {fileContents[selectedFile]}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            {lang === 'ar' ? 'جميع الملفات جاهزة ومولدة بالكامل في بيئة المشروع.' : 'All production files are generated in workspace root.'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition cursor-pointer"
          >
            {lang === 'ar' ? 'إغلاق' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
