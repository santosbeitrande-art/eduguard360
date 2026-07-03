// src/components/NewFeaturesNavigation.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, GraduationCap, Lock, Users } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';

export const NewFeaturesNavigation = () => {
  const { language } = useLanguage();

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-2">
          {language === 'pt' ? '🚀 Novos Portais Educacionais' : '🚀 New Educational Portals'}
        </h2>
        <p className="text-lg opacity-90 mb-8">
          {language === 'pt'
            ? 'Acesso a cursos online, literatura aberta e ferramentas para educadores'
            : 'Access online courses, open literature and tools for educators'}
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Portal de Cursos */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-6 hover:bg-white/20 transition">
            <GraduationCap className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">{language === 'pt' ? 'Cursos Online' : 'Online Courses'}</h3>
            <p className="mb-4 opacity-90">
              {language === 'pt' ? 'Aprenda com profissionais mocambicanos. Pague em M-Pesa!' : 'Learn with Mozambican professionals. Pay with M-Pesa!'}
            </p>
            <Button 
              asChild 
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <a href="/cursos">{language === 'pt' ? 'Explorar Cursos' : 'Explore Courses'}</a>
            </Button>
          </div>

          {/* Portal de Literatura */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-6 hover:bg-white/20 transition">
            <BookOpen className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">{language === 'pt' ? 'Literatura Aberta' : 'Open Literature'}</h3>
            <p className="mb-4 opacity-90">
              {language === 'pt' ? '50.000+ livros gratis de dominio publico e creative commons' : '50,000+ free public-domain and creative commons books'}
            </p>
            <Button 
              asChild 
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <a href="/literatura">{language === 'pt' ? 'Descobrir Livros' : 'Discover Books'}</a>
            </Button>
          </div>

          {/* Dashboard de Educador */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-6 hover:bg-white/20 transition">
            <Users className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">{language === 'pt' ? 'Seja Educador' : 'Become an Educator'}</h3>
            <p className="mb-4 opacity-90">
              {language === 'pt' ? 'Crie cursos e ganhe ate 75% das receitas. Receba em M-Pesa!' : 'Create courses and earn up to 75% of revenue. Get paid with M-Pesa!'}
            </p>
            <Button 
              asChild 
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <a href="/educador">Dashboard</a>
            </Button>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-lg p-6 hover:bg-white/20 transition">
            <Lock className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">EduGuard Verify AI</h3>
            <p className="mb-4 opacity-90">
              {language === 'pt'
                ? 'Portal de verificacao documental com IA para entidades e empresas.'
                : 'AI-powered document verification portal for organizations and enterprises.'}
            </p>
            <Button
              asChild
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <a href="/public/login">{language === 'pt' ? 'Aceder Verify AI' : 'Open Verify AI'}</a>
            </Button>
          </div>
        </div>

        {/* CTA Secundário */}
        <div className="mt-8 text-center">
          <p className="text-sm opacity-75 mb-3">
            {language === 'pt' ? 'Quer saber mais sobre a plataforma?' : 'Want to learn more about the platform?'}
          </p>
          <Button 
            asChild 
            variant="outline"
            className="border-white text-white hover:bg-white/20"
          >
            <a href="#" onclick="window.open('/ARCHITECTURE_COURSE_PLATFORM.md', '_blank')">
              Ver Documentação Completa
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NewFeaturesNavigation;
