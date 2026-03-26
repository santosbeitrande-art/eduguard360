<<<<<<< HEAD
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
=======
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";

const SystemLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    const { data } = await supabase
      .from("school_users")
      .select("*, schools(*)")
      .eq("email", email)
      .eq("password", password)
      .single();

    if (!data) {
      alert("Login inválido");
      return;
    }

    // 🔥 guardar school_id no local
    localStorage.setItem("school_id", data.school_id);
    localStorage.setItem("school", JSON.stringify(data.schools));

    navigate("/sistema/escola");
  };

  return (
    <div>
      <input onChange={(e) => setEmail(e.target.value)} />
      <input type="password" onChange={(e) => setPassword(e.target.value)} />
      <button onClick={handleLogin}>Entrar</button>
    </div>
  );
};

export default SystemLogin;
>>>>>>> 5a29b53 (primeiro deploy eduguard360)
