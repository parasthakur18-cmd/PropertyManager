import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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
    const key = 'chunk_reload_attempted';
    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, '1');
      window.location.reload();
    } else {
      sessionStorage.removeItem(key);
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
