// PromoBar.tsx
// Versão limpa sem FAQ

import React from "react";

const PromoBar: React.FC = () => {
  return (
    <section className="py-6 bg-blue-600 text-white text-center">
      <div className="max-w-4xl mx-auto px-4">
        <h2 className="text-xl sm:text-2xl font-semibold">
          Eduguard360 — Sistema de Gestão Escolar
        </h2>

        <p className="text-sm sm:text-base mt-2">
          Controle de entrada, gestão de alunos e monitoramento escolar em tempo real.
        </p>
      </div>
    </section>
  );
};

export default PromoBar;