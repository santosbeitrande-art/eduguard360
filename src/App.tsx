import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// Páginas principais
import SystemLogin from "@/pages/system/SystemLogin";
import AdminDashboard from "@/pages/system/AdminDashboard";
import ParentDashboard from "@/pages/system/ParentDashboard";
import SchoolDashboard from "@/pages/system/SchoolDashboard";
import AdminExecutiveDashboard from "@/pages/system/AdminExecutiveDashboard";
import QRScannerPro from "@/pages/system/QRScannerPro";

// Página inicial
import Home from "@/pages/Home";
import LandingPage from "@/pages/public/LandingPage";

// Página 404
function NotFound() {
  return (
    <div className="flex items-center justify-center h-screen text-center">
      <div>
        <h1 className="text-4xl font-bold">404</h1>

        <p className="mt-2">
          Página não encontrada
        </p>

        <a
          href="/"
          className="text-blue-600 underline mt-4 inline-block"
        >
          Voltar ao início
        </a>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Página inicial Pública */}
        <Route path="/" element={<LandingPage />} />

        {/* ROTA CRÍTICA — resolve /sistema */}
        <Route path="/sistema" element={<SystemLogin />} />

        {/* Login alternativo */}
        <Route path="/login" element={<SystemLogin />} />

        {/* Dashboards */}
        <Route path="/admin" element={<AdminDashboard />} />

        <Route path="/parent" element={<ParentDashboard />} />

        <Route path="/school" element={<SchoolDashboard />} />

        <Route
          path="/executive"
          element={<AdminExecutiveDashboard />}
        />

        {/* Scanner QR */}
        <Route path="/scanner" element={<QRScannerPro />} />

        {/* Dashboard padrão */}
        <Route
          path="/dashboard"
          element={<Navigate to="/admin" replace />}
        />

        {/* Redirecionamentos úteis */}
        <Route
          path="/home"
          element={<Navigate to="/" replace />}
        />

        {/* Página não encontrada */}
        <Route path="*" element={<NotFound />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;