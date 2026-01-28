import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

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
