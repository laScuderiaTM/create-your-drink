export type Category = {
  id: string;
  name_ro: string;
  name_en: string;
  description_ro: string;
  description_en: string;
  base_price: number;
  active: boolean;
  sort_order: number;
};

export type Step = {
  id: string;
  category_id: string;
  name_ro: string;
  name_en: string;
  hint_ro: string;
  hint_en: string;
  min_select: number;
  max_select: number;
  is_alcohol: boolean;
  sort_order: number;
};

export type Option = {
  id: string;
  step_id: string;
  name_ro: string;
  name_en: string;
  price: number;
  max_qty: number;
  in_stock: boolean;
  sort_order: number;
};

export type OrderItem = {
  step_ro: string;
  step_en: string;
  name_ro: string;
  name_en: string;
  qty: number;
  unit_price: number;
  line_total: number;
};

// „new” rămâne doar pentru comenzile dinainte de plata în avans; „in_pos” = predată.
export type OrderStatus = "awaiting_payment" | "new" | "preparing" | "ready" | "in_pos" | "cancelled";

export type Order = {
  id: string;
  code: string;
  table_no: string;
  customer_name: string;
  category_name: string;
  items: OrderItem[];
  total: number;
  has_alcohol: boolean;
  status: OrderStatus;
  lang: string;
  created_at: string;
};

export const MENU_URL = "https://smart-menu.ro/la-scuderia";

export function formatLei(n: number) {
  return `${Number(n).toFixed(Number(n) % 1 === 0 ? 0 : 2)} lei`;
}
