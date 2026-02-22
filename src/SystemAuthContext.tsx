import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'pt' | 'en';

interface Translations {
  [key: string]: {
    pt: string;
    en: string;
  };
}

export const translations: Translations = {
  // Navigation
  'nav.home': { pt: 'Início', en: 'Home' },
  'nav.project': { pt: 'O Projeto', en: 'The Project' },
  'nav.howItWorks': { pt: 'Como Funciona', en: 'How It Works' },
  'nav.forSchools': { pt: 'Para Escolas', en: 'For Schools' },
  'nav.forParents': { pt: 'Para Pais', en: 'For Parents' },
  'nav.contact': { pt: 'Contactos', en: 'Contact' },
  
  // Hero
  'hero.title': { pt: 'EDU•GUARD360', en: 'EDU•GUARD360' },
  'hero.slogan': { pt: 'Segurança escolar transformada em confiança digital.', en: 'School security transformed into digital trust.' },
  'hero.description': { pt: 'Plataforma digital para controlo de entradas e saídas escolares, garantindo tranquilidade para pais e governação para escolas.', en: 'Digital platform for school entry and exit control, ensuring peace of mind for parents and governance for schools.' },
  'hero.cta': { pt: 'Solicitar Demonstração', en: 'Request Demo' },
  'hero.learnMore': { pt: 'Saiba Mais', en: 'Learn More' },
  
  // How It Works
  'howItWorks.title': { pt: 'Como Funciona', en: 'How It Works' },
  'howItWorks.subtitle': { pt: 'Processo simples em 4 passos', en: 'Simple 4-step process' },
  'howItWorks.step1.title': { pt: 'Identificação do Aluno', en: 'Student Identification' },
  'howItWorks.step1.desc': { pt: 'Cada aluno recebe um QR Code único e seguro', en: 'Each student receives a unique and secure QR Code' },
  'howItWorks.step2.title': { pt: 'Leitura no Portão', en: 'Gate Reading' },
  'howItWorks.step2.desc': { pt: 'O QR Code é lido na entrada da escola', en: 'The QR Code is read at the school entrance' },
  'howItWorks.step3.title': { pt: 'Registo Automático', en: 'Automatic Registration' },
  'howItWorks.step3.desc': { pt: 'O sistema regista automaticamente a entrada ou saída', en: 'The system automatically records entry or exit' },
  'howItWorks.step4.title': { pt: 'Notificação aos Pais', en: 'Parent Notification' },
  'howItWorks.step4.desc': { pt: 'Os pais recebem notificação em tempo real', en: 'Parents receive real-time notification' },
  
  // Project
  'project.title': { pt: 'O Projeto', en: 'The Project' },
  'project.problem.title': { pt: 'O Problema', en: 'The Problem' },
  'project.problem.desc': { pt: 'A segurança escolar é uma preocupação crescente. Muitas escolas ainda dependem de métodos manuais para controlar entradas e saídas, criando vulnerabilidades e falta de transparência.', en: 'School security is a growing concern. Many schools still rely on manual methods to control entries and exits, creating vulnerabilities and lack of transparency.' },
  'project.solution.title': { pt: 'A Solução', en: 'The Solution' },
  'project.solution.desc': { pt: 'O EDU•GUARD360 digitaliza todo o processo de controlo de acesso escolar, criando um registo auditável e notificando os pais em tempo real.', en: 'EDU•GUARD360 digitizes the entire school access control process, creating an auditable record and notifying parents in real-time.' },
  'project.vision.title': { pt: 'A Visão', en: 'The Vision' },
  'project.vision.desc': { pt: 'Transformar cada portão escolar num ponto inteligente de segurança e confiança, conectando escolas e famílias através da tecnologia.', en: 'Transform every school gate into an intelligent point of security and trust, connecting schools and families through technology.' },
  
  // For Schools
  'forSchools.title': { pt: 'Para Escolas', en: 'For Schools' },
  'forSchools.subtitle': { pt: 'Benefícios para a sua instituição', en: 'Benefits for your institution' },
  'forSchools.benefit1.title': { pt: 'Redução de Riscos Legais', en: 'Legal Risk Reduction' },
  'forSchools.benefit1.desc': { pt: 'Documentação completa de todos os movimentos de alunos', en: 'Complete documentation of all student movements' },
  'forSchools.benefit2.title': { pt: 'Prova Documental', en: 'Documentary Evidence' },
  'forSchools.benefit2.desc': { pt: 'Registos digitais auditáveis para qualquer verificação', en: 'Auditable digital records for any verification' },
  'forSchools.benefit3.title': { pt: 'Controlo em Tempo Real', en: 'Real-Time Control' },
  'forSchools.benefit3.desc': { pt: 'Saiba quem está na escola a qualquer momento', en: 'Know who is at school at any time' },
  'forSchools.benefit4.title': { pt: 'Melhor Governação', en: 'Better Governance' },
  'forSchools.benefit4.desc': { pt: 'Relatórios detalhados para gestão escolar', en: 'Detailed reports for school management' },
  'forSchools.benefit5.title': { pt: 'Reputação Institucional', en: 'Institutional Reputation' },
  'forSchools.benefit5.desc': { pt: 'Demonstre compromisso com a segurança dos alunos', en: 'Demonstrate commitment to student safety' },
  
  // For Parents
  'forParents.title': { pt: 'Para Pais', en: 'For Parents' },
  'forParents.subtitle': { pt: 'Tranquilidade para a sua família', en: 'Peace of mind for your family' },
  'forParents.benefit1.title': { pt: 'Tranquilidade', en: 'Peace of Mind' },
  'forParents.benefit1.desc': { pt: 'Saiba quando o seu filho chega e sai da escola', en: 'Know when your child arrives and leaves school' },
  'forParents.benefit2.title': { pt: 'Informação em Tempo Real', en: 'Real-Time Information' },
  'forParents.benefit2.desc': { pt: 'Receba notificações instantâneas no seu telemóvel', en: 'Receive instant notifications on your phone' },
  'forParents.benefit3.title': { pt: 'Transparência', en: 'Transparency' },
  'forParents.benefit3.desc': { pt: 'Acesso ao histórico completo de movimentos', en: 'Access to complete movement history' },
  'forParents.benefit4.title': { pt: 'Confiança na Escola', en: 'Trust in School' },
  'forParents.benefit4.desc': { pt: 'Parceria digital entre família e instituição', en: 'Digital partnership between family and institution' },
  
  // Contact
  'contact.title': { pt: 'Contactos', en: 'Contact' },
  'contact.subtitle': { pt: 'Entre em contacto connosco', en: 'Get in touch with us' },
  'contact.description': { pt: 'Interessado em implementar o EDU•GUARD360 na sua escola? Entre em contacto para uma demonstração personalizada.', en: 'Interested in implementing EDU•GUARD360 at your school? Get in touch for a personalized demonstration.' },
  'contact.email': { pt: 'Email', en: 'Email' },
  'contact.form.name': { pt: 'Nome', en: 'Name' },
  'contact.form.email': { pt: 'Email', en: 'Email' },
  'contact.form.school': { pt: 'Nome da Escola', en: 'School Name' },
  'contact.form.message': { pt: 'Mensagem', en: 'Message' },
  'contact.form.submit': { pt: 'Enviar Mensagem', en: 'Send Message' },
  'contact.form.success': { pt: 'Mensagem enviada com sucesso!', en: 'Message sent successfully!' },
  
  // Footer
  'footer.rights': { pt: 'Todos os direitos reservados.', en: 'All rights reserved.' },
  'footer.tagline': { pt: 'Segurança escolar transformada em confiança digital.', en: 'School security transformed into digital trust.' },
  
  // Process Details
  'process.entry.title': { pt: 'Entrada', en: 'Entry' },
  'process.entry.desc': { pt: 'O aluno apresenta o QR Code ao chegar à escola. O sistema regista a hora exata e notifica os pais.', en: 'The student presents the QR Code upon arriving at school. The system records the exact time and notifies parents.' },
  'process.exit.title': { pt: 'Saída', en: 'Exit' },
  'process.exit.desc': { pt: 'Na saída, o mesmo processo é repetido, garantindo registo completo do período na escola.', en: 'On exit, the same process is repeated, ensuring complete record of time at school.' },
  'process.auth.title': { pt: 'Autorizações', en: 'Authorizations' },
  'process.auth.desc': { pt: 'Gestão de autorizações especiais para saídas antecipadas ou com terceiros autorizados.', en: 'Management of special authorizations for early departures or with authorized third parties.' },
  'process.records.title': { pt: 'Registos', en: 'Records' },
  'process.records.desc': { pt: 'Todos os movimentos são registados com data, hora e identificação do responsável.', en: 'All movements are recorded with date, time and responsible person identification.' },
  'process.history.title': { pt: 'Histórico Digital', en: 'Digital History' },
  'process.history.desc': { pt: 'Acesso completo ao histórico de movimentos para consulta e auditoria.', en: 'Complete access to movement history for consultation and audit.' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('pt');

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) return key;
    return translation[language] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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
