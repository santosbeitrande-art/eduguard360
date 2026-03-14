import { useEffect, useState } from "react"
import { supabase } from "../services/supabase"

interface School {
  id: string
  name: string
  email: string
  plan: string
  status: string
}

export default function AdminDashboard(){

const [schools,setSchools] = useState<School[]>([])

useEffect(()=>{
loadSchools()
},[])

async function loadSchools(){

const { data, error } = await supabase
.from("schools")
.select("*")

if(!error){
setSchools(data || [])
}

}

async function suspendSchool(id:string){

await supabase
.from("schools")
.update({ status:"suspended" })
.eq("id",id)

loadSchools()

}

return(

<div style={{padding:"40px"}}>

<h1>EduGuard360 Admin</h1>

<h3>Escolas registadas</h3>

<table border={1} cellPadding={10}>

<thead>

<tr>
<th>Escola</th>
<th>Email</th>
<th>Plano</th>
<th>Status</th>
<th>Ação</th>
</tr>

</thead>

<tbody>

{schools.map((school)=>(

<tr key={school.id}>

<td>{school.name}</td>
<td>{school.email}</td>
<td>{school.plan}</td>
<td>{school.status}</td>

<td>

<button
onClick={()=>suspendSchool(school.id)}
>
Suspender
</button>

</td>

</tr>

))}

</tbody>

</table>

</div>

)

}
