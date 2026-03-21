import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }: any) => {
  const school = JSON.parse(localStorage.getItem("school") || "null");

  if (!school) {
    return <Navigate to="/sistema/login" />;
  }

  if (!school.is_active) {
    return (
      <div style={{ padding: 40, textAlign: "center" }}>
        <h1>🚫 Escola bloqueada</h1>
        <p>Contacte o administrador</p>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
