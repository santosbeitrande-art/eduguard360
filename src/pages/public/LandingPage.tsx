import { Link } from "react-router-dom";
import { ShieldCheck, Eye, MapPin, Users, Mail, Phone, ChevronRight } from "lucide-react";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-[#0b1f2a] text-white selection:bg-[#2ecc71] selection:text-white font-sans">
      
      {/* Header / Navigation */}
      <header className="fixed w-full top-0 z-50 bg-[#0a1a24]/90 backdrop-blur-md border-b border-[#2e5a6e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#2ecc71] rounded-lg flex items-center justify-center shadow-lg shadow-[#2ecc71]/20">
                <ShieldCheck className="h-6 w-6 text-white" />
              </div>
              <span className="font-bold text-2xl tracking-tight text-white">EduGuard<span className="text-[#2ecc71]">360</span></span>
            </div>
            
            <nav className="hidden md:flex space-x-8">
              <a href="#sobre" className="text-gray-300 hover:text-[#2ecc71] font-medium transition-colors">Sobre</a>
              <a href="#visao" className="text-gray-300 hover:text-[#2ecc71] font-medium transition-colors">A Nossa Visão</a>
              <a href="#adesao" className="text-gray-300 hover:text-[#2ecc71] font-medium transition-colors">Adesão Escolar</a>
              <a href="#contactos" className="text-gray-300 hover:text-[#2ecc71] font-medium transition-colors">Contactos</a>
            </nav>

            <div className="flex items-center gap-4">
              <Link 
                to="/sistema" 
                className="btn px-6 py-2.5 font-semibold shadow-lg hover:-translate-y-0.5 transition-transform flex items-center gap-2"
              >
                Aceder ao Portal <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 relative overflow-hidden flex flex-col items-center text-center">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2ecc71]/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-tight text-white z-10">
          Segurança Escolar Transformada em <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2ecc71] to-emerald-400">Confiança Digital</span>.
        </h1>
        <p className="mt-6 text-xl text-[#9bbbc9] max-w-2xl mx-auto leading-relaxed z-10">
          O primeiro ecossistema inteligente em Moçambique que notifica os pais em tempo real através de QR Codes inteligentes quando os alunos entram ou saem da escola.
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center z-10">
          <a href="#sobre" className="px-8 py-4 bg-[#132f3f] border border-[#2e5a6e] rounded-lg font-semibold hover:bg-[#1c3b4d] transition-colors text-white">
            Saber Mais
          </a>
          <a href="#adesao" className="btn px-8 py-4 font-semibold shadow-xl shadow-[#2ecc71]/20 flex items-center justify-center gap-2">
            Simular na Minha Escola
          </a>
        </div>
      </section>

      {/* Sobre Section */}
      <section id="sobre" className="py-20 bg-[#0f2e3d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#2ecc71] tracking-wide uppercase text-sm mb-2">O Que É a EduGuard360?</h2>
            <p className="text-4xl font-extrabold text-white">Tecnologia Simples para Paz de Espírito Total.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card p-8 border border-[#2e5a6e] hover:border-[#2ecc71]/50 transition-colors">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
                <MapPin className="h-7 w-7 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Notificações em Tempo Real</h3>
              <p className="text-[#9bbbc9] leading-relaxed">
                Assim que o aluno passa o seu cartão pelo nosso Scanner Profissional à entrada, os pais recebem uma notificação instantânea confirmando a sua chegada.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card p-8 border border-[#2e5a6e] hover:border-[#2ecc71]/50 transition-colors">
              <div className="w-14 h-14 bg-[#2ecc71]/10 rounded-xl flex items-center justify-center mb-6">
                <Eye className="h-7 w-7 text-[#2ecc71]" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Controlo de Absentismo</h3>
              <p className="text-[#9bbbc9] leading-relaxed">
                As direções das escolas têm acesso a relatórios precisos sobre atrasos, faltas e presenças, simplificando radicalmente o trabalho administrativo diário.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card p-8 border border-[#2e5a6e] hover:border-[#2ecc71]/50 transition-colors">
              <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6">
                <Users className="h-7 w-7 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Acesso Exclusivo para Pais</h3>
              <p className="text-[#9bbbc9] leading-relaxed">
                Um portal web seguro onde cada encarregado de educação pode aceder ao histórico de movimentos e manter o seu perfil e as credenciais protegidas.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Visao Section */}
      <section id="visao" className="py-24 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-4xl font-extrabold text-white mb-6 leading-tight">A Nossa Visão: <br/><span className="text-[#2ecc71]">Transformar a Educação em Moçambique</span></h2>
              <p className="text-lg text-[#9bbbc9] mb-6 leading-relaxed">
                A EduGuard360 não é apenas um sistema de controlo de acessos; é uma ponte de confiança inquebrável entre a escola e a casa. 
              </p>
              <p className="text-lg text-[#9bbbc9] leading-relaxed">
                A nossa missão é eliminar o medo e a incerteza diária dos encarregados de educação, garantindo que todas as crianças chegam ao seu destino em segurança, impulsionando a responsabilidade e modernizando as infraestruturas escolares em todo o país através de tecnologia de ponta.
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#2ecc71] to-blue-500 blur-3xl opacity-20 rounded-full"></div>
              <div className="card border border-[#2e5a6e] p-2 relative">
                <img src="https://images.unsplash.com/photo-1577896851231-70ef18881754?q=80&w=2070&auto=format&fit=crop" alt="Crianças na escola" className="rounded-lg shadow-2xl opacity-80" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Adesao Section */}
      <section id="adesao" className="py-24 bg-[#0f2e3d]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card p-10 md:p-16 border border-[#2e5a6e] text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#2ecc71]/10 rounded-full blur-[80px]"></div>
            
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 relative z-10">A Sua Escola Está Pronta Para o Futuro?</h2>
            <p className="text-[#9bbbc9] text-lg mb-8 max-w-2xl mx-auto relative z-10">
              Inicie a transição para a modernidade hoje mesmo. Deixe o seu contacto e a nossa equipa agendará uma simulação presencial ou remota, sem compromisso.
            </p>

            <form className="max-w-lg mx-auto flex flex-col gap-4 relative z-10">
              <input 
                type="text" 
                placeholder="Nome da Escola ou Instituição" 
                className="w-full px-5 py-4 rounded-lg"
              />
              <input 
                type="email" 
                placeholder="E-mail de Contacto da Direção" 
                className="w-full px-5 py-4 rounded-lg"
              />
              <button type="button" className="btn w-full px-8 py-4 font-bold text-lg mt-2">
                Solicitar Simulação Gratuita
              </button>
            </form>
          </div>
        </div>
      </section>

      {/* Footer / Contactos */}
      <footer id="contactos" className="bg-[#0a1a24] pt-16 pb-8 border-t border-[#2e5a6e]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <ShieldCheck className="h-8 w-8 text-[#2ecc71]" />
                <span className="font-bold text-2xl tracking-tight text-white">EduGuard360</span>
              </div>
              <p className="text-[#9bbbc9] max-w-xs">
                O guardião digital da educação. A segurança do seu filho à distância de uma notificação.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-6">Contactos Diretos</h4>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-[#9bbbc9]">
                  <Mail className="h-5 w-5 text-[#2ecc71]" />
                  <a href="mailto:comercial@eduguard360.co.mz" className="hover:text-white transition-colors">comercial@eduguard360.co.mz</a>
                </li>
                <li className="flex items-center gap-3 text-[#9bbbc9]">
                  <Phone className="h-5 w-5 text-[#2ecc71]" />
                  <span>+258 84 123 4567</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-6">Acesso Rápido</h4>
              <ul className="space-y-3">
                <li><Link to="/sistema" className="text-[#9bbbc9] hover:text-[#2ecc71] transition-colors">Portal de Acesso (Escolas e Pais)</Link></li>
                <li><a href="#sobre" className="text-[#9bbbc9] hover:text-[#2ecc71] transition-colors">Como Funciona</a></li>
                <li><a href="#" className="text-[#9bbbc9] hover:text-[#2ecc71] transition-colors">Política de Privacidade</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#1c3b4d] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[#9bbbc9]">
              &copy; {new Date().getFullYear()} EduGuard360. Todos os direitos reservados.
            </p>
            <p className="text-sm text-[#9bbbc9]">
              Desenvolvido em Moçambique.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
