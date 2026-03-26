<<<<<<< HEAD
import { supabase } from "@/services/supabase";

async function handleScan(studentId: string) {

const today = new Date().toISOString().split("T")[0];

const { data: existing } = await supabase
.from("attendance")
.select("*")
.eq("student_id", studentId)
.gte("checkin", today)
.single();

if (!existing) {

await supabase.from("attendance").insert({

student_id: studentId,
checkin: new Date()

});

alert("Entrada registada");

} else {

await supabase
.from("attendance")
.update({ checkout: new Date() })
.eq("id", existing.id);

alert("Saída registada");

}

}
=======
import { useState } from "react";
import { QrReader } from "react-qr-reader";
import { supabase } from "@/lib/supabase";

const QRScanner = () => {
  const [lastScan, setLastScan] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const school = JSON.parse(localStorage.getItem("school") || "null");

  const handleScan = async (result: any) => {
    if (!result?.text || loading) return;

    const code = result.text.trim();

    const now = Date.now();
    if (lastScan[code] && now - lastScan[code] < 3000) return;

    setLastScan((prev: any) => ({ ...prev, [code]: now }));

    try {
      setLoading(true);

      // 🔍 buscar aluno (COM ISOLAMENTO)
      const { data: aluno } = await supabase
        .from("students")
        .select("*")
        .eq("qr_code", code)
        .eq("school_id", school.id)
        .single();

      if (!aluno) {
        alert("Aluno não encontrado");
        setLoading(false);
        return;
      }

      // 🔍 último registo
      const { data: ultimo } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", aluno.id)
        .order("checkin", { ascending: false })
        .limit(1)
        .single();

      let tipo = "entrada";

      if (ultimo && !ultimo.checkout) {
        tipo = "saida";
      }

      // 📝 guardar
      if (tipo === "entrada") {
        await supabase.from("attendance").insert({
          student_id: aluno.id,
          school_id: school.id,
          checkin: new Date().toISOString(),
        });
      } else {
        await supabase
          .from("attendance")
          .update({ checkout: new Date().toISOString() })
          .eq("id", ultimo.id);
      }

      alert(tipo === "entrada" ? "Entrada registada" : "Saída registada");
    } catch (err) {
      console.error(err);
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Scanner</h2>

      <QrReader
        constraints={{ facingMode: "environment" }}
        onResult={(result) => handleScan(result)}
      />
    </div>
  );
};

export default QRScanner;
>>>>>>> 5a29b53 (primeiro deploy eduguard360)
