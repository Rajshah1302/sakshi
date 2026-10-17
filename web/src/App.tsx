import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { ToastProvider } from "./components/Toast";
import CreatePage from "./pages/CreatePage";
import GuardianPage from "./pages/GuardianPage";
import LandingPage from "./pages/LandingPage";
import SettingsPage from "./pages/SettingsPage";
import VaultPage from "./pages/VaultPage";
import VaultsPage from "./pages/VaultsPage";

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route element={<Layout />}>
            <Route path="vaults" element={<VaultsPage />} />
            <Route path="create" element={<CreatePage />} />
            <Route path="vaults/:vaultKey" element={<VaultPage />} />
            <Route path="guardians" element={<GuardianPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  );
}
