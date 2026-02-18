// store/useUserStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UserState {
  user: any | null;
  profile: any | null;
  loading: boolean;
  setUser: (user: any) => void;
  setProfile: (profile: any) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,
      profile: null,
      loading: false,
      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      clearUser: () => set({ user: null, profile: null }),
    }),
    { name: "metapeptides-user-storage" },
  ),
);
