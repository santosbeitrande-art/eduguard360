import { BrowserRouter,Routes,Route } from "react-router-dom"
import AdminDashboard from "./pages/AdminDashboard"
import Home from "./pages/Index"

export default function App(){

return(

<BrowserRouter>

<Routes>

<Route path="/" element={<Home/>}/>
<Route path="/admin" element={<AdminDashboard/>}/>

</Routes>

</BrowserRouter>

)

}
