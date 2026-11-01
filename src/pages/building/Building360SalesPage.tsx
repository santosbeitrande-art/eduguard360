import React, { FormEvent, useState } from 'react';
import { ArrowRight, Building2, Check, FileText, MessageCircle, Wallet, Wrench } from 'lucide-react';
import { Link } from 'react-router-dom';

const whatsappNumber = '258876068738';
const emailAddress = 'admin@eduguard360.co.mz';

const plans = [
  {
    name: 'Essencial',
    price: '4.900',
    buildings: '1 edifício',
    units: 'Até 50 unidades',
    users: 'Até 3 utilizadores de gestão',
  },
  {
    name: 'Gestão',
    price: '9.900',
    buildings: 'Até 5 edifícios',
    units: 'Até 200 unidades',
    users: 'Até 10 utilizadores de gestão',
    featured: true,
  },
  {
    name: 'Portfólio',
    price: '19.900',
    buildings: 'Até 15 edifícios',
    units: 'Até 750 unidades',
    users: 'Até 25 utilizadores de gestão',
  },
];

const whatsappHref = (message: string) =>
  `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

const Building360SalesPage: React.FC = () => {
  const [requestState, setRequestState] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleContactSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const request = {
      name: String(formData.get('name') || '').trim(),
      organizationName: String(formData.get('organization') || '').trim(),
      email: String(formData.get('email') || '').trim(),
      phone: String(formData.get('phone') || '').trim(),
      city: String(formData.get('city') || '').trim(),
      buildingName: String(formData.get('buildingName') || '').trim(),
      plan: String(formData.get('plan') || ''),
      message: String(formData.get('message') || '').trim(),
      privacyConsent: formData.get('privacyConsent') === 'on',
    };

    setSubmitting(true);
    setRequestState(null);
    try {
      const response = await fetch('/api/v1/building360/public/demo-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const detail = Array.isArray(body.message) ? body.message.join(' ') : body.message;
        throw new Error(detail || 'Não foi possível enviar o pedido. Tente novamente ou contacte-nos por WhatsApp.');
      }
      form.reset();
      setRequestState({
        type: 'success',
        message: 'Pedido recebido. A equipa comercial irá analisá-lo e entrará em contacto para combinar a demonstração.',
      });
    } catch (error) {
      setRequestState({
        type: 'error',
        message: error instanceof Error ? error.message : 'Não foi possível enviar o pedido. Tente novamente.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <a href="#inicio" className="text-lg font-black tracking-tight text-white">Building360</a>
          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#produto" className="hover:text-white">O produto</a>
            <a href="#planos" className="hover:text-white">Planos</a>
            <a href="#contacto" className="hover:text-white">Contacto</a>
          </nav>
          <Link
            to="/building360/login?returnTo=%2Fbuilding360%2Fdashboard"
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold hover:bg-slate-900"
          >
            Entrar
          </Link>
        </div>
      </header>

      <main>
        <section id="inicio" className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2">
          <div>
            <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-emerald-300">
              Gestão de edifícios · Produto comercial V1
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight text-white sm:text-6xl">
              Cobranças, despesas e manutenção sob controlo.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-300">
              Uma forma simples de acompanhar pagamentos, dívidas, despesas e pedidos de manutenção
              do seu condomínio ou dos edifícios que administra.
            </p>
            <p className="mt-3 text-sm text-slate-400">
              Para condomínios e empresas que administram vários edifícios.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#contacto"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-6 py-3 font-bold text-slate-950 hover:bg-emerald-300"
              >
                Solicitar demonstração <ArrowRight className="h-4 w-4" />
              </a>
              <a
                href={whatsappHref('Olá, gostaria de solicitar uma demonstração do Building360.')}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-700 px-6 py-3 font-semibold hover:bg-slate-900"
              >
                <MessageCircle className="h-4 w-4" /> Falar no WhatsApp
              </a>
            </div>
          </div>

          <aside className="rounded-3xl border border-emerald-700/40 bg-slate-900 p-5 shadow-2xl shadow-emerald-950/30 sm:p-7" aria-label="Exemplo de painel financeiro">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-300">Resumo financeiro mensal</p>
                <p className="mt-1 text-xs text-slate-500">Condomínio de demonstração · Setembro</p>
              </div>
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-200">
                Dados fictícios
              </span>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                ['Total cobrado', '1.250.000 MZN', 'text-white'],
                ['Total recebido', '980.000 MZN', 'text-emerald-300'],
                ['Em dívida', '270.000 MZN', 'text-amber-300'],
                ['Despesas registadas', '315.000 MZN', 'text-sky-300'],
              ].map(([label, value, color]) => (
                <div key={label} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                  <p className="text-xs text-slate-400">{label}</p>
                  <p className={`mt-2 text-lg font-extrabold sm:text-xl ${color}`}>{value}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-300">Saldo registado no sistema</p>
                <p className="font-bold text-white">665.000 MZN</p>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Saldo bancário: não ligado nem confirmado. O valor do sistema não representa uma
                reconciliação bancária.
              </p>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-amber-100/80">
              Exemplo ilustrativo. Estes montantes são fictícios, não pertencem a clientes e não
              representam resultados reais nem dados bancários confirmados.
            </p>
          </aside>
        </section>

        <section id="produto" className="border-y border-slate-800 bg-slate-900/40">
          <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
            <div className="max-w-3xl">
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-300">O essencial para começar</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">
                Cinco tarefas, num só lugar.
              </h2>
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                [Building2, 'Organizar edifícios', 'Registar edifícios, apartamentos, proprietários e inquilinos.'],
                [Wallet, 'Acompanhar cobranças', 'Emitir mensalidades e ver quem pagou, quem deve e há quanto tempo.'],
                [FileText, 'Registar receitas e despesas', 'Guardar movimentos, anexar comprovativos e emitir recibos.'],
                [Wrench, 'Resolver pedidos', 'Receber reclamações e acompanhar reparações até à conclusão.'],
                [Check, 'Fechar o mês com clareza', 'Consultar cobrança, dívida, receitas, despesas e saldo registado.'],
              ].map(([Icon, title, description]) => (
                <article key={String(title)} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                  <Icon className="h-6 w-6 text-emerald-300" />
                  <h3 className="mt-4 font-bold text-white">{String(title)}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-400">{String(description)}</p>
                </article>
              ))}
            </div>
            <p className="mt-6 max-w-4xl text-sm leading-relaxed text-slate-400">
              A V1 mantém também avisos à comunidade e documentos com validade. Operações e
              manutenção ficam numa versão simples; registo básico de visitantes, sem QR avançado.
              IA, previsões, Digital Twin, marketplace, reservas avançadas e integrações IoT ficam
              para fases futuras.
            </p>
          </div>
        </section>

        <section id="planos" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-sky-300">Planos mensais propostos</p>
            <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Escolha a dimensão do seu portfólio.</h2>
          </div>
          <div className="mt-9 grid gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-2xl border p-6 ${plan.featured ? 'border-emerald-400 bg-emerald-950/30' : 'border-slate-800 bg-slate-900/70'}`}
              >
                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                <p className="mt-4 text-3xl font-black text-white">{plan.price}<span className="ml-2 text-sm font-medium text-slate-400">MZN/mês*</span></p>
                <ul className="mt-6 space-y-3 text-sm text-slate-300">
                  {[plan.buildings, plan.units, plan.users, 'Cobranças, despesas e pedidos de manutenção'].map((item) => (
                    <li key={item} className="flex gap-2"><Check className="h-4 w-4 shrink-0 text-emerald-300" />{item}</li>
                  ))}
                </ul>
                <a
                  href={whatsappHref(`Olá, gostaria de saber mais sobre o plano ${plan.name} do Building360.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-7 block rounded-lg border border-slate-700 px-4 py-3 text-center text-sm font-bold text-white hover:bg-slate-800"
                >
                  Consultar plano
                </a>
              </article>
            ))}
          </div>
          <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">
            * Valores e limites indicativos, sujeitos a confirmação comercial. A implementação,
            formação e eventuais personalizações serão confirmadas na proposta.
          </p>
        </section>

        <section id="contacto" className="border-t border-slate-800 bg-slate-900/50">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-2">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300">Vamos conversar</p>
              <h2 className="mt-3 text-3xl font-black text-white sm:text-4xl">Peça uma demonstração.</h2>
              <p className="mt-4 max-w-xl text-slate-300">
                Conte-nos quantos edifícios e unidades administra. A equipa comercial entrará em
                contacto para perceber as suas necessidades e apresentar o Building360.
              </p>
              <a
                href={whatsappHref('Olá, gostaria de solicitar uma demonstração do Building360.')}
                target="_blank"
                rel="noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 font-bold text-slate-950 hover:bg-emerald-300"
              >
                <MessageCircle className="h-5 w-5" /> Solicitar pelo WhatsApp
              </a>
              <p className="mt-4 text-sm text-slate-400">
                Ou escreva para <a className="text-sky-300 hover:underline" href={`mailto:${emailAddress}`}>{emailAddress}</a>
              </p>
            </div>
            <form onSubmit={handleContactSubmit} className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950 p-6">
              <label className="block text-sm font-medium text-slate-300">
                Nome
                <input required name="name" autoComplete="name" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Condomínio ou empresa
                <input required name="organization" autoComplete="organization" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Email para convite e contacto
                <input required type="email" name="email" autoComplete="email" maxLength={180} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-300">
                  Telefone (opcional)
                  <input name="phone" type="tel" autoComplete="tel" maxLength={40} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
                </label>
                <label className="block text-sm font-medium text-slate-300">
                  Cidade
                  <input required name="city" autoComplete="address-level2" maxLength={120} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-300">
                Nome do primeiro edifício
                <input required name="buildingName" maxLength={160} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
              </label>
              <label className="block text-sm font-medium text-slate-300">
                Plano pretendido
                <select required name="plan" defaultValue="" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white">
                  <option value="" disabled>Seleccione um plano</option>
                  <option value="essencial">Essencial</option>
                  <option value="gestao">Gestão</option>
                  <option value="portfolio">Portfólio</option>
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-300">
                O que pretende gerir?
                <textarea name="message" rows={3} maxLength={2000} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white" />
              </label>
              <label className="flex items-start gap-3 text-xs leading-relaxed text-slate-400">
                <input required type="checkbox" name="privacyConsent" className="mt-0.5 accent-emerald-400" />
                <span>Autorizo o contacto para análise deste pedido de demonstração e aceito que estes dados sejam guardados para esse fim.</span>
              </label>
              {requestState && (
                <p role={requestState.type === 'error' ? 'alert' : 'status'} className={`rounded-lg p-3 text-sm ${requestState.type === 'success' ? 'bg-emerald-950/50 text-emerald-200' : 'bg-red-950/50 text-red-200'}`}>
                  {requestState.message}
                </p>
              )}
              <button disabled={submitting} type="submit" className="w-full rounded-lg bg-sky-400 px-4 py-3 font-bold text-slate-950 hover:bg-sky-300 disabled:cursor-wait disabled:opacity-60">
                {submitting ? 'A enviar pedido…' : 'Solicitar demonstração'}
              </button>
              <p className="text-xs text-slate-500">
                O pedido fica pendente de análise pela equipa comercial. A criação da conta e o convite
                só acontecem depois de aprovação manual.
              </p>
            </form>
          </div>
        </section>
      </main>
      <footer className="border-t border-slate-800 px-4 py-6 text-center text-xs text-slate-500">
        Building360 Gestão de Edifícios · Produto comercial V1.0
      </footer>
    </div>
  );
};

export default Building360SalesPage;
