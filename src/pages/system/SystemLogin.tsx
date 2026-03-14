import { supabase } from "@/services/supabase"
import { useNavigate } from "react-router-dom"

const navigate = useNavigate()

async function handleLogin(email:string,password:string){

const { data, error } = await supabase.auth.signInWithPassword({
email,
password
})

if(error){
alert(error.message)
return
}

const userId = data.user?.id

const { data:user } = await supabase
.from("users")
.select("*")
.eq("auth_id",userId)
.single()

if(!user) return

if(user.role === "super_admin"){

navigate("/sistema/admin")

}

if(user.role === "school_admin"){

navigate("/sistema/escola")

}

if(user.role === "parent"){

navigate("/sistema/pais")

}

if(user.role === "security"){

navigate("/sistema/scanner")

}

}
