import { api } from "@/lib/axios";
import { useQuery } from "@tanstack/react-query";
import type { QueryKey, UseQueryOptions } from "@tanstack/react-query";
import type { AxiosRequestConfig } from "axios";

export async function getApiData<TData>(
  url: string,
  config?: AxiosRequestConfig,
) {
  const { data } = await api.get<TData>(url, config);
  const maybeApiResponse = data as any;

  if (maybeApiResponse?.success === false) {
    throw new Error(maybeApiResponse.message || "Failed to fetch data");
  }

  return data;
}

export function useApiQuery<TData>(
  queryKey: QueryKey,
  url: string,
  config?: AxiosRequestConfig,
  options?: Omit<UseQueryOptions<TData, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey,
    queryFn: () => getApiData<TData>(url, config),
    ...options,
  });
}
