type userRole = "admin" | "doctor" | "nurse" | "pharmacist";

interface PaginationMeta {
  total_items: number;
  total_pages: number;
  current_page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}
