import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Widget } from "./components/widget/Widget";
import "./index.css";

const isWidget = new URLSearchParams(window.location.search).get("window") === "widget";

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isWidget ? <Widget /> : <App />}</StrictMode>
);
