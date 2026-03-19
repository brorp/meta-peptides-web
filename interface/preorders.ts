import { ProductInterface } from "./products";

export interface PreorderInterface {
  id: string;
  name: string;
  domisili: string;
  shopee_username: string;
  whatsapp_number: string;
  product_id: string;
  product_name?: string;
  status: 'pending' | 'contacted' | 'completed';
  created_at: string;
}

export interface GetPreordersResponseInterface {
  success: boolean;
  message: string;
  data: PreorderInterface[];
  pagination: {
    total_items: number;
    total_pages: number;
    current_page: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
  };
}
