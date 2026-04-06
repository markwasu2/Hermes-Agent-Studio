"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Message, Conversation, AppSettings, GatewayStatus } from "./types";

interface AppState {
  settings: AppSettings;
  updateSettings: (s: Partial<AppSettings>) => void;

  status: GatewayStatus;
  setStatus: (s: GatewayStatus) => void;

  activePanel: string;
  setActivePanel: (p: string) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;

  // Onboarding
  onboardingComplete: boolean;
  setOnboardingComplete: (v: boolean) => void;

  activeConversation: string | null;
  setActiveConversation: (id: string | null) => void;
  messages: Message[];
  addMessage: (m: Message) => void;
  updateMessage: (id: string, patch: Partial<Message>) => void;
  clearMessages: () => void;

  conversations: Conversation[];
  upsertConversation: (c: Conversation) => void;
  removeConversation: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      settings: {
        gatewayUrl: process.env.NEXT_PUBLIC_GATEWAY_URL ?? "http://localhost:8642",
        apiKey: process.env.NEXT_PUBLIC_API_KEY ?? "",
        model: "hermes-agent",
        systemPrompt: "",
        streamingEnabled: true,
      },
      updateSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),

      status: { connected: false },
      setStatus: (status) => set({ status }),

      activePanel: "chat",
      setActivePanel: (activePanel) => set({ activePanel }),
      settingsOpen: false,
      setSettingsOpen: (settingsOpen) => set({ settingsOpen }),

      onboardingComplete: false,
      setOnboardingComplete: (v) => set({ onboardingComplete: v }),

      activeConversation: null,
      setActiveConversation: (id) => set({ activeConversation: id, messages: [] }),

      messages: [],
      addMessage: (m) => set((st) => ({ messages: [...st.messages, m] })),
      updateMessage: (id, patch) =>
        set((st) => ({
          messages: st.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        })),
      clearMessages: () => set({ messages: [] }),

      conversations: [],
      upsertConversation: (c) =>
        set((st) => {
          const existing = st.conversations.findIndex((x) => x.id === c.id);
          if (existing >= 0) {
            const updated = [...st.conversations];
            updated[existing] = c;
            return { conversations: updated };
          }
          return { conversations: [c, ...st.conversations] };
        }),
      removeConversation: (id) =>
        set((st) => ({ conversations: st.conversations.filter((c) => c.id !== id) })),
    }),
    {
      name: "hermes-studio",
      partialize: (s) => ({
        settings: s.settings,
        conversations: s.conversations,
        activeConversation: s.activeConversation,
        onboardingComplete: s.onboardingComplete,
      }),
    }
  )
);
