import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { predictAbsence } from "@/utils/predictAbsence";

const AdminExecutiveDashboard = () => {
  const [stats, setStats] = useState({
    schools: 0,
    students: 0,
    entries: 0,
    mrr: 0,
    risco: ""
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: schools } = await supabase.from("schools").select("*");
    const { data: students } = await supabase.from("students").select("*");
    const { data: attendance } = await supabase.from("attendance").select("*");

    const mrr = schools
      ?.filter((s) => s.subscription_status === "active")
      .reduce((sum, s) => sum + (s.monthly_fee || 0), 0);

    const risco = predictAbsence(attendance || []);

    setStats({
      schools: schools?.length || 0,
      students: students?.length || 0,
      entries: attendance?.length || 0,
      mrr: mrr || 0,
      risco
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>📊 Dashboard Executivo EduGuard360</h1>

      <div style={{ display: "flex", gap: 20, marginTop: 20 }}>
        <Card title="🏫 Escolas" value={stats.schools} />
        <Card title="👨‍🎓 Alunos" value={stats.students} />
        <Card title="📍 Registos" value={stats.entries} />
        <Card title="💰 MRR" value={stats.mrr + " MZN"} />
      </div>

      <div style={{ marginTop: 30 }}>
        <h2>🤖 IA de Presença</h2>
        <div style={{ fontSize: 20 }}>{stats.risco}</div>
      </div>
    </div>
  );
};

const Card = ({ title, value }: any) => (
  <div
    style={{
      background: "linear-gradient(135deg, #1e293b, #0f172a)",
      color: "#fff",
      padding: 20,
      borderRadius: 12,
      minWidth: 200,
      boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
    }}
  >
    <div style={{ opacity: 0.7 }}>{title}</div>
    <h2>{value}</h2>
  </div>
);

export default AdminExecutiveDashboard;
