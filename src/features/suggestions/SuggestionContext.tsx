"use client";

import { createContext, useContext, useState } from "react";

const CanSuggestContext = createContext<[boolean, (v: boolean) => void]>([false, () => {}]);

export function SuggestionProvider({
  canSuggest,
  children,
}: {
  canSuggest: boolean;
  children: React.ReactNode;
}) {
  const state = useState(canSuggest);
  return <CanSuggestContext.Provider value={state}>{children}</CanSuggestContext.Provider>;
}

export function useCanSuggest() {
  return useContext(CanSuggestContext)[0];
}

export function useSetCanSuggest() {
  return useContext(CanSuggestContext)[1];
}
