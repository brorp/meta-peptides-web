import { ApiResponse } from "@/interface/global";
import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

type ForgotPasswordPayload = {
  email: string;
};

type ForgotPasswordResponse = {
  email: string;
};

type ForgotPasswordOptions = UseMutationOptions<
  ApiResponse<ForgotPasswordResponse>,
  any,
  ForgotPasswordPayload,
  any
>;

export function useForgotPassword(options?: ForgotPasswordOptions) {
  return useMutation({
    mutationFn: async (payload: ForgotPasswordPayload) => {
      const { data } = await axios.post("/api/auth/forgot-password", payload);
      return data;
    },
    onSuccess: (...args) => {
      const [data] = args;
      toast.success("Reset Link Sent", {
        description:
          data.message ||
          "Check your inbox for a secure password reset link.",
      });

      options?.onSuccess?.(...args);
    },
    onError: (error: any, ...args) => {
      const errorMessage =
        error.response?.data?.message ||
        "We could not send the password reset email.";

      toast.error("Password Reset Failed", {
        description: errorMessage,
      });

      options?.onError?.(error, ...args);
    },
    ...options,
  });
}
