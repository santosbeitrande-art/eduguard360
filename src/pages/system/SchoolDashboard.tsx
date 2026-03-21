import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const SchoolDashboard = () => {
  const [data, setData] = useState<any[]>([]);

  const school = JSON.parse(localStorage.getItem("school") || "null");

  const fetchData = async () => {
    const { data } = await supabase
      .from("attendance")
      .select("*, students(name, classroom)")
      .eq("school_id", school.id);

    setData(data || []);
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Painel</h1>

      <table border={1}>
        <thead>
          <tr>
            <th>Aluno</th>
            <th>Turma</th>
            <th>Entrada</th>
            <th>Saída</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item, i) => (
            <tr key={i}>
              <td>{item.students?.name}</td>
              <td>{item.students?.classroom}</td>
              <td>
                {item.checkin
                  ? new Date(item.checkin).toLocaleTimeString()
                  : ""}
              </td>
              <td>
                {item.checkout
                  ? new Date(item.checkout).toLocaleTimeString()
                  : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SchoolDashboard;
