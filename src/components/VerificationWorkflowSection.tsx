import { useLanguage } from "@/context/LanguageContext";

type WorkflowStep = {
  n: string;
  titlePt: string;
  titleEn: string;
  textPt: string;
  textEn: string;
};

const steps: WorkflowStep[] = [
  {
    n: "01",
    titlePt: "Understanding",
    titleEn: "Understanding",
    textPt: "A IA identifica o tipo de ficheiro, os documentos esperados e as verificações obrigatórias antes de iniciar a leitura.",
    textEn: "AI identifies the file type, expected documents, and required verifications before even reading."
  },
  {
    n: "02",
    titlePt: "Extraction",
    titleEn: "Extraction",
    textPt: "Leitura inteligente de contratos, faturas, IDs e documentos de suporte para captar os dados-chave.",
    textEn: "Intelligent reading of contracts, invoices, IDs, and supporting documents to capture key data."
  },
  {
    n: "03",
    titlePt: "Cross-validation",
    titleEn: "Cross-validation",
    textPt: "Checks automáticos de consistência entre montantes, identidades, datas e referências em vários documentos.",
    textEn: "Automatic consistency checks across amounts, identities, dates, and references between documents."
  },
  {
    n: "04",
    titlePt: "Verdict",
    titleEn: "Verdict",
    textPt: "Resultado claro: conforme, não conforme ou atenção requerida, enriquecido via APIs oficiais.",
    textEn: "Clear outcome: compliant, non-compliant, or attention required, enriched via official APIs."
  },
  {
    n: "05",
    titlePt: "Actions",
    titleEn: "Actions",
    textPt: "Notificação, atualização de CRM, geração de relatórios e follow-up automático em cada veredito.",
    textEn: "Notification, CRM update, report generation, and automatic follow-up for every verdict."
  }
];

export default function VerificationWorkflowSection() {
  const { language } = useLanguage();

  return (
    <section className="py-20 bg-[#0b2533]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.25em] text-[#7dd3fc] mb-3">
            {language === "pt" ? "Fluxo de validação" : "Validation flow"}
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
            {language === "pt"
              ? "Um processo claro, automático e acionável."
              : "A clear, automatic, and actionable process."}
          </h2>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {steps.map((step) => (
            <article
              key={step.n}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 hover:bg-white/10 transition"
            >
              <div className="text-2xl font-black text-[#7dd3fc]">{step.n}</div>
              <h3 className="mt-3 text-lg font-bold text-white">
                {language === "pt" ? step.titlePt : step.titleEn}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#c5d8e8]">
                {language === "pt" ? step.textPt : step.textEn}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
