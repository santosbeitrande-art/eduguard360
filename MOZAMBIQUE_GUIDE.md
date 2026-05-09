# EduMarket MZ - Guia Prático para Moçambique

## 🎯 Casos de Uso Reais

### Caso 1: João, Programador em Maputo

**Situação:**
- Trabalha em empresa de TI
- Tem 5 anos de experiência em React
- Quer ganhar renda extra

**Estratégia:**
1. Cria curso: "React para Iniciantes" por 250 MT
2. Grava 10 vídeos (30 minutos cada)
3. Primeiro mês: 50 alunos = 10,000 MT
4. Terceiro mês: 200 alunos = 40,000 MT
5. Renda recorrente (alunos novos continuam entrando)

**Ganho anual estimado:** 300,000 - 500,000 MT

---

### Caso 2: Marta, Empreendedora em Gaza

**Situação:**
- Donos de pequena loja
- Não sabe gerir finanças
- Quer crescer o negócio

**Estratégia:**
1. Contrata consultora de negócios via plataforma
2. Paga 50 MT/hora (consultoria)
3. 10 horas/semana de consultoria = 500 MT/semana
4. Renda mensal: 2,000 MT
5. Pode fazer com 5-10 clientes = 10,000-20,000 MT/mês

**Ganho anual estimado:** 120,000 - 240,000 MT

---

### Caso 3: Zena, Designers em Inhambane

**Situação:**
- Faz design gráfico freelancer
- Clientes esporádicos
- Quer estabilidade

**Estratégia 1 - Curso:**
- Cria: "Design Gráfico com Canva" por 179 MT
- 150 alunos/ano = 21,570 MT/ano

**Estratégia 2 - Serviços:**
- Oferece: "Design de Logos" por 100 MT/projeto
- 2-3 projetos/semana = 800-1200 MT/semana
- Renda mensal: 3,200-4,800 MT

**Ganho anual estimado:** 80,000 - 100,000 MT

---

## 📱 Integração M-Pesa Detalhada

### Setup M-Pesa em Moçambique

```typescript
import axios from 'axios';
import crypto from 'crypto';

class MPesaMozambique {
  private apiKey = process.env.MPESA_API_KEY;
  private apiSecret = process.env.MPESA_API_SECRET;
  private baseUrl = 'https://api.m-pesa.co.mz/v1';
  private merchant = 'EDUMARKET_MZ';

  /**
   * Iniciar pagamento C2B (Cliente para Empresa)
   * Cliente paga para EduMarket MZ
   */
  async initiatePayment(
    phoneNumber: string,
    amount: number,
    reference: string,
    description: string
  ) {
    try {
      const timestamp = Date.now();
      const signature = this.generateSignature(timestamp);

      const response = await axios.post(`${this.baseUrl}/checkout`, {
        merchant: this.merchant,
        phone: this.normalizePhone(phoneNumber),
        amount: Math.round(amount),
        reference: reference,
        description: description,
        timestamp: timestamp,
        signature: signature,
        callbackUrl: `${process.env.BASE_URL}/api/webhooks/mpesa/callback`,
        timeoutUrl: `${process.env.BASE_URL}/api/webhooks/mpesa/timeout`,
      });

      return {
        success: true,
        checkoutUrl: response.data.checkoutUrl,
        sessionId: response.data.sessionId,
      };
    } catch (error) {
      console.error('Erro M-Pesa C2B:', error);
      throw error;
    }
  }

  /**
   * Levantamento B2C (Empresa para Cliente)
   * EduMarket paga o educador via M-Pesa
   */
  async withdrawalPayment(
    phoneNumber: string,
    amount: number,
    reference: string,
    description: string
  ) {
    try {
      const timestamp = Date.now();
      const signature = this.generateSignature(timestamp);

      const response = await axios.post(`${this.baseUrl}/disbursement`, {
        merchant: this.merchant,
        phone: this.normalizePhone(phoneNumber),
        amount: Math.round(amount),
        reference: reference,
        description: description,
        timestamp: timestamp,
        signature: signature,
        callbackUrl: `${process.env.BASE_URL}/api/webhooks/mpesa/disbursement-callback`,
      });

      return {
        success: true,
        transactionId: response.data.transactionId,
        status: response.data.status,
      };
    } catch (error) {
      console.error('Erro M-Pesa B2C:', error);
      throw error;
    }
  }

  /**
   * Verificar status de transação
   */
  async checkTransactionStatus(sessionId: string) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/checkout/${sessionId}/status`,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
          },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      throw error;
    }
  }

  /**
   * Webhook de callback (M-Pesa notifica sobre resultado)
   */
  async handleCallback(payload: any) {
    const { sessionId, status, amount, phone, reference } = payload;

    if (status === 'completed') {
      // Atualizar transação como completa
      console.log(`Pagamento confirmado: ${reference} - ${amount} MT`);
      // Creditar aluno no curso, etc
    } else if (status === 'failed') {
      console.log(`Pagamento falhou: ${reference}`);
    }

    return { statusCode: 200 };
  }

  // Métodos auxiliares
  private normalizePhone(phone: string): string {
    // Remove caracteres especiais e formata
    let normalized = phone.replace(/\D/g, '');

    // Se começar com 258, está OK
    if (normalized.startsWith('258')) {
      return normalized;
    }

    // Se começar com 0, remover e adicionar 258
    if (normalized.startsWith('0')) {
      normalized = normalized.substring(1);
    }

    return `258${normalized}`;
  }

  private generateSignature(timestamp: number): string {
    const data = `${this.merchant}${timestamp}${this.apiSecret}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export default new MPesaMozambique();
```

### Backend Route para Pagamentos

```typescript
import express from 'express';
import mpesa from './mpesa-integration';

const router = express.Router();

/**
 * POST /api/payments/course-enrollment
 * Cliente compra um curso
 */
router.post('/payments/course-enrollment', async (req, res) => {
  try {
    const { courseId, studentId, coursePrice, studentPhone } = req.body;

    // Validar
    if (!courseId || !studentPhone || !coursePrice) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    // Iniciar pagamento M-Pesa
    const payment = await mpesa.initiatePayment(
      studentPhone,
      coursePrice,
      `COURSE-${courseId}`,
      `Inscrição: ${courseId}`
    );

    // Salvar transação como pendente
    const transaction = await saveTransaction({
      courseId,
      studentId,
      amount: coursePrice,
      status: 'pending',
      sessionId: payment.sessionId,
      phone: studentPhone,
    });

    res.json({
      success: true,
      checkoutUrl: payment.checkoutUrl,
      message: 'Redirecionando para M-Pesa...',
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar pagamento' });
  }
});

/**
 * POST /api/webhooks/mpesa/callback
 * M-Pesa chama este endpoint para confirmar pagamento
 */
router.post('/webhooks/mpesa/callback', async (req, res) => {
  try {
    const { sessionId, status, phone, reference } = req.body;

    if (status === 'completed') {
      // Buscar transação pendente
      const transaction = await getTransactionBySessionId(sessionId);

      if (transaction) {
        // Marcar como completa
        transaction.status = 'completed';
        transaction.completedAt = new Date();
        await transaction.save();

        // Inscrever aluno no curso
        const enrollment = await createEnrollment(
          transaction.courseId,
          transaction.studentId
        );

        // Creditar educador
        const course = await getCourse(transaction.courseId);
        const instructor = await getUser(course.instructorId);
        instructor.balance += transaction.amount * 0.8; // 80%
        await instructor.save();

        // Enviar confirmação via SMS
        await sendSMS(
          phone,
          `Parabéns! Seu pagamento foi confirmado. Acesse seu curso em EduMarket MZ`
        );
      }
    } else if (status === 'failed') {
      const transaction = await getTransactionBySessionId(sessionId);
      if (transaction) {
        transaction.status = 'failed';
        await transaction.save();

        // Enviar SMS de falha
        await sendSMS(
          phone,
          `O pagamento não foi confirmado. Por favor, tente novamente.`
        );
      }
    }

    // Sempre responder 200 ao M-Pesa
    res.json({ statusCode: 200 });
  } catch (error) {
    console.error('Erro no webhook M-Pesa:', error);
    res.json({ statusCode: 200 }); // Responder mesmo com erro
  }
});

/**
 * POST /api/payments/educator-withdrawal
 * Educador levanta seus ganhos
 */
router.post('/payments/educator-withdrawal', async (req, res) => {
  try {
    const { educatorId, amount } = req.body;

    const educator = await getUser(educatorId);

    if (!educator) {
      return res.status(404).json({ error: 'Educador não encontrado' });
    }

    if (educator.balance < amount) {
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    if (amount < 1000) {
      return res.status(400).json({
        error: 'Valor mínimo de levantamento: 1.000 MT',
      });
    }

    // Processar levantamento B2C via M-Pesa
    const withdrawal = await mpesa.withdrawalPayment(
      educator.phone,
      amount,
      `WITHDRAW-${educatorId}`,
      'Levantamento de ganhos EduMarket'
    );

    // Atualizar saldo (diminuir)
    educator.balance -= amount;
    await educator.save();

    // Registrar transação
    const transaction = await saveTransaction({
      educatorId,
      amount,
      type: 'withdrawal',
      status: 'pending',
      transactionId: withdrawal.transactionId,
    });

    res.json({
      success: true,
      message: `Levantamento de MT ${amount} iniciado`,
      transaction,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar levantamento' });
  }
});

/**
 * POST /api/webhooks/mpesa/disbursement-callback
 * M-Pesa confirma levantamento do educador
 */
router.post('/webhooks/mpesa/disbursement-callback', async (req, res) => {
  try {
    const { transactionId, status, phone, reference } = req.body;

    const transaction = await getTransactionByMpesaId(transactionId);

    if (transaction) {
      if (status === 'completed') {
        transaction.status = 'completed';
        transaction.completedAt = new Date();

        await sendSMS(
          phone,
          `Levantamento de MT ${transaction.amount} confirmado com sucesso!`
        );
      } else if (status === 'failed') {
        transaction.status = 'failed';

        // Reverter crédito
        const educator = await getUser(transaction.educatorId);
        educator.balance += transaction.amount;
        await educator.save();

        await sendSMS(phone, `Levantamento falhou. Seu saldo foi revertido.`);
      }

      await transaction.save();
    }

    res.json({ statusCode: 200 });
  } catch (error) {
    console.error('Erro no webhook de levantamento:', error);
    res.json({ statusCode: 200 });
  }
});

export default router;
```

---

## 💡 Dicas para Sucesso em Moçambique

### 1. Preços Competitivos
- Cursos: 100-300 MT (acessível mas lucrativo)
- Serviços: 30-100 MT/hora
- Evitar preços muito altos (mercado ainda em crescimento)

### 2. Conteúdo Local
- Exemplos em contexto moçambicano
- Casos de sucesso de negócios locais
- Problemas reais que educadores enfrentam

### 3. Suporte
- WhatsApp para dúvidas urgentes
- FAQ em Português
- Comunidade local no Facebook/Telegram

### 4. Marketing
- Facebook Ads (ativo em Moçambique)
- TikTok (crescimento rápido)
- Influenciadores locais
- Parcerias com escolas/universidades

### 5. Monetização Adicional
- Publicidade de produtos/serviços
- Certificados premium
- Cursos corporativos
- Mentoria 1-on-1

---

## 🎓 Exemplo de Curso Popular

### "Gestão de Pequenos Negócios" - 199 MT

**Conteúdo:**
1. Planejamento financeiro básico (30 min)
2. Como registar seu negócio (25 min)
3. Marketing para iniciantes (40 min)
4. Atendimento ao cliente (35 min)
5. Ferramentas gratuitas (20 min)

**Projeção:**
- Alvo: 200 alunos no primeiro ano
- Receita: 39,800 MT (80%)
- Esforço: 20 horas de conteúdo
- ROI: Excelente

---

## 📊 Métricas de Sucesso

Monitorar:
- Taxa de conversão (visualizações vs vendas)
- Avaliação média dos alunos
- Taxa de conclusão
- Lifetime value do aluno
- Churn rate

---

## ⚖️ Conformidade Legal

- Registar como freelancer/profissional independente
- Cumprir com impostos (verificar com Autoridade Tributária)
- Contrato claro com a plataforma
- PCCR (Proteção de Dados)

