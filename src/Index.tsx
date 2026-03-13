import React from "react"
import Header from "@/components/Header"
import Hero from "@/components/Hero"
import Footer from "@/components/Footer"

const Index: React.FC = () => {

return (

<div>

<Header/>

<Hero/>

<div className="p-10 text-center">

<h1 className="text-4xl font-bold">
EduGuard360
</h1>

<p className="mt-4">
Plataforma de segurança escolar
</p>

</div>

<Footer/>

</div>

)

}

export default Index
