"use client";
import { createContext, useContext } from "react";

export interface AdminMe {
  name: string;
  role: "OWNER" | "CO_ADMIN";
  isOwner: boolean;
  store: { id: string; name: string } | null;
  cities: { id: string; district: string; isActive: boolean }[];
  selectedCityId: string | null;
}

export const CITY_KEY = "pcc-admin-city";

interface AdminContextValue {
  me: AdminMe | null;
  // The city picked in the switcher, or null for everything this admin may see.
  cityId: string | null;
  setCityId: (id: string | null) => void;
}

export const AdminContext = createContext<AdminContextValue>({ me: null, cityId: null, setCityId: () => undefined });

export const useAdmin = () => useContext(AdminContext);

export function readStoredCity(): string | null {
  try {
    return window.localStorage.getItem(CITY_KEY);
  } catch {
    return null;
  }
}
