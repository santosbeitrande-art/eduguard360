import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export default function AttendanceDashboard() {

  const [insideStudents, setInsideStudents] = useState<any[]>([]);
  const [todayEntries, setTodayEntries] = useState(0);
  const [todayExits, setTodayExits] = useState(0);

  async function loadData() {

    const today = new Date();
    today.setHours(0,0,0,0);

    const { data: inside } = await supabase
      .from("attendance")
      .select("*, students(name, classroom)")
      .is("exit_time", null);

    if (inside) {
      setInsideStudents(inside);
    }

    const { count: entries } = await supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .gte("entry_time", today.toISOString());

    if (entries) setTodayEntries(entries);

    const { count: exits } = await supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .gte("exit_time", today.toISOString());

    if (exits) setTodayExits(exits);
  }

  async function downloadReport() {

    const today = new Date();
    today.setHours(0,0,0,0);

    const { data } = await supabase
      .from("attendance")
      .select("*, students(name, classroom)")
      .gte("entry_time", today.toISOString());

    if (!data) return;

    const doc = new jsPDF();

    const todayStr = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.text("EduGuard360", 14, 20);

    doc.setFontSize(12);
    doc.text("Relatório Diário de Presenças", 14, 30);
    doc.text("Data: " + todayStr, 14, 36);

    const rows = data.map((item:any) => [

      item.students?.name || "",
      item.students?.classroom || "",
      new Date(item.entry_time).toLocaleTimeString(),
      item.exit_time
        ? new Date(item.exit_time).toLocaleTimeString()
        : "-"

    ]);

    autoTable(doc, {
      head: [["Aluno","Turma","Entrada","Saída"]],
      body: rows,
      startY: 45
    });

    doc.save("presencas_" + todayStr + ".pdf");
  }

  useEffect(() => {

    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 5000);

    return () => clearInterval(interval);

  }, []);

  return (

    <div style={{ padding: "30px" }}>

      <h1>Painel de Presenças</h1>

      <button
        onClick={downloadReport}
        style={{
          padding:"10px 20px",
          marginBottom:"20px",
          background:"#1677ff",
          color:"white",
          border:"none",
          borderRadius:"6px",
          cursor:"pointer"
        }}
      >
        Baixar Relatório Diário (PDF)
      </button>

      <div style={{ display:"flex", gap:"40px", marginBottom:"30px" }}>

        <div style={{ background:"#e6f7ff", padding:"20px", borderRadius:"8px" }}>
          <h2>Entradas hoje</h2>
          <h1>{todayEntries}</h1>
        </div>

        <div style={{ background:"#fff1f0", padding:"20px", borderRadius:"8px" }}>
          <h2>Saídas hoje</h2>
          <h1>{todayExits}</h1>
        </div>

        <div style={{ background:"#f6ffed", padding:"20px", borderRadius:"8px" }}>
          <h2>Alunos na escola</h2>
          <h1>{insideStudents.length}</h1>
        </div>

      </div>

      <h2>Alunos presentes</h2>

      <table style={{ width:"100%", borderCollapse:"collapse" }}>

        <thead>
          <tr style={{ background:"#fafafa" }}>
            <th style={{ padding:"10px", border:"1px solid #ddd" }}>Nome</th>
            <th style={{ padding:"10px", border:"1px solid #ddd" }}>Turma</th>
            <th style={{ padding:"10px", border:"1px solid #ddd" }}>Entrada</th>
          </tr>
        </thead>

        <tbody>

          {insideStudents.map((item:any) => (

            <tr key={item.id}>

              <td style={{ padding:"10px", border:"1px solid #ddd" }}>
                {item.students?.name}
              </td>

              <td style={{ padding:"10px", border:"1px solid #ddd" }}>
                {item.students?.classroom}
              </td>

              <td style={{ padding:"10px", border:"1px solid #ddd" }}>
                {new Date(item.entry_time).toLocaleTimeString()}
              </td>

            </tr>

          ))}

        </tbody>

      </table>

    </div>

  );
}
