import QRScanner from "../components/QRScanner"
import { supabase } from "@/lib/supabase"

export default function Checkin(){

async function handleScan(data:string){

const { error } = await supabase
.from("attendance")
.insert({

student_id: data,
checkin: new Date()

})

if(error){

console.log(error)

}else{

alert("Entrada registada")

}

}

return(

<div className="flex flex-col items-center mt-20">

<h1 className="text-2xl mb-6">
Scanner de Entrada
</h1>

<QRScanner onScan={handleScan}/>

</div>

)

}
