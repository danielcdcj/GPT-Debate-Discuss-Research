"use client";

import React from "react";
import { EngineProvider } from "@/hooks/useEngine";
import { AppShell } from "@/components/layout/AppShell";
import { ChatPanel } from "@/components/chat/ChatPanel";

export default function Home() {
  return (
    <EngineProvider>
      <AppShell>
        <ChatPanel />
      </AppShell>
    </EngineProvider>
  );
}
