import { create } from 'zustand';

interface CartItem {
  id: string; // e.g. "monthly" or "yearly"
  title: string;
  price: number;
  quantity: number;
}

interface CartState {
  isOpen: boolean;
  items: CartItem[];
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  getTotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  isOpen: false,
  items: [],
  
  openCart: () => set({ isOpen: true }),
  closeCart: () => set({ isOpen: false }),
  
  addItem: (item) => set((state) => {
    const existing = state.items.find(i => i.id === item.id);
    if (existing) {
      return {
        items: state.items.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i),
        isOpen: true
      };
    }
    return {
      items: [...state.items, { ...item, quantity: 1 }],
      isOpen: true
    };
  }),

  removeItem: (id) => set((state) => ({
    items: state.items.filter(i => i.id !== id)
  })),

  clearCart: () => set({ items: [] }),

  getTotal: () => {
    const { items } = get();
    return items.reduce((total, item) => total + (item.price * item.quantity), 0);
  }
}));
