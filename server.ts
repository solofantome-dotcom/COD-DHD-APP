import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import { generateRealisticMockOrders } from './src/data/mockOrders.ts';
import { DHDOrder, DeliveryStatus } from './src/types.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());

// In-memory runtime config for DHD API settings (can be seeded by env vars)
let dhdConfig = {
  apiKey: process.env.DHD_API_KEY || '',
  apiUrl: process.env.DHD_API_URL || 'https://dhd.ecotrack.dz/api/v1',
  forceMock: !process.env.DHD_API_KEY,
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

// Normalize status string from DHD/Ecotrack to standard DeliveryStatus enum
function normalizeDhdStatus(rawStatus: string): { status: DeliveryStatus; label: string } {
  const s = (rawStatus || '').toLowerCase().trim();

  if (s.includes('livr') || s === 'delivered' || s === 'livre') {
    return { status: 'livre', label: 'Livré' };
  }
  if (s.includes('retour') || s === 'returned' || s === 'retourne' || s === 'echec') {
    return { status: 'retourne', label: 'Retourné' };
  }
  if (s.includes('annul') || s === 'canceled' || s === 'cancelled' || s === 'annule') {
    return { status: 'annule', label: 'Annulé' };
  }
  if (s.includes('sorti') || s.includes('livraison') || s === 'out_for_delivery') {
    return { status: 'sorti_en_livraison', label: 'Sorti en livraison' };
  }
  if (s.includes('station') || s.includes('centre') || s.includes('hub') || s === 'at_station') {
    return { status: 'en_station', label: 'En station' };
  }
  if (s.includes('circulation') || s.includes('transit') || s === 'in_transit') {
    return { status: 'en_circulation', label: 'En circulation' };
  }
  if (s.includes('tentative') || s.includes('echou') || s.includes('report') || s.includes('injoignable')) {
    return { status: 'tentative_echouee', label: 'Tentative échouée' };
  }

  return { status: 'en_attente', label: 'En attente' };
}

// -------------------------------------------------------------
// 1. DHD / Ecotrack API Integration & Data Fetching Route
// -------------------------------------------------------------
app.get('/api/dhd/orders', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, wilayaId, status, search } = req.query as {
      startDate?: string;
      endDate?: string;
      wilayaId?: string;
      status?: string;
      search?: string;
    };

    let allOrders: DHDOrder[] = [];
    let isLiveFetch = false;
    let liveError: string | null = null;

    // Check if live API is configured and enabled
    if (dhdConfig.apiKey && !dhdConfig.forceMock) {
      try {
        isLiveFetch = true;
        // Construct query parameters for DHD / Ecotrack endpoint
        const params = new URLSearchParams();
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);
        if (wilayaId && wilayaId !== 'all') params.append('wilaya_id', wilayaId);
        if (status && status !== 'all') params.append('status', status);

        // Fetch page 1 (and follow pagination if present)
        let page = 1;
        let hasMorePages = true;
        const maxPagesToFetch = 5; // Safety bound

        while (hasMorePages && page <= maxPagesToFetch) {
          params.set('page', page.toString());
          const fetchUrl = `${dhdConfig.apiUrl.replace(/\/$/, '')}/get/orders?${params.toString()}`;

          const apiResponse = await fetch(fetchUrl, {
            headers: {
              Authorization: `Bearer ${dhdConfig.apiKey}`,
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
          });

          if (!apiResponse.ok) {
            throw new Error(`DHD API responded with status ${apiResponse.status}: ${apiResponse.statusText}`);
          }

          const responseData = await apiResponse.json();
          const items: any[] = Array.isArray(responseData)
            ? responseData
            : Array.isArray(responseData?.data)
              ? responseData.data
              : Array.isArray(responseData?.orders)
                ? responseData.orders
                : [];

          if (items.length === 0) {
            hasMorePages = false;
            break;
          }

          // Map items to unified DHDOrder format
          for (const item of items) {
            const statusInfo = normalizeDhdStatus(item.status || item.statut || item.current_status || '');
            allOrders.push({
              id: String(item.id || item.tracking || Math.random()),
              tracking: String(item.tracking || item.code_suivi || item.tracking_code || `DHD-${item.id}`),
              reference: String(item.reference || item.order_number || `#${item.id}`),
              customer_name: String(item.client || item.customer_name || item.nom_client || 'Client'),
              customer_phone: String(item.phone || item.telephone || item.customer_phone || ''),
              wilaya_id: Number(item.wilaya_id || item.wilaya_code || 16),
              wilaya_name: String(item.wilaya || item.wilaya_name || 'Alger'),
              commune: String(item.commune || item.city || ''),
              address: String(item.address || item.adresse || ''),
              product_raw: String(item.produit || item.product || item.products_string || item.designation || 'Produit'),
              price: Number(item.montant || item.price || item.total_amount || item.total || 0),
              shipping_cost: Number(item.tarif || item.shipping_fee || item.frais_livraison || 500),
              status: statusInfo.status,
              status_label: statusInfo.label,
              created_at: item.created_at || new Date().toISOString(),
              updated_at: item.updated_at || item.created_at || new Date().toISOString(),
              delivery_attempts: Number(item.tentatives || item.attempts || 1),
              last_note: item.note || item.last_note || item.remarque || '',
            });
          }

          const lastPage = Number(responseData.last_page || responseData.total_pages || 1);
          if (page >= lastPage || items.length < 20) {
            hasMorePages = false;
          } else {
            page++;
          }
        }
      } catch (err: any) {
        console.error('Error fetching from live DHD API:', err.message);
        liveError = err.message;
        // Fallback to sample data if live fetch failed
        allOrders = generateRealisticMockOrders();
        isLiveFetch = false;
      }
    } else {
      // Use realistic Algerian COD dataset
      allOrders = generateRealisticMockOrders();
    }

    // Apply date range filtering on created_at or updated_at
    if (startDate || endDate) {
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

    // Filter by search query (tracking, phone, customer, product)
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
app.get('/api/dhd/config', (_req: Request, res: Response) => {
  return res.json({
    apiKeyMasked: dhdConfig.apiKey
      ? `${dhdConfig.apiKey.substring(0, 4)}...${dhdConfig.apiKey.substring(dhdConfig.apiKey.length - 4)}`
      : '',
    hasApiKey: Boolean(dhdConfig.apiKey),
    apiUrl: dhdConfig.apiUrl,
    forceMock: dhdConfig.forceMock,
  });
});

app.post('/api/dhd/config', (req: Request, res: Response) => {
  const { apiKey, apiUrl, forceMock } = req.body;
  if (typeof apiKey === 'string') dhdConfig.apiKey = apiKey.trim();
  if (typeof apiUrl === 'string' && apiUrl.trim()) dhdConfig.apiUrl = apiUrl.trim();
  if (typeof forceMock === 'boolean') dhdConfig.forceMock = forceMock;

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

app.post('/api/dhd/test-connection', async (req: Request, res: Response) => {
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
    const testUrl = `${urlToTest.replace(/\/$/, '')}/get/orders?page=1&per_page=1`;
    const response = await fetch(testUrl, {
      headers: {
        Authorization: `Bearer ${keyToTest}`,
        Accept: 'application/json',
      },
    });

    if (response.ok) {
      return res.json({
        success: true,
        message: 'Connexion à l\'API DHD Ecotrack réussie !',
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
app.post('/api/ai/standardize-products', async (req: Request, res: Response) => {
  try {
    const { products } = req.body as { products?: string[] };

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Aucune liste de produits fournie dans le corps de la requête.',
      });
    }

    // Filter unique product strings
    const uniqueProducts = Array.from(new Set(products.map((p) => p.trim()).filter(Boolean)));

    // Separate products already in cache from missing ones
    const missingProducts = uniqueProducts.filter((p) => !productStandardizationCache[p]);

    if (missingProducts.length > 0) {
      const systemInstruction =
        "You are an e-commerce assistant. Group these messy, user-entered apparel product names into standard categories (e.g., 'Survêtement Noir', 'Ensemble Lin'). Return ONLY a JSON object mapping the raw string to the standard category name.";

      const promptText = `Here is the list of messy apparel product names from Shopify/Releasit COD orders:
${JSON.stringify(missingProducts, null, 2)}

Provide a clean standard category mapping for each item.`;

      // Call Gemini API server-side using gemini-3.8-flash
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

    // Construct total response mapping for all requested products
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
    // Graceful fallback to existing cache
    return res.status(500).json({
      success: false,
      error: err.message,
      fallbackMapping: productStandardizationCache,
    });
  }
});

// -------------------------------------------------------------
// 4. Vite Dev Server / Production Static Serving
// -------------------------------------------------------------
const PORT = 3000;
const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[DHD COD Tracker] Server running on port ${PORT}`);
  });
}

startServer();
