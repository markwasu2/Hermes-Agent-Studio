"use client";
import { useEffect, useState } from "react";
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
import OnboardingWizard from "./OnboardingWizard";
import ToastContainer from "./Toast";
import CommandPalette from "./CommandPalette";

export default function AppShell() {
  const {
    activePanel, settings, setStatus, settingsOpen,
    onboardingComplete, setOnboardingComplete,
  } = useStore();

  const [cmdOpen, setCmdOpen] = useState(false);

  // Fast polling: 5s until connected, then 15s
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    let fast = true;

    async function ping() {
      const s = await checkHealth(settings);
      setStatus(s);
      if (s.connected) fast = false;
      timeout = setTimeout(ping, fast ? 5_000 : 15_000);
    }

    ping();
    return () => clearTimeout(timeout);
  }, [settings.gatewayUrl, settings.apiKey]);

  // Cmd+K / Ctrl+K opens command palette
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(prev => !prev);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showOnboarding = !onboardingComplete;

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

      {showOnboarding && (
        <OnboardingWizard onComplete={() => setOnboardingComplete(true)} />
      )}
      {settingsOpen && <SettingsModal />}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <ToastContainer />
    </div>
  );
}
