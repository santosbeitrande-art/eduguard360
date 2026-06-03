import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/context/LanguageContext";

// Páginas principais
import SystemLogin from "@/pages/system/SystemLogin";
import AdminDashboard from "@/pages/system/AdminDashboard";
import AdminCourses from "@/pages/system/AdminCourses";
import ParentDashboard from "@/pages/system/ParentDashboard";
import SchoolDashboard from "@/pages/system/SchoolDashboard";
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
        <Route path="/sistema/pais" element={<ParentDashboard />} />
        <Route path="/sistema/admin" element={<AdminDashboard />} />
        <Route path="/sistema/admin/edumarket" element={<AdminCourses />} />
        <Route path="/sistema/escola" element={<SchoolDashboard />} />
        <Route path="/sistema/scanner" element={<QRScannerPro />} />

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
    </LanguageProvider>
  );
}

export default App;