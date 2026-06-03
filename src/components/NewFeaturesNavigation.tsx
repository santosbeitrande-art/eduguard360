// src/components/NewFeaturesNavigation.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { BookOpen, GraduationCap, Users } from 'lucide-react';

export const NewFeaturesNavigation = () => {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-12">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-2">🚀 Novos Portais Educacionais</h2>
        <p className="text-lg opacity-90 mb-8">
          Acesso a cursos online, literatura aberta e ferramentas para educadores
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Portal de Cursos */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-6 hover:bg-white/20 transition">
            <GraduationCap className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">Cursos Online</h3>
            <p className="mb-4 opacity-90">
              Aprenda com profissionais moçambicanos. Pague em M-Pesa!
            </p>
            <Button 
              asChild 
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <a href="/cursos">Explorar Cursos</a>
            </Button>
          </div>

          {/* Portal de Literatura */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-6 hover:bg-white/20 transition">
            <BookOpen className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">Literatura Aberta</h3>
            <p className="mb-4 opacity-90">
              50.000+ livros grátis de domínio público e creative commons
            </p>
            <Button 
              asChild 
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <a href="/literatura">Descobrir Livros</a>
            </Button>
          </div>

          {/* Dashboard de Educador */}
          <div className="bg-white/10 backdrop-blur rounded-lg p-6 hover:bg-white/20 transition">
            <Users className="w-12 h-12 mb-4" />
            <h3 className="text-xl font-bold mb-2">Seja Educador</h3>
            <p className="mb-4 opacity-90">
              Crie cursos e ganhe até 75% das receitas. Receba em M-Pesa!
            </p>
            <Button 
              asChild 
              className="bg-white text-blue-600 hover:bg-gray-100"
            >
              <a href="/educador">Dashboard</a>
            </Button>
          </div>
        </div>

        {/* CTA Secundário */}
        <div className="mt-8 text-center">
          <p className="text-sm opacity-75 mb-3">
            Quer saber mais sobre a plataforma?
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
