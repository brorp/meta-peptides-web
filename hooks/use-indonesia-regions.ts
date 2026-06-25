"use client";

import { useCallback, useEffect, useState } from "react";

const BASE_URL = "https://raw.githubusercontent.com/ibnux/data-indonesia/master";

export interface Province {
    id: string;
    nama: string;
}

export interface City {
    id: string;
    nama: string;
}

/** Fetch province list once and cache in module-level variable */
let cachedProvinces: Province[] | null = null;
const cityCache: Record<string, City[]> = {};

async function fetchProvinces(): Promise<Province[]> {
    if (cachedProvinces) return cachedProvinces;
    const res = await fetch(`${BASE_URL}/provinsi.json`);
    const data: Province[] = await res.json();
    cachedProvinces = data;
    return data;
}

async function fetchCities(provinceId: string): Promise<City[]> {
    if (cityCache[provinceId]) return cityCache[provinceId];
    const res = await fetch(`${BASE_URL}/kabupaten/${provinceId}.json`);
    const data: City[] = await res.json();
    cityCache[provinceId] = data;
    return data;
}

export function useIndonesiaRegions() {
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [selectedProvinceId, setSelectedProvinceId] = useState("");
    const [loadingProvinces, setLoadingProvinces] = useState(true);
    const [loadingCities, setLoadingCities] = useState(false);

    useEffect(() => {
        fetchProvinces()
            .then(setProvinces)
            .catch(() => {})
            .finally(() => setLoadingProvinces(false));
    }, []);

    const selectProvince = useCallback(async (provinceId: string) => {
        setSelectedProvinceId(provinceId);
        setCities([]);
        if (!provinceId) return;
        setLoadingCities(true);
        try {
            const data = await fetchCities(provinceId);
            setCities(data);
        } catch {
            // silently fail
        } finally {
            setLoadingCities(false);
        }
    }, []);

    return {
        provinces,
        cities,
        selectedProvinceId,
        loadingProvinces,
        loadingCities,
        selectProvince,
    };
}

export interface FlatCity {
    nama: string;
    provinsi: string;
}

let cachedAllCities: FlatCity[] | null = null;

async function fetchAllCities(): Promise<FlatCity[]> {
    if (cachedAllCities) return cachedAllCities;
    const provinces = await fetchProvinces();
    const cityPromises = provinces.map(async (prov) => {
        try {
            const cities = await fetchCities(prov.id);
            return cities.map((city) => ({
                nama: city.nama,
                provinsi: prov.nama,
            }));
        } catch {
            return [];
        }
    });
    const results = await Promise.all(cityPromises);
    const flattened = results.flat();
    cachedAllCities = flattened;
    return flattened;
}

export function useAllIndonesiaCities() {
    const [allCities, setAllCities] = useState<FlatCity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        fetchAllCities()
            .then((data) => {
                if (active) setAllCities(data);
            })
            .catch(() => {})
            .finally(() => {
                if (active) setLoading(false);
            });
        return () => {
            active = false;
        };
    }, []);

    return { allCities, loading };
}

