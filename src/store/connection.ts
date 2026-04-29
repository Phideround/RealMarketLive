import { create } from "zustand";

function createLogId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "success";
  message: string;
  details?: string;
}

interface ConnectionStore {
  // Connection status
  wsConnected: boolean;
  setWsConnected: (connected: boolean) => void;

  // Latency
  latency: number;
  setLatency: (ms: number) => void;

  // Server time
  serverTime: string;
  setServerTime: (time: string) => void;

  // API health
  apiHealth: "ok" | "degraded" | "error";
  setApiHealth: (health: "ok" | "degraded" | "error") => void;

  // Logs
  logs: SystemLog[];
  addLog: (log: Omit<SystemLog, "id">) => void;
  clearLogs: () => void;
  maxLogs: number;

  // Tick frequency (ticks per second)
  tickFrequency: number;
  updateTickFrequency: () => void;
  tickCount: number;
  setTickCount: (count: number) => void;

  // Last tick timestamp for frequency calculation
  lastTickReset: number;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  wsConnected: false,
  setWsConnected: (connected: boolean) => set({ wsConnected: connected }),

  latency: 0,
  setLatency: (ms: number) => set({ latency: ms }),

  serverTime: new Date().toISOString(),
  setServerTime: (time: string) => set({ serverTime: time }),

  apiHealth: "ok",
  setApiHealth: (health: "ok" | "degraded" | "error") =>
    set({ apiHealth: health }),

  logs: [],
  addLog: (log) =>
    set((state) => ({
      logs: [
        { ...log, id: createLogId() },
        ...state.logs,
      ].slice(0, state.maxLogs),
    })),
  clearLogs: () => set({ logs: [] }),
  maxLogs: 100,

  tickFrequency: 0,
  updateTickFrequency: () => {
    set((state) => {
      const now = Date.now();
      if (now - state.lastTickReset >= 1000) {
        return {
          tickFrequency: state.tickCount,
          tickCount: 0,
          lastTickReset: now,
        };
      }
      return {
        tickCount: state.tickCount + 1,
      };
    });
  },
  tickCount: 0,
  setTickCount: (count: number) => set({ tickCount: count }),
  lastTickReset: Date.now(),
}));
