// ============================================
// DASHBOARD DE EDUCADORES
// src/components/EducatorDashboard/
// ============================================

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, BarChart3, DollarSign, Users, TrendingUp } from 'lucide-react';

export const EducatorDashboard = () => {
  const [courses, setCourses] = useState([]);
  const [earnings, setEarnings] = useState(0);
  const [stats, setStats] = useState({
    totalStudents: 0,
    avgRating: 0,
    totalReviews: 0
  });
  const [showCreateCourse, setShowCreateCourse] = useState(false);

  useEffect(() => {
    fetchEducatorData();
  }, []);

  const fetchEducatorData = async () => {
    try {
      const [coursesRes, earningsRes, statsRes] = await Promise.all([
        fetch('/api/educator/courses'),
        fetch('/api/educator/earnings'),
        fetch('/api/educator/stats')
      ]);

      setCourses(await coursesRes.json());
      setEarnings(await earningsRes.json());
      setStats(await statsRes.json());
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Dashboard de Educador</h1>
              <p className="text-gray-600">Gerencie seus cursos e ganhos</p>
            </div>
            <Dialog open={showCreateCourse} onOpenChange={setShowCreateCourse}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Plus size={20} />
                  Criar Novo Curso
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <CreateCourseForm onSuccess={() => {
                  setShowCreateCourse(false);
                  fetchEducatorData();
                }} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Ganhos (MZN)"
            value={`${earnings.total_earned?.toFixed(0) || 0}`}
            icon={DollarSign}
            trend={earnings.monthly_growth}
          />
          <StatCard
            title="Total de Alunos"
            value={stats.totalStudents}
            icon={Users}
            trend="+12%"
          />
          <StatCard
            title="Classificação Média"
            value={stats.avgRating?.toFixed(1) || 'N/A'}
            icon={TrendingUp}
            trend={`${stats.totalReviews} avaliações`}
          />
          <StatCard
            title="Cursos Publicados"
            value={courses.filter(c => c.status === 'published').length}
            icon={BarChart3}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="courses" className="space-y-4">
          <TabsList>
            <TabsTrigger value="courses">Cursos</TabsTrigger>
            <TabsTrigger value="earnings">Ganhos</TabsTrigger>
            <TabsTrigger value="students">Alunos</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          {/* CURSOS */}
          <TabsContent value="courses">
            <div className="space-y-4">
              {courses.length === 0 ? (
                <Card>
                  <CardContent className="pt-12 text-center">
                    <p className="text-gray-500 mb-4">Nenhum curso criado ainda</p>
                    <Button onClick={() => setShowCreateCourse(true)}>
                      Criar Primeiro Curso
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                courses.map(course => (
                  <CourseManagementCard key={course.id} course={course} />
                ))
              )}
            </div>
          </TabsContent>

          {/* GANHOS */}
          <TabsContent value="earnings">
            <EarningsPanel earnings={earnings} />
          </TabsContent>

          {/* ALUNOS */}
          <TabsContent value="students">
            <StudentsPanel />
          </TabsContent>

          {/* CONFIGURAÇÕES */}
          <TabsContent value="settings">
            <EducatorSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTES SECUNDÁRIOS
// ============================================

const StatCard = ({ title, value, icon: Icon, trend }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-gray-600 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {trend && <p className="text-sm text-green-600 mt-1">{trend}</p>}
        </div>
        <Icon className="text-blue-600 w-8 h-8" />
      </div>
    </CardContent>
  </Card>
);

const CourseManagementCard = ({ course }) => {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle>{course.title}</CardTitle>
            <CardDescription className="mt-2">{course.description}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowEdit(true)}>
              <Edit2 size={16} />
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setShowDelete(true)}>
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div>
            <p className="text-sm text-gray-600">Status</p>
            <p className="font-semibold capitalize">{course.status}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Alunos</p>
            <p className="font-semibold">{course.student_count}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Classificação</p>
            <p className="font-semibold">{course.rating?.toFixed(1) || 'N/A'}/5</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Preço</p>
            <p className="font-semibold">MZN {course.price_mzn}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Ganhos</p>
            <p className="font-semibold text-green-600">MZN {(course.revenue || 0).toFixed(0)}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="outline" asChild>
            <a href={`/cursos/${course.id}`}>Ver Curso</a>
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={`/educator/courses/${course.id}/edit`}>Editar</a>
          </Button>
          <Button size="sm" variant="outline">
            Analytics
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const EarningsPanel = ({ earnings }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Ganho</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">MZN {earnings.total_earned?.toFixed(0) || 0}</p>
            <p className="text-sm text-gray-600 mt-2">Desde o início</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Disponível para Saque</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              MZN {earnings.available_for_withdrawal?.toFixed(0) || 0}
            </p>
            <Button className="w-full mt-4">Requisitar Saque</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Saques Anteriores</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">MZN {earnings.total_paid_out?.toFixed(0) || 0}</p>
            <p className="text-sm text-gray-600 mt-2">{earnings.payout_count || 0} transações</p>
          </CardContent>
        </Card>
      </div>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Ganhos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {earnings.transactions?.map(tx => (
              <div key={tx.id} className="flex justify-between items-center p-2 border-b">
                <div>
                  <p className="font-semibold">{tx.course_title}</p>
                  <p className="text-sm text-gray-600">{tx.student_name}</p>
                </div>
                <p className="font-bold text-green-600">+MZN {tx.amount_educator?.toFixed(0)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StudentsPanel = () => {
  const [students, setStudents] = useState([]);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await fetch('/api/educator/students');
      setStudents(await response.json());
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meus Alunos</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2">Nome</th>
                <th className="text-left px-4 py-2">Email</th>
                <th className="text-left px-4 py-2">Curso</th>
                <th className="text-left px-4 py-2">Progresso</th>
                <th className="text-left px-4 py-2">Data Inscrição</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{student.name}</td>
                  <td className="px-4 py-3">{student.email}</td>
                  <td className="px-4 py-3">{student.course_title}</td>
                  <td className="px-4 py-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${student.progress}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(student.enrollment_date).toLocaleDateString('pt-PT')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};

const EducatorSettings = () => {
  const [profile, setProfile] = useState({
    name: '',
    bio: '',
    professionalTitle: '',
    bankAccount: '',
    bankName: '',
    profileImage: ''
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurações de Perfil</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-semibold mb-2">Nome</label>
          <Input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Bio Profissional</label>
          <Textarea 
            value={profile.bio} 
            onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
            rows={4}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold mb-2">Título Profissional</label>
          <Input value={profile.professionalTitle} onChange={(e) => setProfile({ ...profile, professionalTitle: e.target.value })} />
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold mb-4">Dados Bancários</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-2">Número da Conta</label>
              <Input value={profile.bankAccount} onChange={(e) => setProfile({ ...profile, bankAccount: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Banco</label>
              <Input value={profile.bankName} onChange={(e) => setProfile({ ...profile, bankName: e.target.value })} />
            </div>
          </div>
        </div>

        <Button className="w-full">Guardar Alterações</Button>
      </CardContent>
    </Card>
  );
};

// ============================================
// CRIAR NOVO CURSO
// ============================================

export const CreateCourseForm = ({ onSuccess }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    level: 'beginner',
    price_mzn: 0,
    is_free: false,
    cover_image: null
  });

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
  };

  const handlePrevious = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    try {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  };

  return (
    <div>
      <DialogHeader>
        <DialogTitle>Criar Novo Curso</DialogTitle>
        <DialogDescription>
          Passo {step} de 4
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {step === 1 && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-2">Título do Curso</label>
              <Input 
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="ex: Introdução a Python"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Descrição</label>
              <Textarea 
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o que os alunos aprenderão"
                rows={4}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-semibold mb-2">Categoria</label>
              <select 
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Selecione uma categoria</option>
                <option value="tech">Tecnologia</option>
                <option value="business">Negócios</option>
                <option value="language">Idiomas</option>
                <option value="arts">Artes</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Nível</label>
              <select 
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="beginner">Iniciante</option>
                <option value="intermediate">Intermediário</option>
                <option value="advanced">Avançado</option>
              </select>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={formData.is_free}
                  onChange={(e) => setFormData({ ...formData, is_free: e.target.checked })}
                />
                <span className="font-semibold">Este curso é grátis?</span>
              </label>
            </div>
            {!formData.is_free && (
              <div>
                <label className="block text-sm font-semibold mb-2">Preço (MZN)</label>
                <Input 
                  type="number"
                  value={formData.price_mzn}
                  onChange={(e) => setFormData({ ...formData, price_mzn: parseFloat(e.target.value) })}
                  placeholder="0"
                />
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div>
            <label className="block text-sm font-semibold mb-2">Imagem de Capa</label>
            <div className="border-2 border-dashed rounded p-8 text-center">
              <input 
                type="file"
                accept="image/*"
                onChange={(e) => setFormData({ ...formData, cover_image: e.target.files?.[0] })}
              />
              <p className="text-sm text-gray-600 mt-2">1920x1080px recomendado</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-4 border-t">
        <Button variant="outline" onClick={handlePrevious} disabled={step === 1}>
          Anterior
        </Button>
        {step < 4 ? (
          <Button onClick={handleNext}>Próximo</Button>
        ) : (
          <Button onClick={handleSubmit}>Criar Curso</Button>
        )}
      </div>
    </div>
  );
};

export default EducatorDashboard;
