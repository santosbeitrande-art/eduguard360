import React, { useState } from 'react';
import { Upload, DollarSign, Save, X, AlertCircle } from 'lucide-react';

/**
 * Componente para Educadores criarem e gerarem cursos
 * Integrado com sistema de pagamentos M-Pesa
 */

export const EducatorCreateCourse: React.FC = () => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [course, setCourse] = useState({
    title: '',
    description: '',
    price: 0,
    level: 'Iniciante',
    duration: '',
    category: 'tecnologia',
    content: [] as string[],
    image: null as File | null,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'tecnologia', label: '💻 Tecnologia' },
    { value: 'negocio', label: '📊 Negócios' },
    { value: 'financeiro', label: '💰 Financeiro' },
    { value: 'criativo', label: '🎨 Criativo' },
    { value: 'agricultura', label: '🌾 Agricultura' },
    { value: 'idiomas', label: '🌍 Idiomas' },
  ];

  const levels = ['Iniciante', 'Intermediário', 'Avançado'];

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setCourse({ ...course, [name]: value });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setCourse({ ...course, image: e.target.files[0] });
    }
  };

  const validateStep = () => {
    setError('');

    if (step === 1) {
      if (!course.title || course.title.length < 5) {
        setError('Título deve ter pelo menos 5 caracteres');
        return false;
      }
      if (!course.description || course.description.length < 20) {
        setError('Descrição deve ter pelo menos 20 caracteres');
        return false;
      }
    }

    if (step === 2) {
      if (course.price <= 0) {
        setError('Preço deve ser maior que 0');
        return false;
      }
      if (course.price > 50000) {
        setError('Preço máximo é 50.000 MT');
        return false;
      }
      if (!course.duration) {
        setError('Duração é obrigatória');
        return false;
      }
    }

    if (step === 3) {
      if (course.content.length === 0) {
        setError('Adicione pelo menos uma lição');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep((step + 1) as 1 | 2 | 3 | 4);
    }
  };

  const handlePrevious = () => {
    setStep((step - 1) as 1 | 2 | 3 | 4);
  };

  const handleAddLesson = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const lesson = form.get('lesson') as string;

    if (lesson && lesson.length > 5) {
      setCourse({
        ...course,
        content: [...course.content, lesson],
      });
      (e.target as HTMLFormElement).reset();
    } else {
      setError('Lição deve ter pelo menos 5 caracteres');
    }
  };

  const handleRemoveLesson = (index: number) => {
    setCourse({
      ...course,
      content: course.content.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    try {
      // Simular criação de curso
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(course),
      });

      if (response.ok) {
        setSuccess('Curso criado com sucesso! 🎉');
        setCourse({
          title: '',
          description: '',
          price: 0,
          level: 'Iniciante',
          duration: '',
          category: 'tecnologia',
          content: [],
          image: null,
        });
        setStep(1);
      }
    } catch (err) {
      setError('Erro ao criar curso. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Criar Novo Curso</h1>
          <p className="text-gray-600">Comece a ganhar renda compartilhando seu conhecimento</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    step >= s
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
                >
                  {s}
                </div>
                <p className="text-xs mt-1 text-gray-600">
                  {['Info', 'Preço', 'Conteúdo', 'Review'][s - 1]}
                </p>
              </div>
            ))}
          </div>
          <div className="h-1 bg-gray-200 mt-4 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-600 transition-all"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-lg shadow-xl p-8">
          {/* Alerts */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-600 text-red-700 rounded">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 mr-2" />
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-600 text-green-700 rounded">
              <div className="flex items-center">
                <div className="w-5 h-5 mr-2">✓</div>
                {success}
              </div>
            </div>
          )}

          {/* Step 1: Informações Básicas */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Informações do Curso
              </h2>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Título do Curso
                </label>
                <input
                  type="text"
                  name="title"
                  value={course.title}
                  onChange={handleInputChange}
                  placeholder="Ex: Programação Web com React"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {course.title.length}/60 caracteres
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Descrição
                </label>
                <textarea
                  name="description"
                  value={course.description}
                  onChange={handleInputChange}
                  placeholder="Descreva o que os alunos vão aprender..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {course.description.length}/500 caracteres
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Categoria
                  </label>
                  <select
                    name="category"
                    value={course.category}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nível
                  </label>
                  <select
                    name="level"
                    value={course.level}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  >
                    {levels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Imagem do Curso
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-600 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="image-upload"
                  />
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      {course.image ? course.image.name : 'Clique para fazer upload'}
                    </p>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Preço e Duração */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Preço e Duração</h2>

              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <p className="text-sm text-blue-900">
                  💡 <strong>Dica:</strong> Cursos com preço entre 150-300 MT têm maior taxa de
                  conversão
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Preço do Curso (MT)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-gray-500 text-lg">MT</span>
                  <input
                    type="number"
                    name="price"
                    value={course.price}
                    onChange={handleInputChange}
                    placeholder="299"
                    min="0"
                    max="50000"
                    className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Você receberá: <strong>MT {course.price * 0.8}</strong> (80% após comissão da
                  plataforma)
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Duração do Curso
                </label>
                <input
                  type="text"
                  name="duration"
                  value={course.duration}
                  onChange={handleInputChange}
                  placeholder="Ex: 6 semanas"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Projeção de Ganhos</h3>
                <div className="space-y-1 text-sm text-green-800">
                  <p>
                    100 alunos = MT <strong>{course.price * 100 * 0.8}</strong>
                  </p>
                  <p>
                    500 alunos = MT <strong>{course.price * 500 * 0.8}</strong>
                  </p>
                  <p>
                    1000 alunos = MT <strong>{course.price * 1000 * 0.8}</strong>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Conteúdo */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Conteúdo do Curso</h2>

              <form onSubmit={handleAddLesson} className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Adicionar Lição
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      name="lesson"
                      placeholder="Ex: Introdução ao React"
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
                    />
                    <button
                      type="submit"
                      className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </form>

              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Lições ({course.content.length})
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {course.content.map((lesson, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                        <span className="text-gray-700">{lesson}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveLesson(index)}
                        className="text-red-600 hover:text-red-700 p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Revisar Curso</h2>

              <div className="bg-gray-50 rounded-lg p-6 space-y-4">
                <div className="border-b pb-4">
                  <p className="text-sm text-gray-600">Título</p>
                  <p className="font-semibold text-gray-900">{course.title}</p>
                </div>

                <div className="border-b pb-4">
                  <p className="text-sm text-gray-600">Descrição</p>
                  <p className="text-gray-800">{course.description}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                  <div>
                    <p className="text-sm text-gray-600">Categoria</p>
                    <p className="font-semibold text-gray-900">
                      {categories.find((c) => c.value === course.category)?.label}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Nível</p>
                    <p className="font-semibold text-gray-900">{course.level}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-b pb-4">
                  <div>
                    <p className="text-sm text-gray-600">Preço</p>
                    <p className="font-semibold text-indigo-600 text-lg">MT {course.price}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Seus Ganhos</p>
                    <p className="font-semibold text-green-600 text-lg">
                      MT {(course.price * 0.8).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="border-b pb-4">
                  <p className="text-sm text-gray-600">Duração</p>
                  <p className="font-semibold text-gray-900">{course.duration}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 mb-2">Lições ({course.content.length})</p>
                  <div className="space-y-1">
                    {course.content.map((lesson, index) => (
                      <p key={index} className="text-sm text-gray-800">
                        {index + 1}. {lesson}
                      </p>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-purple-900">
                  ✓ Seu curso será publicado em breve após revisão pela nossa equipe (24-48h)
                </p>
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex justify-between mt-8 pt-8 border-t">
            <button
              onClick={handlePrevious}
              disabled={step === 1}
              className={`px-6 py-3 rounded-lg font-semibold ${
                step === 1
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ← Anterior
            </button>

            {step < 4 ? (
              <button
                onClick={handleNext}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 font-semibold flex items-center gap-2"
              >
                Próximo →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`px-6 py-3 rounded-lg font-semibold flex items-center gap-2 ${
                  loading
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <Save className="w-5 h-5" />
                {loading ? 'Publicando...' : 'Publicar Curso'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EducatorCreateCourse;
