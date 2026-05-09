import { useSearchParams } from 'react-router-dom';

const servicesMap = {
  s1: {
    title: 'Consultoria de Negócios',
    provider: 'Consultores Moçambique',
    description: 'Análise e estratégia para seu negócio crescer.',
    deliveryTime: '3-5 dias',
    price: 'MT 50/hora',
  },
  s2: {
    title: 'Desenvolvimento Web Custom',
    provider: 'Tech Solutions Moz',
    description: 'Website ou aplicação personalizada para seu negócio.',
    deliveryTime: '2-4 semanas',
    price: 'MT 100/hora',
  },
  s3: {
    title: 'Gestão de Redes Sociais',
    provider: 'Social Media Experts',
    description: 'Aumente sua presença online com conteúdo profissional.',
    deliveryTime: '1-2 semanas',
    price: 'MT 35/hora',
  },
  s4: {
    title: 'Suporte Técnico IT',
    provider: 'IT Support Moçambique',
    description: 'Suporte e manutenção de seus sistemas informativos.',
    deliveryTime: 'Resposta em 24h',
    price: 'MT 40/hora',
  },
};

const OfferService: React.FC = () => {
  const [searchParams] = useSearchParams();
  const serviceId = searchParams.get('service') || 's1';
  const service = servicesMap[serviceId] || servicesMap.s1;

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-8 sm:p-12">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-green-700 font-semibold">Oferecer Serviço</p>
                <h1 className="mt-4 text-4xl font-bold text-slate-900">{service.title}</h1>
                <p className="mt-2 text-lg text-slate-600">Fornecedor: {service.provider}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Preço sugerido</p>
                <p className="text-3xl font-semibold text-green-600">{service.price}</p>
              </div>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-6">
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">O que você vai oferecer</h2>
                <p className="text-slate-600 leading-7">{service.description}</p>
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Tempo de entrega</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{service.deliveryTime}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <p className="text-sm text-slate-500">Formato</p>
                    <p className="mt-2 text-lg font-semibold text-slate-900">Consulta ou projeto sob medida</p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl bg-green-700 p-6 text-white">
                <p className="text-sm uppercase tracking-[0.24em] text-green-200">Pronto para lançar</p>
                <p className="mt-4 text-4xl font-bold">MT {service.price.split('/')[0]}</p>
                <div className="mt-8 space-y-4">
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-slate-200">Visibilidade no marketplace</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-slate-200">Suporte ao cliente</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-4">
                    <p className="text-slate-200">Gerenciamento de pedidos</p>
                  </div>
                </div>
                <a
                  href="/edumarket"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-3xl bg-white px-6 py-3 text-sm font-semibold text-green-700 transition hover:bg-green-100"
                >
                  Voltar ao Marketplace
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OfferService;
