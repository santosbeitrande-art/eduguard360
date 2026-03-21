import { useState } from "react";

export default function Payment() {

  const [phone, setPhone] = useState("");

  async function handlePayment() {

    await fetch("http://localhost:5000/api/mpesa", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        phone,
        amount: 500
      })
    });

    alert("Pedido enviado. Complete o pagamento no telemóvel.");
  }

  return (

    <div style={{ padding: 30 }}>

      <h2>Ativar EduGuard360</h2>

      <p>Plano mensal: 500 MZN</p>

      <input
        placeholder="84xxxxxxx"
        onChange={(e) => setPhone(e.target.value)}
      />

      <br /><br />

      <button onClick={handlePayment}>
        Pagar via M-Pesa
      </button>

    </div>
  );
}
