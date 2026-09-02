import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/context/LanguageContext";
import GlobalFloatingActions from "@/components/GlobalFloatingActions";

// Páginas principais
import SystemLogin from "@/pages/system/SystemLogin";
import AdminDashboard from "@/pages/system/AdminDashboard";
import AdminCourses from "@/pages/system/AdminCourses";
import EnterprisePortalPage from "@/pages/system/EnterprisePortalPage";
import EnterpriseWorkspacePage from "@/pages/system/EnterpriseWorkspacePage";
import AnalyticsPortalPage from "@/pages/system/AnalyticsPortalPage";
import Building360PortalPage from "@/pages/building/Building360PortalPage";
import Building360BlueprintV1Page from "@/pages/building/Building360BlueprintV1Page";
import Building360WorkspacePage from "@/pages/building/Building360WorkspacePage";
import ParentDashboard from "@/pages/system/ParentDashboard";
import SchoolDashboard from "@/pages/system/SchoolDashboard";
import DirecaoDashboard from "@/pages/system/DirecaoDashboard";
import AdministracaoDashboard from "@/pages/system/AdministracaoDashboard";
import SecretariaDashboard from "@/pages/system/SecretariaDashboard";
import CoordenacaoDashboard from "@/pages/system/CoordenacaoDashboard";
import ProfessorDashboard from "@/pages/system/ProfessorDashboard";
import FinanceiroDashboard from "@/pages/system/FinanceiroDashboard";
import RHDashboard from "@/pages/system/RHDashboard";
import AdminExecutiveDashboard from "@/pages/system/AdminExecutiveDashboard";
import QRScannerPro from "@/pages/system/QRScannerPro";

// Página inicial
import Home from "@/pages/Home";
import LandingPage from "@/pages/public/LandingPage";

// Portais
import EducuardPortalHub from "@/EducuardPortalHub";
import EducationMarketplace from "@/EducationMarketplace";
import EducatorCreateCourse from "@/EducatorCreateCourse";
import CourseDetail from "@/CourseDetail";
import OfferService from "@/OfferService";

// Novas páginas educação online
import CoursesPage from "@/pages/CoursesPage";
import LiteraturePage from "@/pages/LiteraturePage";
import LiteratureBookPage from "@/pages/LiteratureBookPage";
import EducatorPortalPage from "@/pages/EducatorPortalPage";

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
    <LanguageProvider>
      <BrowserRouter>
        <Routes>

        {/* Página inicial Pública */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/public" element={<LandingPage />} />
        <Route path="/public/*" element={<LandingPage />} />

        {/* Portal Hub - Acesso central aos portais */}
        <Route path="/portais" element={<EducuardPortalHub />} />

        {/* EduMarket Portal */}
        <Route path="/edumarket" element={<EducationMarketplace />} />
        <Route path="/edumarket/criar-curso" element={<EducatorCreateCourse />} />
        <Route path="/edumarket/oferecer-servico" element={<OfferService />} />
        <Route path="/edumarket/curso/:courseId" element={<CourseDetail />} />

        {/* Cursos Online - Nova Plataforma */}
        <Route path="/cursos" element={<CoursesPage />} />
        <Route path="/cursos/:courseId" element={<CourseDetail />} />
        
        {/* Portal de Literatura Aberta */}
        <Route path="/literatura" element={<LiteraturePage />} />
        <Route path="/literatura/:bookId" element={<LiteratureBookPage />} />
        
        {/* Dashboard de Educador */}
        <Route path="/educador" element={<EducatorPortalPage />} />

        {/* ROTA CRÍTICA — resolve /sistema */}
        <Route path="/sistema" element={<SystemLogin />} />
        <Route path="/sistema/login" element={<SystemLogin />} />
        <Route path="/sistema/pais" element={<ParentDashboard />} />
        <Route path="/sistema/encarregado" element={<ParentDashboard />} />
        <Route path="/sistema/admin" element={<AdminDashboard />} />
        <Route path="/sistema/admin/edumarket" element={<AdminCourses />} />
        <Route path="/sistema/enterprise" element={<EnterprisePortalPage />} />
        <Route path="/sistema/enterprise/workspace/:role/:module" element={<EnterpriseWorkspacePage />} />
        <Route path="/enterprise" element={<Navigate to="/sistema/enterprise" replace />} />
        <Route path="/enterprise/workspace/:role/:module" element={<EnterpriseWorkspacePage />} />
        <Route path="/analytics" element={<AnalyticsPortalPage />} />
        <Route path="/building360" element={<Building360PortalPage />} />
        <Route path="/building360/blueprint" element={<Building360BlueprintV1Page />} />
        <Route path="/building360/workspace/:profile/:module" element={<Building360WorkspacePage />} />
        <Route path="/sistema/building360/:profile/:module" element={<Building360WorkspacePage />} />
        <Route path="/sistema/escola" element={<Navigate to="/sistema/administracao" replace />} />
        <Route path="/sistema/direcao" element={<DirecaoDashboard />} />
        <Route path="/sistema/direcao/:module" element={<DirecaoDashboard />} />
        <Route path="/sistema/administracao" element={<AdministracaoDashboard />} />
        <Route path="/sistema/administracao/:module" element={<AdministracaoDashboard />} />
        <Route path="/sistema/secretaria" element={<SecretariaDashboard />} />
        <Route path="/sistema/secretaria/:module" element={<SecretariaDashboard />} />
        <Route path="/sistema/coordenacao" element={<CoordenacaoDashboard />} />
        <Route path="/sistema/coordenacao/:module" element={<CoordenacaoDashboard />} />
        <Route path="/sistema/professor" element={<ProfessorDashboard />} />
        <Route path="/sistema/professor/:module" element={<ProfessorDashboard />} />
        <Route path="/sistema/financeiro" element={<FinanceiroDashboard />} />
        <Route path="/sistema/financeiro/:module" element={<FinanceiroDashboard />} />
        <Route path="/sistema/rh" element={<RHDashboard />} />
        <Route path="/sistema/rh/:module" element={<RHDashboard />} />
        <Route path="/sistema/seguranca" element={<QRScannerPro />} />
        <Route path="/sistema/scanner" element={<Navigate to="/sistema/seguranca" replace />} />
        <Route path="/sistema/aluno" element={<Navigate to="/cursos" replace />} />

        {/* Login alternativo */}
        <Route path="/login" element={<SystemLogin />} />

        {/* Dashboards */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/analytics-portal" element={<AnalyticsPortalPage />} />

        <Route path="/parent" element={<ParentDashboard />} />

        <Route path="/school" element={<SchoolDashboard />} />

        <Route
          path="/executive"
          element={<AdminExecutiveDashboard />}
        />

        {/* Scanner QR */}
        <Route path="/scanner" element={<Navigate to="/sistema/seguranca" replace />} />

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
      <GlobalFloatingActions />
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;