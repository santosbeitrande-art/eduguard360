import { useState } from "react";
import { QrReader } from "react-qr-reader";
import { supabase } from "@/lib/supabase";

const QRScanner = () => {
  const [lastScan, setLastScan] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);

  const school = JSON.parse(localStorage.getItem("school") || "null");

  const handleScan = async (result: any) => {
    if (!result?.text || loading) return;

    const code = result.text.trim();
    const now = Date.now();

    if (lastScan[code] && now - lastScan[code] < 3000) return;
    setLastScan((prev) => ({ ...prev, [code]: now }));

    try {
      setLoading(true);

      const { data: aluno } = await supabase
        .from("students")
        .select("*")
        .eq("qr_code", code)
        .eq("school_id", school?.id)
        .single();

      if (!aluno) {
        alert("Aluno não encontrado");
        return;
      }

      const { data: ultimo } = await supabase
        .from("attendance")
        .select("*")
        .eq("student_id", aluno.id)
        .order("checkin", { ascending: false })
        .limit(1)
        .single();

      if (!ultimo || ultimo.checkout) {
        await supabase.from("attendance").insert({
          student_id: aluno.id,
          school_id: school?.id,
          checkin: new Date().toISOString(),
        });
        alert("Entrada registada");
      } else {
        await supabase.from("attendance").update({ checkout: new Date().toISOString() }).eq("id", ultimo.id);
        alert("Saída registada");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao processar QR code. Verifique a conexão.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Scanner</h2>
        <p className="text-sm text-slate-600 mb-6">Aponte a câmera para o QR dos alunos para registrar entrada/saída.</p>

        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <QrReader
            constraints={{ facingMode: "environment" }}
            onResult={(result) => handleScan(result)}
          />

          {loading && <p className="mt-3 text-sm text-blue-600">Processando...</p>}
        </div>
      </div>
    </div>
  );
};

export default QRScanner;

