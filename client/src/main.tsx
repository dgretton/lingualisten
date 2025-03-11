import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set up language meta attributes for proper speech synthesis
// The default document language is Spanish, but for speech synthesis paths, it'll be dynamically set to English
document.documentElement.lang = "es";

// Add explicit meta tag for content language
if (!document.querySelector('meta[http-equiv="Content-Language"]')) {
  const meta = document.createElement('meta');
  meta.setAttribute('http-equiv', 'Content-Language');
  meta.setAttribute('content', 'es');
  document.head.appendChild(meta);
}

createRoot(document.getElementById("root")!).render(<App />);
