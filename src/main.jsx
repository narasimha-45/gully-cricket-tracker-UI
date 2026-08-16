import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./styles/tokens.css";
import "./index.css";

import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import ErrorBoundary from "./components/common/ErrorBoundary";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary message="The app hit an unexpected error. Reloading should fix it.">
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
