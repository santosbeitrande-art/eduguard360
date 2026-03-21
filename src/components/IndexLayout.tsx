import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FeatureCard from '@/components/FeatureCard';
import FAQ from '@/components/FAQ';
import AdminCredentials from '@/components/AdminCredentials';
import { Link } from 'react-router-dom';

const featureList = [
  { title: 'Controle de Acesso Inteligente', description: 'Sistema de entrada/saída com QR codes únicos para rastreamento completo de alunos.' },
  { title: 'Scanner QR Avançado', description: 'Leitura instantânea via câmera para identificação e registro automático de presença.' },
  { title: 'Gestão de Alunos Completa', description: 'Perfil detalhado de cada aluno com histórico de presença e incidentes.' },
  { title: 'Dashboard Executivo', description: 'Visão global com indicadores de presença, alertas e estatísticas em tempo real.' },
  { title: 'Gestão de Incidentes', description: 'Registro e classificação de ocorrências com foco em prevenção de riscos.' },
  { title: 'Relatórios Automatizados', description: 'Geração automática de relatórios PDF com análises e estatísticas mensais.' },
  { title: 'Análise Inteligente', description: 'Previsão de faltas e insights baseados em dados para tomada de decisões.' },
  { title: 'Portal Multiperfil Seguro', description: 'Acesso segmentado para administradores, segurança, professores e pais.' },
];

const IndexLayout: React.FC = () => (
  <div className='min-h-screen bg-slate-50 text-slate-900'>
    <Navbar />

    <section className='bg-gradient-to-r from-indigo-700 via-cyan-700 to-sky-600 text-white py-20'>
      <div className='mx-auto max-w-6xl px-6 lg:px-8'>
        <div className='grid gap-10 lg:grid-cols-2 lg:items-center'>
          <div>
            <p className='inline-flex rounded-full bg-white/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider'>EduGuard360 - Segurança Escolar Inteligente</p>
            <h1 className='mt-6 text-4xl font-bold sm:text-5xl'>Sistema Operativo de Segurança para Escolas</h1>
            <p className='mt-6 text-lg text-cyan-100'>Controle de acesso, monitorização de alunos, gestão de riscos e prevenção inteligente. Garanta a segurança física dos estudantes com tecnologia digital avançada.</p>
            <div className='mt-8 flex flex-wrap gap-4'>
              <Link to='/sistema' className='rounded-full bg-white px-8 py-3 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-cyan-100'>Acessar Sistema</Link>
              <a href='#recursos' className='rounded-full border border-white/75 px-8 py-3 text-sm font-semibold text-white hover:bg-white/15 transition'>Ver Recursos</a>
            </div>
          </div>
          <div className='rounded-3xl border border-white/20 bg-white/10 p-10 backdrop-blur-lg shadow-xl'>
            <h2 className='text-xl font-semibold'>Benefícios Principais</h2>
            <ul className='mt-4 text-sm text-cyan-50 space-y-2'>
              <li>• Rastreabilidade completa de movimentos dos alunos</li>
              <li>• Resposta rápida a incidentes e emergências</li>
              <li>• Transparência total para pais e gestores</li>
              <li>• Redução de riscos e prevenção de negligência</li>
              <li>• Relatórios auditáveis e conformidade</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <main className='mx-auto max-w-6xl px-6 py-16 lg:px-8'>
      <section id='recursos' className='space-y-8'>
        <h2 className='text-3xl font-bold'>Funcionalidades Principais</h2>
        <p className='text-slate-600'>EduGuard360 oferece um ecossistema completo de segurança escolar digital, focado em prevenção e resposta inteligente.</p>
        <div className='grid gap-6 sm:grid-cols-2 lg:grid-cols-4'>
          {featureList.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
        </div>
      </section>

      <FAQ />

      <AdminCredentials />

      <section id='contato' className='mt-16 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm'>
        <h2 className='text-3xl font-bold text-slate-900'>Implemente o EduGuard360 na sua escola</h2>
        <p className='mt-2 text-slate-600'>Junte-se às instituições de ensino que já confiam na nossa plataforma para garantir a segurança dos seus alunos.</p>
        <p className='mt-4 text-sm text-slate-500'>Para demonstrações e implementação, contacte-nos através do formulário acima ou visite <a href="https://eduguard360.co.mz" className="text-indigo-600 hover:underline">eduguard360.co.mz</a>.</p>
      </section>
    </main>

    <Footer />
  </div>
);

export default IndexLayout;
