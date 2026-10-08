import React, { useState } from 'react';
import { X, Key, ShieldCheck, CheckCircle2, AlertCircle, ExternalLink, Eye, EyeOff } from 'lucide-react';

interface ApiCredentialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ar' | 'en';
  onSaveCredentials: (key: string, secret: string) => Promise<{ success: boolean; message: string; balance?: number }>;
}

export const ApiCredentialsModal: React.FC<ApiCredentialsModalProps> = ({
  isOpen,
  onClose,
  lang,
  onSaveCredentials,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; balance?: number } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setResult(null);
    try {
      const res = await onSaveCredentials(apiKey, apiSecret);
      setResult(res);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {lang === 'ar' ? 'إعداد مفاتيح MEXC API للتداول الحقيقي' : 'MEXC API Keys Configuration'}
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {lang === 'ar' ? 'مفاتيح العقود الآجلة وعقود الأحداث' : 'Contract & Event Futures Permissions'}
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/20 text-xs text-amber-200 leading-relaxed">
            {lang === 'ar' ? (
              <>
                🔒 يتم استخدام المفاتيح حصرياً لتوقيع طلبات MEXC عبر <strong>HMAC-SHA256</strong>. يمكنك أيضاً إدخالها كمتغيرات بيئة في Railway (<code>MEXC_API_KEY</code> و <code>MEXC_API_SECRET</code>).
              </>
            ) : (
              <>
                🔒 Keys are signed securely server-side using <strong>HMAC-SHA256</strong>. You can also inject them via Railway environment variables.
              </>
            )}
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">
              MEXC API Key
            </label>
            <input
              type="text"
              placeholder="mx0vgl..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 text-white font-mono text-xs rounded-xl px-3.5 py-2.5 outline-none transition"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-300 mb-1.5">
              MEXC API Secret
            </label>
            <div className="relative">
              <input
                type={showSecret ? 'text' : 'password'}
                placeholder="Secret key..."
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 text-white font-mono text-xs rounded-xl pl-3.5 pr-10 py-2.5 outline-none transition"
                required
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-white"
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {result && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              result.success
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
            }`}>
              {result.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
              <div>
                <div>{result.message}</div>
                {result.balance !== undefined && (
                  <div className="font-mono mt-0.5 font-bold">
                    Available USDT Balance: ${result.balance.toFixed(2)}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="pt-2 flex items-center justify-between">
            <a
              href="https://www.mexc.com/user/openapi"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 font-mono transition"
            >
              <span>{lang === 'ar' ? 'إنشاء مفتاح في MEXC' : 'Create Key on MEXC'}</span>
              <ExternalLink className="w-3 h-3" />
            </a>

            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition cursor-pointer shadow-lg shadow-amber-500/20"
            >
              {isLoading ? (lang === 'ar' ? 'جاري الفحص...' : 'Testing...') : (lang === 'ar' ? 'حفظ وفحص الاتصال' : 'Save & Test Connection')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
