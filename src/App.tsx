import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';

// Páginas
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import SystemLogin from './pages/system/SystemLogin';
import QRScannerPro from './pages/system/QRScannerPro';
import ParentDashboard from './pages/system/ParentDashboard';
import AdminDashboard from './pages/system/AdminDashboard';
import SchoolDashboard from './pages/system/SchoolDashboard';
import AdminExecutiveDashboard from './pages/system/AdminExecutiveDashboard';

const queryClient = new QueryClient();

const App = () => {
  return (
    <ThemeProvider defaultTheme="light">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />

          <BrowserRouter>
            <Routes>
              {/* Home */}
              <Route path="/" element={<Index />} />

              {/* Login do sistema */}
              <Route path="/sistema/login" element={<SystemLogin />} />

              {/* Scanner Profissional de Alunos */}
              <Route path="/sistema/scanner-pro" element={<QRScannerPro />} />

              {/* Dashboards */}
              <Route path="/sistema/pais" element={<ParentDashboard />} />
              <Route path="/sistema/admin" element={<AdminDashboard />} />
              <Route path="/sistema/escola" element={<SchoolDashboard />} />

              {/* Dashboard executivo (opcional) */}
              <Route path="/admin-executivo" element={<AdminExecutiveDashboard />} />

              {/* Página não encontrada */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
};

export default App;