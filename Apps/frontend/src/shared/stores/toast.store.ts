import { create } from "zustand";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: ToastMessage[];
  toast: (payload: Omit<ToastMessage, "id">) => void;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  toast: (payload) => {
    const id = Math.random().toString(36).slice(2, 9);
    const newToast = { ...payload, id };

    set((state) => ({ toasts: [...state.toasts, newToast] }));

    const duration = payload.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },
  dismiss: (id) => {
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
  },
}));

export const toast = (payload: Omit<ToastMessage, "id">) => {
  useToastStore.getState().toast(payload);
};
