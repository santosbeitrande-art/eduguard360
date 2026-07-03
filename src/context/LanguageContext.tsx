import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'pt' | 'en';

// ==================== TRADUÇÕES COMPLETAS ====================
export const translations = {
  pt: {
    nav: {
      inicio: 'Início',
      sobre: 'Sobre',
      contacto: 'Contacto',
      portais: 'Portais',
      login: 'Entrar',
      logout: 'Sair',
      idioma: 'Idioma',
    },
    portals: {
      hub_title: 'Todos os Portais',
      hub_subtitle: 'Explore nossos portais educacionais',
      seguranca: 'Segurança Escolar',
      edumarket: 'Marketplace Educacional',
      literatura: 'Literatura Aberta',
      enterprise: 'Enterprise',
      analytics: 'Analytics',
      acessar: 'Acessar',
      explorar: 'Explorar',
      em_breve: 'Em Breve',
      disponivel: 'Disponível',
      novo: 'Novo',
    },
    literatura: {
      title: 'Literatura Aberta',
      subtitle: 'Acesso Gratuito a Milhares de Livros',
      buscar_placeholder: 'Buscar livros, autores, tópicos...',
      explorar: 'Explorar',
      colecoes: 'Coleções',
      mocambique: 'Moçambique',
      guardados: 'Guardados',
      nenhum_livro_guardado: 'Nenhum livro guardado ainda',
      filtros: {
        idioma: 'Idioma',
        licenca: 'Licença',
        assunto: 'Assunto / Tema',
        pais: 'País',
        fonte: 'Fonte',
      },
      opcoes: {
        todos: 'Todos',
        portugues: 'Português',
        ingles: 'English',
        espanhol: 'Español',
        frances: 'Français',
        dominio_publico: 'Domínio Público',
        creative_commons: 'Creative Commons',
        open_access: 'Open Access',
        mocambique: 'Moçambique',
        portugal: 'Portugal',
        brasil: 'Brasil',
      },
      botoes: {
        ver: 'Ver',
        baixar: 'Baixar',
        guardar: 'Guardar',
        compartilhar: 'Partilhar',
        nenhum_resultado: 'Nenhum resultado encontrado',
      },
    },
    edumarket: {
      title: 'EduMarket',
      subtitle: 'Marketplace de Cursos e Educação',
      meus_cursos: 'Meus Cursos',
      criar_curso: 'Criar Curso',
      procurar_curso: 'Procurar um curso...',
    },
    sistema: {
      title: 'Segurança Escolar',
      login: 'Entrar',
      logout: 'Sair',
      nome_usuario: 'Nome de Usuário',
      email: 'Email',
      senha: 'Senha',
      entrar: 'Entrar',
      registrar: 'Registrar',
      nome_completo: 'Nome completo',
      selecionar_escola: 'Selecione a escola',
      role_director: 'Diretor / Escola',
      role_parent: 'Encarregado',
      preencher_campos: 'Preencha todos os campos obrigatórios.',
      registo_pendente: 'O seu registo foi submetido e aguarda aprovação do administrador.',
      esqueceu_senha: 'Esqueceu a senha?',
      recuperar_senha: 'Recuperar senha',
      enviar_link_recuperacao: 'Enviar link de recuperação',
      link_recuperacao_enviado: 'Se o e-mail existir, enviámos instruções de recuperação.',
      voltar_login: 'Voltar ao login',
      erro_login: 'Email ou senha inválidos',
      pagamento_escola_titulo: 'Pagamento da Escola',
      pagamento_escola_obrigatorio: 'Para conta de Diretor, é obrigatório pagar um plano da escola (mensal, trimestral ou anual).',
      pagamento_escola_plans: 'Escolha e pague um plano: mensal, trimestral ou anual.',
      pagamento_registado: 'Pagamento registado com sucesso. Pode concluir o cadastro.',
      billing_monthly: 'Mensal',
      billing_quarterly: 'Trimestral',
      billing_annual: 'Anual',
      btn_pagar_plano: 'Pagar plano da escola',
      validade_ate: 'Validade até',
    },
    home: {
      titulo_principal: 'Bem-vindo ao EduGuard360',
      subtitulo: 'Plataforma Educacional Integrada',
      cta_explorar: 'Explorar Portais',
      cta_saber_mais: 'Saiba Mais',
    },
    botoes: {
      ok: 'OK',
      cancelar: 'Cancelar',
      salvar: 'Guardar',
      editar: 'Editar',
      deletar: 'Eliminar',
      enviar: 'Enviar',
      voltar: 'Voltar',
      proximo: 'Próximo',
      anterior: 'Anterior',
      sim: 'Sim',
      nao: 'Não',
      carregando: 'Carregando...',
      erro: 'Erro',
      sucesso: 'Sucesso',
    },
    mensagens: {
      bem_vindo: 'Bem-vindo!',
      ate_logo: 'Até logo!',
      operacao_sucesso: 'Operação concluída com sucesso',
      erro_generico: 'Ocorreu um erro. Tente novamente.',
      offline: 'Você está offline',
    },
    // Compatibilidade com chaves antigas
    'nav.home': 'Início',
    'nav.project': 'O Projeto',
    'nav.contact': 'Contactos',
    'hero.title': 'EDU•GUARD360',
    'hero.slogan': 'Segurança escolar transformada em confiança digital.',
    'hero.description': 'Plataforma digital para controlo de entradas e saídas escolares, garantindo tranquilidade para pais e governação para escolas.',
    'hero.cta': 'Solicitar Demonstração',
    'hero.learnMore': 'Saiba Mais',
    'howItWorks.title': 'Como Funciona',
    'howItWorks.subtitle': 'Processo simples em 4 passos',
    'project.title': 'O Projeto',
    'contact.title': 'Contactos',
    'contact.subtitle': 'Entre em contacto connosco',
    'footer.rights': 'Todos os direitos reservados.',
  },

  en: {
    nav: {
      inicio: 'Home',
      sobre: 'About',
      contacto: 'Contact',
      portais: 'Portals',
      login: 'Login',
      logout: 'Logout',
      idioma: 'Language',
    },
    portals: {
      hub_title: 'All Portals',
      hub_subtitle: 'Explore our educational portals',
      seguranca: 'School Security',
      edumarket: 'Educational Marketplace',
      literatura: 'Open Literature',
      enterprise: 'Enterprise',
      analytics: 'Analytics',
      acessar: 'Access',
      explorar: 'Explore',
      em_breve: 'Coming Soon',
      disponivel: 'Available',
      novo: 'New',
    },
    literatura: {
      title: 'Open Literature',
      subtitle: 'Free Access to Thousands of Books',
      buscar_placeholder: 'Search books, authors, topics...',
      explorar: 'Explore',
      colecoes: 'Collections',
      mocambique: 'Mozambique',
      guardados: 'Saved',
      nenhum_livro_guardado: 'No saved books yet',
      filtros: {
        idioma: 'Language',
        licenca: 'License',
        assunto: 'Subject / Topic',
        pais: 'Country',
        fonte: 'Source',
      },
      opcoes: {
        todos: 'All',
        portugues: 'Português',
        ingles: 'English',
        espanhol: 'Español',
        frances: 'Français',
        dominio_publico: 'Public Domain',
        creative_commons: 'Creative Commons',
        open_access: 'Open Access',
        mocambique: 'Mozambique',
        portugal: 'Portugal',
        brasil: 'Brazil',
      },
      botoes: {
        ver: 'View',
        baixar: 'Download',
        guardar: 'Save',
        compartilhar: 'Share',
        nenhum_resultado: 'No results found',
      },
    },
    edumarket: {
      title: 'EduMarket',
      subtitle: 'Courses and Education Marketplace',
      meus_cursos: 'My Courses',
      criar_curso: 'Create Course',
      procurar_curso: 'Search for a course...',
    },
    sistema: {
      title: 'School Security',
      login: 'Login',
      logout: 'Logout',
      nome_usuario: 'Username',
      email: 'Email',
      senha: 'Password',
      entrar: 'Sign In',
      registrar: 'Sign Up',
      nome_completo: 'Full name',
      selecionar_escola: 'Select school',
      role_director: 'Director / School',
      role_parent: 'Parent',
      preencher_campos: 'Please complete all required fields.',
      registo_pendente: 'Your registration was submitted and is awaiting administrator approval.',
      esqueceu_senha: 'Forgot password?',
      recuperar_senha: 'Recover password',
      enviar_link_recuperacao: 'Send recovery link',
      link_recuperacao_enviado: 'If the email exists, recovery instructions have been sent.',
      voltar_login: 'Back to login',
      erro_login: 'Invalid email or password',
      pagamento_escola_titulo: 'School Payment',
      pagamento_escola_obrigatorio: 'For Director accounts, payment of a school plan is required (monthly, quarterly, or annual).',
      pagamento_escola_plans: 'Choose and pay a plan: monthly, quarterly, or annual.',
      pagamento_registado: 'Payment registered successfully. You can complete signup now.',
      billing_monthly: 'Monthly',
      billing_quarterly: 'Quarterly',
      billing_annual: 'Annual',
      btn_pagar_plano: 'Pay school plan',
      validade_ate: 'Valid until',
    },
    home: {
      titulo_principal: 'Welcome to EduGuard360',
      subtitulo: 'Integrated Educational Platform',
      cta_explorar: 'Explore Portals',
      cta_saber_mais: 'Learn More',
    },
    botoes: {
      ok: 'OK',
      cancelar: 'Cancel',
      salvar: 'Save',
      editar: 'Edit',
      deletar: 'Delete',
      enviar: 'Send',
      voltar: 'Back',
      proximo: 'Next',
      anterior: 'Previous',
      sim: 'Yes',
      nao: 'No',
      carregando: 'Loading...',
      erro: 'Error',
      sucesso: 'Success',
    },
    mensagens: {
      bem_vindo: 'Welcome!',
      ate_logo: 'See you soon!',
      operacao_sucesso: 'Operation completed successfully',
      erro_generico: 'An error occurred. Please try again.',
      offline: 'You are offline',
    },
    // Compatibilidade com chaves antigas
    'nav.home': 'Home',
    'nav.project': 'The Project',
    'nav.contact': 'Contact',
    'hero.title': 'EDU•GUARD360',
    'hero.slogan': 'School security transformed into digital trust.',
    'hero.description': 'Digital platform for school entry and exit control, ensuring peace of mind for parents and governance for schools.',
    'hero.cta': 'Request Demo',
    'hero.learnMore': 'Learn More',
    'howItWorks.title': 'How It Works',
    'howItWorks.subtitle': 'Simple 4-step process',
    'project.title': 'The Project',
    'contact.title': 'Contact',
    'contact.subtitle': 'Get in touch with us',
    'footer.rights': 'All rights reserved.',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Estado inicial: localStorage ou navegador ou padrão (pt)
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('preferred-language') as Language | null;
      if (saved && (saved === 'pt' || saved === 'en')) {
        return saved;
      }

      const browserLang = navigator.language.substring(0, 2);
      if (browserLang === 'pt') return 'pt';
      if (browserLang === 'en') return 'en';
    }
    return 'pt';
  });

  // Salvar preferência ao mudar
  useEffect(() => {
    localStorage.setItem('preferred-language', language);
    // Atualizar atributo html para CSS e acessibilidade
    document.documentElement.lang = language;
  }, [language]);

  // Função para acessar traduções com notação de ponto
  const t = (key: string): string => {
    const keys = key.split('.');
    let value: any = translations[language];

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }

    return typeof value === 'string' ? value : key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: setLanguageState, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
