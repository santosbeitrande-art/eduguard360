import { useState } from "react"
import { supabase } from "../services/supabase"

export default function Login(){

const [email,setEmail]=useState("")
const [password,setPassword]=useState("")

async function handleLogin(){

const {error} = await supabase.auth.signInWithPassword({
email,
password
})

if(error){

alert(error.message)

}else{

alert("Login realizado")

}

}

return(

<div className="flex justify-center mt-20">

<div className="bg-white shadow p-8 rounded">

<h2 className="text-2xl mb-4">
Login Escola
</h2>

<input
className="border p-2 mb-3 w-full"
placeholder="Email"
onChange={(e)=>setEmail(e.target.value)}
/>

<input
className="border p-2 mb-4 w-full"
type="password"
placeholder="Senha"
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
