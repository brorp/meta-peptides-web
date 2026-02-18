import axios from "axios";
import { ApiResponse } from "./api-response";

export const api = axios.create({
  baseURL: "/api",
});

api.interceptors.response.use(
  (response) => {
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
