import { useLanguage } from "@/context/LanguageContext";

type IntegrationTool = {
  name: string;
  logo: string;
};

const tools: IntegrationTool[] = [
  { name: "Salesforce", logo: "https://www.checkfile.ai/logos/salesforce.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "SAP", logo: "https://www.checkfile.ai/logos/sap.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Gmail", logo: "https://www.checkfile.ai/logos/gmail.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "SharePoint", logo: "https://www.checkfile.ai/logos/sharepoint.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Zapier", logo: "https://www.checkfile.ai/logos/zapier.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Notion", logo: "https://www.checkfile.ai/logos/notion.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "HubSpot", logo: "https://www.checkfile.ai/logos/hubspot.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Google Drive", logo: "https://www.checkfile.ai/logos/googledrive.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Slack", logo: "https://www.checkfile.ai/logos/slack.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Oracle NetSuite", logo: "https://www.checkfile.ai/logos/oracle.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "QuickBooks", logo: "https://www.checkfile.ai/logos/quickbooks.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "DocuSign", logo: "https://www.checkfile.ai/_next/image?url=%2Flogos%2Fdocusign.png&w=48&q=75&dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Dropbox", logo: "https://www.checkfile.ai/logos/dropbox.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Microsoft 365", logo: "https://www.checkfile.ai/logos/microsoft.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Airtable", logo: "https://www.checkfile.ai/logos/airtable.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Sage", logo: "https://www.checkfile.ai/logos/sage.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Make", logo: "https://www.checkfile.ai/logos/make.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Pennylane", logo: "https://www.checkfile.ai/_next/image?url=%2Flogos%2Fpennylane.png&w=48&q=75&dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Pipedrive", logo: "https://www.checkfile.ai/logos/pipedrive.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Google Workspace", logo: "https://www.checkfile.ai/logos/google.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Box", logo: "https://www.checkfile.ai/logos/box.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Cegid", logo: "https://www.checkfile.ai/logos/cegid.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "REST API", logo: "https://www.checkfile.ai/logos/restapi.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Webhooks", logo: "https://www.checkfile.ai/logos/webhooks.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" },
  { name: "Zoho", logo: "https://www.checkfile.ai/logos/zoho.svg?dpl=dpl_D8RfvPCQm3YLDjLrENT9NUgHvv1m" }
];

export default function IntegrationPartnersSection() {
  const { language } = useLanguage();

  return (
    <section className="py-20 bg-[#081923] border-y border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.25em] text-[#7dd3fc] mb-3">
            {language === "pt" ? "Integrações prontas" : "Ready integrations"}
          </p>
          <h2 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
            {language === "pt"
              ? "Conecta com ferramentas que a sua equipa já usa."
              : "Connects with tools your team already uses."}
          </h2>
          <p className="mt-4 text-lg text-[#b9d0e7]">
            {language === "pt"
              ? "Ligação nativa a CRMs, ferramentas de negócio e aplicações do dia a dia, com REST API e webhooks para automatizar o fluxo documental."
              : "Native connection to CRMs, business tools and everyday apps, with REST API and webhooks to automate document workflows."}
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur px-4 py-5 flex flex-col items-center justify-center text-center gap-3 hover:bg-white/10 transition"
            >
              <img
                src={tool.logo}
                alt={tool.name}
                className="h-9 w-9 object-contain"
                loading="lazy"
              />
              <span className="text-sm font-semibold text-white leading-tight">
                {tool.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
