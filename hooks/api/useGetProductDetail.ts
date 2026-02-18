import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { ProductInterface } from "@/interface/products";
import { toast } from "sonner";
import { ApiResponse } from "@/lib/api-response";

export function useGetProductDetail(
  slug: string,
  options?: Omit<
    UseQueryOptions<ApiResponse<ProductInterface>, Error>,
    "queryKey" | "queryFn"
  >,
) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => {
      if (!slug) throw new Error("Slug is required");

      const { data } = await axios.get<ApiResponse<ProductInterface>>(
        `/api/products/${slug}`,
      );

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch sample detail");
      }

      return data;
    },
    ...options,
    meta: {
      onError: (error: any) => {
        toast.error("Access Denied", {
          description: error.message || "Database node is unreachable.",
        });
      },
    },
  });
}
