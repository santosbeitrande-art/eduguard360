import {useEffect,useState} from "react"
import StudentCard from "@/components/StudentCard"
import {supabase} from "@/lib/supabase"

export default function Students(){

const[students,setStudents]=useState([])

useEffect(()=>{

loadStudents()

},[])

async function loadStudents(){

const{data}=await supabase
.from("students")
.select("*")

setStudents(data||[])

}

return(

<div className="p-10">

<h1 className="text-2xl mb-6">
Alunos
</h1>

<div className="grid grid-cols-3 gap-4">

{students.map((s:any)=>(

<StudentCard
key={s.id}
name={s.name}
classroom={s.classroom}
/>

))}

</div>

</div>

)

}
