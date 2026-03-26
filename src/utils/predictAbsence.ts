export function predictAbsence(attendance: any[]) {
  if (!attendance || attendance.length === 0) return "Sem dados";

  const faltas = attendance.filter(a => !a.exit_time);

  const taxa = (faltas.length / attendance.length) * 100;

  if (taxa > 50) return "🔴 Alto risco de faltas";
  if (taxa > 20) return "🟡 Risco médio";
  return "🟢 Presença normal";
}