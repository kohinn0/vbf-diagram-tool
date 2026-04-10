import { createContext, useContext } from "react";

export interface AppActions {
  isSaving: boolean;
  locked: boolean;
  hasReportId: boolean;
  handleSave: () => Promise<void>;
  handleExport: (type: "pdf" | "word") => Promise<void>;
  handleFinalize: () => Promise<void>;
}

export const AppActionsContext = createContext<AppActions | null>(null);

export function useAppActions(): AppActions {
  const ctx = useContext(AppActionsContext);
  if (!ctx) throw new Error("useAppActions must be used within AppActionsContext.Provider");
  return ctx;
}
