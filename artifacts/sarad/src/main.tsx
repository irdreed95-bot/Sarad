window.addEventListener('error', (e) => {
  alert('سراد - خطأ برمجي: ' + e.message + '\nفي ملف: ' + e.filename + '\nسطر: ' + e.lineno);
});

window.addEventListener('unhandledrejection', (e) => {
  alert('سراد - خطأ في السيرفرات: ' + e.reason);
});

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
// Force rebuild trigger
