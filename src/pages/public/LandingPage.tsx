import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Eye, MapPin, Users, Mail, Phone, ChevronRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

// Novos componentes dos portais
import EducuardNavigation from "@/components/EducuardNavigation";
import PortalsPromoSection from "@/components/PortalsPromoSection";
import NewFeaturesNavigation from "@/components/NewFeaturesNavigation";
import IntegrationPartnersSection from "@/components/IntegrationPartnersSection";
import VerificationWorkflowSection from "@/components/VerificationWorkflowSection";

const LandingPage = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [schoolName, setSchoolName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleDemoRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!schoolName.trim() || !contactEmail.trim()) {
      setFeedback({
        type: "error",
        message: language === "pt"
          ? "Por favor preencha o nome da escola e o e-mail de contacto."
          : "Please fill in the school name and contact email."
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const formBody = {
      name: schoolName,
      email: contactEmail,
      school: schoolName,
      message: `Pedido de simulação gratuita para a escola ${schoolName}. E-mail de contacto: ${contactEmail}`,
      _subject: "Novo pedido de simulação EduGuard360",
      _captcha: "false",
    };

    try {
      const response = await fetch("https://formsubmit.co/ajax/admin@eduguard360.co.mz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(formBody),
      });

      const result = await response.json();
      if (!response.ok || result.success === false) {
        throw new Error(result.message || "Falha ao enviar o pedido por email.");
      }

      setFeedback({
        type: "success",
        message: language === "pt"
          ? "Pedido enviado! O nosso administrador recebera o email imediatamente."
          : "Request sent. Our administrator will receive the email immediately."
      });
      setSchoolName("");
      setContactEmail("");
    } catch (error) {
      const mailBody = encodeURIComponent(`Pedido de simulação gratuita para a escola ${schoolName}.\nE-mail de contacto: ${contactEmail}`);
      const mailto = `mailto:admin@eduguard360.co.mz?subject=${encodeURIComponent("Pedido de Simulação Gratuita EduGuard360")}&body=${mailBody}`;
      window.location.href = mailto;
      setFeedback({
        type: "success",
        message: language === "pt"
          ? "Nao foi possivel enviar automaticamente, mas o e-mail ja foi aberto para completar o envio."
          : "Automatic submission failed, but your email app was opened to complete sending."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b1f2a] text-white selection:bg-[#2ecc71] selection:text-white font-sans">

      {/* Navegação centralizada com portais */}
      <EducuardNavigation variant="light" />

      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-48 lg:pb-32 px-4 relative overflow-hidden flex flex-col items-center text-center">
        {/* Background glow effects */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#2ecc71]/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-tight text-white z-10">
          {language === "pt" ? "Seguranca Escolar Transformada em " : "School Safety Transformed into "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#2ecc71] to-emerald-400">
            {language === "pt" ? "Confianca Digital" : "Digital Trust"}
          </span>
          .
        </h1>
        <p className="mt-6 text-xl text-[#9bbbc9] max-w-2xl mx-auto leading-relaxed z-10">
          {language === "pt"
            ? "O primeiro ecossistema inteligente em Mocambique que notifica os pais em tempo real atraves de QR Codes inteligentes quando os alunos entram ou saem da escola."
            : "The first intelligent ecosystem in Mozambique that notifies parents in real time through smart QR Codes when students enter or leave school."}
        </p>
        <p className="mt-4 text-base text-[#a6c4d5] max-w-2xl mx-auto leading-relaxed z-10">
          {language === "pt"
            ? "Portal ja funcional: escolas, pais e administracao podem aceder com credenciais e gerir a plataforma de forma segura."
            : "Live portal: schools, parents and administrators can sign in securely with credentials."}
        </p>
        
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center z-10">
          <Link to="/portais" className="px-8 py-4 bg-[#132f3f] border border-[#2e5a6e] rounded-lg font-semibold hover:bg-[#1c3b4d] transition-colors text-white">
            {language === "pt" ? "Explorar Portais" : "Explore Portals"}
          </Link>
          <a href="#adesao" className="btn px-8 py-4 font-semibold shadow-xl shadow-[#2ecc71]/20 flex items-center justify-center gap-2">
            {language === "pt" ? "Simular na Minha Escola" : "Request a Demo"}
          </a>
        </div>

        <div className="mt-8 max-w-3xl mx-auto bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl shadow-[#00000033]">
          <h2 className="text-2xl font-semibold text-white">Acesso Pais / Encarregados</h2>
          <p className="mt-3 text-gray-300">
            {language === "pt"
              ? "Se ja tiver uma conta de pai/encarregado, use o portal de acesso. Para testar imediatamente, pode entrar com a conta de demonstracao de encarregado."
              : "If you already have a parent account, use the access portal. For immediate testing, you can sign in with the demo parent account."}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => {
                const demoParent = {
                  id: "demo-parent",
                  perfil: "pai",
                  nome: "Pai Demo",
                  email: "demo.pai@eduguard360.co.mz",
                  phone: "+258 84 000 0000"
                };
                localStorage.setItem('currentUser', JSON.stringify(demoParent));
                localStorage.setItem('eduguard_user', JSON.stringify({
                  id: demoParent.id,
                  email: demoParent.email,
                  name: demoParent.nome,
                  type: 'parent',
                  phone: demoParent.phone,
                  password_changed: true,
                }));
                navigate('/parent');
              }}
              className="btn px-8 py-4 bg-[#2ecc71] hover:bg-[#27ae60] text-black font-semibold shadow-xl shadow-[#2ecc71]/20"
            >
              {language === "pt" ? "Entrar como Pai Demo" : "Sign in as Demo Parent"}
            </button>
            <Link to="/sistema" className="px-8 py-4 bg-[#132f3f] border border-[#2e5a6e] rounded-lg font-semibold hover:bg-[#1c3b4d] transition-colors text-white flex items-center justify-center">
              {language === "pt" ? "Aceder ao Portal de Login" : "Open Login Portal"}
            </Link>
          </div>
        </div>
      </section>

      <PortalsPromoSection />

      {/* Novos Portais Educacionais */}
      <NewFeaturesNavigation />

      {/* Integrações */}
      <IntegrationPartnersSection />

      {/* Fluxo de validação */}
      <VerificationWorkflowSection />

      {/* Sobre Section */}
      <section id="sobre" className="py-20 bg-[#0f2e3d]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-[#2ecc71] tracking-wide uppercase text-sm mb-2">O Que É a EduGuard360?</h2>
            <p className="text-4xl font-extrabold text-white">
              {language === "pt" ? "Tecnologia Simples para Paz de Espirito Total." : "Simple Technology for Complete Peace of Mind."}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card p-8 border border-[#2e5a6e] hover:border-[#2ecc71]/50 transition-colors">
              <div className="w-14 h-14 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6">
                <MapPin className="h-7 w-7 text-blue-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{language === "pt" ? "Notificacoes em Tempo Real" : "Real-time Notifications"}</h3>
              <p className="text-[#9bbbc9] leading-relaxed">
                {language === "pt"
                  ? "Assim que o aluno passa o seu cartao pelo nosso Scanner Profissional a entrada, os pais recebem uma notificacao instantanea confirmando a sua chegada."
                  : "As soon as the student scans at the gate, parents instantly receive a confirmation notification."}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card p-8 border border-[#2e5a6e] hover:border-[#2ecc71]/50 transition-colors">
              <div className="w-14 h-14 bg-[#2ecc71]/10 rounded-xl flex items-center justify-center mb-6">
                <Eye className="h-7 w-7 text-[#2ecc71]" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{language === "pt" ? "Controlo de Absentismo" : "Attendance Control"}</h3>
              <p className="text-[#9bbbc9] leading-relaxed">
                {language === "pt"
                  ? "As direcoes das escolas tem acesso a relatorios precisos sobre atrasos, faltas e presencas, simplificando o trabalho administrativo diario."
                  : "School leadership gets precise reports on delays, absences and attendance, simplifying daily administration."}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card p-8 border border-[#2e5a6e] hover:border-[#2ecc71]/50 transition-colors">
              <div className="w-14 h-14 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6">
                <Users className="h-7 w-7 text-purple-400" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">{language === "pt" ? "Acesso Exclusivo para Pais" : "Exclusive Parent Access"}</h3>
              <p className="text-[#9bbbc9] leading-relaxed">
                {language === "pt"
                  ? "Um portal web seguro onde cada encarregado de educacao pode aceder ao historico de movimentos e manter o seu perfil protegido."
                  : "A secure web portal where each guardian can access movement history and keep profile credentials protected."}
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
              <h2 className="text-4xl font-extrabold text-white mb-6 leading-tight">
                {language === "pt" ? "A Nossa Visao:" : "Our Vision:"}
                <br />
                <span className="text-[#2ecc71]">{language === "pt" ? "Transformar a Educacao em Mocambique" : "Transform Education in Mozambique"}</span>
              </h2>
              <p className="text-lg text-[#9bbbc9] mb-6 leading-relaxed">
                {language === "pt"
                  ? "A EduGuard360 nao e apenas um sistema de controlo de acessos; e uma ponte de confianca entre a escola e a casa."
                  : "EduGuard360 is not just an access-control system; it is a trust bridge between school and home."}
              </p>
              <p className="text-lg text-[#9bbbc9] leading-relaxed">
                {language === "pt"
                  ? "A nossa missao e eliminar o medo e a incerteza diaria dos encarregados de educacao, garantindo que todas as criancas chegam ao seu destino em seguranca."
                  : "Our mission is to remove daily uncertainty for guardians, ensuring every child reaches destination safely while modernizing school infrastructure."}
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#2ecc71] to-blue-500 blur-3xl opacity-20 rounded-full"></div>
              <div className="card border border-[#2e5a6e] p-2 relative">
                <img src="https://images.unsplash.com/photo-1544717305-996b815c338c?auto=format&fit=crop&w=2070&q=80" alt="Crianças de várias raças em sala de aula" className="rounded-lg shadow-2xl opacity-80" />
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
            
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 relative z-10">
              {language === "pt" ? "A Sua Escola Esta Pronta Para o Futuro?" : "Is Your School Ready for the Future?"}
            </h2>
            <p className="text-[#9bbbc9] text-lg mb-8 max-w-2xl mx-auto relative z-10">
              {language === "pt"
                ? "Inicie a transicao para a modernidade hoje mesmo. Deixe o seu contacto e a nossa equipa agendara uma simulacao sem compromisso."
                : "Start your modernization today. Leave your contact and our team will schedule a no-obligation demo."}
            </p>

            <form onSubmit={handleDemoRequest} className="max-w-lg mx-auto flex flex-col gap-4 relative z-10">
              <input 
                type="text" 
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder={language === "pt" ? "Nome da Escola ou Instituicao" : "School or Institution Name"}
                className="w-full px-5 py-4 rounded-lg"
                required
              />
              <input 
                type="email" 
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder={language === "pt" ? "E-mail de Contacto da Direcao" : "School Management Contact Email"}
                className="w-full px-5 py-4 rounded-lg"
                required
              />
              {feedback && (
                <div className={`rounded-lg px-4 py-3 text-sm ${feedback.type === 'success' ? 'bg-emerald-500/15 text-emerald-200' : 'bg-red-500/15 text-red-200'}`}>
                  {feedback.message}
                </div>
              )}
              <button type="submit" disabled={isSubmitting} className="btn w-full px-8 py-4 font-bold text-lg mt-2">
                {isSubmitting
                  ? (language === "pt" ? 'A enviar...' : 'Sending...')
                  : (language === "pt" ? 'Solicitar Simulacao Gratuita' : 'Request Free Demo')}
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
              <h4 className="text-white font-bold text-lg mb-6">{language === "pt" ? "Contactos Diretos" : "Direct Contacts"}</h4>
              <ul className="space-y-4">
                <li className="flex items-center gap-3 text-[#9bbbc9]">
                  <Mail className="h-5 w-5 text-[#2ecc71]" />
                  <a href="mailto:admin@eduguard360.co.mz" className="hover:text-white transition-colors">admin@eduguard360.co.mz</a>
                </li>
                <li className="flex items-center gap-3 text-[#9bbbc9]">
                  <Phone className="h-5 w-5 text-[#2ecc71]" />
                  <span>+258 84 436 5114</span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-6">{language === "pt" ? "Acesso Rapido" : "Quick Access"}</h4>
              <ul className="space-y-3">
                <li><Link to="/portais" className="text-[#9bbbc9] hover:text-[#2ecc71] transition-colors">{language === "pt" ? "Portal Hub" : "Portal Hub"}</Link></li>
                <li><Link to="/edumarket" className="text-[#9bbbc9] hover:text-[#2ecc71] transition-colors">EduMarket</Link></li>
                <li><Link to="/sistema" className="text-[#9bbbc9] hover:text-[#2ecc71] transition-colors">{language === "pt" ? "Portal de Acesso (Escolas e Pais)" : "Access Portal (Schools and Parents)"}</Link></li>
                <li><a href="#sobre" className="text-[#9bbbc9] hover:text-[#2ecc71] transition-colors">{language === "pt" ? "Como Funciona" : "How It Works"}</a></li>
                <li><a href="#" className="text-[#9bbbc9] hover:text-[#2ecc71] transition-colors">{language === "pt" ? "Politica de Privacidade" : "Privacy Policy"}</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#1c3b4d] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[#9bbbc9]">
              &copy; {new Date().getFullYear()} EduGuard360. {language === "pt" ? "Todos os direitos reservados." : "All rights reserved."}
            </p>
            <p className="text-sm text-[#9bbbc9]">
              {language === "pt" ? "Desenvolvido em Mocambique." : "Built in Mozambique."}
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
