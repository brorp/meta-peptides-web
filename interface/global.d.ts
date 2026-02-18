export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data?: T;
  pagination?: {
    total_items: number;
    total_pages: number;
    current_page: number;
    limit: number;
    has_next: boolean;
    has_prev: boolean;
  };
  error?: any;
};
