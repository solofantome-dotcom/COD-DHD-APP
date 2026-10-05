/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { KpiCards } from './components/KpiCards';
import { StatusCharts } from './components/StatusCharts';
import { StandardizedProductsTable } from './components/StandardizedProductsTable';
import { OrdersDataTable } from './components/OrdersDataTable';
import { DhdSettingsModal } from './components/DhdSettingsModal';
import { DHDOrder, StandardizedProductGroup } from './types';
import { DatePresetKey, DateRange, getDateRangeForPreset } from './utils/datePresets';
import { calculateKpis, groupOrdersByStandardizedProduct } from './utils/kpiCalculator';
import {
  Sparkles,
  LayoutDashboard,
  Shirt,
  ListOrdered,
  AlertTriangle,
  Download,
  CheckCircle,
  Truck,
} from 'lucide-react';

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dhd_dark_mode');
      if (saved !== null) return saved === 'true';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true;
  });

  // Date and filter state
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const preset: DatePresetKey = 'ALL';
    const dates = getDateRangeForPreset(preset);
    return { preset, ...dates };
  });
  const [selectedWilaya, setSelectedWilaya] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Orders and API state
  const [orders, setOrders] = useState<DHDOrder[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // DHD Configuration state
  const [hasApiKey, setHasApiKey] = useState<boolean>(false);
  const [apiKeyMasked, setApiKeyMasked] = useState<string>('');
  const [apiUrl, setApiUrl] = useState<string>('https://dhd.ecotrack.dz/api/v1');
  const [isLive, setIsLive] = useState<boolean>(false);
  const [forceMock, setForceMock] = useState<boolean>(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Gemini AI state
  const [productMapping, setProductMapping] = useState<Record<string, string>>({});
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiNotification, setAiNotification] = useState<string | null>(null);

  // UI active tab
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders'>('overview');

  // Synchronize dark mode class with root html element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('dhd_dark_mode', String(darkMode));
  }, [darkMode]);

  // Load initial DHD config from server
  const loadDhdConfig = async () => {
    try {
      const res = await fetch('/api/dhd/config');
      if (res.ok) {
        const data = await res.json();
        setHasApiKey(data.hasApiKey);
        setApiKeyMasked(data.apiKeyMasked);
        setApiUrl(data.apiUrl);
        setForceMock(data.forceMock);
        setIsLive(data.hasApiKey && !data.forceMock);
      }
    } catch (err) {
      console.error('Failed to load DHD config:', err);
    }
  };

  useEffect(() => {
    loadDhdConfig();
  }, []);

  // Fetch orders from backend
  const fetchOrders = async (forceRefresh: boolean = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (forceRefresh) params.append('forceRefresh', 'true');
      if (dateRange.preset === 'ALL') {
        params.append('allTime', 'true');
      } else {
        if (dateRange.startDate) params.append('startDate', dateRange.startDate);
        if (dateRange.endDate) params.append('endDate', dateRange.endDate);
      }
      if (selectedWilaya && selectedWilaya !== 'all') params.append('wilayaId', selectedWilaya);
      if (selectedStatus && selectedStatus !== 'all') params.append('status', selectedStatus);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await fetch(`/api/dhd/orders?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Erreur serveur (${res.status}): ${res.statusText}`);
      }

      const data = await res.json();
      if (data.success) {
        setOrders(data.orders || []);
        setIsLive(data.isLiveFetch);
        setHasApiKey(data.hasApiKey);
        setForceMock(data.forceMock);
        setLastUpdated(new Date());

        // Extract products for AI mapping if not yet categorized
        const uniqueProducts = Array.from(
          new Set(
            (data.orders as DHDOrder[])
              .map((o) => o.product_raw)
              .filter((p) => Boolean(p && p.trim()))
          )
        );

        // Pre-populate any existing mappings returned from server
        const initialMap: Record<string, string> = { ...productMapping };
        for (const order of data.orders) {
          if (order.standardized_product) {
            initialMap[order.product_raw] = order.standardized_product;
          }
        }
        setProductMapping(initialMap);

        // If some products are not yet mapped, trigger Gemini AI in background
        const unmapped = uniqueProducts.filter((p) => !initialMap[p]);
        if (unmapped.length > 0 && !isAiProcessing) {
          triggerGeminiProductGrouping(uniqueProducts);
        }
      } else {
        throw new Error(data.error || 'Erreur lors de la récupération des commandes.');
      }
    } catch (err: any) {
      console.error('Fetch orders error:', err);
      setError(err.message || 'Impossible de charger les données DHD.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [dateRange.startDate, dateRange.endDate, selectedWilaya, selectedStatus]);

  // Search debounce or client-side refine
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return orders;
    const q = searchQuery.toLowerCase().trim();
    return orders.filter(
      (o) =>
        o.tracking.toLowerCase().includes(q) ||
        o.reference.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.customer_phone.includes(q) ||
        o.product_raw.toLowerCase().includes(q) ||
        (o.standardized_product && o.standardized_product.toLowerCase().includes(q)) ||
        o.wilaya_name.toLowerCase().includes(q)
    );
  }, [orders, searchQuery]);

  // Calculate real-time COD KPIs
  const kpis = useMemo(() => {
    return calculateKpis(filteredOrders);
  }, [filteredOrders]);

  // Group orders by AI standardized product name
  const standardizedProductGroups = useMemo(() => {
    return groupOrdersByStandardizedProduct(filteredOrders, productMapping);
  }, [filteredOrders, productMapping]);

  // Call Gemini AI endpoint to standardize messy product names
  const triggerGeminiProductGrouping = async (productList?: string[]) => {
    const listToProcess =
      productList ||
      Array.from(
        new Set(
          orders.map((o) => o.product_raw).filter((p) => Boolean(p && p.trim()))
        )
      );

    if (listToProcess.length === 0) return;

    setIsAiProcessing(true);
    try {
      const response = await fetch('/api/ai/standardize-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: listToProcess }),
      });

      if (!response.ok) {
        throw new Error('Échec de la standardisation IA');
      }

      const result = await response.json();
      if (result.success && result.mapping) {
        setProductMapping((prev) => ({ ...prev, ...result.mapping }));
        setAiNotification(
          `✨ ${Object.keys(result.mapping).length} variantes regroupées avec succès par Gemini !`
        );
        setTimeout(() => setAiNotification(null), 4000);
      }
    } catch (err: any) {
      console.warn('AI standardization error:', err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Date Range Presets Handler
  const handleSelectDatePreset = (preset: DatePresetKey) => {
    const range = getDateRangeForPreset(preset);
    setDateRange({
      preset,
      startDate: range.startDate,
      endDate: range.endDate,
    });
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setDateRange({
      preset: 'CUSTOM',
      startDate: start,
      endDate: end,
    });
  };

  // Save DHD API configuration
  const handleSaveDhdConfig = async (
    apiKey: string,
    apiUrlVal: string,
    forceMockVal: boolean
  ) => {
    const response = await fetch('/api/dhd/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey,
        apiUrl: apiUrlVal,
        forceMock: forceMockVal,
      }),
    });

    if (response.ok) {
      await loadDhdConfig();
      await fetchOrders();
    }
  };

  // Test DHD API connection
  const handleTestConnection = async (apiKey: string, apiUrlVal: string) => {
    const response = await fetch('/api/dhd/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey, apiUrl: apiUrlVal }),
    });

    return await response.json();
  };

  // Export CSV of filtered orders
  const exportToCsv = () => {
    if (filteredOrders.length === 0) return;

    const headers = [
      'Code de Suivi',
      'Référence',
      'Client',
      'Téléphone',
      'Wilaya',
      'Commune',
      'Produit Brut (Shopify)',
      'Produit Standardisé (IA)',
      'Montant COD (DA)',
      'Statut',
      'Dernière Note',
      'Date Création',
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.tracking}"`,
      `"${o.reference}"`,
      `"${o.customer_name}"`,
      `"${o.customer_phone}"`,
      `"${o.wilaya_name}"`,
      `"${o.commune || ''}"`,
      `"${o.product_raw.replace(/"/g, '""')}"`,
      `"${(o.standardized_product || '').replace(/"/g, '""')}"`,
      o.price,
      `"${o.status_label}"`,
      `"${(o.last_note || '').replace(/"/g, '""')}"`,
      `"${o.created_at}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `DHD_COD_Export_${dateRange.startDate}_${dateRange.endDate}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col antialiased selection:bg-emerald-500 selection:text-white transition-colors duration-200">
      {/* Top Navbar */}
      <Header
        isLive={isLive}
        hasApiKey={hasApiKey}
        isLoading={isLoading}
        onRefresh={() => fetchOrders(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onTriggerAiGrouping={() => triggerGeminiProductGrouping()}
        isAiProcessing={isAiProcessing}
        aiCacheCount={Object.keys(productMapping).length}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        lastUpdated={lastUpdated}
      />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Toast / Notification Banner */}
        {aiNotification && (
          <div className="p-3 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-transparent border border-purple-500/30 rounded-xl flex items-center justify-between text-xs text-purple-700 dark:text-purple-300 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>{aiNotification}</span>
            </div>
            <button
              onClick={() => setAiNotification(null)}
              className="text-purple-400 hover:text-purple-600 font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Live vs Demo Notice banner when in Demo Mode */}
        {!isLive && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-800 dark:text-amber-200">
            <div className="flex items-center gap-2.5">
              <span className="flex h-2.5 w-2.5 relative shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
              </span>
              <span>
                <strong>Mode Démo Algérie :</strong> Visualisation avec échantillons Shopify/Releasit réalistes (58 Wilayas, statuts Ecotrack).
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-semibold shrink-0 shadow-sm transition-all"
            >
              Connecter votre Clé API DHD
            </button>
          </div>
        )}

        {/* Filter Controls: Date presets + 58 Wilayas + Status + Search */}
        <FilterBar
          dateRange={dateRange}
          onSelectDatePreset={handleSelectDatePreset}
          onCustomDateChange={handleCustomDateChange}
          selectedWilaya={selectedWilaya}
          onSelectWilaya={setSelectedWilaya}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          totalFilteredOrders={filteredOrders.length}
          totalOrders={orders.length}
        />

        {/* View Tabs & Export Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center p-1 bg-zinc-200/70 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'overview'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Vue Globale & Graphiques</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'products'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Shirt className="w-3.5 h-3.5 text-purple-500" />
              <span>Produits IA ({standardizedProductGroups.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg transition-all ${
                activeTab === 'orders'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Colis DHD ({filteredOrders.length})</span>
            </button>
          </div>

          {/* Export CSV button */}
          <button
            onClick={exportToCsv}
            disabled={filteredOrders.length === 0}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold shadow-xs transition-colors disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter CSV ({filteredOrders.length})</span>
          </button>
        </div>

        {/* Loading state indicator on first full sync */}
        {isLoading && orders.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 shadow-xs">
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
              <Truck className="w-8 h-8 animate-bounce" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                Synchronisation DHD Express en cours...
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm">
                Téléchargement et analyse de l'ensemble de votre historique de colis (350+ commandes) depuis la plateforme DHD.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Tab 1: Overview Dashboard with KPIs, Charts, and Top Products */}
            {activeTab === 'overview' && (
              <div className="space-y-6 animate-in fade-in">
                {/* Custom E-commerce KPI Cards */}
                <KpiCards kpis={kpis} />

                {/* Distribution Charts (Pie/Donut & Wilaya Top 5) */}
                <StatusCharts kpis={kpis} orders={filteredOrders} />

                {/* AI-Standardized Products Breakdown preview */}
                <StandardizedProductsTable
                  groups={standardizedProductGroups}
                  onTriggerAi={() => triggerGeminiProductGrouping()}
                  isAiProcessing={isAiProcessing}
                  totalRawProductsCount={orders.length}
                />
              </div>
            )}

            {/* Tab 2: Standardized Products Focused Table */}
            {activeTab === 'products' && (
              <div className="space-y-4 animate-in fade-in">
                <StandardizedProductsTable
                  groups={standardizedProductGroups}
                  onTriggerAi={() => triggerGeminiProductGrouping()}
                  isAiProcessing={isAiProcessing}
                  totalRawProductsCount={orders.length}
                />
              </div>
            )}

            {/* Tab 3: Detailed Orders Table */}
            {activeTab === 'orders' && (
              <div className="space-y-4 animate-in fade-in">
                <OrdersDataTable
                  orders={filteredOrders}
                  totalOrdersCount={orders.length}
                />
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800/80 py-6 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-emerald-500" />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              DHD Analytics COD
            </span>
            <span>• E-Commerce Algérien &amp; Réseau Ecotrack</span>
          </div>
          <div>
            Intégration Google Gemini AI • Couverture 58 Wilayas
          </div>
        </div>
      </footer>

      {/* Settings Modal */}
      <DhdSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentApiKeyMasked={apiKeyMasked}
        hasApiKey={hasApiKey}
        currentApiUrl={apiUrl}
        isForceMock={forceMock}
        onSaveConfig={handleSaveDhdConfig}
        onTestConnection={handleTestConnection}
      />
    </div>
  );
}
