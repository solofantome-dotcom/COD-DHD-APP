import React from 'react';
import {
  CheckCircle2,
  XCircle,
  Truck,
  Warehouse,
  AlertTriangle,
  Clock,
  TrendingUp,
  Package,
  Coins,
  Send,
} from 'lucide-react';
import { KpiMetrics } from '../types';

interface KpiCardsProps {
  kpis: KpiMetrics;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis }) => {
  const formatDzd = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      maximumFractionDigits: 0,
    }).format(amount) + ' DA';
  };

  return (
    <div className="space-y-4">
      {/* 3 Core Primary COD Cards: Delivery %, Retour %, Delivered Parcels & Total Revenue */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Taux de Livraison */}
        <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Taux de Livraison
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400">
              {kpis.deliveryRate.toFixed(1)}%
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              ({kpis.livreCount} / {kpis.concludedCount} clôturés)
            </span>
          </div>
          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
            <span>Formule : Livré / (Livré + Retour + Annulé)</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, kpis.deliveryRate)}%` }}
            />
          </div>
        </div>

        {/* Taux de Retour */}
        <div className="relative overflow-hidden rounded-2xl border border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Taux de Retour
            </span>
            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-500">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
              {kpis.retourRate.toFixed(1)}%
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              ({kpis.retourneCount + kpis.annuleCount} non livrés)
            </span>
          </div>
          <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
            <span>
              {kpis.retourneCount} retournés • {kpis.annuleCount} annulés
            </span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-rose-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, kpis.retourRate)}%` }}
            />
          </div>
        </div>

        {/* Total Colis Livrés & Encaissement COD */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 via-blue-500/5 to-transparent p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              Total Livrés & Encaissés
            </span>
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-500">
              <Coins className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              {kpis.livreCount}
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              colis livrés
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">Cash Collecté (COD) :</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formatDzd(kpis.totalDeliveredRevenue)}
            </span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${kpis.totalOrders > 0 ? (kpis.livreCount / kpis.totalOrders) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Total Orders Sent */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/80 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total Expédiés (DHD)
            </span>
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
              <Send className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
              {kpis.totalOrders}
            </span>
            <span className="text-xs text-zinc-500">colis traités</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-zinc-500 dark:text-zinc-400">En cours d'acheminement :</span>
            <span className="font-semibold text-amber-500">{kpis.activeInTransitCount} colis</span>
          </div>
          <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-zinc-500 h-full rounded-full transition-all duration-500"
              style={{
                width: `${kpis.totalOrders > 0 ? (kpis.activeInTransitCount / kpis.totalOrders) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Status Breakdown Counts: Remaining Active In-Transit Orders */}
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Répartition des Statuts Actifs ({kpis.activeInTransitCount} en transit)
            </h3>
          </div>
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            Cash en circulation : <strong className="text-amber-500">{formatDzd(kpis.totalPendingRevenue)}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* En station */}
          <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400">
              <span className="text-xs font-medium">En station</span>
              <Warehouse className="w-4 h-4" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {kpis.enStationCount}
              </span>
              <span className="text-[10px] text-zinc-500">Hub local</span>
            </div>
          </div>

          {/* En circulation */}
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400">
              <span className="text-xs font-medium">En circulation</span>
              <Truck className="w-4 h-4" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {kpis.enCirculationCount}
              </span>
              <span className="text-[10px] text-zinc-500">Inter-wilayas</span>
            </div>
          </div>

          {/* Sorti en livraison */}
          <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400">
              <span className="text-xs font-medium">Sorti en livraison</span>
              <Send className="w-4 h-4" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {kpis.sortiLivraisonCount}
              </span>
              <span className="text-[10px] text-zinc-500">Avec livreur</span>
            </div>
          </div>

          {/* Tentative échouée */}
          <div className="p-3 rounded-xl bg-yellow-500/5 border border-yellow-500/20 flex flex-col justify-between">
            <div className="flex items-center justify-between text-yellow-600 dark:text-yellow-400">
              <span className="text-xs font-medium">Tentative échouée</span>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {kpis.tentativeEchoueeCount}
              </span>
              <span className="text-[10px] text-zinc-500">À relancer</span>
            </div>
          </div>

          {/* En attente */}
          <div className="p-3 rounded-xl bg-zinc-500/5 border border-zinc-500/20 flex flex-col justify-between col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-zinc-600 dark:text-zinc-400">
              <span className="text-xs font-medium">En attente</span>
              <Clock className="w-4 h-4" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                {kpis.enAttenteCount}
              </span>
              <span className="text-[10px] text-zinc-500">Préparation</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
