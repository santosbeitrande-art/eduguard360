import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';
import {
  BookOpen,
  Shield,
  ArrowRight,
  Users,
  TrendingUp,
  Zap,
  Lock,
  GraduationCap,
  ChevronDown,
} from 'lucide-react';

interface Portal {
  id: string;
  name: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  route: string;
  external?: boolean;
  features: string[];
  status: 'available' | 'coming-soon';
  badge?: 'Novo' | 'Popular' | 'Beta';
  stats?: { label: string; value: string }[];
}

const EducuardPortalHub: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [selectedPortal, setSelectedPortal] = useState<string | null>(null);

  const portals: Portal[] = [
    {
      id: 'security',
      name: language === 'pt' ? 'Seguranca Escolar' : 'School Security',
      title: language === 'pt' ? 'EduGuard Security' : 'EduGuard Security',
      description: language === 'pt' ? 'Sistema de seguranca e monitoramento da comunidade escolar' : 'School community safety and monitoring system',
      icon: <Shield className="w-12 h-12" />,
      color: 'from-blue-600 to-blue-700',
      route: '/sistema',
      status: 'available',
      features: [
        'Monitoramento em tempo real',
        'Alertas de segurança',
        'Comunicação com pais',
        'Relatórios de incidentes',
        'Controlo de presença',
        'QR Scanning avançado',
      ],
      stats: [
        { label: 'Escolas', value: '250+' },
        { label: 'Utilizadores', value: '15K+' },
        { label: 'Uptime', value: '99.9%' },
      ],
    },
    {
      id: 'edumarket',
      name: 'EduMarket',
      title: '📚 EduMarket MZ',
      description: 'Marketplace de educação e serviços profissionais - Ganhe renda online',
      icon: <BookOpen className="w-12 h-12" />,
      color: 'from-purple-600 to-indigo-600',
      route: '/edumarket',
      status: 'available',
      features: [
        'Criar e vender cursos',
        'Oferecer serviços profissionais',
        'Pagamentos M-Pesa integrado',
        'Dashboard de ganhos',
        'Sistema de certificados',
        'Comunidade de aprendizagem',
      ],
      stats: [
        { label: 'Cursos', value: '300+' },
        { label: 'Educadores', value: '500+' },
        { label: 'Alunos', value: '10K+' },
      ],
    },
    {
      id: 'verify-ai',
      name: 'Verify AI',
      title: 'AI EduGuard Verify',
      description: 'Verificacao inteligente de autenticidade documental para entidades e empresas',
      icon: <Lock className="w-12 h-12" />,
      color: 'from-cyan-600 to-sky-700',
      route: '/public/login',
      external: true,
      status: 'available',
      badge: 'Novo',
      features: [
        'Verificacao passiva e contextual',
        'Deteccao de sinais de IA',
        'Fraud intelligence empresarial',
        'Subscricao por planos',
        'Onboarding de entidades',
        'Portal dedicado de verificacao',
      ],
      stats: [
        { label: 'Planos', value: '4' },
        { label: 'Setores', value: '5+' },
        { label: 'Disponibilidade', value: '24/7' },
      ],
    },
    {
      id: 'literature',
      name: language === 'pt' ? 'Literatura Aberta' : 'Open Literature',
      title: language === 'pt' ? 'Portal de Literatura' : 'Literature Portal',
      description: language === 'pt' ? 'Aceda livros, artigos e publicacoes abertas com busca avancada' : 'Access open books and articles with advanced search',
      icon: <BookOpen className="w-12 h-12" />,
      color: 'from-amber-500 to-orange-500',
      route: '/literatura',
      status: 'available',
      badge: 'Novo',
      features: [
        'Busca por Open Library',
        'Resultados do Project Gutenberg',
        'Conteúdo Repoarte e moçambicano',
        'Filtros por idioma e fonte',
        'Acesso direto a livros completos',
        'Visualização rápida de livros',
      ],
      stats: [
        { label: 'Fontes', value: '3+' },
        { label: 'Obras', value: '50K+' },
        { label: 'Artigos', value: '10K+' },
      ],
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      title: 'EduGuard Enterprise',
      description: language === 'pt' ? 'Solucao completa para gestao administrativa e academica de instituicoes' : 'Complete solution for administrative and academic management',
      icon: <Users className="w-12 h-12" />,
      color: 'from-green-600 to-emerald-600',
      route: '#',
      status: 'coming-soon',
      features: [
        'Gestão de notas e currículos',
        'Planejamento académico',
        'Comunicação com alunos',
        'Relatórios pedagógicos',
        'Integração com sistemas',
        'API dedicada',
      ],
    },
    {
      id: 'analytics',
      name: 'Analytics',
      title: 'EduGuard Analytics',
      description: language === 'pt' ? 'Analise avancada de dados educacionais e insights inteligentes' : 'Advanced educational analytics and insights',
      icon: <TrendingUp className="w-12 h-12" />,
      color: 'from-orange-600 to-red-600',
      route: '#',
      status: 'coming-soon',
      features: [
        'Análise de desempenho',
        'Tendências de segurança',
        'Relatórios customizados',
        'Previsões inteligentes',
        'Dashboards executivos',
        'Exportação de dados',
      ],
    },
  ];

  const handlePortalAccess = (portal: Portal) => {
    if (portal.status === 'available') {
      if (portal.external) {
        window.location.assign(portal.route);
        return;
      }
      navigate(portal.route);
    } else {
      setSelectedPortal(portal.id);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">EduGuard 360</h1>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-semibold transition-colors"
          >
            {language === 'pt' ? 'Voltar' : 'Back'}
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
          {language === 'pt' ? 'Bem-vindo aos Portais EduGuard' : 'Welcome to EduGuard Portals'}
        </h2>
        <p className="text-xl text-gray-600 mb-2">
          {language === 'pt' ? 'Escolha o servico que deseja acessar' : 'Choose the service you want to access'}
        </p>
        <p className="text-gray-500">
          {language === 'pt'
            ? 'Solucoes integradas para seguranca, educacao e desenvolvimento profissional em Mocambique'
            : 'Integrated solutions for safety, education and professional growth in Mozambique'}
        </p>
      </div>

      {/* Portals Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {portals.map((portal) => (
            <div
              key={portal.id}
              className="group relative overflow-hidden rounded-2xl bg-white shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              {/* Background gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${portal.color} opacity-0 group-hover:opacity-5 transition-opacity`}
              />

              {/* Content */}
              <div className="relative p-8">
                {/* Badge */}
                <div className="mb-4">
                  {portal.status === 'coming-soon' && (
                    <span className="inline-block px-3 py-1 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                      {language === 'pt' ? 'Em Breve' : 'Coming Soon'}
                    </span>
                  )}
                  {portal.status === 'available' && (
                    <span className="inline-block px-3 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full">
                      {language === 'pt' ? 'Disponivel' : 'Available'}
                    </span>
                  )}
                </div>

                {/* Icon and Title */}
                <div className="mb-6">
                  <div
                    className={`w-16 h-16 rounded-xl bg-gradient-to-br ${portal.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}
                  >
                    {portal.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{portal.name}</h3>
                  {portal.badge && (
                    <span className="inline-flex items-center justify-center text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full bg-amber-100 text-amber-800 mb-2">
                      {portal.badge}
                    </span>
                  )}
                  <p className="text-sm text-gray-500">{portal.title}</p>
                </div>

                {/* Description */}
                <p className="text-gray-600 mb-6">{portal.description}</p>

                {/* Features */}
                <div className="mb-8">
                  <ul className="space-y-2">
                    {portal.features.slice(0, 3).map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                        <Zap className="w-4 h-4 text-blue-500" />
                        {feature}
                      </li>
                    ))}
                    {portal.features.length > 3 && (
                      <li className="text-sm text-gray-500 pl-6">
                        + {portal.features.length - 3} mais recursos
                      </li>
                    )}
                  </ul>
                </div>

                {/* Stats */}
                {portal.stats && (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-3 gap-4">
                      {portal.stats.map((stat, idx) => (
                        <div key={idx} className="text-center">
                          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                          <p className="text-xs text-gray-500">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Button */}
                <button
                  onClick={() => handlePortalAccess(portal)}
                  disabled={portal.status === 'coming-soon'}
                  className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                    portal.status === 'available'
                      ? `bg-gradient-to-r ${portal.color} text-white hover:shadow-lg group-hover:translate-y-0`
                      : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {portal.status === 'available' ? (
                    <>
                      {language === 'pt' ? 'Acessar Portal' : 'Open Portal'}
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      {language === 'pt' ? 'Em Breve' : 'Coming Soon'}
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Coming Soon Details Modal */}
        {selectedPortal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                {portals.find((p) => p.id === selectedPortal)?.name}
              </h3>
              <p className="text-gray-600 mb-6">
                {language === 'pt'
                  ? 'Este portal estara disponivel em breve. Deixe seu e-mail para ser notificado do lancamento.'
                  : 'This portal will be available soon. Leave your email to be notified when it launches.'}
              </p>

              <div className="space-y-3 mb-6">
                <input
                  type="email"
                  placeholder="seu@email.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
                <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-semibold">
                  {language === 'pt' ? 'Notifique-me' : 'Notify me'}
                </button>
              </div>

              <button
                onClick={() => setSelectedPortal(null)}
                className="w-full text-gray-600 py-2 rounded-lg hover:bg-gray-100"
              >
                {language === 'pt' ? 'Fechar' : 'Close'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <Lock className="w-8 h-8 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Seguro</h3>
              <p className="text-blue-100">Dados encriptados e protegidos</p>
            </div>
            <div>
              <Zap className="w-8 h-8 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Rápido</h3>
              <p className="text-blue-100">Plataforma otimizada para Moçambique</p>
            </div>
            <div>
              <Users className="w-8 h-8 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Integrado</h3>
              <p className="text-blue-100">Todos os serviços em um único lugar</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>© 2024 EduGuard 360 - Soluções de Educação para Moçambique</p>
          <p className="text-sm mt-2">admin@eduguard360.co.mz | +258 84 XXXXXX</p>
        </div>
      </footer>
    </div>
  );
};

export default EducuardPortalHub;
