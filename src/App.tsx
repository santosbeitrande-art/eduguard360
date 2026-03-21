import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

import SystemLogin from "./pages/system/SystemLogin";
import QRScanner from "./pages/system/QRScanner";
import ParentDashboard from "./pages/system/ParentDashboard";
import AdminDashboard from "./pages/system/AdminDashboard";
import SchoolDashboard from "./pages/system/SchoolDashboard";
import Students from "./pages/system/Students";
import AdminExecutiveDashboard from "./pages/system/AdminExecutiveDashboard";

const queryClient = new QueryClient();

const App = () => {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />

          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />

              <Route path="/sistema" element={<SystemLogin />} />
              <Route path="/sistema/login" element={<SystemLogin />} />

              <Route path="/sistema/scanner" element={<QRScanner />} />
              <Route path="/sistema/pais" element={<ParentDashboard />} />
              <Route path="/sistema/admin" element={<AdminDashboard />} />
              <Route path="/sistema/escola" element={<SchoolDashboard />} />
              <Route path="/sistema/alunos" element={<Students />} />

              {/* 🔥 NOVO DASHBOARD EXECUTIVO */}
              <Route path="/admin-executivo" element={<AdminExecutiveDashboard />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;
