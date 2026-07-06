"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const BASE_URL = "/api/regions";
const CACHE_PREFIX = "meta-peptides:indonesia-regions";
const REGION_CACHE_TTL_MS = 21 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8000;

export interface Province {
    id: string;
    nama: string;
}

export interface City {
    id: string;
    nama: string;
}

export interface FlatCity {
    nama: string;
    provinsi: string;
}

type StoredValue<T> = {
    data: T;
    savedAt: number;
};

type StoredRead<T> = {
    data: T;
    expired: boolean;
};

let cachedProvinces: Province[] | null = null;
const cityCache: Record<string, City[]> = {};
let cachedAllCities: FlatCity[] | null = null;

function storageAvailable() {
    try {
        return typeof window !== "undefined" && Boolean(window.localStorage);
    } catch {
        return false;
    }
}

function readStorage<T>(key: string, allowExpired = false): StoredRead<T> | null {
    if (!storageAvailable()) return null;

    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as StoredValue<T>;
        if (!parsed || !Array.isArray(parsed.data) || typeof parsed.savedAt !== "number") {
            return null;
        }

        const expired = Date.now() - parsed.savedAt > REGION_CACHE_TTL_MS;
        if (expired && !allowExpired) return null;

        return {
            data: parsed.data,
            expired,
        };
    } catch {
        return null;
    }
}

function writeStorage<T>(key: string, data: T) {
    if (!storageAvailable()) return;

    try {
        window.localStorage.setItem(
            key,
            JSON.stringify({
                data,
                savedAt: Date.now(),
            }),
        );
    } catch {
        // Storage can be unavailable in private mode or full devices. Query cache still works.
    }
}

function provinceStorageKey() {
    return `${CACHE_PREFIX}:provinces:v1`;
}

function cityStorageKey(provinceId: string) {
    return `${CACHE_PREFIX}:cities:${provinceId}:v1`;
}

function allCitiesStorageKey() {
    return `${CACHE_PREFIX}:all-cities:v1`;
}

async function fetchJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const res = await fetch(url, {
            cache: "force-cache",
            signal: controller.signal,
        });

        if (!res.ok) {
            throw new Error(`Region API failed with status ${res.status}`);
        }

        return (await res.json()) as T;
    } finally {
        clearTimeout(timeout);
    }
}

async function fetchWithStorageFallback<T>(
    key: string,
    request: () => Promise<T>,
): Promise<T> {
    const fresh = readStorage<T>(key);
    if (fresh) return fresh.data;

    const stale = readStorage<T>(key, true);

    try {
        const data = await request();
        writeStorage(key, data);
        return data;
    } catch (error) {
        if (stale) return stale.data;
        throw error;
    }
}

async function fetchProvinces(): Promise<Province[]> {
    if (cachedProvinces) return cachedProvinces;

    const data = await fetchWithStorageFallback(provinceStorageKey(), () =>
        fetchJson<Province[]>(`${BASE_URL}/provinces`),
    );

    cachedProvinces = data;
    return data;
}

async function fetchCities(provinceId: string): Promise<City[]> {
    if (!provinceId) return [];
    if (cityCache[provinceId]) return cityCache[provinceId];

    const data = await fetchWithStorageFallback(cityStorageKey(provinceId), () =>
        fetchJson<City[]>(`${BASE_URL}/cities?provinceId=${encodeURIComponent(provinceId)}`),
    );

    cityCache[provinceId] = data;
    return data;
}

async function fetchAllCities(): Promise<FlatCity[]> {
    if (cachedAllCities) return cachedAllCities;

    const data = await fetchWithStorageFallback(allCitiesStorageKey(), async () => {
        const provinces = await fetchProvinces();
        const results: FlatCity[][] = [];

        for (const prov of provinces) {
            try {
                const cities = await fetchCities(prov.id);
                results.push(
                    cities.map((city) => ({
                        nama: city.nama,
                        provinsi: prov.nama,
                    })),
                );
            } catch {
                results.push([]);
            }
        }

        return results.flat();
    });

    cachedAllCities = data;
    return data;
}

export function useIndonesiaRegions() {
    const queryClient = useQueryClient();
    const [selectedProvinceId, setSelectedProvinceId] = useState("");

    const provincesQuery = useQuery({
        queryKey: ["indonesia-regions", "provinces"],
        queryFn: fetchProvinces,
        staleTime: REGION_CACHE_TTL_MS,
        gcTime: REGION_CACHE_TTL_MS,
        retry: 1,
    });

    const citiesQuery = useQuery({
        queryKey: ["indonesia-regions", "cities", selectedProvinceId],
        queryFn: () => fetchCities(selectedProvinceId),
        enabled: Boolean(selectedProvinceId),
        staleTime: REGION_CACHE_TTL_MS,
        gcTime: REGION_CACHE_TTL_MS,
        retry: 1,
    });

    const selectProvince = useCallback(
        (provinceId: string) => {
            setSelectedProvinceId(provinceId);

            if (!provinceId) return;

            queryClient.prefetchQuery({
                queryKey: ["indonesia-regions", "cities", provinceId],
                queryFn: () => fetchCities(provinceId),
                staleTime: REGION_CACHE_TTL_MS,
                gcTime: REGION_CACHE_TTL_MS,
            });
        },
        [queryClient],
    );

    return {
        provinces: provincesQuery.data || [],
        cities: selectedProvinceId ? citiesQuery.data || [] : [],
        selectedProvinceId,
        loadingProvinces: provincesQuery.isLoading,
        loadingCities: selectedProvinceId ? citiesQuery.isFetching : false,
        provinceError: provincesQuery.error,
        cityError: citiesQuery.error,
        selectProvince,
    };
}

export function useAllIndonesiaCities() {
    const allCitiesQuery = useQuery({
        queryKey: ["indonesia-regions", "all-cities"],
        queryFn: fetchAllCities,
        staleTime: REGION_CACHE_TTL_MS,
        gcTime: REGION_CACHE_TTL_MS,
        retry: 1,
    });

    return {
        allCities: allCitiesQuery.data || [],
        loading: allCitiesQuery.isLoading,
        error: allCitiesQuery.error,
    };
}
