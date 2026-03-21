import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const AdminGlobalDashboard = () => {
  const [schools, setSchools] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalStudents: 0,
    totalEntries: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: schoolsData } = await supabase
      .from("schools")
      .select("*");

    const { data: students } = await supabase
      .from("students")
      .select("*");

    const { data: attendance } = await supabase
      .from("attendance")
      .select("*");

    setSchools(schoolsData || []);

    setStats({
      totalSchools: schoolsData?.length || 0,
      totalStudents: students?.length || 0,
      totalEntries: attendance?.length || 0
    });
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>📊 Admin Global</h1>

      <div style={{ display: "flex", gap: 20 }}>
        <div>🏫 Escolas: {stats.totalSchools}</div>
        <div>👨‍🎓 Alunos: {stats.totalStudents}</div>
        <div>📍 Registos: {stats.totalEntries}</div>
      </div>

      <h2 style={{ marginTop: 30 }}>Escolas</h2>

      <ul>
        {schools.map((s) => (
          <li key={s.id}>{s.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default AdminGlobalDashboard;
