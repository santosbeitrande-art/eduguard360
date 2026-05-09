import express, { Request, Response } from 'express';
import nodemailer from 'nodemailer';

const router = express.Router();

// Tipos
interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'educator' | 'professional' | 'student';
  balance: number;
  rating: number;
  joinDate: Date;
}

interface Course {
  id: string;
  title: string;
  instructorId: string;
  price: number;
  description: string;
  content: string[];
  students: string[];
  rating: number;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
}

interface Transaction {
  id: string;
  userId: string;
  type: 'payment' | 'withdrawal' | 'refund';
  amount: number;
  method: 'mpesa' | 'bank' | 'card';
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
}

// Mock Database (em produção, usar MongoDB/PostgreSQL)
const users: Map<string, User> = new Map();
const courses: Map<string, Course> = new Map();
const transactions: Map<string, Transaction> = new Map();

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// ==================== AUTENTICAÇÃO ====================

/**
 * POST /api/auth/register
 * Registar novo utilizador
 */
router.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, type } = req.body;

    // Validar dados
    if (!name || !email || !phone || !type) {
      return res.status(400).json({ error: 'Campos obrigatórios: name, email, phone, type' });
    }

    if (!['educator', 'professional', 'student'].includes(type)) {
      return res.status(400).json({ error: 'Type deve ser: educator, professional ou student' });
    }

    // Verificar se utilizador já existe
    const existingUser = Array.from(users.values()).find((u) => u.email === email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email já registado' });
    }

    // Criar utilizador
    const userId = `user_${Date.now()}`;
    const newUser: User = {
      id: userId,
      name,
      email,
      phone,
      type,
      balance: 0,
      rating: 0,
      joinDate: new Date(),
    };

    users.set(userId, newUser);

    // Enviar email de boas-vindas
    await transporter.sendMail({
      to: email,
      subject: 'Bem-vindo ao EduMarket MZ',
      html: `
        <h1>Bem-vindo, ${name}!</h1>
        <p>Sua conta foi criada com sucesso.</p>
        <p>Tipo de conta: ${type}</p>
        <p>Comece a criar conteúdo e ganhe renda hoje!</p>
      `,
    });

    res.status(201).json({
      success: true,
      userId,
      message: 'Utilizador registado com sucesso',
      user: newUser,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registar utilizador' });
  }
});

/**
 * GET /api/users/:userId
 * Obter perfil do utilizador
 */
router.get('/users/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const user = users.get(userId);

    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter utilizador' });
  }
});

// ==================== CURSOS ====================

/**
 * POST /api/courses
 * Criar novo curso
 */
router.post('/courses', async (req: Request, res: Response) => {
  try {
    const { title, instructorId, price, description, content } = req.body;

    if (!title || !instructorId || !price) {
      return res.status(400).json({ error: 'Campos obrigatórios: title, instructorId, price' });
    }

    const instructor = users.get(instructorId);
    if (!instructor || instructor.type !== 'educator') {
      return res.status(400).json({ error: 'Apenas educadores podem criar cursos' });
    }

    const courseId = `course_${Date.now()}`;
    const newCourse: Course = {
      id: courseId,
      title,
      instructorId,
      price,
      description: description || '',
      content: content || [],
      students: [],
      rating: 0,
      status: 'draft',
      createdAt: new Date(),
    };

    courses.set(courseId, newCourse);

    res.status(201).json({
      success: true,
      courseId,
      message: 'Curso criado com sucesso',
      course: newCourse,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar curso' });
  }
});

/**
 * GET /api/courses
 * Listar cursos
 */
router.get('/courses', (req: Request, res: Response) => {
  try {
    const { category, status = 'published' } = req.query;
    let allCourses = Array.from(courses.values());

    if (status) {
      allCourses = allCourses.filter((c) => c.status === status);
    }

    res.json({
      total: allCourses.length,
      courses: allCourses,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar cursos' });
  }
});

/**
 * PUT /api/courses/:courseId
 * Atualizar curso
 */
router.put('/courses/:courseId', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { title, price, description, status } = req.body;

    const course = courses.get(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Atualizar campos
    if (title) course.title = title;
    if (price) course.price = price;
    if (description) course.description = description;
    if (status && ['draft', 'published', 'archived'].includes(status)) {
      course.status = status;
    }

    res.json({
      success: true,
      message: 'Curso atualizado com sucesso',
      course,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao atualizar curso' });
  }
});

/**
 * POST /api/courses/:courseId/enroll
 * Aluno inscrever-se num curso
 */
router.post('/courses/:courseId/enroll', async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const { studentId } = req.body;

    const course = courses.get(courseId);
    const student = users.get(studentId);

    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    if (!student) {
      return res.status(404).json({ error: 'Aluno não encontrado' });
    }

    if (course.students.includes(studentId)) {
      return res.status(400).json({ error: 'Aluno já inscrito neste curso' });
    }

    // Adicionar aluno
    course.students.push(studentId);

    // Processar pagamento
    const transaction: Transaction = {
      id: `tx_${Date.now()}`,
      userId: studentId,
      type: 'payment',
      amount: course.price,
      method: 'mpesa',
      status: 'completed',
      createdAt: new Date(),
    };

    transactions.set(transaction.id, transaction);

    // Creditar educador (80%)
    const instructor = users.get(course.instructorId);
    if (instructor) {
      instructor.balance += course.price * 0.8;
    }

    // Enviar confirmação
    await transporter.sendMail({
      to: student.email,
      subject: `Inscrição confirmada: ${course.title}`,
      html: `
        <h1>Parabéns!</h1>
        <p>Você se inscreveu com sucesso no curso: <strong>${course.title}</strong></p>
        <p>Preço: MT ${course.price}</p>
        <p>Acesse sua conta para começar a aprender.</p>
      `,
    });

    res.json({
      success: true,
      message: 'Inscrição realizada com sucesso',
      transaction,
      courseId,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao inscrever aluno' });
  }
});

// ==================== PAGAMENTOS ====================

/**
 * POST /api/payments/mpesa
 * Processar pagamento via M-Pesa
 */
router.post('/payments/mpesa', async (req: Request, res: Response) => {
  try {
    const { userId, phone, amount, reference } = req.body;

    if (!userId || !phone || !amount) {
      return res.status(400).json({
        error: 'Campos obrigatórios: userId, phone, amount',
      });
    }

    // Em produção: chamar API M-Pesa
    // const mpesaResponse = await mpesaAPI.checkout({
    //   phone,
    //   amount,
    //   reference
    // });

    const transaction: Transaction = {
      id: `tx_${Date.now()}`,
      userId,
      type: 'payment',
      amount,
      method: 'mpesa',
      status: 'pending',
      createdAt: new Date(),
    };

    transactions.set(transaction.id, transaction);

    res.json({
      success: true,
      message: 'Pedido de pagamento M-Pesa iniciado',
      transaction,
      instructions: `Verifique seu telefone ${phone} para confirmar o pagamento`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar pagamento' });
  }
});

/**
 * POST /api/payments/withdraw
 * Solicitar levantamento de fundos
 */
router.post('/payments/withdraw', async (req: Request, res: Response) => {
  try {
    const { userId, amount, method, bankAccount } = req.body;

    const user = users.get(userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilizador não encontrado' });
    }

    if (user.balance < amount) {
      return res.status(400).json({ error: 'Saldo insuficiente' });
    }

    if (amount < 1000) {
      return res.status(400).json({
        error: 'Valor mínimo de levantamento: 1000 MT',
      });
    }

    // Processar levantamento
    user.balance -= amount;

    const transaction: Transaction = {
      id: `tx_${Date.now()}`,
      userId,
      type: 'withdrawal',
      amount,
      method: method as 'mpesa' | 'bank' | 'card',
      status: 'pending',
      createdAt: new Date(),
    };

    transactions.set(transaction.id, transaction);

    // Notificar
    await transporter.sendMail({
      to: user.email,
      subject: 'Levantamento de fundos solicitado',
      html: `
        <h1>Levantamento de MT ${amount}</h1>
        <p>Seu levantamento foi solicitado com sucesso.</p>
        <p>Método: ${method}</p>
        <p>Status: Em processamento (1-3 dias úteis)</p>
      `,
    });

    res.json({
      success: true,
      message: 'Levantamento solicitado com sucesso',
      transaction,
      newBalance: user.balance,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar levantamento' });
  }
});

/**
 * GET /api/transactions/:userId
 * Histórico de transações do utilizador
 */
router.get('/transactions/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const userTransactions = Array.from(transactions.values()).filter(
      (t) => t.userId === userId
    );

    res.json({
      total: userTransactions.length,
      transactions: userTransactions.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      ),
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter transações' });
  }
});

// ==================== ESTATÍSTICAS ====================

/**
 * GET /api/analytics/educator/:userId
 * Dashboard do educador
 */
router.get('/analytics/educator/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const educatorCourses = Array.from(courses.values()).filter(
      (c) => c.instructorId === userId
    );

    const totalStudents = educatorCourses.reduce((sum, c) => sum + c.students.length, 0);

    const educatorTransactions = Array.from(transactions.values()).filter(
      (t) => t.userId === userId && t.type === 'payment'
    );

    const totalEarnings = educatorTransactions.reduce((sum, t) => sum + t.amount, 0);

    const user = users.get(userId);

    res.json({
      user,
      courses: educatorCourses.length,
      totalStudents,
      totalEarnings,
      currentBalance: user?.balance || 0,
      avgRating: user?.rating || 0,
      recentTransactions: Array.from(transactions.values())
        .filter((t) => t.userId === userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 10),
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter analytics' });
  }
});

/**
 * GET /api/platform/stats
 * Estatísticas gerais da plataforma
 */
router.get('/platform/stats', (req: Request, res: Response) => {
  try {
    const totalUsers = users.size;
    const educators = Array.from(users.values()).filter((u) => u.type === 'educator').length;
    const students = Array.from(users.values()).filter((u) => u.type === 'student').length;
    const totalCourses = courses.size;
    const totalTransactions = transactions.size;

    const totalVolume = Array.from(transactions.values())
      .filter((t) => t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);

    const platformRevenue = totalVolume * 0.15; // 15% comissão

    res.json({
      totalUsers,
      educators,
      students,
      totalCourses,
      totalTransactions,
      totalVolume,
      platformRevenue,
      avgCoursePrice:
        totalCourses > 0
          ? Array.from(courses.values()).reduce((sum, c) => sum + c.price, 0) / totalCourses
          : 0,
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao obter estatísticas' });
  }
});

// ==================== RATINGS & REVIEWS ====================

/**
 * POST /api/reviews
 * Deixar avaliação
 */
router.post('/reviews', async (req: Request, res: Response) => {
  try {
    const { courseId, studentId, rating, comment } = req.body;

    if (!courseId || !studentId || !rating) {
      return res.status(400).json({
        error: 'Campos obrigatórios: courseId, studentId, rating',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating deve estar entre 1 e 5' });
    }

    const course = courses.get(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Curso não encontrado' });
    }

    // Atualizar rating do curso (média simples)
    course.rating = (course.rating + rating) / 2;

    // Atualizar rating do educador
    const instructor = users.get(course.instructorId);
    if (instructor) {
      instructor.rating = (instructor.rating + rating) / 2;
    }

    res.json({
      success: true,
      message: 'Avaliação registada com sucesso',
      review: {
        id: `review_${Date.now()}`,
        courseId,
        studentId,
        rating,
        comment,
        createdAt: new Date(),
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao registar avaliação' });
  }
});

// ==================== HEALTH CHECK ====================

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date(),
    users: users.size,
    courses: courses.size,
    transactions: transactions.size,
  });
});

export default router;
