import { supabase } from "@/lib/supabase"

export async function login(email:string,password:string){

const {data,error}=await supabase.auth.signInWithPassword({
email,
password
})

if(error){
throw error
}

return data

}
