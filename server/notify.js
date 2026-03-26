import express from "express";
import axios from "axios";

const router = express.Router();

router.post("/notify", async (req, res) => {

  const { phone, message } = req.body;

  console.log("Enviar mensagem para:", phone);
  console.log("Mensagem:", message);

  try {

    // Simulação de envio (por enquanto)
    // Aqui depois entrará a API do WhatsApp

    res.json({
      success: true,
      phone,
      message
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      error: "Erro ao enviar mensagem"
    });

  }

});

export default router;