import { GetProductsResponseInterface } from "@/interface/products";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

interface UseGetProductsParams {
  page?: number;
  limit?: number;
  category?: string;
  keyword?: string;
}

export function useGetProducts(
  params: UseGetProductsParams = {},
  options?: Omit<
    UseQueryOptions<GetProductsResponseInterface, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const { page = 1, limit = 10, category, keyword } = params;

  return useQuery({
    queryKey: ["products", page, limit, category, keyword],
    queryFn: async () => {
      const { data } = await axios.get<GetProductsResponseInterface>(
        "/api/products",
        {
          params: { page, limit, category, keyword },
        },
      );

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch lab samples");
      }

      return data;
    },
    ...options,
    meta: {
      onError: (error: any) => {
        toast.error("Data Retrieval Failed", {
          description: error.message || "Unable to access product database.",
        });
      },
      ...options?.meta,
    },
  });
}
