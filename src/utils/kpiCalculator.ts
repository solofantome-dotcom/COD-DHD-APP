import { DHDOrder, KpiMetrics, StandardizedProductGroup } from '../types';

export function calculateKpis(orders: DHDOrder[]): KpiMetrics {
  const totalOrders = orders.length;

  let livreCount = 0;
  let retourneCount = 0;
  let annuleCount = 0;
  let enStationCount = 0;
  let enCirculationCount = 0;
  let sortiLivraisonCount = 0;
  let enAttenteCount = 0;
  let tentativeEchoueeCount = 0;

  let totalDeliveredRevenue = 0;
  let totalPendingRevenue = 0;
  let totalOverallRevenue = 0;

  for (const order of orders) {
    const price = Number(order.price) || 0;
    totalOverallRevenue += price;

    switch (order.status) {
      case 'livre':
        livreCount++;
        totalDeliveredRevenue += price;
        break;
      case 'retourne':
        retourneCount++;
        break;
      case 'annule':
        annuleCount++;
        break;
      case 'en_station':
        enStationCount++;
        totalPendingRevenue += price;
        break;
      case 'en_circulation':
        enCirculationCount++;
        totalPendingRevenue += price;
        break;
      case 'sorti_en_livraison':
        sortiLivraisonCount++;
        totalPendingRevenue += price;
        break;
      case 'en_attente':
        enAttenteCount++;
        totalPendingRevenue += price;
        break;
      case 'tentative_echouee':
        tentativeEchoueeCount++;
        totalPendingRevenue += price;
        break;
      default:
        totalPendingRevenue += price;
        break;
    }
  }

  const concludedCount = livreCount + retourneCount + annuleCount;
  const activeInTransitCount = totalOrders - concludedCount;

  // Custom Algerian COD delivery & return rate formulas:
  // Taux de Livraison: (Livré) / (Livré + Retourné + Annulé)
  // Taux de Retour: (Retourné + Annulé) / (Livré + Retourné + Annulé)
  const deliveryRate = concludedCount > 0 ? (livreCount / concludedCount) * 100 : 0;
  const retourRate = concludedCount > 0 ? ((retourneCount + annuleCount) / concludedCount) * 100 : 0;

  return {
    totalOrders,
    livreCount,
    retourneCount,
    annuleCount,
    concludedCount,
    enStationCount,
    enCirculationCount,
    sortiLivraisonCount,
    enAttenteCount,
    tentativeEchoueeCount,
    activeInTransitCount,
    deliveryRate,
    retourRate,
    totalDeliveredRevenue,
    totalPendingRevenue,
    totalOverallRevenue,
  };
}

export function groupOrdersByStandardizedProduct(
  orders: DHDOrder[],
  productMapping: Record<string, string> = {}
): StandardizedProductGroup[] {
  const groups: Record<
    string,
    {
      category: string;
      rawVariants: Set<string>;
      totalOrders: number;
      livreCount: number;
      retourneCount: number;
      enCirculationCount: number;
      totalDeliveredRevenue: number;
      totalPotentialRevenue: number;
    }
  > = {};

  for (const order of orders) {
    const raw = (order.product_raw || 'Produit Inconnu').trim();
    // Use AI standardized category if mapped, or clean fallback
    const category = productMapping[raw] || cleanFallbackCategory(raw);

    if (!groups[category]) {
      groups[category] = {
        category,
        rawVariants: new Set<string>(),
        totalOrders: 0,
        livreCount: 0,
        retourneCount: 0,
        enCirculationCount: 0,
        totalDeliveredRevenue: 0,
        totalPotentialRevenue: 0,
      };
    }

    const g = groups[category];
    g.rawVariants.add(raw);
    g.totalOrders++;

    const price = Number(order.price) || 0;
    g.totalPotentialRevenue += price;

    if (order.status === 'livre') {
      g.livreCount++;
      g.totalDeliveredRevenue += price;
    } else if (order.status === 'retourne' || order.status === 'annule') {
      g.retourneCount++;
    } else {
      g.enCirculationCount++;
    }
  }

  return Object.values(groups)
    .map((g) => {
      const concluded = g.livreCount + g.retourneCount;
      const deliveryRate = concluded > 0 ? (g.livreCount / concluded) * 100 : 0;
      const retourRate = concluded > 0 ? (g.retourneCount / concluded) * 100 : 0;

      return {
        category: g.category,
        rawVariants: Array.from(g.rawVariants),
        totalOrders: g.totalOrders,
        livreCount: g.livreCount,
        retourneCount: g.retourneCount,
        enCirculationCount: g.enCirculationCount,
        deliveryRate,
        retourRate,
        totalDeliveredRevenue: g.totalDeliveredRevenue,
        totalPotentialRevenue: g.totalPotentialRevenue,
      };
    })
    .sort((a, b) => b.totalOrders - a.totalOrders);
}

// Client-side heuristic fallback before or in absence of Gemini API call
function cleanFallbackCategory(raw: string): string {
  const lower = raw.toLowerCase();

  if (lower.includes('survet') || lower.includes('survêtement')) {
    if (lower.includes('noir') || lower.includes('black')) return 'Survêtement Noir';
    if (lower.includes('gris') || lower.includes('grey')) return 'Survêtement Gris';
    if (lower.includes('bleu') || lower.includes('blue')) return 'Survêtement Bleu';
    return 'Survêtement Sport';
  }

  if (lower.includes('lin')) {
    if (lower.includes('beige')) return 'Ensemble Lin Beige';
    if (lower.includes('noir') || lower.includes('black')) return 'Ensemble Lin Noir';
    return 'Ensemble Lin';
  }

  if (lower.includes('t-shirt') || lower.includes('tshirt')) {
    if (lower.includes('blanc') || lower.includes('white')) return 'T-Shirt Blanc';
    if (lower.includes('noir') || lower.includes('black')) return 'T-Shirt Noir';
    return 'T-Shirt Coton';
  }

  if (lower.includes('robe')) {
    return 'Robe Fleurie';
  }

  if (lower.includes('cargo') || lower.includes('pantalon')) {
    return 'Pantalon Cargo';
  }

  if (lower.includes('sweat') || lower.includes('hoodie')) {
    return 'Sweat & Hoodie';
  }

  // Capitalize first letters of raw clean string
  return raw.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
}
