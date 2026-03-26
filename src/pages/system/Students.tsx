import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const Students = () => {
  const [students, setStudents] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [classroom, setClassroom] = useState("");

  const school = JSON.parse(localStorage.getItem("school") || "null");

  const fetchStudents = async () => {
    const { data } = await supabase
      .from("students")
      .select("*")
      .eq("school_id", school.id);

    setStudents(data || []);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleAdd = async () => {
    await supabase.from("students").insert({
      name,
      classroom,
      school_id: school.id,
      qr_code: "ALUNO" + Date.now(),
    });

    setName("");
    setClassroom("");
    fetchStudents();
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Alunos</h1>

      <input
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <input
        placeholder="Turma"
        value={classroom}
        onChange={(e) => setClassroom(e.target.value)}
      />

      <button onClick={handleAdd}>Adicionar</button>

      <ul>
        {students.map((s) => (
          <li key={s.id}>
            {s.name} - {s.classroom}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Students;