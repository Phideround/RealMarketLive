import { create } from "zustand";

export type BottomTab = "logs";

interface UIStore {
  // Active bottom panel tab
  activeBottomTab: BottomTab;
  setActiveBottomTab: (tab: BottomTab) => void;

  // Panel visibility
  showLogs: boolean;
  setShowLogs: (show: boolean) => void;

  // Heat intensity (for flash effects)
  heatIntensity: Record<string, number>;
  setHeatIntensity: (symbol: string, intensity: number) => void;
  decayHeatIntensity: () => void;

  // Keyboard shortcuts enabled
  keyboardShortcuts: boolean;
  setKeyboardShortcuts: (enabled: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  activeBottomTab: "logs",
  setActiveBottomTab: () => set({ activeBottomTab: "logs" }),

  showLogs: false,
  setShowLogs: (show: boolean) => set({ showLogs: show }),

  heatIntensity: {},
  setHeatIntensity: (symbol: string, intensity: number) =>
    set((state) => ({
      heatIntensity: { ...state.heatIntensity, [symbol]: Math.min(intensity, 1) },
    })),
  decayHeatIntensity: () =>
    set((state) => {
      const newIntensities: Record<string, number> = {};
      for (const [symbol, intensity] of Object.entries(state.heatIntensity)) {
        const newIntensity = intensity * 0.9;
        if (newIntensity > 0.01) {
          newIntensities[symbol] = newIntensity;
        }
      }
      return { heatIntensity: newIntensities };
    }),

  keyboardShortcuts: true,
  setKeyboardShortcuts: (enabled: boolean) =>
    set({ keyboardShortcuts: enabled }),
}));
