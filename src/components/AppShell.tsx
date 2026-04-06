"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";
import { checkHealth } from "@/lib/hermes";
import Sidebar from "./Sidebar";
import ChatPanel from "./ChatPanel";
import SessionsPanel from "./SessionsPanel";
import SkillsPanel from "./SkillsPanel";
import MemoryPanel from "./MemoryPanel";
import CronPanel from "./CronPanel";
import SettingsModal from "./SettingsModal";
import StatusBar from "./StatusBar";

export default function AppShell() {
  const { activePanel, settings, setStatus, settingsOpen } = useStore();

  // Poll health every 15 seconds
  useEffect(() => {
    async function ping() {
      const s = await checkHealth(settings);
      setStatus(s);
    }
    ping();
    const interval = setInterval(ping, 15_000);
    return () => clearInterval(interval);
  }, [settings.gatewayUrl, settings.apiKey]);

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: "var(--surface-0)" }}>
      <Sidebar />

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <StatusBar />
        <div className="flex-1 min-h-0 overflow-hidden panel-fade">
          {activePanel === "chat" && <ChatPanel />}
          {activePanel === "sessions" && <SessionsPanel />}
          {activePanel === "skills" && <SkillsPanel />}
          {activePanel === "memory" && <MemoryPanel />}
          {activePanel === "cron" && <CronPanel />}
        </div>
      </div>

      {settingsOpen && <SettingsModal />}
    </div>
  );
}
