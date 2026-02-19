import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@supabase/supabase-js";
interface Profile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
  role?: string;
}

interface UserState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
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
      setLoading: (loading) => set({ loading }),
      clearUser: () => set({ user: null, profile: null }),
    }),
    {
      name: "metapeptides-user-storage",
    },
  ),
);
