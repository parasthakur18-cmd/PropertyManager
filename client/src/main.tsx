import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const CHUNK_RELOAD_KEY = 'chunk_reload_ts';
const CHUNK_RELOAD_COOLDOWN_MS = 30_000;

function isChunkLoadError(message: string): boolean {
  return (
    message.includes('Failed to fetch dynamically imported module') ||
    message.includes('Loading chunk') ||
    message.includes('Loading CSS chunk') ||
    message.includes('error loading dynamically imported module')
  );
}

window.addEventListener('unhandledrejection', (event) => {
  const reason = event.reason;
  const msg = reason?.message ?? String(reason ?? '');
  if (isChunkLoadError(msg)) {
    const last = parseInt(sessionStorage.getItem(CHUNK_RELOAD_KEY) ?? '0', 10);
    if (Date.now() - last > CHUNK_RELOAD_COOLDOWN_MS) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
      window.location.reload();
    }
  }
});

const rootElement = document.getElementById("root");

if (rootElement) {
  try {
    console.log('[Main] Starting React render...');
    const root = createRoot(rootElement);
    root.render(<App />);
    console.log('[Main] React render initiated');
  } catch (error) {
    console.error('[Main] Failed to render:', error);
    rootElement.innerHTML = '<div style="padding: 20px; font-family: sans-serif;"><h1>Loading Error</h1><p>Please refresh the page.</p></div>';
  }
} else {
  console.error('[Main] Root element not found');
}
