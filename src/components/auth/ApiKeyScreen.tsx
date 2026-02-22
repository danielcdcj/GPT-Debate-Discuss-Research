"use client";

import React, { useState } from "react";
import { useDebateStore } from "@/store/debate-store";
import { validateApiKey, fetchModels } from "@/lib/openrouter";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { showToast } from "@/components/ui/Toast";

export function ApiKeyScreen() {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const setApiKey = useDebateStore((s) => s.setApiKey);
  const setAuthenticated = useDebateStore((s) => s.setAuthenticated);
  const setModels = useDebateStore((s) => s.setModels);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) {
      setError("Please enter an API key");
      return;
    }

    setLoading(true);
    setError("");

    const isValid = await validateApiKey(key.trim());
    if (!isValid) {
      setError("Invalid API key. Please check and try again.");
      setLoading(false);
      return;
    }

    try {
      const models = await fetchModels(key.trim());
      setModels(models);
    } catch {
      showToast("Failed to fetch models, but you can proceed", "info");
    }

    setApiKey(key.trim());
    setAuthenticated(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎙️</div>
          <h1 className="text-3xl font-bold text-white mb-2">Debate Room</h1>
          <p className="text-slate-400 text-sm">
            Multi-agent LLM discussion platform
          </p>
        </div>

        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="OpenRouter API Key"
              type="password"
              placeholder="sk-or-v1-..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              error={error}
              autoFocus
            />

            <p className="text-xs text-slate-500">
              Get your API key at{" "}
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline"
              >
                openrouter.ai/keys
              </a>
            </p>

            <Button type="submit" disabled={loading} size="lg" className="w-full">
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24"
                    fill="none"
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
                </span>
              ) : (
                "Enter Debate Room"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Your API key is stored locally in your browser and never sent to any server other than OpenRouter.
        </p>
      </div>
    </div>
  );
}
