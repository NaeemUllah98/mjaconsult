import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/context/AuthContext";
import App from "./App";
import "./index.css";

// After a new build is uploaded, a browser still running the OLD app may try to
// lazy-load a code chunk whose hashed filename no longer exists on the server —
// which surfaced as a 404 / blank screen on refresh. Recover automatically by
// reloading once to pull the fresh index.html + chunk names. The sessionStorage
// guard prevents a reload loop if something else is genuinely broken.
const CHUNK_RELOAD_KEY = "mja-chunk-reloaded";
window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  if (!sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "12px",
              background: "#0d3b54",
              color: "#fff",
              fontSize: "14px",
            },
            success: { iconTheme: { primary: "#34a0a4", secondary: "#fff" } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);

// App booted successfully — clear the guard so a future stale-chunk situation
// can auto-recover again.
sessionStorage.removeItem(CHUNK_RELOAD_KEY);
