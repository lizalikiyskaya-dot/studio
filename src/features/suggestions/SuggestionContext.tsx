"use client";

import { createContext, useContext } from "react";

const CanSuggestContext = createContext(false);

export function SuggestionProvider({
  canSuggest,
  children,
}: {
  canSuggest: boolean;
  children: React.ReactNode;
}) {
  return <CanSuggestContext.Provider value={canSuggest}>{children}</CanSuggestContext.Provider>;
}

export function useCanSuggest() {
  return useContext(CanSuggestContext);
}
