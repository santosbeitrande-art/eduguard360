import React from 'react';
import { useLanguage } from '@/context/LanguageContext';

interface HeroProps {
  onRequestDemo: () => void;
  onLearnMore: () => void;
}

const Hero: React.FC<HeroProps> = ({ onRequestDemo, onLearnMore }) => {
  const { t } = useLanguage();

  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0">
        <img
          src="https://d64gsuwffb70l.cloudfront.net/695e58bf02f8604af77ea6bf_1767811248313_2f0cea32.jpg"
          alt="School Security"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b1d2a]/95 via-[#0b1d2a]/80 to-[#0b1d2a]/60"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
        <div className="max-w-3xl">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-[#2ecc71]/20 border border-[#2ecc71]/30 rounded-full mb-6">
            <span className="w-2 h-2 bg-[#2ecc71] rounded-full mr-2 animate-pulse"></span>
            <span className="text-[#2ecc71] text-sm font-medium">
              {t('hero.title')}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            {t('hero.title')}
          </h1>

          {/* Slogan */}
          <p className="text-xl sm:text-2xl text-[#2ecc71] font-semibold mb-6">
            {t('hero.slogan')}
          </p>

          {/* Description */}
          <p className="text-lg text-gray-300 mb-10 max-w-2xl">
            {t('hero.description')}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={onRequestDemo}
              className="px-8 py-4 bg-[#2ecc71] text-white font-semibold rounded-lg hover:bg-[#27ae60] transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-[#2ecc71]/20 flex items-center justify-center space-x-2"
            >
              <span>{t('hero.cta')}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </button>
            <button
              onClick={onLearnMore}
              className="px-8 py-4 bg-white/10 text-white font-semibold rounded-lg hover:bg-white/20 transition-all duration-300 border border-white/20 flex items-center justify-center space-x-2"
            >
              <span>{t('hero.learnMore')}</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
        <svg className="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </section>
  );
};

export default Hero;
