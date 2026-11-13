"use client";

import { useSyncExternalStore } from "react";
import { parkedStore } from "./chromeLayout";

/** True once the pinned column has parked; see parkedStore. */
export function useParked() {
  return useSyncExternalStore(parkedStore.subscribe, parkedStore.get, () => false);
}
