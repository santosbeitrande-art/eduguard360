import QRScanner from "@/components/QRScanner"
import {supabase} from "@/integrations/supabase/client"

export default function Checkin(){

async function handleScan(data:string){

await supabase
.from("attendance")
.insert({

student_id:data,
entrada:new Date()

})

alert("Entrada registada")

}

return(

<div className="flex flex-col items-center mt-20">

<h1 className="text-2xl mb-6">
Scan QR do Aluno
</h1>

<QRScanner onScan={handleScan}/>

</div>

)

}
