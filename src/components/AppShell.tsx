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
import CanvasPanel from "./CanvasPanel";
import SettingsModal from "./SettingsModal";
import StatusBar from "./StatusBar";

export default function AppShell() {
  const { activePanel, settings, setStatus, settingsOpen } = useStore();

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
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {activePanel !== "canvas" && <StatusBar />}
        <div className="flex-1 min-h-0 overflow-hidden panel-fade">
          {activePanel === "chat"     && <ChatPanel />}
          {activePanel === "canvas"   && <CanvasPanel />}
          {activePanel === "sessions" && <SessionsPanel />}
          {activePanel === "skills"   && <SkillsPanel />}
          {activePanel === "memory"   && <MemoryPanel />}
          {activePanel === "cron"     && <CronPanel />}
        </div>
      </div>
      {settingsOpen && <SettingsModal />}
    </div>
  );
}
