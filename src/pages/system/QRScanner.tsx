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
