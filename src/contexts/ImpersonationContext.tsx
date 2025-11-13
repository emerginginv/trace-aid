import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ImpersonationContextType {
  impersonatedUserId: string | null;
  impersonatedUserEmail: string | null;
  impersonatedUserName: string | null;
  startImpersonation: (userId: string, email: string, name: string) => void;
  stopImpersonation: () => void;
  isImpersonating: boolean;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [impersonatedUserEmail, setImpersonatedUserEmail] = useState<string | null>(null);
  const [impersonatedUserName, setImpersonatedUserName] = useState<string | null>(null);

  useEffect(() => {
    // Load impersonation state from localStorage
    const stored = localStorage.getItem("impersonation");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setImpersonatedUserId(data.userId);
        setImpersonatedUserEmail(data.email);
        setImpersonatedUserName(data.name);
      } catch (e) {
        localStorage.removeItem("impersonation");
      }
    }
  }, []);

  const startImpersonation = (userId: string, email: string, name: string) => {
    const data = { userId, email, name };
    localStorage.setItem("impersonation", JSON.stringify(data));
    setImpersonatedUserId(userId);
    setImpersonatedUserEmail(email);
    setImpersonatedUserName(name);
    
    // Reload the page to apply the impersonation
    window.location.href = "/";
  };

  const stopImpersonation = () => {
    localStorage.removeItem("impersonation");
    setImpersonatedUserId(null);
    setImpersonatedUserEmail(null);
    setImpersonatedUserName(null);
    
    // Reload the page to exit impersonation
    window.location.href = "/";
  };

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedUserId,
        impersonatedUserEmail,
        impersonatedUserName,
        startImpersonation,
        stopImpersonation,
        isImpersonating: !!impersonatedUserId,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  const context = useContext(ImpersonationContext);
  if (context === undefined) {
    throw new Error("useImpersonation must be used within an ImpersonationProvider");
  }
  return context;
}
