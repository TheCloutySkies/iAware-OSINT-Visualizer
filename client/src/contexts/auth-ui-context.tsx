import { createContext, useContext, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";

interface AuthUiContextValue {
  isAuthenticated: boolean;
  isLoading: boolean;
  requireAuth: () => boolean;
  authPromptOpen: boolean;
  closeAuthPrompt: () => void;
}

const AuthUiContext = createContext<AuthUiContextValue>({
  isAuthenticated: false,
  isLoading: true,
  requireAuth: () => false,
  authPromptOpen: false,
  closeAuthPrompt: () => {},
});

export function AuthUiProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [authPromptOpen, setAuthPromptOpen] = useState(false);

  const requireAuth = useCallback((): boolean => {
    if (!isAuthenticated) {
      setAuthPromptOpen(true);
      return false;
    }
    return true;
  }, [isAuthenticated]);

  const closeAuthPrompt = useCallback(() => setAuthPromptOpen(false), []);

  return (
    <AuthUiContext.Provider value={{ isAuthenticated, isLoading, requireAuth, authPromptOpen, closeAuthPrompt }}>
      {children}
    </AuthUiContext.Provider>
  );
}

export function useAuthUi() {
  return useContext(AuthUiContext);
}
