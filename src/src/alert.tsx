import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

const Project: React.FC = () => {
  const { t } = useLanguage();

  const sections = [
    {
      id: 'problem',
      title: t('project.problem.title'),
      description: t('project.problem.desc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      color: 'bg-red-500',
    },
    {
      id: 'solution',
      title: t('project.solution.title'),
      description: t('project.solution.desc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      color: 'bg-[#2ecc71]',
    },
    {
      id: 'vision',
      title: t('project.vision.title'),
      description: t('project.vision.desc'),
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      color: 'bg-blue-500',
    },
  ];

  return (
    <section id="project" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#0b1d2a] mb-4">
            {t('project.title')}
          </h2>
          <div className="w-24 h-1 bg-[#2ecc71] mx-auto rounded-full"></div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: Image */}
          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl">
              <img
                src="https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767811389215_dace9807.png"
                alt="EDU•GUARD360 Shield"
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0b1d2a]/50 to-transparent"></div>
            </div>
            {/* Decorative Elements */}
            <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-[#2ecc71]/20 rounded-full blur-2xl"></div>
            <div className="absolute -top-6 -left-6 w-24 h-24 bg-[#0b1d2a]/20 rounded-full blur-2xl"></div>
          </div>

          {/* Right: Content Cards */}
          <div className="space-y-6">
            {sections.map((section) => (
              <div
                key={section.id}
                className="bg-gray-50 rounded-xl p-6 hover:shadow-lg transition-all duration-300 border-l-4 border-transparent hover:border-[#2ecc71]"
              >
                <div className="flex items-start space-x-4">
                  <div className={`${section.color} w-14 h-14 rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                    {section.icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#0b1d2a] mb-2">
                      {section.title}
                    </h3>
                    <p className="text-gray-600 leading-relaxed">
                      {section.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quote */}
        <div className="mt-16 text-center">
          <blockquote className="text-xl sm:text-2xl text-[#0b1d2a] font-medium italic max-w-3xl mx-auto">
            "EDU•GUARD360 transforma o portão escolar num ponto inteligente de segurança e confiança."
          </blockquote>
        </div>
      </div>
    </section>
  );
};

export default Project;
