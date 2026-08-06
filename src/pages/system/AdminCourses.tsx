import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle, Eye, Layers3, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { fetchWithTimeout } from '@/lib/networkPerformance';

type CourseStatus = 'draft' | 'published' | 'archived';
type DisciplineStatus = 'active' | 'archived';
type TurmaStatus = 'active' | 'inactive';

type CourseForm = {
  title: string;
  instructorId: string;
  price: string;
  description: string;
  contentText: string;
  status: CourseStatus;
  disciplineIds: string;
  turmaIds: string;
};

type DisciplineForm = {
  name: string;
  code: string;
  description: string;
  courseIds: string;
  status: DisciplineStatus;
};

type TurmaForm = {
  name: string;
  grade: string;
  shift: string;
  capacity: string;
  courseIds: string;
  status: TurmaStatus;
};

const emptyCourseForm: CourseForm = {
  title: '',
  instructorId: '',
  price: '',
  description: '',
  contentText: '',
  status: 'draft',
  disciplineIds: '',
  turmaIds: '',
};

const emptyDisciplineForm: DisciplineForm = {
  name: '',
  code: '',
  description: '',
  courseIds: '',
  status: 'active',
};

const emptyTurmaForm: TurmaForm = {
  name: '',
  grade: '',
  shift: 'Manhã',
  capacity: '',
  courseIds: '',
  status: 'active',
};

const splitList = (value: string) => value.split(',').map((item) => item.trim()).filter(Boolean);
const splitLines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);

const resolveStoredInstructorId = () => {
  for (const key of ['eduguard_user', 'currentUser', 'user']) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;

      const parsed = JSON.parse(raw);
      const normalizedType = String(parsed?.type || parsed?.role || parsed?.perfil || '').trim().toLowerCase();
      if (parsed?.id && normalizedType === 'educator') {
        return String(parsed.id);
      }
    } catch {
      continue;
    }
  }

  return '';
};

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [disciplines, setDisciplines] = useState<any[]>([]);
  const [turmas, setTurmas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'courses' | 'disciplines' | 'turmas'>('courses');
  const [publishingCourseId, setPublishingCourseId] = useState<string | null>(null);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingDisciplineId, setEditingDisciplineId] = useState<string | null>(null);
  const [editingTurmaId, setEditingTurmaId] = useState<string | null>(null);
  const [courseForm, setCourseForm] = useState<CourseForm>({ ...emptyCourseForm, instructorId: resolveStoredInstructorId() });
  const [disciplineForm, setDisciplineForm] = useState<DisciplineForm>(emptyDisciplineForm);
  const [turmaForm, setTurmaForm] = useState<TurmaForm>(emptyTurmaForm);
  const navigate = useNavigate();

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [coursesRes, disciplinesRes, turmasRes] = await Promise.all([
        fetchWithTimeout('/api/courses?status=all', undefined, 12000),
        fetchWithTimeout('/api/disciplines', undefined, 12000),
        fetchWithTimeout('/api/turmas', undefined, 12000),
      ]);

      if (!coursesRes.ok) throw new Error('Falha ao carregar cursos');
      if (!disciplinesRes.ok) throw new Error('Falha ao carregar disciplinas');
      if (!turmasRes.ok) throw new Error('Falha ao carregar turmas');

      const [coursesData, disciplinesData, turmasData] = await Promise.all([
        coursesRes.json(),
        disciplinesRes.json(),
        turmasRes.json(),
      ]);

      setCourses(Array.isArray(coursesData.courses) ? coursesData.courses : []);
      setDisciplines(Array.isArray(disciplinesData.disciplines) ? disciplinesData.disciplines : []);
      setTurmas(Array.isArray(turmasData.turmas) ? turmasData.turmas : []);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const courseMap = useMemo(() => new Map(courses.map((course) => [String(course.id), course])), [courses]);

  const resetCourseForm = () => {
    setEditingCourseId(null);
    setCourseForm({ ...emptyCourseForm, instructorId: resolveStoredInstructorId() });
  };

  const resetDisciplineForm = () => {
    setEditingDisciplineId(null);
    setDisciplineForm(emptyDisciplineForm);
  };

  const resetTurmaForm = () => {
    setEditingTurmaId(null);
    setTurmaForm(emptyTurmaForm);
  };

  const saveCourse = async () => {
    if (!courseForm.title.trim() || !courseForm.instructorId.trim() || !courseForm.price.trim()) {
      setError('Preencha título, instrutor e preço do curso.');
      return;
    }

    try {
      const body = {
        title: courseForm.title.trim(),
        instructorId: courseForm.instructorId.trim(),
        price: Number(courseForm.price),
        description: courseForm.description.trim(),
        content: splitLines(courseForm.contentText),
        status: courseForm.status,
        disciplineIds: splitList(courseForm.disciplineIds),
        turmaIds: splitList(courseForm.turmaIds),
      };

      const response = await fetchWithTimeout(
        editingCourseId ? `/api/courses/${editingCourseId}` : '/api/courses',
        {
          method: editingCourseId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        12000
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || 'Falha ao guardar curso');
      }

      resetCourseForm();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao guardar curso');
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!window.confirm('Remover este curso?')) return;

    try {
      const response = await fetchWithTimeout(`/api/courses/${courseId}`, { method: 'DELETE' }, 12000);
      if (!response.ok) throw new Error('Falha ao remover curso');
      await loadData();
      if (editingCourseId === courseId) resetCourseForm();
    } catch (err: any) {
      setError(err.message || 'Erro ao remover curso');
    }
  };

  const publishCourse = async (courseId: string) => {
    if (!window.confirm('Publicar este curso?')) return;
    if (publishingCourseId) return;
    setPublishingCourseId(courseId);
    try {
      const course = courseMap.get(String(courseId));
      const response = await fetchWithTimeout(
        `/api/courses/${courseId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: course?.title,
            price: course?.price,
            description: course?.description,
            status: 'published',
            instructorId: course?.instructorId,
            content: Array.isArray(course?.content) ? course.content : [],
            disciplineIds: Array.isArray(course?.disciplineIds) ? course.disciplineIds : [],
            turmaIds: Array.isArray(course?.turmaIds) ? course.turmaIds : [],
          }),
        },
        12000
      );

      if (!response.ok) throw new Error('Falha ao publicar');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao publicar curso');
    } finally {
      setPublishingCourseId(null);
    }
  };

  const editCourse = (course: any) => {
    setEditingCourseId(String(course.id));
    setCourseForm({
      title: course.title || '',
      instructorId: course.instructorId || '',
      price: String(course.price ?? ''),
      description: course.description || '',
      contentText: Array.isArray(course.content) ? course.content.join('\n') : '',
      status: course.status || 'draft',
      disciplineIds: Array.isArray(course.disciplineIds) ? course.disciplineIds.join(', ') : '',
      turmaIds: Array.isArray(course.turmaIds) ? course.turmaIds.join(', ') : '',
    });
    setActiveTab('courses');
  };

  const saveDiscipline = async () => {
    if (!disciplineForm.name.trim() || !disciplineForm.code.trim()) {
      setError('Preencha nome e código da disciplina.');
      return;
    }

    try {
      const response = await fetchWithTimeout(
        editingDisciplineId ? `/api/disciplines/${editingDisciplineId}` : '/api/disciplines',
        {
          method: editingDisciplineId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: disciplineForm.name.trim(),
            code: disciplineForm.code.trim(),
            description: disciplineForm.description.trim(),
            courseIds: splitList(disciplineForm.courseIds),
            status: disciplineForm.status,
          }),
        },
        12000
      );

      if (!response.ok) throw new Error('Falha ao guardar disciplina');
      resetDisciplineForm();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao guardar disciplina');
    }
  };

  const editDiscipline = (discipline: any) => {
    setEditingDisciplineId(String(discipline.id));
    setDisciplineForm({
      name: discipline.name || '',
      code: discipline.code || '',
      description: discipline.description || '',
      courseIds: Array.isArray(discipline.courseIds) ? discipline.courseIds.join(', ') : '',
      status: discipline.status || 'active',
    });
    setActiveTab('disciplines');
  };

  const deleteDiscipline = async (disciplineId: string) => {
    if (!window.confirm('Remover esta disciplina?')) return;
    try {
      const response = await fetchWithTimeout(`/api/disciplines/${disciplineId}`, { method: 'DELETE' }, 12000);
      if (!response.ok) throw new Error('Falha ao remover disciplina');
      if (editingDisciplineId === disciplineId) resetDisciplineForm();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao remover disciplina');
    }
  };

  const saveTurma = async () => {
    if (!turmaForm.name.trim() || !turmaForm.grade.trim()) {
      setError('Preencha nome e classe/turma.');
      return;
    }

    try {
      const response = await fetchWithTimeout(
        editingTurmaId ? `/api/turmas/${editingTurmaId}` : '/api/turmas',
        {
          method: editingTurmaId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: turmaForm.name.trim(),
            grade: turmaForm.grade.trim(),
            shift: turmaForm.shift.trim(),
            capacity: Number(turmaForm.capacity || 0),
            courseIds: splitList(turmaForm.courseIds),
            status: turmaForm.status,
          }),
        },
        12000
      );

      if (!response.ok) throw new Error('Falha ao guardar turma');
      resetTurmaForm();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao guardar turma');
    }
  };

  const editTurma = (turma: any) => {
    setEditingTurmaId(String(turma.id));
    setTurmaForm({
      name: turma.name || '',
      grade: turma.grade || '',
      shift: turma.shift || 'Manhã',
      capacity: String(turma.capacity ?? ''),
      courseIds: Array.isArray(turma.courseIds) ? turma.courseIds.join(', ') : '',
      status: turma.status || 'active',
    });
    setActiveTab('turmas');
  };

  const deleteTurma = async (turmaId: string) => {
    if (!window.confirm('Remover esta turma?')) return;
    try {
      const response = await fetchWithTimeout(`/api/turmas/${turmaId}`, { method: 'DELETE' }, 12000);
      if (!response.ok) throw new Error('Falha ao remover turma');
      if (editingTurmaId === turmaId) resetTurmaForm();
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Erro ao remover turma');
    }
  };

  const cards = [
    { label: 'Cursos', value: courses.length, icon: <BookOpen className="w-5 h-5" /> },
    { label: 'Disciplinas', value: disciplines.length, icon: <Layers3 className="w-5 h-5" /> },
    { label: 'Turmas', value: turmas.length, icon: <Users className="w-5 h-5" /> },
    { label: 'Publicados', value: courses.filter((course) => course.status === 'published').length, icon: <CheckCircle className="w-5 h-5" /> },
  ];

  const courseTitleById = (courseId: string) => courseMap.get(String(courseId))?.title || `Curso ${courseId}`;

  return (
    <div className="min-h-screen bg-[#07131f] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Gestão Curricular</h1>
            <p className="mt-1 text-sm text-slate-300">CRUD completo de cursos, disciplinas e turmas no mesmo fluxo.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={loadData} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15" disabled={loading}>
              <RefreshCw className="w-4 h-4" /> Atualizar
            </button>
            <button onClick={() => navigate('/admin')} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
              Voltar ao Admin
            </button>
          </div>
        </div>

        {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <div key={card.label} className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                {card.icon}
              </div>
              <p className="mt-3 text-sm text-slate-400">{card.label}</p>
              <p className="text-3xl font-black">{card.value}</p>
            </div>
          ))}
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Navegação do fluxo</h2>
              <p className="text-sm text-slate-300">Escolhe o tipo de registo que queres manter no mesmo painel.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveTab('courses')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === 'courses' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 hover:bg-white/15'}`}>
                Cursos
              </button>
              <button onClick={() => setActiveTab('disciplines')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === 'disciplines' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 hover:bg-white/15'}`}>
                Disciplinas
              </button>
              <button onClick={() => setActiveTab('turmas')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${activeTab === 'turmas' ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 hover:bg-white/15'}`}>
                Turmas
              </button>
            </div>
          </div>
        </section>

        {activeTab === 'courses' && (
          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{editingCourseId ? 'Editar Curso' : 'Criar Curso'}</h2>
                  <p className="text-sm text-slate-300">Título, conteúdo, estado e vínculos curriculares.</p>
                </div>
                {editingCourseId && (
                  <button onClick={resetCourseForm} className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">Cancelar</button>
                )}
              </div>

              <div className="mt-6 space-y-4">
                <input value={courseForm.title} onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })} placeholder="Título do curso" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                <input value={courseForm.instructorId} onChange={(e) => setCourseForm({ ...courseForm, instructorId: e.target.value })} placeholder="ID do instrutor" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                <div className="grid gap-4 md:grid-cols-2">
                  <input type="number" value={courseForm.price} onChange={(e) => setCourseForm({ ...courseForm, price: e.target.value })} placeholder="Preço" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                  <select value={courseForm.status} onChange={(e) => setCourseForm({ ...courseForm, status: e.target.value as CourseStatus })} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                    <option value="draft">Rascunho</option>
                    <option value="published">Publicado</option>
                    <option value="archived">Arquivado</option>
                  </select>
                </div>
                <textarea value={courseForm.description} onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })} placeholder="Descrição" rows={4} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                <textarea value={courseForm.contentText} onChange={(e) => setCourseForm({ ...courseForm, contentText: e.target.value })} placeholder="Conteúdo, uma lição por linha" rows={4} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                <input value={courseForm.disciplineIds} onChange={(e) => setCourseForm({ ...courseForm, disciplineIds: e.target.value })} placeholder="IDs de disciplinas separados por vírgula" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                <input value={courseForm.turmaIds} onChange={(e) => setCourseForm({ ...courseForm, turmaIds: e.target.value })} placeholder="IDs de turmas separados por vírgula" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />

                <div className="flex flex-wrap gap-2">
                  <button onClick={saveCourse} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
                    <Plus className="w-4 h-4" /> {editingCourseId ? 'Guardar Alterações' : 'Criar Curso'}
                  </button>
                  <button onClick={loadData} className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">Recarregar</button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Lista de Cursos</h2>
                  <p className="text-sm text-slate-300">Editar, publicar ou remover cursos existentes.</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{courses.length}</span>
              </div>

              <div className="mt-6 space-y-3 max-h-[34rem] overflow-auto pr-1">
                {loading ? (
                  <p className="text-slate-300">A carregar cursos...</p>
                ) : courses.length === 0 ? (
                  <p className="text-slate-400">Nenhum curso encontrado.</p>
                ) : (
                  courses.map((course) => (
                    <div key={course.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white">{course.title}</p>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-200">{course.status}</span>
                          </div>
                          <p className="text-sm text-slate-400">Instrutor: {course.instructorId} · Preço: MT {course.price}</p>
                          <p className="text-sm text-slate-400">{Array.isArray(course.content) ? course.content.length : 0} lição(ões) · {Array.isArray(course.disciplineIds) ? course.disciplineIds.length : 0} disciplina(s) · {Array.isArray(course.turmaIds) ? course.turmaIds.length : 0} turma(s)</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => editCourse(course)} className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">
                            <Eye className="w-4 h-4" /> Editar
                          </button>
                          <button onClick={() => publishCourse(course.id)} disabled={publishingCourseId === course.id} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">
                            <CheckCircle className="w-4 h-4" /> Publicar
                          </button>
                          <button onClick={() => deleteCourse(course.id)} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">
                            <Trash2 className="w-4 h-4" /> Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'disciplines' && (
          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{editingDisciplineId ? 'Editar Disciplina' : 'Criar Disciplina'}</h2>
                  <p className="text-sm text-slate-300">Disciplina real com vínculo opcional a cursos.</p>
                </div>
                {editingDisciplineId && <button onClick={resetDisciplineForm} className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">Cancelar</button>}
              </div>

              <div className="mt-6 space-y-4">
                <input value={disciplineForm.name} onChange={(e) => setDisciplineForm({ ...disciplineForm, name: e.target.value })} placeholder="Nome da disciplina" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                <input value={disciplineForm.code} onChange={(e) => setDisciplineForm({ ...disciplineForm, code: e.target.value })} placeholder="Código" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                <select value={disciplineForm.status} onChange={(e) => setDisciplineForm({ ...disciplineForm, status: e.target.value as DisciplineStatus })} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                  <option value="active">Ativa</option>
                  <option value="archived">Arquivada</option>
                </select>
                <textarea value={disciplineForm.description} onChange={(e) => setDisciplineForm({ ...disciplineForm, description: e.target.value })} placeholder="Descrição" rows={4} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                <input value={disciplineForm.courseIds} onChange={(e) => setDisciplineForm({ ...disciplineForm, courseIds: e.target.value })} placeholder="Cursos vinculados separados por vírgula" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                <div className="flex flex-wrap gap-2">
                  <button onClick={saveDiscipline} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
                    <Plus className="w-4 h-4" /> {editingDisciplineId ? 'Guardar Alterações' : 'Criar Disciplina'}
                  </button>
                  <button onClick={loadData} className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">Recarregar</button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Lista de Disciplinas</h2>
                  <p className="text-sm text-slate-300">Organização curricular por disciplina.</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{disciplines.length}</span>
              </div>

              <div className="mt-6 space-y-3 max-h-[34rem] overflow-auto pr-1">
                {loading ? (
                  <p className="text-slate-300">A carregar disciplinas...</p>
                ) : disciplines.length === 0 ? (
                  <p className="text-slate-400">Nenhuma disciplina encontrada.</p>
                ) : (
                  disciplines.map((discipline) => (
                    <div key={discipline.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white">{discipline.name}</p>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-200">{discipline.code}</span>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-200">{discipline.status}</span>
                          </div>
                          <p className="text-sm text-slate-400">{discipline.description || 'Sem descrição'}</p>
                          <p className="text-xs text-slate-500">Vínculos: {(discipline.courseIds || []).length} curso(s)</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => editDiscipline(discipline)} className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">Editar</button>
                          <button onClick={() => deleteDiscipline(discipline.id)} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">Remover</button>
                        </div>
                      </div>
                      {(discipline.courseIds || []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {discipline.courseIds.map((courseId: string) => (
                            <span key={`${discipline.id}-${courseId}`} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                              {courseTitleById(courseId)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'turmas' && (
          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">{editingTurmaId ? 'Editar Turma' : 'Criar Turma'}</h2>
                  <p className="text-sm text-slate-300">Turma real com nível, turno e capacidade.</p>
                </div>
                {editingTurmaId && <button onClick={resetTurmaForm} className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">Cancelar</button>}
              </div>

              <div className="mt-6 space-y-4">
                <input value={turmaForm.name} onChange={(e) => setTurmaForm({ ...turmaForm, name: e.target.value })} placeholder="Nome da turma" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                <input value={turmaForm.grade} onChange={(e) => setTurmaForm({ ...turmaForm, grade: e.target.value })} placeholder="Classe / ano" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                <div className="grid gap-4 md:grid-cols-2">
                  <input value={turmaForm.shift} onChange={(e) => setTurmaForm({ ...turmaForm, shift: e.target.value })} placeholder="Turno" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                  <input type="number" value={turmaForm.capacity} onChange={(e) => setTurmaForm({ ...turmaForm, capacity: e.target.value })} placeholder="Capacidade" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                </div>
                <select value={turmaForm.status} onChange={(e) => setTurmaForm({ ...turmaForm, status: e.target.value as TurmaStatus })} className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none">
                  <option value="active">Ativa</option>
                  <option value="inactive">Inativa</option>
                </select>
                <input value={turmaForm.courseIds} onChange={(e) => setTurmaForm({ ...turmaForm, courseIds: e.target.value })} placeholder="Cursos vinculados separados por vírgula" className="w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-white outline-none" />
                <div className="flex flex-wrap gap-2">
                  <button onClick={saveTurma} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
                    <Plus className="w-4 h-4" /> {editingTurmaId ? 'Guardar Alterações' : 'Criar Turma'}
                  </button>
                  <button onClick={loadData} className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/15">Recarregar</button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Lista de Turmas</h2>
                  <p className="text-sm text-slate-300">Consultas rápidas por turma e vínculos curriculares.</p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">{turmas.length}</span>
              </div>

              <div className="mt-6 space-y-3 max-h-[34rem] overflow-auto pr-1">
                {loading ? (
                  <p className="text-slate-300">A carregar turmas...</p>
                ) : turmas.length === 0 ? (
                  <p className="text-slate-400">Nenhuma turma encontrada.</p>
                ) : (
                  turmas.map((turma) => (
                    <div key={turma.id} className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-white">{turma.name}</p>
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-slate-200">{turma.status}</span>
                          </div>
                          <p className="text-sm text-slate-400">{turma.grade} · {turma.shift} · capacidade {turma.capacity}</p>
                          <p className="text-xs text-slate-500">Vínculos: {(turma.courseIds || []).length} curso(s)</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button onClick={() => editTurma(turma)} className="rounded-xl bg-white/10 px-3 py-2 text-sm hover:bg-white/15">Editar</button>
                          <button onClick={() => deleteTurma(turma.id)} className="rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">Remover</button>
                        </div>
                      </div>
                      {(turma.courseIds || []).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {turma.courseIds.map((courseId: string) => (
                            <span key={`${turma.id}-${courseId}`} className="rounded-full bg-white/5 px-3 py-1 text-xs text-slate-300">
                              {courseTitleById(courseId)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default AdminCourses;