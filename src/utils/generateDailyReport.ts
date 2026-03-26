import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export async function generateAndSendReport(data: any[]) {
  const doc = new jsPDF();

  const today = new Date().toLocaleDateString();

  doc.setFontSize(18);
  doc.text("EduGuard360", 14, 20);

  doc.setFontSize(12);
  doc.text("Relatório Diário de Presenças", 14, 30);
  doc.text("Data: " + today, 14, 36);

  const rows = data.map((item) => [
    item.students?.name || "",
    item.students?.classroom || "",
    item.checkin
      ? new Date(item.checkin).toLocaleTimeString()
      : "",
    item.checkout
      ? new Date(item.checkout).toLocaleTimeString()
      : "",
  ]);

  autoTable(doc, {
    head: [["Aluno", "Turma", "Entrada", "Saída"]],
    body: rows,
    startY: 45,
  });

  const pdfBase64 = doc.output("datauristring").split(",")[1];

  await fetch("http://localhost:5000/api/send-report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: "escola@email.com", // ALTERAR
      pdfBase64,
    }),
  });
}