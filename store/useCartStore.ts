import { create } from "zustand";

interface Product {
  id: number;
  name: string;
  price: number;
  volume: string;
  purity: string;
}

interface CartState {
  cart: Record<number, number>; // { productId: quantity }
  isCartOpen: boolean;
  toggleCart: () => void;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (productId: string) => void;
  updateQuantity: (productId: number, newQty: number) => void;
  removeFromCart: (productId: number) => void;
  getCartCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  cart: {},
  isCartOpen: false,

  toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),

  setIsCartOpen: (open) => set({ isCartOpen: open }),

  addToCart: (productId) =>
    set((state) => ({
      cart: {
        ...state.cart,
        [productId]: (state.cart[productId as any] || 0) + 1,
      },
      isCartOpen: true,
    })),

  updateQuantity: (productId, newQty) => {
    if (newQty <= 0) {
      get().removeFromCart(productId);
    } else {
      set((state) => ({
        cart: { ...state.cart, [productId]: newQty },
      }));
    }
  },

  removeFromCart: (productId) =>
    set((state) => {
      const updatedCart = { ...state.cart };
      delete updatedCart[productId];
      return { cart: updatedCart };
    }),

  getCartCount: () => {
    return Object.values(get().cart).reduce((acc, qty) => acc + qty, 0);
  },
}));
