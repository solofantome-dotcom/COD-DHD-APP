import React, { useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  ChevronRight,
  TrendingUp,
  Tag,
  CheckCircle,
  XCircle,
  Truck,
  Coins,
  ArrowUpDown,
  Search,
} from 'lucide-react';
import { StandardizedProductGroup } from '../types';

interface StandardizedProductsTableProps {
  groups: StandardizedProductGroup[];
  onTriggerAi: () => void;
  isAiProcessing: boolean;
  totalRawProductsCount: number;
}

export const StandardizedProductsTable: React.FC<StandardizedProductsTableProps> = ({
  groups,
  onTriggerAi,
  isAiProcessing,
  totalRawProductsCount,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [sortBy, setSortBy] = useState<'total' | 'livre' | 'deliveryRate' | 'revenue'>('total');
  const [sortAsc, setSortAsc] = useState(false);

  const toggleExpand = (cat: string) => {
    setExpandedCategory(expandedCategory === cat ? null : cat);
  };

  const handleSort = (field: 'total' | 'livre' | 'deliveryRate' | 'revenue') => {
    if (sortBy === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(field);
      setSortAsc(false);
    }
  };

  const formatDzd = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      maximumFractionDigits: 0,
    }).format(amount) + ' DA';
  };

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    const q = filterQuery.toLowerCase();
    return (
      g.category.toLowerCase().includes(q) ||
      g.rawVariants.some((v) => v.toLowerCase().includes(q))
    );
  });

  // Sort groups
  const sortedGroups = [...filteredGroups].sort((a, b) => {
    let diff = 0;
    if (sortBy === 'total') diff = a.totalOrders - b.totalOrders;
    else if (sortBy === 'livre') diff = a.livreCount - b.livreCount;
    else if (sortBy === 'deliveryRate') diff = a.deliveryRate - b.deliveryRate;
    else if (sortBy === 'revenue') diff = a.totalDeliveredRevenue - b.totalDeliveredRevenue;

    return sortAsc ? diff : -diff;
  });

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header & AI action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
              Performance par Produit Standardisé (IA Gemini)
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Regroupement automatique des variantes Shopify/Releasit COD en catégories propres
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick search inside table */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Filtrer produit..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-purple-500 w-40 sm:w-48"
            />
          </div>

          {/* Trigger AI Standardization */}
          <button
            onClick={onTriggerAi}
            disabled={isAiProcessing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all active:scale-95 disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiProcessing ? 'animate-spin' : ''}`} />
            <span>{isAiProcessing ? 'Analyse Gemini...' : 'Re-grouper avec IA'}</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-medium">
              <th className="py-2.5 px-3">Produit Standardisé</th>
              <th
                onClick={() => handleSort('total')}
                className="py-2.5 px-3 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <div className="flex items-center gap-1">
                  <span>Total Colis</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('livre')}
                className="py-2.5 px-3 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <div className="flex items-center gap-1">
                  <span>Livrés</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleSort('deliveryRate')}
                className="py-2.5 px-3 cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <div className="flex items-center gap-1">
                  <span>Taux Livraison %</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-2.5 px-3">Retournés</th>
              <th className="py-2.5 px-3">En Circulation</th>
              <th
                onClick={() => handleSort('revenue')}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Chiffre Encaissé (DA)</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {sortedGroups.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-zinc-400">
                  Aucun produit ne correspond aux filtres.
                </td>
              </tr>
            ) : (
              sortedGroups.map((group) => {
                const isExpanded = expandedCategory === group.category;
                const hasHighRate = group.deliveryRate >= 70;

                return (
                  <React.Fragment key={group.category}>
                    <tr
                      onClick={() => toggleExpand(group.category)}
                      className={`cursor-pointer transition-colors group ${
                        isExpanded
                          ? 'bg-purple-500/5 dark:bg-purple-500/10'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      {/* Product Name & Variant count */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <button className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-purple-500" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </button>
                          <div>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
                              {group.category}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 mt-0.5">
                              <Tag className="w-3 h-3 text-purple-400" />
                              <span>
                                {group.rawVariants.length} variante
                                {group.rawVariants.length > 1 ? 's' : ''} Shopify
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Total Orders */}
                      <td className="py-3 px-3 font-semibold text-zinc-800 dark:text-zinc-200">
                        {group.totalOrders}
                      </td>

                      {/* Livrés */}
                      <td className="py-3 px-3">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {group.livreCount}
                        </span>
                      </td>

                      {/* Delivery Rate % */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-extrabold ${
                              hasHighRate
                                ? 'text-emerald-500'
                                : group.deliveryRate >= 50
                                  ? 'text-amber-500'
                                  : 'text-rose-500'
                            }`}
                          >
                            {group.deliveryRate.toFixed(1)}%
                          </span>
                          <div className="w-12 bg-zinc-200 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                hasHighRate
                                  ? 'bg-emerald-500'
                                  : group.deliveryRate >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                              }`}
                              style={{ width: `${Math.min(100, group.deliveryRate)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Retournés */}
                      <td className="py-3 px-3 text-rose-500 font-medium">
                        {group.retourneCount}
                      </td>

                      {/* En circulation */}
                      <td className="py-3 px-3 text-amber-500 font-medium">
                        {group.enCirculationCount}
                      </td>

                      {/* Chiffre d'Affaires Encaissé */}
                      <td className="py-3 px-3 text-right">
                        <div className="font-bold text-zinc-900 dark:text-zinc-50">
                          {formatDzd(group.totalDeliveredRevenue)}
                        </div>
                        <div className="text-[10px] text-zinc-400">
                          sur {formatDzd(group.totalPotentialRevenue)}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable row showing raw Shopify / Releasit strings */}
                    {isExpanded && (
                      <tr className="bg-purple-500/5 dark:bg-purple-500/10">
                        <td colSpan={7} className="px-6 py-3 border-t border-b border-purple-500/20">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-purple-600 dark:text-purple-300">
                              <Sparkles className="w-3 h-3" />
                              <span>Variantes brutes saisies par les clients (Shopify / Releasit COD) :</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {group.rawVariants.map((raw, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-purple-500/20 text-zinc-800 dark:text-zinc-200 text-[11px] font-mono shadow-2xs"
                                >
                                  "{raw}"
                                </span>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
