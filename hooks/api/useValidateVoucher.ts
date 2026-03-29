import { ApiResponse } from "@/interface/global";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";

export type VoucherValidationResponse = {
  voucher_id: string;
  code: string;
  discount_nominal: number;
  discount_percentage: number;
  max_discount_cap: number;
  discount_amount: number;
  valid_until: string;
};

type ValidatePayload = {
  code: string;
  subtotal: number;
};

export function useValidateVoucher() {
  return useMutation({
    mutationFn: async (
      payload: ValidatePayload,
    ): Promise<ApiResponse<VoucherValidationResponse>> => {
      const { data } = await axios.post("/api/vouchers/validate", payload);
      return data;
    },
  });
}
