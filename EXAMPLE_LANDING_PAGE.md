# 📄 Exemplo de Landing Page Integrada com Portais

Abaixo está o exemplo de como a `LandingPage.tsx` ficaria com a integração dos portais.

## Código de Exemplo

```tsx
// src/pages/public/LandingPage.tsx

import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Eye, MapPin, Users, Mail, Phone, ChevronRight } from "lucide-react";

// NOVO: Importar componentes de navegação e portais
import EducuardNavigation from "@/components/EducuardNavigation";
import PortalsPromoSection from "@/components/PortalsPromoSection";

const LandingPage = () => {
  const navigate = useNavigate();
  const [schoolName, setSchoolName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleDemoRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!schoolName.trim() || !contactEmail.trim()) {
      setFeedback({ type: "error", message: "Por favor preencha o nome da escola e o e-mail de contacto." });
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

      setFeedback({ type: "success", message: "Pedido enviado! O nosso administrador receberá o email imediatamente." });
      setSchoolName("");
      setContactEmail("");
    } catch (error) {
      setFeedback({ type: "error", message: "Erro ao enviar o pedido. Por favor, tente novamente." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* ========== NOVO: NAVEGAÇÃO INTEGRADA ========== */}
      <EducuardNavigation variant="light" />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            Segurança Escolar Inteligente
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            A plataforma completa para segurança, educação e desenvolvimento profissional
          </p>
          <button
            onClick={() => navigate('/portais')}
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors inline-flex items-center gap-2"
          >
            Explorar Portais
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </section>

      {/* Features Section - Sua seção atual */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Recursos Principais
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1: Segurança */}
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <ShieldCheck className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Segurança 24/7</h3>
              <p className="text-gray-600">
                Monitoramento contínuo da comunidade escolar com alertas em tempo real
              </p>
            </div>

            {/* Feature 2: Monitoramento */}
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <Eye className="w-12 h-12 text-purple-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Monitoramento Inteligente</h3>
              <p className="text-gray-600">
                Controlo de presença com QR codes e análise de dados em tempo real
              </p>
            </div>

            {/* Feature 3: Localização */}
            <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <MapPin className="w-12 h-12 text-red-600 mb-4" />
              <h3 className="text-xl font-bold text-gray-900 mb-3">Localização Segura</h3>
              <p className="text-gray-600">
                Rastreamento de localização dos alunos para maior tranquilidade dos pais
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== NOVO: SEÇÃO DE PORTAIS ========== */}
      <PortalsPromoSection />

      {/* Demo Request Section */}
      <section id="contact" className="py-20 bg-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            Solicitar Demonstração Gratuita
          </h2>

          <form onSubmit={handleDemoRequest} className="bg-gray-50 p-8 rounded-lg shadow-lg">
            {/* Feedback Message */}
            {feedback && (
              <div className={`mb-6 p-4 rounded-lg ${
                feedback.type === 'success'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {feedback.message}
              </div>
            )}

            {/* Form Fields */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Nome da Escola
                </label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Ex: Escola Primária Moçambique"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  E-mail de Contacto
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:bg-gray-400"
            >
              {isSubmitting ? 'Enviando...' : 'Solicitar Demonstração'}
            </button>
          </form>

          {/* Direct Access Links */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <p className="text-center text-gray-600 mb-6">
              Ou aceda diretamente aos portais:
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Link
                to="/sistema"
                className="bg-blue-600 text-white py-3 rounded-lg text-center font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <ShieldCheck className="w-5 h-5" />
                Portal de Segurança
              </Link>
              <Link
                to="/edumarket"
                className="bg-purple-600 text-white py-3 rounded-lg text-center font-semibold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                <ChevronRight className="w-5 h-5" />
                Portal EduMarket
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">
            O que Dizem Sobre Nós
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Testimonial 1 */}
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                  JM
                </div>
                <div className="ml-4">
                  <p className="font-bold text-gray-900">João Maputo</p>
                  <p className="text-sm text-gray-500">Director, Escola Secundária</p>
                </div>
              </div>
              <p className="text-gray-600">
                "A plataforma transformou a segurança da nossa escola. Pais e professores adoram!"
              </p>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  MT
                </div>
                <div className="ml-4">
                  <p className="font-bold text-gray-900">Marta Tete</p>
                  <p className="text-sm text-gray-500">Educadora, EduMarket</p>
                </div>
              </div>
              <p className="text-gray-600">
                "Ganhei 50.000 MT no primeiro mês ensinando online. Recomendo!"
              </p>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white p-8 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center text-white font-bold">
                  CF
                </div>
                <div className="ml-4">
                  <p className="font-bold text-gray-900">Carlos Inhambane</p>
                  <p className="text-sm text-gray-500">Consultor, Plataforma</p>
                </div>
              </div>
              <p className="text-gray-600">
                "Excelente plataforma para conectar com clientes e ganhar renda extra!"
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">
            Pronto para Começar?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Explore os portais EduGuard e descubra como podemos transformar a sua instituição
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/portais')}
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-bold hover:bg-gray-100 transition-colors"
            >
              Ver Todos os Portais
            </button>
            <button
              onClick={() => {
                document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-bold hover:bg-white/10 transition-colors"
            >
              Contacte-nos
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* About */}
            <div>
              <h3 className="text-white font-bold mb-4">EduGuard 360</h3>
              <p className="text-sm">
                Soluções integradas de educação, segurança e desenvolvimento profissional
              </p>
            </div>

            {/* Portals */}
            <div>
              <h3 className="text-white font-bold mb-4">Portais</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/sistema" className="hover:text-white transition-colors">
                    Segurança Escolar
                  </Link>
                </li>
                <li>
                  <Link to="/edumarket" className="hover:text-white transition-colors">
                    EduMarket
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors opacity-50">
                    Enterprise (Em breve)
                  </a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="text-white font-bold mb-4">Suporte</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Centro de Ajuda
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Documentação
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Contacto
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-white font-bold mb-4">Contacto</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  admin@eduguard360.co.mz
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  +258 84 XXXXXX
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>© 2024 EduGuard 360. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
```

---

## 📋 Mudanças Implementadas

### ✅ Adições:
1. **Importação de EducuardNavigation** - No topo da página
2. **Importação de PortalsPromoSection** - Seção entre Features e Demo
3. **Direct Access Links** - Na seção de Demo Request
4. **Portals Link** na footer
5. **Portals no menu** via EducuardNavigation

### ✅ Estrutura:
```
Landing Page
├── EducuardNavigation (novo)
├── Hero Section
├── Features Section
├── PortalsPromoSection (novo)
├── Demo Request Section
├── Testimonials Section
├── CTA Section
└── Footer (atualizado)
```

---

## 🎯 User Journey

```
Utilizador chega na página inicial
        ↓
Vê a navegação com "Portais" em destaque
        ↓
Pode:
  - Clicar em "Portais" no menu → /portais
  - Clicar em "Explorar Portais" no hero → /portais
  - Clicar em "Ver Todos os Portais" na seção promo → /portais
  - Clicar em portal específico → /sistema ou /edumarket
  - Clicar em "Portal de Segurança" ou "Portal EduMarket" → portal direto
```

---

## 🚀 Como Implementar

1. **Copie o código acima** na sua `LandingPage.tsx`
2. **Certifique-se que os imports estão corretos**
3. **Testar a navegação**
4. **Deploy**

---

## 🎨 Customizações Fáceis

### Mudar cores
```tsx
// Em PortalsPromoSection.tsx
color: 'from-purple-600 to-indigo-600' // Change here
```

### Adicionar links na footer
```tsx
<li>
  <Link to="/seu-novo-portal" className="...">
    Seu Portal
  </Link>
</li>
```

### Mudar textos
```tsx
"Bem-vindo ao EduGuard 360" // Mude aqui
"Soluções integradas..." // Ou aqui
```

---

Pronto! A sua landing page agora é um **portal centralizado** para todos os serviços! 🎉

