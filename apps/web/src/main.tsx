import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./styles.css";

const baseName = import.meta.env.BASE_URL.replace(/^\/+|\/+$/gu, "");
const root = document.getElementById("root");
if (root === null) throw new Error("Missing #root mount point");

const routerProps = baseName === "" ? {} : { basename: `/${baseName}` };
const reactRoot = createRoot(root);

function bootstrap(): void {
  try {
    reactRoot.render(
      <StrictMode>
        <BrowserRouter {...routerProps}>
          <App />
        </BrowserRouter>
      </StrictMode>,
    );
  } catch (error) {
    console.error(error);
    reactRoot.render(
      <div className="boot-shell" role="alert">
        <strong>资料载入失败</strong>
        <p>请检查网络连接，或稍后重新载入这一页。</p>
        <button type="button" onClick={() => window.location.reload()}>
          重新载入
        </button>
      </div>,
    );
  }
}

bootstrap();
