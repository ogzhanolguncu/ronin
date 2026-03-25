import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "../extension.css"
import { App } from "./app"

document.documentElement.classList.add("dark")

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
