import {BrowserRouter,Routes,Route} from "react-router-dom"

import Home from "./pages/Home"
import Login from "./pages/Login"
import Dashboard from "./pages/Dashboard"
import Students from "./pages/Students"
import Checkin from "./pages/Checkin"

function App(){

return(

<BrowserRouter>

<Routes>

<Route path="/" element={<Home/>}/>
<Route path="/login" element={<Login/>}/>
<Route path="/dashboard" element={<Dashboard/>}/>
<Route path="/students" element={<Students/>}/>
<Route path="/checkin" element={<Checkin/>}/>

</Routes>

</BrowserRouter>

)

}

export default App
