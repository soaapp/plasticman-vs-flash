import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <div style={{ minHeight: "100vh", padding: "24px 12px" }}>
      <App />
    </div>
  </React.StrictMode>
);
