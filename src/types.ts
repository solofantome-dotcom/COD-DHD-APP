export type DeliveryStatus =
  | 'livre'
  | 'retourne'
  | 'annule'
  | 'en_station'
  | 'en_circulation'
  | 'sorti_en_livraison'
  | 'en_attente'
  | 'tentative_echouee';

export interface DHDOrder {
  id: string;
  tracking: string;
  reference: string;
  customer_name: string;
  customer_phone: string;
  wilaya_id: number;
  wilaya_name: string;
  commune: string;
  address: string;
  product_raw: string;
  price: number; // In DZD (DA)
  shipping_cost: number;
  status: DeliveryStatus;
  status_label: string;
  created_at: string;
  updated_at: string;
  delivery_attempts: number;
  last_note?: string;
  standardized_product?: string;
}

export interface DateFilterPreset {
  id: 'TODAY' | 'YESTERDAY' | 'LAST_WEEK' | 'THIS_MONTH' | 'CUSTOM';
  label: string;
  startDate: string;
  endDate: string;
}

export interface WilayaInfo {
  id: number;
  code: string;
  name: string;
  name_ar: string;
}

export interface StandardizedProductGroup {
  category: string;
  rawVariants: string[];
  totalOrders: number;
  livreCount: number;
  retourneCount: number;
  enCirculationCount: number;
  deliveryRate: number; // percentage
  retourRate: number; // percentage
  totalDeliveredRevenue: number; // in DZD
  totalPotentialRevenue: number; // in DZD
}

export interface KpiMetrics {
  totalOrders: number;
  livreCount: number;
  retourneCount: number;
  annuleCount: number;
  concludedCount: number;
  enStationCount: number;
  enCirculationCount: number;
  sortiLivraisonCount: number;
  enAttenteCount: number;
  tentativeEchoueeCount: number;
  activeInTransitCount: number;
  deliveryRate: number; // Livré / (Livré + Retourné + Annulé) * 100
  retourRate: number; // (Retourné + Annulé) / (Livré + Retourné + Annulé) * 100
  totalDeliveredRevenue: number;
  totalPendingRevenue: number;
  totalOverallRevenue: number;
}

export interface DHDConfig {
  apiKey: string;
  apiUrl: string;
  isLive: boolean;
}
