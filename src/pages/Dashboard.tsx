import Navbar from "@/components/Navbar"

export default function Dashboard(){

return(

<div>

<Navbar/>

<div className="p-10">

<h1 className="text-3xl font-bold mb-6">
Dashboard
</h1>

<div className="grid grid-cols-3 gap-4">

<div className="bg-white p-6 shadow rounded">
Alunos
</div>

<div className="bg-white p-6 shadow rounded">
Entradas Hoje
</div>

<div className="bg-white p-6 shadow rounded">
Saídas Hoje
</div>

</div>

</div>

</div>

)

}
