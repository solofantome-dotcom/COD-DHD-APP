import React, { useState } from 'react';
import {
  X,
  Key,
  Globe,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Radio,
  ExternalLink,
  Save,
  HelpCircle,
} from 'lucide-react';

interface DhdSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentApiKeyMasked: string;
  hasApiKey: boolean;
  currentApiUrl: string;
  isForceMock: boolean;
  onSaveConfig: (apiKey: string, apiUrl: string, forceMock: boolean) => Promise<void>;
  onTestConnection: (apiKey: string, apiUrl: string) => Promise<{ success: boolean; message: string }>;
}

export const DhdSettingsModal: React.FC<DhdSettingsModalProps> = ({
  isOpen,
  onClose,
  currentApiKeyMasked,
  hasApiKey,
  currentApiUrl,
  isForceMock,
  onSaveConfig,
  onTestConnection,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiUrlInput, setApiUrlInput] = useState(currentApiUrl || 'https://dhd.ecotrack.dz/api/v1');
  const [useMock, setUseMock] = useState(isForceMock);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await onTestConnection(apiKeyInput, apiUrlInput);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Erreur lors du test de connexion',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSaveConfig(apiKeyInput, apiUrlInput, useMock);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">
                Configuration API DHD Express (Ecotrack)
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Liaison sécurisée serveur à serveur pour vos colis COD
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode selector */}
        <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2">
          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
            Mode d'Alimentation des Données :
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setUseMock(false)}
              className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
                !useMock
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-500" />
                API DHD Directe
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Connecte votre compte DHD/Ecotrack réel
              </p>
            </button>

            <button
              type="button"
              onClick={() => setUseMock(true)}
              className={`p-2.5 rounded-lg border text-left text-xs font-medium transition-all ${
                useMock
                  ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              <div className="font-bold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                Mode Démo / Test
              </div>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                Données COD algériennes simulées
              </p>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          {/* API URL */}
          <div className="space-y-1">
            <label className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-zinc-400" />
              URL de l'API DHD (Ecotrack)
            </label>
            <input
              type="text"
              value={apiUrlInput}
              onChange={(e) => setApiUrlInput(e.target.value)}
              placeholder="https://dhd.ecotrack.dz/api/v1"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* API Token */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
                <Key className="w-3.5 h-3.5 text-zinc-400" />
                Jeton / Clé API DHD (Bearer Token)
              </label>
              {hasApiKey && (
                <span className="text-[11px] text-emerald-500 font-mono">
                  Actuelle : {currentApiKeyMasked}
                </span>
              )}
            </div>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder={hasApiKey ? 'Laisser vide pour conserver la clé actuelle' : 'Ex: 123|abcdefghijk...'}
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Test connection output */}
          {testResult && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-600 dark:text-rose-400'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Instructions note */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-950/60 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 space-y-1">
            <div className="font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
              Où trouver votre clé API DHD ?
            </div>
            <p>
              Connectez-vous à votre portail DHD / Ecotrack &gt; <strong>Mon Compte &gt; Paramètres Développeur / API</strong> pour générer votre jeton sécurisé.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || (!apiKeyInput && !hasApiKey)}
              className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-medium transition-colors disabled:opacity-40"
            >
              {isTesting ? 'Test en cours...' : 'Tester la Connexion'}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
