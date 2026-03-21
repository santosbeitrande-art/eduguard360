import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const featureList = [
  {
    title: "Controle de Acesso em Tempo Real",
    description: "Monitore entradas e saídas de alunos e funcionários instantaneamente com alertas inteligentes.",
  },
  {
    title: "Geolocalização Escolar",
    description: "Mapa e status de presença em tempo real para máxima visibilidade e planejamento de segurança.",
  },
  {
    title: "Relatórios Inteligentes",
    description: "Relatórios históricos, análises personalizadas e exportação em CSV/PDF para diretorias e mantenedoras.",
  },
  {
    title: "Portal Pais, Escola e Admin",
    description: "Acesso diferenciado por perfil para informações de rotas, frequência e comunicados urgentes.",
  },
];

export default function Home() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [status, setStatus] = useState<"" | "success" | "error">("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nome || !email || !mensagem) {
      setStatus("error");
      return;
    }

    // Simula envio real. Aqui você pode conectar a backend ou Supabase.
    setStatus("success");
    setNome("");
    setEmail("");
    setMensagem("");

    window.setTimeout(() => setStatus(""), 4000);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />

      <section className="bg-gradient-to-r from-indigo-700 via-cyan-700 to-sky-600 text-white py-20">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
                Plataforma EduGuard360
              </p>
              <h1 className="mt-6 text-4xl font-bold leading-tight sm:text-5xl">
                Segurança escolar digital integrada para pais, escolas e gestores
              </h1>
              <p className="mt-6 text-lg text-cyan-100">
                Controle de ponto, notificações críticas e análises acionáveis em um único painel.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/sistema"
                  className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-cyan-100"
                >
                  Entrar no Sistema
                </Link>
                <a
                  href="#contato"
                  className="rounded-full border border-white/75 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
                >
                  Fale com a gente
                </a>
              </div>
            </div>
            <div className="rounded-3xl border border-white/20 bg-white/10 p-10 backdrop-blur-lg shadow-xl">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">Visão geral do fluxo operacional</h2>
                <ul className="space-y-3 text-sm text-cyan-50">
                  <li>1. Registro de alunos/visitantes no check-in com QR code.</li>
                  <li>2. Validação automática por setor, série e classe.</li>
                  <li>3. Notificações por app/whatsapp para permissão de saída.</li>
                  <li>4. Relatórios de frequência + cumplimento em tempo real.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-6 py-16 lg:px-8">
        <section id="recursos" className="space-y-8">
          <h2 className="text-3xl font-bold text-slate-900">Recursos avançados</h2>
          <p className="text-slate-600">
            A EduGuard360 foi desenvolvida para reduzir riscos e tornar a operação escolar mais confiável e transparente.
          </p>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featureList.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                <h3 className="text-lg font-semibold text-indigo-700">{item.title}</h3>
                <p className="mt-2 text-slate-600">{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="como-funciona" className="mt-16 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-bold text-slate-900">Como funciona</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              { step: "1", title: "Cadastro", description: "Crie perfis de escola, alunos, pais e colaboradores em minutos." },
              { step: "2", title: "Monitoramento", description: "Acompanhe entradas/saídas com sensor de presença e QR de acesso." },
              { step: "3", title: "Ação", description: "Receba alertas de anomalias e envie comunicados urgentes instantaneamente." },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-slate-100 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold">{item.step}</div>
                <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-slate-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="contato" className="mt-16 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h2 className="text-3xl font-bold text-slate-900">Solicite uma demonstração</h2>
          <p className="mt-2 text-slate-600">Nosso time entra em contato em até 24h úteis.</p>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <input
                name="nome"
                type="text"
                placeholder="Nome completo"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="rounded-lg border border-slate-300 px-4 py-3 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
              <input
                name="email"
                type="email"
                placeholder="email@escola.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-lg border border-slate-300 px-4 py-3 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
              />
            </div>
            <textarea
              name="mensagem"
              rows={5}
              placeholder="Descreva brevemente o seu desafio"
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-200"
            />
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-700 px-6 py-3 text-white font-semibold hover:bg-indigo-800 transition"
            >
              Enviar contato
            </button>
            {status === "success" && <p className="text-green-600">Mensagem enviada com sucesso!</p>}
            {status === "error" && <p className="text-red-600">Por favor preencha todos os campos.</p>}
          </form>
        </section>
      </main>

      <Footer />
    </div>
  );
}
