import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, Shield, Zap, Users } from 'lucide-react';

export const PortalsPromoSection: React.FC = () => {
  const navigate = useNavigate();

  const portals = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: 'Segurança Escolar',
      description: 'Sistema integrado de segurança e monitoramento da comunidade escolar',
      color: 'from-blue-600 to-blue-700',
      route: '/sistema',
    },
    {
      icon: <BookOpen className="w-8 h-8" />,
      title: 'EduMarket',
      description: 'Ganhe renda criando cursos online e oferecendo serviços profissionais',
      color: 'from-purple-600 to-indigo-600',
      route: '/edumarket',
    },
  ];

  return (
    <section className="py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4">
            Descubra os Portais EduGuard
          </h2>
          <p className="text-xl text-blue-200">
            Tudo que precisa para educação, segurança e desenvolvimento em um único lugar
          </p>
        </div>

        {/* Portals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {portals.map((portal, idx) => (
            <div
              key={idx}
              className="group relative overflow-hidden rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 hover:border-white/40 transition-all hover:bg-white/15"
            >
              {/* Icon and Title */}
              <div className="p-8">
                <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${portal.color} flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {portal.icon}
                </div>

                <h3 className="text-2xl font-bold mb-3">{portal.title}</h3>
                <p className="text-blue-100 mb-6 leading-relaxed">{portal.description}</p>

                <button
                  onClick={() => navigate(portal.route)}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r ${portal.color} text-white font-semibold hover:shadow-lg transition-all group-hover:translate-y-0`}
                >
                  Acessar Agora
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 pt-8 border-t border-white/20">
          <div className="text-center">
            <Zap className="w-8 h-8 mx-auto mb-3 text-yellow-400" />
            <h4 className="font-semibold mb-2">Rápido e Fácil</h4>
            <p className="text-blue-200 text-sm">Acesso instantâneo aos serviços</p>
          </div>
          <div className="text-center">
            <Users className="w-8 h-8 mx-auto mb-3 text-green-400" />
            <h4 className="font-semibold mb-2">Comunidade</h4>
            <p className="text-blue-200 text-sm">Conecte com educadores e profissionais</p>
          </div>
          <div className="text-center">
            <BookOpen className="w-8 h-8 mx-auto mb-3 text-pink-400" />
            <h4 className="font-semibold mb-2">Aprendizado</h4>
            <p className="text-blue-200 text-sm">Qualificação contínua e desenvolvimento</p>
          </div>
        </div>

        {/* CTA Button */}
        <div className="text-center">
          <button
            onClick={() => navigate('/portais')}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-blue-900 font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all"
          >
            Ver Todos os Portais
            <ArrowRight className="w-6 h-6" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default PortalsPromoSection;
