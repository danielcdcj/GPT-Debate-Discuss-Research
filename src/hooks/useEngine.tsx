"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { DebateStore, getStore, type StoreState } from "@/core/store";

const StoreContext = createContext<DebateStore | null>(null);

export function EngineProvider({ children }: { children: React.ReactNode }) {
  const storeRef = useRef<DebateStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = getStore();
  }

  return (
    <StoreContext.Provider value={storeRef.current}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore(): DebateStore {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used within EngineProvider");
  return store;
}

export function useStoreState<T>(selector: (state: StoreState) => T): T {
  const store = useStore();
  const [value, setValue] = useState(() => selector(store.getState()));

  useEffect(() => {
    // Re-check on any state-affecting events
    const events = [
      "room:created", "room:deleted", "room:updated", "room:active",
      "phase:changed", "message:added", "message:updated", "message:chunk",
      "guest:added", "guest:removed", "guest:model:changed", "guest:memory:updated",
      "research:file:added", "research:file:updated", "research:file:chunk",
      "host:memory:updated", "models:loaded", "models:loading",
      "auth:changed", "ui:rightPanelTab", "ui:sidebarCollapsed",
      "ui:mobileSidebarOpen", "ui:mobileRightPanelOpen",
      "debate:intensity",
    ] as const;

    const unsubscribers = events.map((event) =>
      store.on(event, () => {
        const next = selector(store.getState());
        setValue(next);
      })
    );

    return () => unsubscribers.forEach((unsub) => unsub());
  }, [store, selector]);

  return value;
}

export function useStoreActions() {
  const store = useStore();

  return {
    // Auth
    setApiKey: useCallback((key: string) => store.setApiKey(key), [store]),
    setAuthenticated: useCallback((val: boolean) => store.setAuthenticated(val), [store]),
    logout: useCallback(() => store.logout(), [store]),

    // Models
    setModels: useCallback((models: StoreState["models"]) => store.setModels(models), [store]),
    setModelsLoading: useCallback((val: boolean) => store.setModelsLoading(val), [store]),
    setSelectedHostModel: useCallback((id: string) => store.setSelectedHostModel(id), [store]),
    setSelectedGuestModel: useCallback((id: string) => store.setSelectedGuestModel(id), [store]),
    setSelectedResearchModel: useCallback((id: string) => store.setSelectedResearchModel(id), [store]),

    // Rooms
    createRoom: useCallback(
      (...args: Parameters<DebateStore["createRoom"]>) => store.createRoom(...args),
      [store]
    ),
    deleteRoom: useCallback((id: string) => store.deleteRoom(id), [store]),
    setActiveRoom: useCallback((id: string | null) => store.setActiveRoom(id), [store]),
    updateRoomConfig: useCallback(
      (...args: Parameters<DebateStore["updateRoomConfig"]>) => store.updateRoomConfig(...args),
      [store]
    ),

    // Guests
    addGuest: useCallback(
      (...args: Parameters<DebateStore["addGuest"]>) => store.addGuest(...args),
      [store]
    ),
    removeGuest: useCallback(
      (...args: Parameters<DebateStore["removeGuest"]>) => store.removeGuest(...args),
      [store]
    ),
    updateGuestModel: useCallback(
      (...args: Parameters<DebateStore["updateGuestModel"]>) => store.updateGuestModel(...args),
      [store]
    ),
    queueUserMessage: useCallback(
      (...args: Parameters<DebateStore["queueUserMessage"]>) => store.queueUserMessage(...args),
      [store]
    ),

    // UI
    setRightPanelTab: useCallback(
      (tab: StoreState["rightPanelTab"]) => store.setRightPanelTab(tab),
      [store]
    ),
    setSidebarCollapsed: useCallback((val: boolean) => store.setSidebarCollapsed(val), [store]),
    setMobileSidebarOpen: useCallback((val: boolean) => store.setMobileSidebarOpen(val), [store]),
    setMobileRightPanelOpen: useCallback((val: boolean) => store.setMobileRightPanelOpen(val), [store]),
  };
}
