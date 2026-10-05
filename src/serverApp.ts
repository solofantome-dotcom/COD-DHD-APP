import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { generateRealisticMockOrders } from './data/mockOrders.ts';
import { DHDOrder, DeliveryStatus } from './types.ts';
import { ALGERIA_WILAYAS } from './constants/wilayas.ts';

dotenv.config();

export const serverApp = express();
serverApp.use(express.json());

// Live DHD / Ecotrack API configuration
const DEFAULT_DHD_TOKEN = 'LZZy5WZqspOY8jSHPSbotPdKsHa4X8KhlyIMZe0HYMtxrrXKYd44Z8YKDTjc';
const DEFAULT_DHD_URL = 'https://platform.dhd-dz.com/api/v1';

let dhdConfig = {
  apiKey: process.env.DHD_API_KEY || DEFAULT_DHD_TOKEN,
  apiUrl: process.env.DHD_API_URL || DEFAULT_DHD_URL,
  forceMock: false,
};

// Gemini AI client initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Cache for standardized product names
const productStandardizationCache: Record<string, string> = {
  'Sketchers Gaxing  - Vert Militaire / 40': 'Skechers Gaxing Vert',
  'Skechers Gaxing  - Blanc / 41': 'Skechers Gaxing Blanc',
  'CASAB Bluegris/ L': 'Ensemble Casablanca Bluegris',
  'CASAB Bluegris /L': 'Ensemble Casablanca Bluegris',
  'CASAB Bluegris/ XL': 'Ensemble Casablanca Bluegris',
  'SUMME bleu noir/ 2XL': 'Ensemble Summer Bleu Noir',
  'SUMME Blanc/ XL': 'Ensemble Summer Blanc',
  "LV'MO Black/ XL": 'Ensemble Louis Vuitton Black',
  "LV'MODELE 2026  - Noir / XL": 'Ensemble Louis Vuitton 2026 Noir',
  'survet noir XL': 'Survêtement Noir',
  'Survetement Black - XL': 'Survêtement Noir',
  'Survet noir taille L': 'Survêtement Noir',
  'SURVÊTEMENT NOIR - 2XL': 'Survêtement Noir',
  'Survetement Black - L': 'Survêtement Noir',
  'T-shirt m': 'T-Shirt Basique',
  'T-Shirt Blanc Taille M': 'T-Shirt Basique',
  'tshirt blanc oversize L': 'T-Shirt Basique',
  'ensemble lin beige L': 'Ensemble Lin',
  'Ensemble Lin - BEIGE XL': 'Ensemble Lin',
  'ensemble lin noir M': 'Ensemble Lin',
  'ensemble lin - BEIGE': 'Ensemble Lin',
  'Robe longue fleurie S': 'Robe Longue Fleurie',
  'robe fleurie taille M': 'Robe Longue Fleurie',
  'Pantalon Cargo Kaki 42': 'Pantalon Cargo Kaki',
  'cargo kaki taille 40': 'Pantalon Cargo Kaki',
  'Sweat Capuche Gris L': 'Sweat à Capuche',
  'Hoodie Oversize Gris XL': 'Sweat à Capuche',
};

// Normalize status string from DHD/Ecotrack payload
function normalizeDhdStatus(rawStatus: string, globalStatus?: string): { status: DeliveryStatus; label: string } {
  const s = (rawStatus || '').toLowerCase().trim();
  const g = (globalStatus || '').toLowerCase().trim();

  // Delivered
  if (s.includes('livr') || g === 'livré' || g === 'livre' || s === 'delivered') {
    return { status: 'livre', label: 'Livré' };
  }

  // Returned
  if (
    s.includes('retour') ||
    g === 'retour' ||
    s.includes('refus') ||
    s === 'returned' ||
    s === 'retour_reçu' ||
    s === 'retour_en_traitement'
  ) {
    return { status: 'retourne', label: 'Retourné' };
  }

  // Cancelled
  if (s.includes('annul') || s.includes('canceled') || s.includes('cancelled')) {
    return { status: 'annule', label: 'Annulé' };
  }

  // Out for delivery
  if (s.includes('sorti') || s.includes('distribution') || s === 'out_for_delivery') {
    return { status: 'sorti_en_livraison', label: 'Sorti en livraison' };
  }

  // At hub/station
  if (s.includes('station') || s.includes('centre') || s.includes('hub') || s === 'at_station') {
    return { status: 'en_station', label: 'En station' };
  }

  // In transit between wilayas
  if (s.includes('circulation') || s.includes('transit') || s.includes('expedie') || s === 'in_transit') {
    return { status: 'en_circulation', label: 'En circulation' };
  }

  // Failed attempt / no answer / rescheduled
  if (
    s.includes('tentative') ||
    s.includes('echou') ||
    s.includes('report') ||
    s.includes('injoignable') ||
    s.includes('rdv') ||
    s.includes('attente_reponse')
  ) {
    return { status: 'tentative_echouee', label: 'Tentative échouée' };
  }

  return { status: 'en_attente', label: 'En attente' };
}

// In-memory cache for live DHD orders (cached for 5 minutes)
let cachedOrdersData: { orders: DHDOrder[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Helper to normalize DHD API base URL (always ensures /api/v1 is present)
function getNormalizedApiUrl(baseUrl: string): string {
  let url = (baseUrl || DEFAULT_DHD_URL).trim().replace(/\/$/, '');
  if (!url.includes('/api/v1')) {
    url = `${url}/api/v1`;
  }
  return url;
}

// Helper to fetch an individual page from DHD Ecotrack
async function fetchDhdPage(apiUrl: string, apiKey: string, page: number, startDate?: string, endDate?: string) {
  const params = new URLSearchParams();
  params.append('page', String(page));

  // CRITICAL: DHD / Ecotrack only returns all historical orders when start_date is set!
  // If no start_date is passed, DHD truncates results to 28 active orders.
  const effectiveStartDate = startDate || '2020-01-01';
  params.append('start_date', effectiveStartDate);

  if (endDate) {
    params.append('end_date', endDate);
  }

  const cleanBase = getNormalizedApiUrl(apiUrl);
  const fetchUrl = `${cleanBase}/get/orders?${params.toString()}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  const apiResponse = await fetch(fetchUrl, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: 'application/json',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!apiResponse.ok) {
    throw new Error(`DHD API page ${page} error (${apiResponse.status}): ${apiResponse.statusText}`);
  }

  return await apiResponse.json();
}

// Parse raw DHD order item into standardized DHDOrder
function parseDhdOrderItem(item: any): DHDOrder {
  const statusInfo = normalizeDhdStatus(item.status || '', item.global_status || '');
  const wId = Number(item.wilaya_id || item.wilaya_code || 16);
  const wilayaObj = ALGERIA_WILAYAS.find((w) => w.id === wId);
  const wilayaName = wilayaObj ? wilayaObj.name : item.wilaya || `Wilaya ${wId}`;

  let lastNote = item.note || item.last_note || '';
  if (!lastNote && Array.isArray(item.status_reason) && item.status_reason.length > 0) {
    const latestReason = item.status_reason[item.status_reason.length - 1];
    lastNote = [latestReason.remarque, latestReason.station, latestReason.livreur].filter(Boolean).join(' • ');
  }

  return {
    id: String(item.tracking || item.id || Math.random()),
    tracking: String(item.tracking || item.code_suivi || `DHD-${item.id}`),
    reference: String(item.reference || `#${item.id}`),
    customer_name: String(item.client || item.customer_name || 'Client'),
    customer_phone: String(item.phone || item.telephone || ''),
    wilaya_id: wId,
    wilaya_name: wilayaName,
    commune: String(item.adresse || item.commune || ''),
    address: String(item.adresse || ''),
    product_raw: String(item.products || item.produit || item.product || 'Produit'),
    price: Number(item.montant || item.price || 0),
    shipping_cost: Number(item.tarif_prestation || item.shipping_fee || 500),
    status: statusInfo.status,
    status_label: statusInfo.label,
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.last_updated_at || item.created_at || new Date().toISOString(),
    delivery_attempts: Number(Array.isArray(item.status_reason) ? item.status_reason.length : 1),
    last_note: lastNote,
  };
}

// -------------------------------------------------------------
// 1. DHD / Ecotrack API Integration & Data Fetching Route
// -------------------------------------------------------------
serverApp.get('/api/dhd/orders', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, wilayaId, status, search, allTime, forceRefresh } = req.query as {
      startDate?: string;
      endDate?: string;
      wilayaId?: string;
      status?: string;
      search?: string;
      allTime?: string;
      forceRefresh?: string;
    };

    let allOrders: DHDOrder[] = [];
    let isLiveFetch = false;
    let liveError: string | null = null;

    const now = Date.now();
    const canUseCache =
      forceRefresh !== 'true' &&
      cachedOrdersData &&
      now - cachedOrdersData.timestamp < CACHE_TTL_MS;

    if (canUseCache && cachedOrdersData) {
      allOrders = [...cachedOrdersData.orders];
      isLiveFetch = true;
    } else if (dhdConfig.apiKey && !dhdConfig.forceMock) {
      try {
        isLiveFetch = true;

        // 1. Fetch Page 1 first to determine total items and total pages
        const page1Data = await fetchDhdPage(
          dhdConfig.apiUrl,
          dhdConfig.apiKey,
          1,
          allTime === 'true' ? '2020-01-01' : startDate,
          allTime === 'true' ? undefined : endDate
        );

        const totalPages = Math.min(Number(page1Data.last_page || 1), 30);
        let rawItems: any[] = [];

        if (Array.isArray(page1Data?.data)) {
          rawItems = rawItems.concat(page1Data.data);
        } else if (Array.isArray(page1Data)) {
          rawItems = rawItems.concat(page1Data);
        }

        // 2. Fetch remaining pages (e.g. pages 2 to 9) concurrently
        if (totalPages > 1) {
          const remainingPages: number[] = [];
          for (let p = 2; p <= totalPages; p++) {
            remainingPages.push(p);
          }

          const pageResults = await Promise.allSettled(
            remainingPages.map((p) =>
              fetchDhdPage(
                dhdConfig.apiUrl,
                dhdConfig.apiKey,
                p,
                allTime === 'true' ? '2020-01-01' : startDate,
                allTime === 'true' ? undefined : endDate
              )
            )
          );

          for (const res of pageResults) {
            if (res.status === 'fulfilled') {
              const pData = res.value;
              if (Array.isArray(pData?.data)) {
                rawItems = rawItems.concat(pData.data);
              } else if (Array.isArray(pData)) {
                rawItems = rawItems.concat(pData);
              }
            }
          }
        }

        // Parse all fetched items into clean DHDOrder objects
        const parsedOrders = rawItems.map(parseDhdOrderItem);

        allOrders = parsedOrders;
        cachedOrdersData = { orders: parsedOrders, timestamp: Date.now() };
      } catch (err: any) {
        console.error('Error fetching all pages from live DHD API:', err.message);
        liveError = err.message;
        if (cachedOrdersData) {
          allOrders = [...cachedOrdersData.orders];
          isLiveFetch = true;
        } else {
          allOrders = generateRealisticMockOrders();
          isLiveFetch = false;
        }
      }
    } else {
      allOrders = generateRealisticMockOrders();
    }

    // Apply date range filtering on created_at if specific dates were requested
    if (allTime !== 'true' && (startDate || endDate)) {
      allOrders = allOrders.filter((order) => {
        const orderTime = new Date(order.created_at).getTime();
        if (startDate) {
          const sTime = new Date(startDate).setHours(0, 0, 0, 0);
          if (orderTime < sTime) return false;
        }
        if (endDate) {
          const eTime = new Date(endDate).setHours(23, 59, 59, 999);
          if (orderTime > eTime) return false;
        }
        return true;
      });
    }

    // Filter by Wilaya
    if (wilayaId && wilayaId !== 'all') {
      const wId = parseInt(wilayaId, 10);
      allOrders = allOrders.filter((o) => o.wilaya_id === wId);
    }

    // Filter by Delivery Status
    if (status && status !== 'all') {
      allOrders = allOrders.filter((o) => o.status === status);
    }

    // Filter by search query
    if (search && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      allOrders = allOrders.filter(
        (o) =>
          o.tracking.toLowerCase().includes(q) ||
          o.reference.toLowerCase().includes(q) ||
          o.customer_name.toLowerCase().includes(q) ||
          o.customer_phone.includes(q) ||
          o.product_raw.toLowerCase().includes(q) ||
          o.wilaya_name.toLowerCase().includes(q)
      );
    }

    // Attach known standardized categories to orders
    allOrders = allOrders.map((o) => ({
      ...o,
      standardized_product: productStandardizationCache[o.product_raw] || undefined,
    }));

    return res.json({
      success: true,
      orders: allOrders,
      total: allOrders.length,
      isLiveFetch,
      liveError,
      hasApiKey: Boolean(dhdConfig.apiKey),
      forceMock: dhdConfig.forceMock,
    });
  } catch (err: any) {
    console.error('DHD orders endpoint error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// -------------------------------------------------------------
// 2. DHD API Configuration & Connection Check Routes
// -------------------------------------------------------------
serverApp.get('/api/dhd/config', (_req: Request, res: Response) => {
  return res.json({
    apiKeyMasked: dhdConfig.apiKey
      ? `${dhdConfig.apiKey.substring(0, 4)}...${dhdConfig.apiKey.substring(dhdConfig.apiKey.length - 4)}`
      : '',
    hasApiKey: Boolean(dhdConfig.apiKey),
    apiUrl: dhdConfig.apiUrl,
    forceMock: dhdConfig.forceMock,
  });
});

serverApp.post('/api/dhd/config', (req: Request, res: Response) => {
  const { apiKey, apiUrl, forceMock } = req.body;
  if (typeof apiKey === 'string') dhdConfig.apiKey = apiKey.trim();
  if (typeof apiUrl === 'string' && apiUrl.trim()) dhdConfig.apiUrl = apiUrl.trim();
  if (typeof forceMock === 'boolean') dhdConfig.forceMock = forceMock;

  // Invalidate cache on config change
  cachedOrdersData = null;

  return res.json({
    success: true,
    message: 'Configuration DHD mise à jour avec succès.',
    config: {
      hasApiKey: Boolean(dhdConfig.apiKey),
      apiUrl: dhdConfig.apiUrl,
      forceMock: dhdConfig.forceMock,
    },
  });
});

serverApp.post('/api/dhd/test-connection', async (req: Request, res: Response) => {
  const { apiKey, apiUrl } = req.body;
  const keyToTest = apiKey || dhdConfig.apiKey;
  const urlToTest = apiUrl || dhdConfig.apiUrl;

  if (!keyToTest) {
    return res.status(400).json({
      success: false,
      message: 'Veuillez renseigner une clé API DHD / Ecotrack.',
    });
  }

  try {
    const testUrl = `${getNormalizedApiUrl(urlToTest)}/get/orders?start_date=2020-01-01&page=1`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${keyToTest}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const total = data?.total || (Array.isArray(data?.data) ? data.data.length : 0);
      return res.json({
        success: true,
        message: `Connexion réussie avec l'API DHD ! (${total} colis trouvés dans votre compte)`,
      });
    } else {
      return res.status(response.status).json({
        success: false,
        message: `Erreur API DHD (${response.status} ${response.statusText}) : Clé API invalide ou URL incorrecte.`,
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: `Impossible de contacter le serveur DHD : ${err.message}`,
    });
  }
});

// -------------------------------------------------------------
// 3. AI-Powered Smart Product Grouping using @google/genai
// -------------------------------------------------------------
serverApp.post('/api/ai/standardize-products', async (req: Request, res: Response) => {
  try {
    const { products } = req.body as { products?: string[] };

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune liste de produits fournie dans le corps de la requête.',
      });
    }

    const uniqueProducts = Array.from(new Set(products.map((p) => p.trim()).filter(Boolean)));
    const missingProducts = uniqueProducts.filter((p) => !productStandardizationCache[p]);

    if (missingProducts.length > 0) {
      const systemInstruction =
        "You are an e-commerce assistant. Group these messy, user-entered apparel product names into standard categories (e.g., 'Survêtement Noir', 'Ensemble Lin'). Return ONLY a JSON object mapping the raw string to the standard category name.";

      const promptText = `Here is the list of messy apparel product names from Shopify/Releasit COD orders:
${JSON.stringify(missingProducts, null, 2)}

Provide a clean standard category mapping for each item.`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptText,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
        },
      });

      const responseText = aiResponse.text || '{}';
      try {
        const parsedMap: Record<string, string> = JSON.parse(responseText.trim());
        for (const [raw, standard] of Object.entries(parsedMap)) {
          if (typeof standard === 'string') {
            productStandardizationCache[raw] = standard;
          }
        }
      } catch (parseError) {
        console.warn('Could not parse Gemini JSON response directly:', responseText);
      }
    }

    const finalMapping: Record<string, string> = {};
    for (const p of uniqueProducts) {
      finalMapping[p] = productStandardizationCache[p] || p;
    }

    return res.json({
      success: true,
      mapping: finalMapping,
      cacheSize: Object.keys(productStandardizationCache).length,
    });
  } catch (err: any) {
    console.error('Error during Gemini product standardization:', err);
    return res.status(500).json({
      success: false,
      error: err.message,
      fallbackMapping: productStandardizationCache,
    });
  }
});
