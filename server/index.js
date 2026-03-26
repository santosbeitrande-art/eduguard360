import express from "express";
import cors from "cors";
import notifyRoutes from "./notify.js";
import emailRoutes from "./email.js";

const app = express();

app.use(cors());
app.use(express.json());

/**
 * 🔔 NOTIFICAÇÕES
 */
app.use("/api", notifyRoutes);

/**
 * 📧 EMAIL
 */
app.use("/api", emailRoutes);

/**
 * 💳 PAGAMENTO (simulação)
 */
app.post("/api/mpesa", async (req, res) => {
  console.log("💳 Pagamento recebido");
  res.send({ success: true });
});

app.listen(5000, () => {
  console.log("🚀 Backend rodando em http://localhost:5000");
});