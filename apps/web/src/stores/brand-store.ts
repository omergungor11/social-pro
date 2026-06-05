"use client";

import { create } from "zustand";
import { apiClient } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Brand {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface BrandState {
  selectedBrandId: string | null;
  brands: Brand[];
  loaded: boolean;
  // actions
  setSelectedBrandId: (id: string | null) => void;
  fetchBrands: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

const STORAGE_KEY = "sp_selected_brand_id";

function readStoredBrandId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useBrandStore = create<BrandState>((set) => ({
  selectedBrandId: readStoredBrandId(),
  brands: [],
  loaded: false,

  setSelectedBrandId: (id: string | null): void => {
    if (typeof window !== "undefined") {
      if (id === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, id);
      }
    }
    set({ selectedBrandId: id });
  },

  fetchBrands: async (): Promise<void> => {
    try {
      const response = await apiClient.getWithMeta<Brand[]>("/clients?limit=100");
      set({ brands: response.data ?? [], loaded: true });
    } catch {
      // Fail silently — keep the selector usable with an empty list
      set({ brands: [], loaded: true });
    }
  },
}));
