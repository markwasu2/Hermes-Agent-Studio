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

  // Poll health — 5s until connected, then 20s
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let connected = false;

    async function ping() {
      const s = await checkHealth(settings);
      setStatus(s);
      if (s.connected) connected = true;
      timer = setTimeout(ping, connected ? 20_000 : 5_000);
    }

    ping();
    return () => clearTimeout(timer);
  }, [settings.gatewayUrl, settings.apiKey]);

  // Cmd+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(p => !p);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

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

      {/* Onboarding — shown on first ever open */}
      {!onboardingComplete && (
        <OnboardingWizard onComplete={() => setOnboardingComplete(true)} />
      )}

      {settingsOpen && <SettingsModal />}
      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
      <ToastContainer />
    </div>
  );
}
