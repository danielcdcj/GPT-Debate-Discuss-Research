"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useStoreState, useStoreActions } from "@/hooks/useEngine";
import type { Phase } from "@/core/types";
import { Button } from "@/components/ui/Button";
import { validateApiKey, fetchModels } from "@/core/api";
import { Sidebar } from "@/components/layout/Sidebar";
import { RightPanel } from "@/components/layout/RightPanel";

// ─── Phase Display Config ───────────────────────────────────────────

const PHASE_CONFIG: Record<Phase, { label: string; color: string; pulse: boolean }> = {
  IDLE: {
    label: "Idle",
    color: "bg-slate-500/20 text-slate-400",
    pulse: false,
  },
  AWAITING_USER: {
    label: "Awaiting Your Input",
    color: "bg-amber-500/15 text-amber-400",
    pulse: true,
  },
  HOST_THINKING: {
    label: "Host Thinking",
    color: "bg-indigo-500/15 text-indigo-400",
    pulse: true,
  },
  HOST_PRESENTING: {
    label: "Host Presenting",
    color: "bg-indigo-500/15 text-indigo-400",
    pulse: true,
  },
  GUESTS_RESPONDING: {
    label: "Guests Responding",
    color: "bg-emerald-500/15 text-emerald-400",
    pulse: true,
  },
  RESEARCH_PHASE: {
    label: "Researching",
    color: "bg-violet-500/15 text-violet-400",
    pulse: true,
  },
};

// ─── Phase Indicator ────────────────────────────────────────────────

function PhaseIndicator({ phase }: { phase: Phase }) {
  const config = PHASE_CONFIG[phase];

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-white/[0.06] bg-white/[0.01]">
      <div className="flex items-center gap-2">
        {/* Status dot */}
        <span className="relative flex h-2 w-2">
          {config.pulse && (
            <span
              className={`absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping ${
                config.color.split(" ")[0]
              }`}
            />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${config.color.split(" ")[0]}`}
          />
        </span>

        <span className={`text-xs font-medium ${config.color.split(" ")[1]}`}>
          {config.label}
        </span>
      </div>
    </div>
  );
}

// ─── Login Screen ───────────────────────────────────────────────────

function LoginScreen() {
  const actions = useStoreActions();
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!apiKey.trim()) {
      setError("Please enter an API key.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const valid = await validateApiKey(apiKey.trim());
      if (!valid) {
        setError("Invalid API key. Please check and try again.");
        setLoading(false);
        return;
      }

      // Key is valid -- store it and fetch models
      actions.setApiKey(apiKey.trim());

      try {
        const models = await fetchModels(apiKey.trim());
        actions.setModels(models);
      } catch {
        // Models fetch failed but auth succeeded, user can retry later
      }

      actions.setAuthenticated(true);
    } catch {
      setError("Connection failed. Please check your network and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-[#08080e] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-indigo-500/15 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-indigo-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Debate Room
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Multi-Agent LLM Discussion Platform
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl bg-white/[0.03] border border-white/[0.06] p-6">
          <label className="block text-xs font-medium text-slate-400 mb-2">
            OpenRouter API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="sk-or-..."
            className="
              w-full rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white
              placeholder-slate-600 transition-colors
              focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50
            "
            autoFocus
            disabled={loading}
          />

          {error && (
            <p className="mt-2.5 text-xs text-red-400">{error}</p>
          )}

          <Button
            variant="primary"
            size="lg"
            className="w-full mt-4"
            onClick={handleLogin}
            disabled={loading || !apiKey.trim()}
          >
            {loading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Validating...
              </>
            ) : (
              "Connect"
            )}
          </Button>

          <p className="mt-4 text-[11px] text-slate-600 text-center leading-relaxed">
            Requires an{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-400/70 hover:text-indigo-400 underline underline-offset-2"
            >
              OpenRouter API key
            </a>
            . Your key is stored locally and never sent to our servers.
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Mobile Header ──────────────────────────────────────────────────

function MobileHeader() {
  const actions = useStoreActions();
  const activeRoom = useStoreState(
    useCallback(
      (s) => {
        if (!s.activeRoomId) return null;
        return s.rooms.find((r) => r.id === s.activeRoomId) ?? null;
      },
      []
    )
  );

  return (
    <div className="flex md:hidden items-center justify-between px-3 py-2.5 border-b border-white/[0.06] bg-[#08080e]">
      {/* Hamburger menu */}
      <button
        onClick={() => actions.setMobileSidebarOpen(true)}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Room name or app name */}
      <div className="text-center flex-1 min-w-0 px-2">
        <p className="text-sm font-semibold text-slate-200 truncate">
          {activeRoom ? activeRoom.name : "Debate Room"}
        </p>
        {activeRoom?.topic && (
          <p className="text-[10px] text-slate-500 truncate">
            {activeRoom.topic}
          </p>
        )}
      </div>

      {/* Settings (right panel toggle) */}
      <button
        onClick={() => actions.setMobileRightPanelOpen(true)}
        className="w-9 h-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] transition-colors"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>
    </div>
  );
}

// ─── App Shell ──────────────────────────────────────────────────────

export function AppShell({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useStoreState(
    useCallback((s) => s.isAuthenticated, [])
  );
  const apiKey = useStoreState(useCallback((s) => s.apiKey, []));
  const modelsCount = useStoreState(useCallback((s) => s.models.length, []));
  const modelsLoading = useStoreState(useCallback((s) => s.modelsLoading, []));
  const actions = useStoreActions();

  const activeRoomPhase = useStoreState(
    useCallback(
      (s): Phase | null => {
        if (!s.activeRoomId) return null;
        const room = s.rooms.find((r) => r.id === s.activeRoomId);
        return room?.phase ?? null;
      },
      []
    )
  );

  // Auto-fetch models when authenticated but list is empty (e.g. page refresh)
  useEffect(() => {
    if (isAuthenticated && apiKey && modelsCount === 0 && !modelsLoading) {
      actions.setModelsLoading(true);
      fetchModels(apiKey)
        .then((models) => actions.setModels(models))
        .catch(() => {
          // Silently fail — user can still use the app with manual model IDs
        })
        .finally(() => actions.setModelsLoading(false));
    }
  }, [isAuthenticated, apiKey, modelsCount, modelsLoading, actions]);

  // Show login screen when not authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  return (
    <div className="h-[100dvh] flex flex-col bg-[#08080e] overflow-hidden">
      {/* Mobile header bar */}
      <MobileHeader />

      {/* Main 3-column layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left: Sidebar */}
        <Sidebar />

        {/* Center: Phase indicator + Chat area */}
        <main className="flex-1 flex flex-col min-w-0">
          {/* Phase indicator bar */}
          {activeRoomPhase && <PhaseIndicator phase={activeRoomPhase} />}

          {/* Chat content via children */}
          <div className="flex-1 min-h-0">{children}</div>
        </main>

        {/* Right: Config / Guests / Research panel */}
        <RightPanel />
      </div>
    </div>
  );
}
