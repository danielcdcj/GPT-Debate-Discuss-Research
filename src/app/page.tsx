"use client";

import React, { useEffect, useState } from "react";
import { useDebateStore } from "@/store/debate-store";
import { ApiKeyScreen } from "@/components/auth/ApiKeyScreen";
import { Sidebar } from "@/components/sidebar/Sidebar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { RightPanel } from "@/components/right-panel/RightPanel";
import { ToastContainer } from "@/components/ui/Toast";
import { fetchModels } from "@/lib/openrouter";

export default function Home() {
  const isAuthenticated = useDebateStore((s) => s.isAuthenticated);
  const apiKey = useDebateStore((s) => s.apiKey);
  const models = useDebateStore((s) => s.models);
  const setModels = useDebateStore((s) => s.setModels);
  const [hydrated, setHydrated] = useState(false);

  // Wait for Zustand hydration
  useEffect(() => {
    setHydrated(true);
  }, []);

  // Fetch models on auth if not cached
  useEffect(() => {
    if (isAuthenticated && apiKey && models.length === 0) {
      fetchModels(apiKey)
        .then(setModels)
        .catch(() => {
          // Models fetch failed, user can still use the app
        });
    }
  }, [isAuthenticated, apiKey, models.length, setModels]);

  // Prevent hydration mismatch
  if (!hydrated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-500 text-sm">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <ApiKeyScreen />
        <ToastContainer />
      </>
    );
  }

  return (
    <>
      <div className="h-[100dvh] flex overflow-hidden">
        <Sidebar />
        <ChatPanel />
        <RightPanel />
      </div>
      <ToastContainer />
    </>
  );
}
