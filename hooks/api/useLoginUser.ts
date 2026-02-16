import { useMutation, UseMutationOptions } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "sonner";

interface LoginPayload {
  email: string;
  password: string;
}

type LoginOptions = UseMutationOptions<any, any, LoginPayload, any>;

export function useLoginUser(options?: LoginOptions) {
  return useMutation({
    mutationFn: async (payload: LoginPayload) => {
      const { data } = await axios.post("/api/auth/login", payload);
      return data;
    },
    onSuccess: (...args) => {
      options?.onSuccess?.(...args);
    },
    onError: (error: any, ...args) => {
      const errorMessage =
        error.response?.data?.message || "Invalid credentials. Access denied.";

      toast.error("Authorization Failed", {
        description: errorMessage,
      });

      options?.onError?.(error, ...args);
    },
    ...options,
  });
}
