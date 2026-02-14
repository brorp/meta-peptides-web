import axios from "axios";
import type { ApiResponse } from "@/types/api";

export const api = axios.create({
  baseURL: "/api",
});

api.interceptors.response.use(
  (response) => {
    // 👇 unwrap response.data
    response.data = response.data as ApiResponse<any>;
    return response;
  },
  (error) => {
    return Promise.reject(
      error?.response?.data ?? {
        success: false,
        message: "Server error",
      },
    );
  },
);
