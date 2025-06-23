import { create } from "zustand";

export const useThemeStore = create((set) => ({
  theme: localStorage.getItem("connectP-theme") || "dark",
  setTheme: (theme) => {
    localStorage.setItem("connectP-theme", theme);
    set({ theme });
  },
}));
