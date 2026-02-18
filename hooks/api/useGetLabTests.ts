import { ApiResponse } from "@/interface/global";
import { ProductInterface } from "@/interface/products";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";
export interface LabTestInterface {
  id: string;
  product_id: string;
  purity_level: string;
  test_date: string;
  report_url: string;
  report_images: string[];
  created_at: string;
  updated_at: string;
  product?: Pick<ProductInterface, "name" | "image_url" | "slug">;
}

interface UseGetLabTestsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export function useGetLabTests(
  params: UseGetLabTestsParams = {},
  options?: Omit<
    UseQueryOptions<ApiResponse<LabTestInterface>, Error>,
    "queryKey" | "queryFn"
  >,
) {
  const { page = 1, limit = 10, search } = params;

  return useQuery({
    queryKey: ["lab-tests", page, limit, search],
    queryFn: async () => {
      const { data } = await axios.get<ApiResponse<LabTestInterface>>(
        "/api/lab-tests",
        {
          params: { page, limit, search },
        },
      );

      if (!data.success) {
        throw new Error(data.message || "Failed to fetch lab reports");
      }

      return data;
    },
    ...options,
    placeholderData: (previousData) => previousData,
    meta: {
      onError: (error: any) => {
        toast.error("Laboratory Database Error", {
          description: error.message || "Unable to access COA archives.",
        });
      },
      ...options?.meta,
    },
  });
}
