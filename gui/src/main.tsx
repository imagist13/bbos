import React from "react";
import ReactDOM from "react-dom/client";

import { Welcome } from "@/pages/Welcome";

import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Welcome />
  </React.StrictMode>,
);
