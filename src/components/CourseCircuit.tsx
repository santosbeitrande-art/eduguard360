// ============================================
// Componentes React - Sistema de Cursos
// src/components/CourseCircuit/
// ============================================

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Star, Users, Clock, BookOpen, Lock } from 'lucide-react';

// ============================================
// 1. DESCOBERTA DE CURSOS (CourseDiscovery)
// ============================================

export const CourseDiscovery = () => {
  const [courses, setCourses] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [filteredCourses, setFilteredCourses] = useState([]);

  const categories = [
    { id: 'all', name: 'Todos' },
    { id: 'tech', name: 'Tecnologia' },
    { id: 'business', name: 'Negócios' },
    { id: 'language', name: 'Idiomas' },
    { id: 'arts', name: 'Artes' },
    { id: 'health', name: 'Saúde' }
  ];

  useEffect(() => {
    // Fetch courses
    fetchCourses();
  }, []);

  useEffect(() => {
    // Filter courses
    let filtered = courses;

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(c => c.category === selectedCategory);
    }

    filtered = filtered.filter(c => c.price_mzn >= priceRange[0] && c.price_mzn <= priceRange[1]);

    setFilteredCourses(filtered);
  }, [courses, searchTerm, selectedCategory, priceRange]);

  const fetchCourses = async () => {
    try {
      const response = await fetch('/api/courses');
      const data = await response.json();
      setCourses(data);
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <section className="py-12 px-4 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4">
            Aprenda com Profissionais Moçambicanos
          </h1>
          <p className="text-lg opacity-90 mb-8">
            Aceda a cursos de qualidade, pagáveis em M-Pesa e com certificados reconhecidos
          </p>
          <Input
            type="search"
            placeholder="Buscar cursos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-2xl text-black"
          />
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Sidebar - Filtros */}
        <aside className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Filtros</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Categorias */}
              <div>
                <h3 className="font-semibold mb-3">Categoria</h3>
                <div className="space-y-2">
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`w-full text-left px-3 py-2 rounded transition ${
                        selectedCategory === cat.id 
                          ? 'bg-blue-600 text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preço */}
              <div>
                <h3 className="font-semibold mb-3">Preço (MZN)</h3>
                <div className="space-y-2">
                  <input
                    type="range"
                    min="0"
                    max="1000"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-600">
                    Até MZN {priceRange[1]}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Cursos Grid */}
        <main className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredCourses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
          {filteredCourses.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>Nenhum curso encontrado</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

// ============================================
// 2. CARD DO CURSO
// ============================================

export const CourseCard = ({ course }) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition">
      {/* Imagem de Capa */}
      <div className="relative h-40 bg-gradient-to-br from-blue-400 to-blue-600 overflow-hidden group">
        <img 
          src={course.cover_image_url} 
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-105 transition"
        />
        {course.is_free && (
          <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded text-sm font-semibold">
            GRÁTIS
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Educador */}
        <p className="text-sm text-gray-600 mb-1">{course.educator_name}</p>

        {/* Título */}
        <h3 className="font-bold text-lg mb-2 line-clamp-2">
          {course.title}
        </h3>

        {/* Rating */}
        <div className="flex items-center gap-1 mb-3">
          <div className="flex text-yellow-400">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={16}
                fill={i < Math.floor(course.rating) ? 'currentColor' : 'none'}
              />
            ))}
          </div>
          <span className="text-sm text-gray-600">
            {course.rating?.toFixed(1)} ({course.review_count})
          </span>
        </div>

        {/* Info */}
        <div className="flex gap-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center gap-1">
            <Clock size={16} />
            <span>{course.duration_minutes}h</span>
          </div>
          <div className="flex items-center gap-1">
            <BookOpen size={16} />
            <span>{course.total_lessons} aulas</span>
          </div>
          <div className="flex items-center gap-1">
            <Users size={16} />
            <span>{course.student_count}</span>
          </div>
        </div>

        {/* Preço e Botão */}
        <div className="flex items-center justify-between">
          <div>
            {course.is_free ? (
              <span className="text-lg font-bold text-green-600">GRÁTIS</span>
            ) : (
              <span className="text-lg font-bold">MZN {course.price_mzn}</span>
            )}
          </div>
          <Button asChild>
            <a href={`/cursos/${course.id}`}>Ver Curso</a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================
// 3. DETALHES DO CURSO
// ============================================

export const CourseDetail = ({ courseId }) => {
  const [course, setCourse] = useState(null);
  const [enrolled, setEnrolled] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchCourse();
    checkEnrollment();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`/api/courses/${courseId}`);
      const data = await response.json();
      setCourse(data);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  const checkEnrollment = async () => {
    try {
      const response = await fetch(`/api/enrollments/check/${courseId}`);
      const { enrolled } = await response.json();
      setEnrolled(enrolled);
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  if (!course) return <div>Carregando...</div>;

  return (
    <div className="max-w-6xl mx-auto py-8">
      {/* Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Conteúdo Principal */}
        <div className="lg:col-span-2">
          <div className="relative h-96 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg overflow-hidden mb-6">
            <img 
              src={course.cover_image_url} 
              alt={course.title}
              className="w-full h-full object-cover"
            />
          </div>

          <h1 className="text-4xl font-bold mb-4">{course.title}</h1>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={20}
                  fill={i < Math.floor(course.rating) ? 'currentColor' : 'none'}
                  className="text-yellow-400"
                />
              ))}
            </div>
            <span className="text-lg">
              {course.rating?.toFixed(1)} • {course.review_count} avaliações • {course.student_count} alunos
            </span>
          </div>

          <p className="text-xl text-gray-600 mb-6">{course.description}</p>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">Visão Geral</TabsTrigger>
              <TabsTrigger value="curriculum">Programa</TabsTrigger>
              <TabsTrigger value="reviews">Avaliações</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-3 gap-4 my-6">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Clock className="mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold">{course.duration_minutes}h</p>
                    <p className="text-sm text-gray-600">Duração</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <BookOpen className="mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold">{course.total_lessons}</p>
                    <p className="text-sm text-gray-600">Aulas</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Users className="mx-auto mb-2 text-blue-600" />
                    <p className="text-2xl font-bold">{course.student_count}</p>
                    <p className="text-sm text-gray-600">Alunos</p>
                  </CardContent>
                </Card>
              </div>

              {/* O que vai aprender */}
              <div>
                <h3 className="font-bold text-lg mb-3">O que você vai aprender:</h3>
                <ul className="space-y-2">
                  {course.learning_objectives?.map((objective, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-green-600 font-bold">✓</span>
                      <span>{objective}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </TabsContent>

            <TabsContent value="curriculum">
              <div className="space-y-3 mt-6">
                {course.lessons?.map((lesson, i) => (
                  <Card key={lesson.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className="bg-blue-100 rounded-full w-10 h-10 flex items-center justify-center font-bold text-blue-600">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{lesson.title}</h4>
                          <p className="text-sm text-gray-600">{lesson.video_duration_seconds / 60}min</p>
                        </div>
                        {lesson.is_preview ? (
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            Prévia Grátis
                          </span>
                        ) : (
                          !enrolled && <Lock size={16} className="text-gray-400" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reviews">
              <div className="space-y-4 mt-6">
                {course.reviews?.map(review => (
                  <Card key={review.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between mb-2">
                        <div>
                          <p className="font-semibold">{review.student_name}</p>
                          <div className="flex text-yellow-400">
                            {[...Array(review.rating)].map((_, i) => (
                              <Star key={i} size={16} fill="currentColor" />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600">{new Date(review.created_at).toLocaleDateString('pt-PT')}</p>
                      </div>
                      <p>{review.review_text}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Inscrição */}
        <aside>
          <Card className="sticky top-4">
            <CardHeader>
              <div className="text-3xl font-bold">
                {course.is_free ? 'GRÁTIS' : `MZN ${course.price_mzn}`}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {enrolled ? (
                <Button className="w-full" asChild>
                  <a href={`/cursos/${courseId}/aulas`}>
                    Ir para o Curso
                  </a>
                </Button>
              ) : (
                <>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={() => setShowPaymentModal(true)}
                  >
                    {course.is_free ? 'Inscrever-se Grátis' : 'Inscrever-se Agora'}
                  </Button>
                  <p className="text-sm text-gray-600 text-center">
                    Acesso de por vida aos materiais
                  </p>
                  <Button variant="outline" className="w-full">
                    Partilhar Curso
                  </Button>
                </>
              )}

              {/* Educador */}
              <div className="border-t pt-4">
                <h4 className="font-semibold mb-2">Instrutor</h4>
                <div className="flex items-center gap-2">
                  <img 
                    src={course.educator_image}
                    alt={course.educator_name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div>
                    <p className="font-semibold">{course.educator_name}</p>
                    <p className="text-sm text-gray-600">{course.educator_title}</p>
                  </div>
                </div>
              </div>

              {/* Certificado */}
              <div className="bg-blue-50 p-3 rounded">
                <p className="text-sm">✓ Certificado digital ao final</p>
              </div>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <PaymentCheckout 
          courseId={courseId} 
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setEnrolled(true);
            setShowPaymentModal(false);
          }}
        />
      )}
    </div>
  );
};

// ============================================
// 4. CHECKOUT DE PAGAMENTO
// ============================================

export const PaymentCheckout = ({ courseId, onClose, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [loading, setLoading] = useState(false);
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [voucherCode, setVoucherCode] = useState('');

  const handlePayment = async () => {
    setLoading(true);
    try {
      const payload = {
        courseId,
        paymentMethod,
        ...(paymentMethod === 'mpesa' && { mpesaPhone }),
        ...(paymentMethod === 'voucher' && { voucherCode })
      };

      const response = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        if (paymentMethod === 'card') {
          window.location.href = data.sessionUrl;
        } else if (paymentMethod === 'voucher' || paymentMethod === 'mpesa') {
          onSuccess();
        }
      }
    } catch (error) {
      console.error('Erro:', error);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Escolha o Método de Pagamento</CardTitle>
          <CardDescription>Selecione como deseja pagar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* M-Pesa */}
          <div 
            onClick={() => setPaymentMethod('mpesa')}
            className={`p-4 border-2 rounded-lg cursor-pointer transition ${
              paymentMethod === 'mpesa' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <input type="radio" name="payment" checked={paymentMethod === 'mpesa'} readOnly className="mr-2" />
            <span className="font-semibold">M-Pesa</span>
            <p className="text-sm text-gray-600 mt-1">Pagamento instantâneo via M-Pesa</p>
            {paymentMethod === 'mpesa' && (
              <Input
                type="tel"
                placeholder="Número de telefone (ex: 844123456)"
                value={mpesaPhone}
                onChange={(e) => setMpesaPhone(e.target.value)}
                className="mt-3"
              />
            )}
          </div>

          {/* Cartão de Crédito */}
          <div 
            onClick={() => setPaymentMethod('card')}
            className={`p-4 border-2 rounded-lg cursor-pointer transition ${
              paymentMethod === 'card' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <input type="radio" name="payment" checked={paymentMethod === 'card'} readOnly className="mr-2" />
            <span className="font-semibold">Cartão de Crédito</span>
            <p className="text-sm text-gray-600 mt-1">Visa, Mastercard, Amex</p>
          </div>

          {/* Transferência Bancária */}
          <div 
            onClick={() => setPaymentMethod('bank_transfer')}
            className={`p-4 border-2 rounded-lg cursor-pointer transition ${
              paymentMethod === 'bank_transfer' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <input type="radio" name="payment" checked={paymentMethod === 'bank_transfer'} readOnly className="mr-2" />
            <span className="font-semibold">Transferência Bancária</span>
            <p className="text-sm text-gray-600 mt-1">Depósito direto no banco</p>
          </div>

          {/* Voucher */}
          <div 
            onClick={() => setPaymentMethod('voucher')}
            className={`p-4 border-2 rounded-lg cursor-pointer transition ${
              paymentMethod === 'voucher' ? 'border-blue-600 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <input type="radio" name="payment" checked={paymentMethod === 'voucher'} readOnly className="mr-2" />
            <span className="font-semibold">Voucher de Promoción</span>
            <p className="text-sm text-gray-600 mt-1">Código de desconto</p>
            {paymentMethod === 'voucher' && (
              <Input
                type="text"
                placeholder="Código do voucher"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                className="mt-3"
              />
            )}
          </div>
        </CardContent>

        <CardContent className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={handlePayment} disabled={loading} className="flex-1">
            {loading ? 'Processando...' : 'Pagar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseDiscovery;
