import React from 'react';
import {
  Package,
  Sparkles,
  RefreshCw,
  Settings,
  ShieldCheck,
  Radio,
  Sun,
  Moon,
  Truck,
} from 'lucide-react';

interface HeaderProps {
  isLive: boolean;
  hasApiKey: boolean;
  isLoading: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onTriggerAiGrouping: () => void;
  isAiProcessing: boolean;
  aiCacheCount: number;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  lastUpdated: Date | null;
}

export const Header: React.FC<HeaderProps> = ({
  isLive,
  hasApiKey,
  isLoading,
  onRefresh,
  onOpenSettings,
  onTriggerAiGrouping,
  isAiProcessing,
  aiCacheCount,
  darkMode,
  onToggleDarkMode,
  lastUpdated,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-200 border-zinc-200 bg-white/90 dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Network info */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
            <Truck className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                <span>DHD Analytics</span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  COD Algérie
                </span>
              </h1>
            </div>
            <div className="flex items-center space-x-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3 text-emerald-500" />
                Réseau Ecotrack
              </span>
              <span>•</span>
              {isLive ? (
                <span className="text-emerald-500 font-medium flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> API DHD Directe
                </span>
              ) : (
                <span className="text-amber-500 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Mode Démo / Échantillon
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          {/* AI Grouping Button */}
          <button
            onClick={onTriggerAiGrouping}
            disabled={isAiProcessing}
            title="Standardiser les noms de produits messy via Gemini AI"
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all shadow-sm ${
              isAiProcessing
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 cursor-wait'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/20 hover:shadow-purple-500/30 active:scale-95'
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiProcessing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isAiProcessing ? 'IA en cours...' : 'Standardiser IA'}
            </span>
            {aiCacheCount > 0 && (
              <span className="bg-black/20 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {aiCacheCount}
              </span>
            )}
          </button>

          {/* Refresh Orders */}
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Rafraîchir les colis DHD"
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-500' : ''}`} />
          </button>

          {/* DHD Settings */}
          <button
            onClick={onOpenSettings}
            title="Paramètres de l'API DHD"
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all active:scale-95 ${
              hasApiKey
                ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10'
                : 'border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Clé API DHD</span>
          </button>

          {/* Dark / Light Toggle */}
          <button
            onClick={onToggleDarkMode}
            title={darkMode ? 'Passer en mode clair' : 'Passer en mode sombre'}
            className="p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>
        </div>
      </div>
    </header>
  );
};
