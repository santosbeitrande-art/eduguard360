interface Props{
name:string
classroom:string
}

export default function StudentCard({name,classroom}:Props){

return(

<div className="bg-white shadow p-4 rounded">

<h2 className="font-bold">
{name}
</h2>

<p className="text-gray-600">
Turma: {classroom}
</p>

</div>

)

}
