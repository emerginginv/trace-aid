import React from "react";
import { createRoot } from "react-dom/client";
import { ImpersonationProvider } from "./contexts/ImpersonationContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ImpersonationProvider>
      <App />
    </ImpersonationProvider>
  </React.StrictMode>
);
