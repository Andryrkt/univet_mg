import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { SettingsProvider } from "./context/SettingsContext";
import { ThemeProvider } from "./context/ThemeContext";
import { TourProvider } from "./context/TourContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <SettingsProvider>
          <AuthProvider>
            <TourProvider>
              <App />
            </TourProvider>
          </AuthProvider>
        </SettingsProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
