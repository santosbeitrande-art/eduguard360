import { Link } from "react-router-dom"

export default function Navbar() {

return(

<nav className="bg-blue-700 text-white p-4">

<div className="max-w-6xl mx-auto flex justify-between">

<h1 className="font-bold text-xl">
EduGuard360
</h1>

<div className="flex gap-4">

<Link to="/">Home</Link>
<Link to="/dashboard">Dashboard</Link>
<Link to="/students">Alunos</Link>
<Link to="/checkin">Entrada</Link>

</div>

</div>

</nav>

)

}
