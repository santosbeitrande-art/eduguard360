import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "teuemail@gmail.com", // ALTERAR
    pass: "SENHA_APP_GMAIL",    // ALTERAR
  },
});

router.post("/send-report", async (req, res) => {
  const { email, pdfBase64 } = req.body;

  try {
    await transporter.sendMail({
      from: "EduGuard360 <teuemail@gmail.com>",
      to: email,
      subject: "Relatório Diário de Presenças",
      text: "Segue o relatório em anexo.",
      attachments: [
        {
          filename: "relatorio.pdf",
          content: pdfBase64,
          encoding: "base64",
        },
      ],
    });

    res.send({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).send({ error: "Erro ao enviar email" });
  }
});

export default router;