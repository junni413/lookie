import { create } from "zustand";

type UIState = {
  isWorkerDrawerOpen: boolean;
  openWorkerDrawer: () => void;
  closeWorkerDrawer: () => void;
  toggleWorkerDrawer: () => void;
};

export const useUIStore = create<UIState>((set) => ({
  isWorkerDrawerOpen: false,
  openWorkerDrawer: () => set({ isWorkerDrawerOpen: true }),
  closeWorkerDrawer: () => set({ isWorkerDrawerOpen: false }),
  toggleWorkerDrawer: () =>
    set((s) => ({ isWorkerDrawerOpen: !s.isWorkerDrawerOpen })),
}));
