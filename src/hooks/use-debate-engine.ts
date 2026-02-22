"use client";

import { useCallback } from "react";
import { useDebateStore } from "@/store/debate-store";
import { runDebateRound } from "@/lib/debate-engine";
import { showToast } from "@/components/ui/Toast";

export function useDebateEngine() {
  const activeRoomId = useDebateStore((s) => s.activeRoomId);
  const rooms = useDebateStore((s) => s.rooms);
  const room = rooms.find((r) => r.id === activeRoomId);
  const queueUserMessage = useDebateStore((s) => s.queueUserMessage);
  const setPhase = useDebateStore((s) => s.setPhase);
  const selectedHostModel = useDebateStore((s) => s.selectedHostModel);

  const sendMessage = useCallback(
    async (message: string) => {
      if (!activeRoomId || !room) return;

      if (!selectedHostModel) {
        showToast(
          "Please select a host model in the Config tab",
          "error"
        );
        return;
      }

      const isRoundActive =
        room.phase === "GUESTS_RESPONDING" ||
        room.phase === "HOST_SUMMARIZING" ||
        room.phase === "RESEARCH_PHASE" ||
        room.phase === "HOST_PRESENTING";

      if (isRoundActive) {
        queueUserMessage(activeRoomId, message);
        showToast("Message queued — will be addressed after current round", "info");
        return;
      }

      // Host goes first — set phase to HOST_SUMMARIZING
      setPhase(activeRoomId, "HOST_SUMMARIZING");

      try {
        await runDebateRound(activeRoomId, message);
      } catch (err) {
        showToast(
          `Debate error: ${err instanceof Error ? err.message : "Unknown error"}`,
          "error"
        );
        setPhase(activeRoomId, "AWAITING_USER");
      }
    },
    [activeRoomId, room, selectedHostModel, queueUserMessage, setPhase]
  );

  return { sendMessage };
}
