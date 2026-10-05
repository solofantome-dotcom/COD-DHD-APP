import React, { useState } from 'react';
import {
  Package,
  Copy,
  Check,
  Phone,
  MapPin,
  ExternalLink,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { DHDOrder } from '../types';
import { STATUS_CONFIG } from '../constants/wilayas';

interface OrdersDataTableProps {
  orders: DHDOrder[];
  totalOrdersCount: number;
}

export const OrdersDataTable: React.FC<OrdersDataTableProps> = ({
  orders,
  totalOrdersCount,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedTracking, setCopiedTracking] = useState<string | null>(null);
  const pageSize = 10;

  const totalPages = Math.ceil(orders.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const currentOrders = orders.slice(startIndex, startIndex + pageSize);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTracking(text);
    setTimeout(() => setCopiedTracking(null), 2000);
  };

  const formatDzd = (amount: number) => {
    return new Intl.NumberFormat('fr-DZ', {
      maximumFractionDigits: 0,
    }).format(amount) + ' DA';
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Table Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-500" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
            Détail des Colis DHD Express ({orders.length} résultats)
          </h3>
        </div>
        <div className="text-xs text-zinc-500">
          Page {currentPage} sur {totalPages}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800 text-zinc-400 font-medium">
              <th className="py-2.5 px-3">Suivi / Réf</th>
              <th className="py-2.5 px-3">Client & Téléphone</th>
              <th className="py-2.5 px-3">Destination (Wilaya)</th>
              <th className="py-2.5 px-3">Article Commandé</th>
              <th className="py-2.5 px-3">Montant COD</th>
              <th className="py-2.5 px-3">Statut DHD</th>
              <th className="py-2.5 px-3">Dernière Note / Étape</th>
              <th className="py-2.5 px-3 text-right">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {currentOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-zinc-400">
                  Aucun colis ne correspond aux critères sélectionnés.
                </td>
              </tr>
            ) : (
              currentOrders.map((order) => {
                const statusStyle = STATUS_CONFIG[order.status] || {
                  label: order.status_label || order.status,
                  color: 'text-zinc-400',
                  bg: 'bg-zinc-500/10',
                  border: 'border-zinc-500/20',
                };

                return (
                  <tr
                    key={order.id}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                  >
                    {/* Tracking & Ref */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                        <span>{order.tracking}</span>
                        <button
                          onClick={() => handleCopy(order.tracking)}
                          title="Copier le code de suivi"
                          className="text-zinc-400 hover:text-emerald-500 transition-colors"
                        >
                          {copiedTracking === order.tracking ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <span className="text-[11px] text-zinc-400 font-mono">
                        {order.reference}
                      </span>
                    </td>

                    {/* Customer & Phone */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-zinc-800 dark:text-zinc-200">
                        {order.customer_name}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                        <Phone className="w-3 h-3 text-emerald-500" />
                        <a
                          href={`tel:${order.customer_phone.replace(/\s+/g, '')}`}
                          className="hover:underline"
                        >
                          {order.customer_phone}
                        </a>
                      </div>
                    </td>

                    {/* Destination */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1 font-medium text-zinc-800 dark:text-zinc-200">
                        <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                        <span>
                          {order.wilaya_id} - {order.wilaya_name}
                        </span>
                      </div>
                      {order.commune && (
                        <span className="text-[11px] text-zinc-400 pl-4 block truncate max-w-[120px]">
                          {order.commune}
                        </span>
                      )}
                    </td>

                    {/* Product & AI Tag */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100 max-w-[160px] truncate" title={order.product_raw}>
                        {order.product_raw}
                      </div>
                      {order.standardized_product && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 mt-0.5 rounded text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          <Sparkles className="w-2.5 h-2.5" />
                          {order.standardized_product}
                        </span>
                      )}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-3 font-semibold text-zinc-900 dark:text-zinc-100">
                      <div>{formatDzd(order.price)}</div>
                      <span className="text-[10px] text-zinc-400 font-normal">
                        Frais: {formatDzd(order.shipping_cost)}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusStyle.bg} ${statusStyle.color} ${statusStyle.border}`}
                      >
                        {statusStyle.label}
                      </span>
                      {order.delivery_attempts > 1 && (
                        <span className="block text-[10px] text-amber-500 mt-0.5">
                          {order.delivery_attempts} tentatives
                        </span>
                      )}
                    </td>

                    {/* Note */}
                    <td className="py-3 px-3 text-zinc-500 dark:text-zinc-400 text-[11px] max-w-[180px] truncate" title={order.last_note || '—'}>
                      {order.last_note || '—'}
                    </td>

                    {/* Date */}
                    <td className="py-3 px-3 text-right text-zinc-400 text-[11px] whitespace-nowrap">
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
          <span className="text-xs text-zinc-500">
            Affichage de {startIndex + 1} à {Math.min(startIndex + pageSize, orders.length)} sur {orders.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-medium px-2 text-zinc-700 dark:text-zinc-300">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
