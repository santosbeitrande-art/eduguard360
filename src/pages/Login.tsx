import {useState} from "react"
import {login} from "@/hooks/useAuth"

export default function Login(){

const[email,setEmail]=useState("")
const[password,setPassword]=useState("")

const handleLogin=async()=>{

try{

await login(email,password)

alert("Login feito")

}catch(e){

alert("Erro login")

}

}

return(

<div className="flex h-screen items-center justify-center">

<div className="bg-white shadow p-8 rounded">

<h1 className="text-2xl mb-4">
Login
</h1>

<input
className="border p-2 w-full mb-2"
placeholder="email"
onChange={(e)=>setEmail(e.target.value)}
/>

<input
type="password"
className="border p-2 w-full mb-4"
placeholder="password"
onChange={(e)=>setPassword(e.target.value)}
/>

<button
className="bg-blue-600 text-white px-4 py-2 rounded"
onClick={handleLogin}
>
Entrar
</button>

</div>

</div>

)

}
