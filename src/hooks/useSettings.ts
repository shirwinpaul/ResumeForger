"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_SETTINGS,
  readSettings,
  subscribeSettings,
  writeSettings,
  type AppSettings,
} from "@/lib/settings";

export function useSettings(): [AppSettings, (patch: Partial<AppSettings>) => void] {
  const settings = useSyncExternalStore(subscribeSettings, readSettings, () => DEFAULT_SETTINGS);
  return [settings, writeSettings];
}
