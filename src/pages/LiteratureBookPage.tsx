import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { LiteratureReader } from '@/components/LiteraturePortal';

export const LiteratureBookPage = () => {
  const { bookId } = useParams<{ bookId?: string }>();
  const navigate = useNavigate();

  if (!bookId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-xl w-full text-center bg-white rounded-3xl shadow-lg p-10">
          <h1 className="text-2xl font-bold mb-4">Livro não encontrado</h1>
          <p className="text-gray-600 mb-6">Escolha um livro a partir do portal de literatura.</p>
          <button onClick={() => navigate('/literatura')} className="btn btn-primary">
            Voltar ao Portal de Literatura
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/literatura')}
          className="mb-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-white hover:bg-slate-800 transition"
        >
          ← Voltar ao Portal de Literatura
        </button>
        <LiteratureReader bookId={bookId} />
      </div>
    </div>
  );
};

export default LiteratureBookPage;
