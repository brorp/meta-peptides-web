export type ProductInterface = {
  id: string;
  name: string;
  label: string;
  slug: string;
  price: number;
  original_price: number;
  purity: string;
  volume: string;
  stock: number;
  image_url: string;
  category: string;
  formula: string;
  overview: string;
  storage_instruction: string;
  usage_instruction: string;
  cas: string;
  short_desc: string;
  dosing: string;
  complimentary_product_id?: string | null;
  complimentary_product_name?: string | null;
  complimentary_product_slug?: string | null;
  complimentary_quantity?: number | null;
};

export type GetProductsResponseInterface = {
  success: boolean;
  message: string;
  data: ProductInterface[];
  pagination: {
    total_items: number;
    total_pages: number;
    current_page: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
  };
};
