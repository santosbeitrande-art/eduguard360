// ============================================
// LANGUAGE SELECTOR - Seletor de Idioma
// ============================================

import React from 'react';
import { useLanguage, type Language } from '@/context/LanguageContext';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface LanguageSelectorProps {
  variant?: 'select' | 'buttons';
  showLabel?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  variant = 'select',
  showLabel = false,
}) => {
  const { language, setLanguage, t } = useLanguage();

  const languages: { code: Language; name: string; flag: string }[] = [
    { code: 'pt', name: 'Português', flag: '🇵🇹' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
  ];

  if (variant === 'buttons') {
    return (
      <div className="flex gap-2 items-center">
        {showLabel && (
          <span className="text-sm font-medium flex items-center gap-1">
            <Globe size={16} />
            {t('nav.idioma')}
          </span>
        )}
        {languages.map((lang) => (
          <Button
            key={lang.code}
            variant={language === lang.code ? 'default' : 'outline'}
            size="sm"
            onClick={() => setLanguage(lang.code)}
            className="min-w-fit"
          >
            {lang.flag} {lang.name}
          </Button>
        ))}
      </div>
    );
  }

  // Default: Select dropdown
  return (
    <div className="flex items-center gap-2">
      {showLabel && (
        <Globe size={16} className="text-amber-600" />
      )}
      <Select value={language} onValueChange={(value) => setLanguage(value as Language)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

// Variação compacta para header
export const LanguageSelectorCompact: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; flag: string }[] = [
    { code: 'pt', flag: '🇵🇹' },
    { code: 'en', flag: '🇬🇧' },
  ];

  return (
    <div className="flex gap-1 items-center border rounded-lg p-1 bg-white">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => setLanguage(lang.code)}
          className={`px-2 py-1 rounded text-sm font-medium transition ${
            language === lang.code
              ? 'bg-amber-600 text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          title={lang.code === 'pt' ? 'Português' : 'English'}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  );
};

export default LanguageSelector;
