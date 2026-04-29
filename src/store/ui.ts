import { create } from "zustand";

export type BottomTab = "system-logs" | "signal-logs";

interface UIStore {
  // Active bottom panel tab
  activeBottomTab: BottomTab;
  setActiveBottomTab: (tab: BottomTab) => void;

  // Bottom logger height
  loggerExpanded: boolean;
  setLoggerExpanded: (expanded: boolean) => void;
  toggleLoggerExpanded: () => void;

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
  activeBottomTab: "system-logs",
  setActiveBottomTab: (tab) => set({ activeBottomTab: tab }),

  loggerExpanded: false,
  setLoggerExpanded: (expanded) => set({ loggerExpanded: expanded }),
  toggleLoggerExpanded: () =>
    set((state) => ({ loggerExpanded: !state.loggerExpanded })),

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
