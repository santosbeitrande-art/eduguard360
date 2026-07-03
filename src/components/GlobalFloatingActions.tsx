import React from 'react';
import { Home } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/context/LanguageContext';

const GlobalFloatingActions: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage } = useLanguage();

  const onHome = () => {
    if (location.pathname !== '/') {
      navigate('/');
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur">
      <button
        type="button"
        onClick={onHome}
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-700"
        title={language === 'pt' ? 'Voltar ao inicio' : 'Back to home'}
      >
        <Home className="h-4 w-4" />
        {language === 'pt' ? 'Home' : 'Home'}
      </button>

      <div className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setLanguage('pt')}
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            language === 'pt' ? 'bg-amber-600 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
          aria-label="Portuguese"
        >
          PT
        </button>
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            language === 'en' ? 'bg-amber-600 text-white' : 'text-slate-700 hover:bg-slate-100'
          }`}
          aria-label="English"
        >
          EN
        </button>
      </div>
    </div>
  );
};

export default GlobalFloatingActions;
