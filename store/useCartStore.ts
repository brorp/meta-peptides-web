import { ProductInterface } from "@/interface/products";
import { create } from "zustand";
import { persist } from "zustand/middleware";
export interface ShippingData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  zip: string;
  note?: string;
  voucherCode?: string;
}

interface CartItem extends ProductInterface {
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isCartOpen: boolean;
  shipping: ShippingData | null;
  toggleCart: () => void;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: ProductInterface) => void;
  updateQuantity: (productId: string | number, newQty: number) => void;
  removeFromCart: (productId: string | number) => void;
  getCartCount: () => number;
  getTotalPrice: () => number;
  clearCart: () => void;
  setShipping: (data: ShippingData) => void;
  clearShipping: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,
      shipping: null, // Initial state

      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

      setIsCartOpen: (open) => set({ isCartOpen: open }),

      addToCart: (product) =>
        set((state) => {
          const existingItem = state.items.find(
            (item) => item.id === product.id,
          );

          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item,
              ),
            };
          }

          return {
            items: [...state.items, { ...product, quantity: 1 }],
          };
        }),

      updateQuantity: (productId, newQty) => {
        if (newQty <= 0) {
          get().removeFromCart(productId);
        } else {
          set((state) => ({
            items: state.items.map((item) =>
              item.id === productId ? { ...item, quantity: newQty } : item,
            ),
          }));
        }
      },

      removeFromCart: (productId) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== productId),
        })),

      getCartCount: () => {
        return get().items.reduce((acc, item) => acc + item.quantity, 0);
      },

      getTotalPrice: () => {
        return get().items.reduce(
          (acc, item) => acc + item.price * item.quantity,
          0,
        );
      },

      clearCart: () => set({ items: [] }),

      // Implementasi fungsi baru
      setShipping: (data) => set({ shipping: data }),

      clearShipping: () => set({ shipping: null }),
    }),
    {
      name: "metapeptides-cart-storage",
    },
  ),
);
