import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Eye } from 'lucide-react';

const AdminCourses: React.FC = () => {
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const loadDrafts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/courses?status=draft');
      if (!res.ok) throw new Error('Falha ao buscar cursos');
      const data = await res.json();
      setCourses(data.courses || []);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDrafts(); }, []);

  const publishCourse = async (courseId: string) => {
    if (!window.confirm('Publicar este curso?')) return;
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'published' }),
      });
      if (!res.ok) throw new Error('Falha ao publicar');
      await loadDrafts();
      alert('Curso publicado com sucesso');
    } catch (err: any) {
      alert(err.message || 'Erro ao publicar curso');
    }
  };

  return (
    <div className="min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Gerir Cursos (EduMarket)</h1>
          <div className="flex gap-2">
            <button onClick={loadDrafts} className="btn">Atualizar</button>
            <button onClick={() => navigate('/sistema')} className="btn">Voltar</button>
          </div>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded">{error}</div>}

        <div className="space-y-4">
          {loading && <div>Carregando rascunhos...</div>}
          {!loading && courses.length === 0 && <div className="text-gray-500">Nenhum curso em rascunho encontrado.</div>}

          {courses.map((c) => (
            <div key={c.id} className="p-4 bg-white/5 rounded-lg border border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="text-sm text-gray-400">Instrutor: {c.instructorId} • Preço: MT {c.price}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => navigate(`/edumarket/curso/${c.id}`)} className="inline-flex items-center gap-2 px-3 py-2 bg-slate-700 text-white rounded">
                  <Eye className="w-4 h-4" /> Ver
                </button>
                <button onClick={() => publishCourse(c.id)} className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded">
                  <CheckCircle className="w-4 h-4" /> Publicar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminCourses;
