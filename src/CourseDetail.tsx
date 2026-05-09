import { useParams } from 'react-router-dom';

const coursesMap = {
  '1': {
    title: 'Programação Web com React',
    instructor: 'João Nhambu',
    description: 'Aprenda a criar aplicações web modernas com React e JavaScript.',
    details: 'Este curso cobre componentes, estado, roteamento, hooks e deploy em produção.',
    duration: '8 semanas',
    level: 'Iniciante',
    price: 'MT 299',
  },
  '2': {
    title: 'Digital Marketing Essentials',
    instructor: 'Marta Simango',
    description: 'Domine as estratégias de marketing digital e redes sociais.',
    details: 'Aprenda SEO, campanhas pagas, analytics e criação de conteúdo de alto impacto.',
    duration: '6 semanas',
    level: 'Iniciante',
    price: 'MT 199',
  },
  '3': {
    title: 'Contabilidade Básica',
    instructor: 'Carlos Zunguze',
    description: 'Fundamentos de contabilidade para pequenos negócios.',
    details: 'Conheça finanças, lançamentos, fluxo de caixa e gestão financeira para microempresas.',
    duration: '4 semanas',
    level: 'Iniciante',
    price: 'MT 149',
  },
  '4': {
    title: 'Design Gráfico com Canva',
    instructor: 'Zena Mende',
    description: 'Crie designs profissionais sem experiência prévia.',
    details: 'Aprenda identidades visuais, peças para redes sociais e materiais de marketing.',
    duration: '3 semanas',
    level: 'Iniciante',
    price: 'MT 179',
  },
  '5': {
    title: 'Agricultura Digital',
    instructor: 'Manuel Mapuranga',
    description: 'Use tecnologia para melhorar produtividade agrícola.',
    details: 'Saiba como sensores, drones e gestão digital podem transformar a agricultura local.',
    duration: '5 semanas',
    level: 'Iniciante',
    price: 'MT 129',
  },
  '6': {
    title: 'Inglês para Negócios',
    instructor: 'Pedro Moreira',
    description: 'Aprenda inglês profissional para carreiras internacionais.',
    details: 'Pratique conversação, vocabulário de negócios e escrita profissional em inglês.',
    duration: '10 semanas',
    level: 'Intermediário',
    price: 'MT 229',
  },
};

const CourseDetail: React.FC = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const course = courseId ? coursesMap[courseId] : undefined;

  if (!course) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-xl w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Curso não encontrado</h1>
          <p className="text-gray-600 mb-6">O curso solicitado não está disponível no momento.</p>
          <a href="/edumarket" className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-5 py-3 text-white hover:bg-indigo-700">
            Voltar ao EduMarket
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-sky-100 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          <div className="p-8 sm:p-12">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.24em] text-indigo-600 font-semibold">Detalhes do curso</p>
                <h1 className="mt-4 text-4xl font-bold text-slate-900">{course.title}</h1>
                <p className="mt-2 text-lg text-slate-600">Instrutor: {course.instructor}</p>
              </div>
              <div className="space-y-2 text-right">
                <p className="text-sm text-slate-500">Duração</p>
                <p className="text-xl font-semibold text-slate-900">{course.duration}</p>
                <p className="text-sm text-slate-500">Nível</p>
                <p className="text-xl font-semibold text-slate-900">{course.level}</p>
              </div>
            </div>

            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              <div className="rounded-3xl bg-slate-50 p-6">
                <h2 className="text-2xl font-semibold text-slate-900 mb-4">Sobre o curso</h2>
                <p className="text-slate-600 leading-7">{course.description}</p>
                <p className="mt-4 text-slate-600 leading-7">{course.details}</p>
              </div>
              <div className="rounded-3xl bg-indigo-600 p-6 text-white">
                <p className="text-sm uppercase tracking-[0.24em] text-indigo-200">Investimento</p>
                <p className="mt-4 text-4xl font-bold">{course.price}</p>
                <div className="mt-8 space-y-4">
                  <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                    <span>Modalidade</span>
                    <span>Online</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                    <span>Certificado</span>
                    <span>Sim</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/10 p-4">
                    <span>Acesso vitalício</span>
                    <span>Incluído</span>
                  </div>
                </div>
                <a
                  href="/edumarket"
                  className="mt-8 inline-flex w-full items-center justify-center rounded-3xl bg-white px-6 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-slate-100"
                >
                  Voltar para EduMarket
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseDetail;
