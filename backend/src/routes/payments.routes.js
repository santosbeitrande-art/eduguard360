// ============================================
// API Routes - Sistema de Pagamentos
// Backend Express.js / Node.js
// ============================================

/**
 * PAYMENT SYSTEM
 * 
 * Suportado:
 * - M-Pesa (Moçambique)
 * - Cartão de Crédito (Stripe)
 * - Transferência Bancária
 * - Vouchers/Cupons
 */

// ============================================
// 1. ENDPOINTS DE PAGAMENTO
// ============================================

/**
 * POST /api/payments/create
 * Criar uma transação de pagamento
 * 
 * Body:
 * {
 *   courseId: UUID,
 *   amount: number (em MZN),
 *   paymentMethod: 'mpesa' | 'card' | 'bank_transfer' | 'voucher',
 *   mpesaPhone?: string,
 *   voucherCode?: string
 * }
 * 
 * Response: { transactionId, sessionUrl?, mpesaRequestId? }
 */
router.post('/payments/create', auth, async (req, res) => {
  try {
    const { courseId, amount, paymentMethod, mpesaPhone, voucherCode } = req.body;
    const userId = req.user.id;

    // Validar curso e preço
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ error: 'Curso não encontrado' });

    // Processar método de pagamento
    switch (paymentMethod) {
      case 'mpesa':
        return handleMpesaPayment(res, userId, courseId, amount, mpesaPhone);
      case 'card':
        return handleStripePayment(res, userId, courseId, amount);
      case 'bank_transfer':
        return handleBankTransfer(res, userId, courseId, amount);
      case 'voucher':
        return handleVoucherPayment(res, userId, courseId, voucherCode);
      default:
        res.status(400).json({ error: 'Método de pagamento inválido' });
    }
  } catch (error) {
    console.error('Payment creation error:', error);
    res.status(500).json({ error: 'Erro ao criar pagamento' });
  }
});

// ============================================
// 2. M-PESA INTEGRATION
// ============================================

/**
 * M-Pesa Implementation
 * Using Vodacom M-Pesa API
 */

const handleMpesaPayment = async (res, userId, courseId, amount, phoneNumber) => {
  try {
    // Formatar número de telefone (844123456 → 258844123456)
    const formattedPhone = phoneNumber.startsWith('258') 
      ? phoneNumber 
      : `258${phoneNumber.replace(/^0/, '')}`;

    // Chamada ao M-Pesa API
    const mpesaResponse = await axios.post(
      'https://api.sandbox.vm.vodacom.co.mz/v1/c2bpayment/singlestep',
      {
        input_Amount: amount,
        input_CustomerMSISDN: formattedPhone,
        input_ServiceProviderCode: process.env.MPESA_SERVICE_PROVIDER_CODE,
        input_ThirdPartyConversationID: `COURSE_${courseId}_${Date.now()}`,
        input_PurchasedItemsDesc: `Curso: ${courseId}`,
      },
      {
        headers: {
          'Authorization': `Bearer ${await getMpesaToken()}`,
          'Content-Type': 'application/json'
        }
      }
    );

    // Guardar transação em estado PENDING
    const transaction = await PaymentTransaction.create({
      userId,
      courseId,
      amount_mzn: amount,
      payment_method: 'mpesa',
      mpesa_transaction_id: mpesaResponse.data.output_ConversationID,
      status: 'pending',
      reference_number: mpesaResponse.data.output_ResponseCode
    });

    res.json({
      transactionId: transaction.id,
      mpesaRequestId: mpesaResponse.data.output_ConversationID,
      message: 'Verifique o seu telefone para confirmar o pagamento'
    });

  } catch (error) {
    console.error('M-Pesa error:', error);
    res.status(500).json({ error: 'Erro ao processar M-Pesa' });
  }
};

/**
 * M-Pesa Callback (Webhook)
 * POST /api/payments/mpesa-callback
 * Recebe confirmação do M-Pesa
 */
router.post('/payments/mpesa-callback', async (req, res) => {
  try {
    const { 
      output_ResponseCode,
      output_ConversationID,
      output_TransactionAmount,
      output_CustomerMSISDN 
    } = req.body;

    // Buscar transação original
    const transaction = await PaymentTransaction.findOne({
      mpesa_transaction_id: output_ConversationID
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transação não encontrada' });
    }

    // Verificar resposta M-Pesa
    if (output_ResponseCode === 'INS-0') {
      // Sucesso!
      transaction.status = 'completed';
      transaction.payment_date = new Date();
      await transaction.save();

      // Inscrever aluno no curso
      await CourseEnrollment.create({
        courseId: transaction.courseId,
        studentId: transaction.userId,
        enrollment_date: new Date()
      });

      // Enviar email de confirmação
      await sendConfirmationEmail(transaction.userId, transaction.courseId);

      // Notificar educador
      await createNotification(
        transaction.courseId, // educador_id
        'new_enrollment',
        `Novo aluno inscrito no seu curso!`
      );

    } else {
      // Falha no pagamento
      transaction.status = 'failed';
      transaction.updated_at = new Date();
      await transaction.save();
    }

    res.json({ status: 'success' });

  } catch (error) {
    console.error('M-Pesa callback error:', error);
    res.status(500).json({ error: 'Erro ao processar callback' });
  }
});

// ============================================
// 3. STRIPE INTEGRATION (Cartão de Crédito)
// ============================================

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const handleStripePayment = async (res, userId, courseId, amount) => {
  try {
    // Criar checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'mzn',
            product_data: {
              name: `Inscrição no Curso`,
              images: [`${process.env.APP_URL}/course-cover.jpg`],
            },
            unit_amount: Math.round(amount * 100), // Stripe usa centavos
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL}/payment/cancelled`,
      metadata: {
        userId,
        courseId,
        paymentType: 'course_enrollment'
      }
    });

    // Guardar transação em estado PENDING
    const transaction = await PaymentTransaction.create({
      userId,
      courseId,
      amount_mzn: amount,
      payment_method: 'card',
      stripe_charge_id: session.id,
      status: 'pending',
      reference_number: session.id
    });

    res.json({
      transactionId: transaction.id,
      sessionUrl: session.url,
      message: 'Redirecione para o Stripe'
    });

  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Erro ao processar Stripe' });
  }
};

/**
 * Verificar Status de Pagamento Stripe
 * GET /api/payments/stripe-status/:sessionId
 */
router.get('/payments/stripe-status/:sessionId', async (req, res) => {
  try {
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    
    if (session.payment_status === 'paid') {
      // Atualizar transação
      const transaction = await PaymentTransaction.findOne({
        stripe_charge_id: session.id
      });

      if (transaction) {
        transaction.status = 'completed';
        transaction.payment_date = new Date();
        await transaction.save();

        // Inscrever aluno
        await CourseEnrollment.create({
          courseId: transaction.courseId,
          studentId: transaction.userId
        });
      }

      res.json({ status: 'completed', success: true });
    } else {
      res.json({ status: 'pending', success: false });
    }

  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

// ============================================
// 4. TRANSFERÊNCIA BANCÁRIA
// ============================================

const handleBankTransfer = async (res, userId, courseId, amount) => {
  try {
    // Gerar referência de pagamento
    const reference = `BANK-${courseId.slice(0, 8)}-${Date.now()}`;

    // Criar transação em estado PENDING
    const transaction = await PaymentTransaction.create({
      userId,
      courseId,
      amount_mzn: amount,
      payment_method: 'bank_transfer',
      status: 'pending',
      reference_number: reference
    });

    res.json({
      transactionId: transaction.id,
      reference,
      bankDetails: {
        accountName: 'EduGuard360 SARL',
        accountNumber: process.env.BANK_ACCOUNT_NUMBER,
        bankName: 'Banco Standard Totta',
        swiftCode: 'BDMOMZMX',
        amount_mzn: amount
      },
      message: `Faça transferência para ${reference}`
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar transferência' });
  }
};

/**
 * Webhook para confirmação bancária (integração com banco)
 * POST /api/payments/bank-confirmation
 */
router.post('/payments/bank-confirmation', async (req, res) => {
  try {
    const { reference, amount, originAccount } = req.body;

    const transaction = await PaymentTransaction.findOne({
      reference_number: reference
    });

    if (transaction && Math.abs(transaction.amount_mzn - amount) < 1) {
      transaction.status = 'completed';
      transaction.payment_date = new Date();
      await transaction.save();

      await CourseEnrollment.create({
        courseId: transaction.courseId,
        studentId: transaction.userId
      });
    }

    res.json({ status: 'confirmed' });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao confirmar transferência' });
  }
});

// ============================================
// 5. SISTEMA DE VOUCHERS
// ============================================

/**
 * POST /api/payments/voucher-redeem
 */
const handleVoucherPayment = async (res, userId, courseId, voucherCode) => {
  try {
    const voucher = await Voucher.findOne({
      code: voucherCode.toUpperCase()
    });

    if (!voucher) {
      return res.status(404).json({ error: 'Voucher inválido' });
    }

    if (voucher.is_redeemed || voucher.expires_at < new Date()) {
      return res.status(400).json({ error: 'Voucher expirado ou já usado' });
    }

    // Marcar voucher como usado
    voucher.is_redeemed = true;
    voucher.redeemed_by = userId;
    voucher.redeemed_at = new Date();
    await voucher.save();

    // Criar transação (valor 0)
    const transaction = await PaymentTransaction.create({
      userId,
      courseId,
      amount_mzn: 0,
      amount_usd: 0,
      payment_method: 'voucher',
      status: 'completed',
      reference_number: voucherCode,
      payment_date: new Date()
    });

    // Inscrever imediatamente
    await CourseEnrollment.create({
      courseId,
      studentId: userId,
      enrollment_date: new Date()
    });

    res.json({
      transactionId: transaction.id,
      success: true,
      message: 'Acesso ao curso desbloqueado!'
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao resgatar voucher' });
  }
};

// ============================================
// 6. SAQUES DE EDUCADORES
// ============================================

/**
 * POST /api/payouts/request
 * Educador requisita saque de ganhos
 */
router.post('/payouts/request', auth, async (req, res) => {
  try {
    const { amount_mzn, bankAccountNumber, bankName } = req.body;
    const educatorId = req.user.id;

    // Validar que é educador
    const role = await UserRole.findOne({
      userId: educatorId,
      role: 'educator'
    });

    if (!role) {
      return res.status(403).json({ error: 'Apenas educadores podem solicitar saques' });
    }

    // Calcular ganhos
    const earnings = await getEducatorEarnings(educatorId);
    
    if (earnings.total_mzn < amount_mzn) {
      return res.status(400).json({ 
        error: 'Saldo insuficiente',
        available: earnings.total_mzn
      });
    }

    if (amount_mzn < 500) {
      return res.status(400).json({ 
        error: 'Valor mínimo de MZN 500' 
      });
    }

    // Criar pedido de saque
    const payout = await EducatorPayout.create({
      educator_id: educatorId,
      amount_requested_mzn: amount_mzn,
      bank_account_number: bankAccountNumber,
      bank_name: bankName,
      status: 'pending',
      requested_date: new Date()
    });

    res.json({
      payoutId: payout.id,
      status: 'pending',
      message: 'Saque solicitado. Será processado em 1-3 dias úteis'
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao solicitar saque' });
  }
});

/**
 * GET /api/payouts/earnings
 * Ver ganhos do educador
 */
router.get('/payouts/earnings', auth, async (req, res) => {
  try {
    const earnings = await getEducatorEarnings(req.user.id);
    
    res.json({
      totalEarned: earnings.total_mzn,
      totalPaidOut: earnings.paid_out_mzn,
      pendingPayout: earnings.pending_mzn,
      availableForWithdrawal: earnings.available_mzn,
      totalStudents: earnings.total_students,
      totalCourses: earnings.total_courses
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao calcular ganhos' });
  }
});

// ============================================
// 7. HELPER FUNCTIONS
// ============================================

async function getEducatorEarnings(educatorId) {
  const result = await db.query(`
    SELECT 
      COALESCE(SUM(pt.amount_mzn * 0.75), 0) as total_earned,
      COALESCE(SUM(CASE WHEN ep.status = 'completed' THEN ep.amount_requested_mzn ELSE 0 END), 0) as paid_out
    FROM courses c
    LEFT JOIN payment_transactions pt ON c.id = pt.course_id AND pt.status = 'completed'
    LEFT JOIN educator_payouts ep ON c.educator_id = ep.educator_id
    WHERE c.educator_id = $1
  `, [educatorId]);

  const row = result.rows[0];
  return {
    total_mzn: row.total_earned,
    paid_out_mzn: row.paid_out,
    pending_mzn: row.total_earned - row.paid_out,
    available_mzn: row.total_earned - row.paid_out
  };
}

async function getMpesaToken() {
  // Implementar OAuth2 token para M-Pesa
  // Cache token até expiração
  const cached = await redis.get('mpesa_token');
  if (cached) return cached;

  const response = await axios.post(
    'https://api.sandbox.vm.vodacom.co.mz/v1/oauth/authorize',
    {
      grant_type: 'client_credentials',
      client_id: process.env.MPESA_CLIENT_ID,
      client_secret: process.env.MPESA_CLIENT_SECRET
    }
  );

  const token = response.data.access_token;
  await redis.setex('mpesa_token', 3600, token); // Cache 1 hora
  return token;
}

async function sendConfirmationEmail(userId, courseId) {
  const user = await User.findById(userId);
  const course = await Course.findById(courseId);

  await emailService.send({
    to: user.email,
    subject: `✅ Inscrição confirmada: ${course.title}`,
    template: 'enrollment-confirmation',
    variables: {
      userName: user.name,
      courseName: course.title,
      accessUrl: `${process.env.APP_URL}/courses/${courseId}/lessons`
    }
  });
}

// ============================================
// 8. VARIÁVEIS DE AMBIENTE NECESSÁRIAS
// ============================================

/*
MPESA_SERVICE_PROVIDER_CODE=xxxxx
MPESA_CLIENT_ID=xxxxx
MPESA_CLIENT_SECRET=xxxxx

STRIPE_SECRET_KEY=sk_test_xxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxx

BANK_ACCOUNT_NUMBER=xxxxx
BANK_SWIFT_CODE=BDMOMZMX

REDIS_URL=redis://localhost:6379
*/

module.exports = router;
