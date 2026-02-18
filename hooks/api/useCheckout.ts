import { ApiResponse } from "@/interface/global";
import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

interface CheckoutResponse {
  orderId: string;
  transaction_code: string;
}

type CheckoutOptions = UseMutationOptions<
  ApiResponse<CheckoutResponse>,
  any,
  FormData,
  any
>;

export function useCheckout(options?: CheckoutOptions) {
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const { data } = await axios.post("/api/checkout", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
      return data;
    },
    onSuccess: (data, variables, context) => {
      toast.success("Order Placed Successfully", {
        description: "Your research sequence request has been recorded.",
      });

      if (options?.onSuccess) {
        options.onSuccess(data, variables, context, undefined as any);
      }
    },
    onError: (error: any, variables, context) => {
      // Mengambil pesan error dari errorResponse backend
      const errorMessage =
        error.response?.data?.message ||
        "An error occurred while processing your order.";

      toast.error("Checkout Failed", {
        description: errorMessage,
      });

      if (options?.onError) {
        options.onError(error, variables, context, undefined as any);
      }
    },
    ...options,
  });
}
