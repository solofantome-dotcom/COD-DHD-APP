import React, { useState } from 'react';
import { PieChart, BarChart3, TrendingUp, Info } from 'lucide-react';
import { KpiMetrics, DHDOrder } from '../types';

interface StatusChartsProps {
  kpis: KpiMetrics;
  orders: DHDOrder[];
}

export const StatusCharts: React.FC<StatusChartsProps> = ({ kpis, orders }) => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);

  // Status slices for the Pie/Donut Chart
  const statusSegments = [
    {
      id: 'livre',
      label: 'Livré',
      count: kpis.livreCount,
      color: '#10b981', // emerald-500
      bgClass: 'bg-emerald-500',
    },
    {
      id: 'en_circulation',
      label: 'En circulation',
      count: kpis.enCirculationCount,
      color: '#f59e0b', // amber-500
      bgClass: 'bg-amber-500',
    },
    {
      id: 'en_station',
      label: 'En station',
      count: kpis.enStationCount,
      color: '#a855f7', // purple-500
      bgClass: 'bg-purple-500',
    },
    {
      id: 'sorti_en_livraison',
      label: 'Sorti en livraison',
      count: kpis.sortiLivraisonCount,
      color: '#3b82f6', // blue-500
      bgClass: 'bg-blue-500',
    },
    {
      id: 'tentative_echouee',
      label: 'Tentative échouée',
      count: kpis.tentativeEchoueeCount,
      color: '#eab308', // yellow-500
      bgClass: 'bg-yellow-500',
    },
    {
      id: 'retourne',
      label: 'Retourné',
      count: kpis.retourneCount,
      color: '#f43f5e', // rose-500
      bgClass: 'bg-rose-500',
    },
    {
      id: 'annule',
      label: 'Annulé',
      count: kpis.annuleCount,
      color: '#ea580c', // orange-600
      bgClass: 'bg-orange-600',
    },
  ].filter((s) => s.count > 0);

  const totalSegmentCount = statusSegments.reduce((acc, s) => acc + s.count, 0) || 1;

  // Compute SVG SVG Donut arcs
  let accumulatedAngle = 0;
  const radius = 80;
  const innerRadius = 52;
  const center = 100;

  const donutPaths = statusSegments.map((segment) => {
    const percentage = segment.count / totalSegmentCount;
    const angle = percentage * 360;
    const startAngle = accumulatedAngle;
    const endAngle = accumulatedAngle + angle;
    accumulatedAngle += angle;

    const startRad = ((startAngle - 90) * Math.PI) / 180;
    const endRad = ((endAngle - 90) * Math.PI) / 180;

    const x1 = center + radius * Math.cos(startRad);
    const y1 = center + radius * Math.sin(startRad);
    const x2 = center + radius * Math.cos(endRad);
    const y2 = center + radius * Math.sin(endRad);

    const x3 = center + innerRadius * Math.cos(endRad);
    const y3 = center + innerRadius * Math.sin(endRad);
    const x4 = center + innerRadius * Math.cos(startRad);
    const y4 = center + innerRadius * Math.sin(startRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    // SVG path string for arc ring segment
    const d = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');

    return {
      ...segment,
      path: d,
      percentage: (percentage * 100).toFixed(1),
    };
  });

  // Calculate Wilaya breakdown for the Top 5 Wilayas
  const wilayaStats: Record<string, { name: string; total: number; livre: number }> = {};
  for (const o of orders) {
    const wKey = o.wilaya_name || `Wilaya ${o.wilaya_id}`;
    if (!wilayaStats[wKey]) {
      wilayaStats[wKey] = { name: wKey, total: 0, livre: 0 };
    }
    wilayaStats[wKey].total++;
    if (o.status === 'livre') {
      wilayaStats[wKey].livre++;
    }
  }

  const topWilayas = Object.values(wilayaStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const maxWilayaTotal = Math.max(...topWilayas.map((w) => w.total), 1);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Donut Chart: Distribution of En circulation vs En station vs Livré etc. */}
      <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Distribution des Statuts de Livraison
            </h3>
          </div>
          <span className="text-xs text-zinc-500">
            {totalSegmentCount} colis
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
          {/* SVG Donut */}
          <div className="relative w-48 h-48 shrink-0">
            <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
              {donutPaths.map((slice) => {
                const isHovered = hoveredSlice === slice.id;
                return (
                  <path
                    key={slice.id}
                    d={slice.path}
                    fill={slice.color}
                    className="transition-all duration-200 cursor-pointer"
                    style={{
                      opacity: hoveredSlice && !isHovered ? 0.45 : 1,
                      transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                      transformOrigin: '100px 100px',
                    }}
                    onMouseEnter={() => setHoveredSlice(slice.id)}
                    onMouseLeave={() => setHoveredSlice(null)}
                  />
                );
              })}
            </svg>

            {/* Inner text overlay */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-xs text-zinc-400 font-medium">Taux Livré</span>
              <span className="text-xl font-extrabold text-emerald-500">
                {kpis.deliveryRate.toFixed(0)}%
              </span>
              <span className="text-[10px] text-zinc-500">Efficacité COD</span>
            </div>
          </div>

          {/* Interactive Legend */}
          <div className="flex-1 w-full space-y-2">
            {donutPaths.map((slice) => (
              <div
                key={slice.id}
                onMouseEnter={() => setHoveredSlice(slice.id)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`flex items-center justify-between text-xs p-1.5 rounded-lg transition-colors cursor-pointer ${
                  hoveredSlice === slice.id
                    ? 'bg-zinc-100 dark:bg-zinc-800 font-medium'
                    : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: slice.color }}
                  />
                  <span className="text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">
                    {slice.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{slice.count}</span>
                  <span className="text-zinc-400 text-[11px] w-10 text-right">{slice.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Wilayas Performance Leaderboard */}
      <div className="lg:col-span-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Top 5 Wilayas de Destination
            </h3>
          </div>
          <span className="text-xs text-zinc-500">Volume & Taux Livré</span>
        </div>

        {topWilayas.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-xs text-zinc-400">
            Aucune donnée pour les filtres sélectionnés
          </div>
        ) : (
          <div className="space-y-3.5">
            {topWilayas.map((wilaya) => {
              const deliveryRate = wilaya.total > 0 ? (wilaya.livre / wilaya.total) * 100 : 0;
              const barWidth = (wilaya.total / maxWilayaTotal) * 100;

              return (
                <div key={wilaya.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      {wilaya.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-500">{wilaya.total} colis</span>
                      <span className="font-bold text-emerald-500">
                        {deliveryRate.toFixed(0)}% livré
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-emerald-500 h-full rounded-l-full transition-all duration-500"
                      style={{ width: `${(wilaya.livre / maxWilayaTotal) * 100}%` }}
                      title={`${wilaya.livre} livrés`}
                    />
                    <div
                      className="bg-zinc-300 dark:bg-zinc-700 h-full rounded-r-full transition-all duration-500"
                      style={{
                        width: `${((wilaya.total - wilaya.livre) / maxWilayaTotal) * 100}%`,
                      }}
                      title={`${wilaya.total - wilaya.livre} autres statuts`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Livré
            <span className="w-2 h-2 rounded-full bg-zinc-300 dark:bg-zinc-700 ml-2"></span> En cours / Autre
          </span>
          <span>58 Wilayas actives</span>
        </div>
      </div>
    </div>
  );
};
