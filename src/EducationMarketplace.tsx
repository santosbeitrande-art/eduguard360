import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, Users, TrendingUp, DollarSign, BookOpen, CheckCircle } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  instructor: string;
  price: number;
  rating: number;
  students: number;
  image: string;
  category: string;
  description: string;
  duration: string;
  level: string;
}

interface Service {
  id: string;
  title: string;
  provider: string;
  price: number;
  rating: number;
  category: string;
  description: string;
  deliveryTime: string;
  image: string;
}

export const EducationMarketplace: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'courses' | 'services' | 'analytics'>('courses');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Dados de exemplo - Cursos populares em Moçambique
  const courses: Course[] = [
    {
      id: '1',
      title: 'Programação Web com React',
      instructor: 'João Nhambu',
      price: 299,
      rating: 4.8,
      students: 1250,
      image: 'https://via.placeholder.com/300x200?text=React',
      category: 'tecnologia',
      description: 'Aprenda a criar aplicações web modernas com React e JavaScript',
      duration: '8 semanas',
      level: 'Iniciante',
    },
    {
      id: '2',
      title: 'Digital Marketing Essentials',
      instructor: 'Marta Simango',
      price: 199,
      rating: 4.6,
      students: 890,
      image: 'https://via.placeholder.com/300x200?text=Marketing',
      category: 'negocio',
      description: 'Domine as estratégias de marketing digital e redes sociais',
      duration: '6 semanas',
      level: 'Iniciante',
    },
    {
      id: '3',
      title: 'Contabilidade Básica',
      instructor: 'Carlos Zunguze',
      price: 149,
      rating: 4.7,
      students: 650,
      image: 'https://via.placeholder.com/300x200?text=Contabilidade',
      category: 'financeiro',
      description: 'Fundamentos de contabilidade para pequenos negócios',
      duration: '4 semanas',
      level: 'Iniciante',
    },
    {
      id: '4',
      title: 'Design Gráfico com Canva',
      instructor: 'Zena Mende',
      price: 179,
      rating: 4.5,
      students: 1050,
      image: 'https://via.placeholder.com/300x200?text=Design',
      category: 'criativo',
      description: 'Crie designs profissionais sem experiência prévia',
      duration: '3 semanas',
      level: 'Iniciante',
    },
    {
      id: '5',
      title: 'Agricultura Digital',
      instructor: 'Manuel Mapuranga',
      price: 129,
      rating: 4.9,
      students: 2100,
      image: 'https://via.placeholder.com/300x200?text=Agricultura',
      category: 'agricultura',
      description: 'Use tecnologia para melhorar produtividade agrícola',
      duration: '5 semanas',
      level: 'Iniciante',
    },
    {
      id: '6',
      title: 'Inglês para Negócios',
      instructor: 'Pedro Moreira',
      price: 229,
      rating: 4.7,
      students: 1450,
      image: 'https://via.placeholder.com/300x200?text=Idiomas',
      category: 'idiomas',
      description: 'Aprenda inglês profissional para carreiras internacionais',
      duration: '10 semanas',
      level: 'Intermediário',
    },
  ];

  const services: Service[] = [
    {
      id: 's1',
      title: 'Consultoria de Negócios',
      provider: 'Consultores Moçambique',
      price: 50,
      rating: 4.8,
      category: 'consultoria',
      description: 'Análise e estratégia para seu negócio crescer',
      deliveryTime: '3-5 dias',
      image: 'https://via.placeholder.com/300x200?text=Consultoria',
    },
    {
      id: 's2',
      title: 'Desenvolvimento Web Custom',
      provider: 'Tech Solutions Moz',
      price: 100,
      rating: 4.9,
      category: 'desenvolvimento',
      description: 'Website ou aplicação personalizada para seu negócio',
      deliveryTime: '2-4 semanas',
      image: 'https://via.placeholder.com/300x200?text=Web',
    },
    {
      id: 's3',
      title: 'Gestão de Redes Sociais',
      provider: 'Social Media Experts',
      price: 35,
      rating: 4.6,
      category: 'marketing',
      description: 'Aumente sua presença online com conteúdo profissional',
      deliveryTime: '1-2 semanas',
      image: 'https://via.placeholder.com/300x200?text=Social',
    },
    {
      id: 's4',
      title: 'Suporte Técnico IT',
      provider: 'IT Support Moçambique',
      price: 40,
      rating: 4.7,
      category: 'tecnologia',
      description: 'Suporte e manutenção de seus sistemas informativos',
      deliveryTime: 'Resposta em 24h',
      image: 'https://via.placeholder.com/300x200?text=TI',
    },
  ];

  const categories = [
    'all',
    'tecnologia',
    'negocio',
    'financeiro',
    'criativo',
    'agricultura',
    'idiomas',
  ];

  const categoryLabels: { [key: string]: string } = {
    all: 'Todas',
    tecnologia: '💻 Tecnologia',
    negocio: '📊 Negócios',
    financeiro: '💰 Financeiro',
    criativo: '🎨 Criativo',
    agricultura: '🌾 Agricultura',
    idiomas: '🌍 Idiomas',
  };

  const filteredCourses = courses.filter(
    (course) =>
      (selectedCategory === 'all' || course.category === selectedCategory) &&
      (course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        course.instructor.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BookOpen className="w-10 h-10 text-indigo-600" />
              <h1 className="text-3xl font-bold text-gray-900">EduMarket MZ</h1>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/edumarket/criar-curso')}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
              >
                Criar Curso
              </button>
              <button
                onClick={() => navigate('/edumarket/oferecer-servico')}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
              >
                Oferecer Serviço
              </button>
            </div>
          </div>
          <p className="text-gray-600 mt-2">
            Conectando educadores e profissionais moçambicanos com oportunidades de renda
          </p>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            icon={<BookOpen className="w-6 h-6" />}
            label="Cursos Ativos"
            value="285"
            color="blue"
          />
          <StatCard
            icon={<Users className="w-6 h-6" />}
            label="Estudantes"
            value="12.5K"
            color="green"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6" />}
            label="Crescimento Mensal"
            value="+32%"
            color="purple"
          />
          <StatCard
            icon={<DollarSign className="w-6 h-6" />}
            label="Renda Gerada"
            value="MT 2.3M"
            color="orange"
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'courses'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📚 Cursos
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'services'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            🔧 Serviços
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-6 py-2 rounded-lg font-semibold transition-colors ${
              activeTab === 'analytics'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            📈 Meu Dashboard
          </button>
        </div>

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div>
            {/* Search e Filtros */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-8">
              <input
                type="text"
                placeholder="Procure cursos ou instrutores..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-600"
              />
              <div className="flex gap-2 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      selectedCategory === cat
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {categoryLabels[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Cursos Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onViewMore={() => navigate(`/edumarket/curso/${course.id}`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Services Tab */}
        {activeTab === 'services' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onContract={() => navigate(`/edumarket/oferecer-servico?service=${service.id}`)}
              />
            ))}
          </div>
        )}

        {/* Dashboard Tab */}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
      </div>
    </div>
  );
};

// Componentes auxiliares
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}> = ({ icon, label, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700',
    green: 'bg-green-100 text-green-700',
    purple: 'bg-purple-100 text-purple-700',
    orange: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} p-6 rounded-lg shadow-md`}>
      <div className="flex items-center gap-3">
        <div>{icon}</div>
        <div>
          <p className="text-sm font-semibold opacity-75">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  );
};

const CourseCard: React.FC<{ course: Course; onViewMore: () => void }> = ({ course, onViewMore }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
      <img
        src={course.image}
        alt={course.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
            {course.level}
          </span>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
            {course.duration}
          </span>
        </div>
        <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2">
          {course.title}
        </h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {course.description}
        </p>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold text-sm">{course.rating}</span>
          </div>
          <span className="text-gray-600 text-sm">({course.students} alunos)</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-indigo-600">
            MT {course.price}
          </div>
          <button
            onClick={onViewMore}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Ver Mais
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Instrutor: {course.instructor}</p>
      </div>
    </div>
  );
};

const ServiceCard: React.FC<{ service: Service; onContract: () => void }> = ({ service, onContract }) => {
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer">
      <img
        src={service.image}
        alt={service.title}
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h3 className="font-bold text-lg text-gray-900 mb-2">
          {service.title}
        </h3>
        <p className="text-gray-600 text-sm mb-3 line-clamp-2">
          {service.description}
        </p>
        <div className="flex items-center gap-2 mb-3">
          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold text-sm">{service.rating}</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-gray-600">📦 {service.deliveryTime}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-green-600">
            MT {service.price}/hora
          </div>
          <button
            onClick={onContract}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            Contratar
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">Fornecedor: {service.provider}</p>
      </div>
    </div>
  );
};

const AnalyticsDashboard: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Suas Earnings</h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-2 border-b">
            <span>Este Mês</span>
            <span className="text-2xl font-bold text-green-600">MT 45,300</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b">
            <span>Total (Ano)</span>
            <span className="text-2xl font-bold text-indigo-600">MT 287,500</span>
          </div>
          <div className="flex justify-between items-center pb-2 border-b">
            <span>Pendente</span>
            <span className="text-2xl font-bold text-orange-600">MT 12,000</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Seus Cursos/Serviços</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
            <span>Programação Web</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
            <span>Consultoria de Negócios</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
            <span>Design Gráfico</span>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 md:col-span-2">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Estatísticas</h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-indigo-600">342</p>
            <p className="text-gray-600 text-sm">Alunos Totais</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">4.8</p>
            <p className="text-gray-600 text-sm">Rating Médio</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">28</p>
            <p className="text-gray-600 text-sm">Certificados Emitidos</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducationMarketplace;
