# GUIA DE IMPLEMENTAÇÃO COMPLETO
## Plataforma de Educação EduGuard 360

---

## 📋 ÍNDICE EXECUTIVO

Este documento descreve como implementar completamente a plataforma de cursos online com:
- ✅ Circuito de cursos completo
- ✅ Sistema de onboarding de educadores
- ✅ Pagamentos (M-Pesa, Cartão, Transferência Bancária)
- ✅ Portal de Literatura Aberta
- ✅ Dashboard de educadores
- ✅ Gestão de alunos e certificações

**Tempo estimado**: 8-12 semanas de desenvolvimento
**Equipa recomendada**: 2-3 frontend devs + 2-3 backend devs + 1 DevOps

---

## FASE 1: SETUP INICIAL (Semana 1)

### 1.1 Configurar Base de Dados

```bash
# Supabase Setup
1. Criar projeto em supabase.com
2. Copiar CONNECTION_STRING
3. Executar SQL schema (database_schema_education.sql)

# Criar extensões necessárias
psql "postgresql://" << EOF
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
EOF
```

### 1.2 Variáveis de Ambiente

```bash
# .env.local

# DATABASE
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_KEY=xxxxx

# PAGAMENTOS
VITE_STRIPE_PUBLISHABLE=pk_test_xxxxx
STRIPE_SECRET_KEY=sk_test_xxxxx

MPESA_SERVICE_PROVIDER_CODE=xxxxx
MPESA_CLIENT_ID=xxxxx
MPESA_CLIENT_SECRET=xxxxx

# BANCO
BANK_ACCOUNT_NUMBER=xxxxx
BANK_SWIFT_CODE=BDMOMZMX

# ARMAZENAMENTO
AWS_S3_BUCKET=eduguard360-videos
AWS_REGION=us-east-1
AWS_ACCESS_KEY=xxxxx
AWS_SECRET_KEY=xxxxx

# EMAIL
SENDGRID_API_KEY=xxxxx

# APP
VITE_APP_URL=http://localhost:5173
```

### 1.3 Instalar Dependências

```bash
# Frontend
npm install \
  @stripe/react-stripe-js @stripe/js \
  axios react-query zustand \
  react-dropzone file-saver

# Backend
npm install \
  express stripe axios redis \
  nodemailer multer cloudinary \
  jsonwebtoken bcrypt
```

---

## FASE 2: AUTENTICAÇÃO & PERFIS (Semana 2)

### 2.1 Sistema de Roles

```typescript
// src/contexts/AuthContext.tsx

export interface User {
  id: string;
  email: string;
  name: string;
  roles: UserRole[];
  profile: UserProfile;
}

export interface UserRole {
  role: 'student' | 'educator' | 'admin' | 'institutional';
  verified_at?: string;
  verification_documents?: string[];
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const hasRole = (role: string) => user?.roles.some(r => r.role === role);

  return (
    <AuthContext.Provider value={{ user, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 2.2 Fluxo de Onboarding de Educador

```typescript
// pages/OnboardEducator.tsx

export const OnboardEducator = () => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: 'Qual é a sua especialidade?',
      fields: ['expertise', 'yearsExperience', 'credentials']
    },
    {
      title: 'Verifique suas qualificações',
      fields: ['diplomaUrl', 'certificateUrl']
    },
    {
      title: 'Dados Bancários',
      fields: ['bankAccount', 'bankName', 'accountHolder']
    },
    {
      title: 'Bio Profissional',
      fields: ['bio', 'socialLinks', 'profileImage']
    }
  ];

  return (
    <div>
      {step < steps.length ? (
        <div>
          <h2>{steps[step].title}</h2>
          {/* Form com campos */}
          <Button onClick={() => setStep(step + 1)}>Próximo</Button>
        </div>
      ) : (
        <div>
          <p>✓ Sua candidatura foi submetida!</p>
          <p>Será aprovada em 24-48 horas</p>
        </div>
      )}
    </div>
  );
};
```

---

## FASE 3: CIRCUITO DE CURSOS (Semana 3-4)

### 3.1 Estrutura de Aulas

```typescript
// API: POST /api/courses

interface Course {
  id: string;
  educator_id: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  cover_image_url: string;
  price_mzn: number;
  lessons: Lesson[];
  assessments: Assessment[];
  status: 'draft' | 'published' | 'archived';
  created_at: timestamp;
}

interface Lesson {
  id: string;
  course_id: string;
  title: string;
  video_url: string; // URL HLS no S3
  duration_seconds: number;
  materials_url: string[]; // PDFs
  order_index: number;
  is_preview: boolean;
}

interface Assessment {
  id: string;
  course_id: string;
  type: 'quiz' | 'assignment' | 'project';
  title: string;
  questions: Question[];
  pass_percentage: number;
}
```

### 3.2 Upload de Vídeos para S3

```typescript
// utils/videoUpload.ts

export const uploadVideoToS3 = async (file: File, courseId: string) => {
  const chunkSize = 5 * 1024 * 1024; // 5MB chunks
  const chunks = Math.ceil(file.size / chunkSize);

  for (let i = 0; i < chunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('chunk', chunk);
    formData.append('chunkIndex', i.toString());
    formData.append('totalChunks', chunks.toString());
    formData.append('courseId', courseId);

    await fetch('/api/upload/video-chunk', {
      method: 'POST',
      body: formData
    });
  }

  // Trigger video processing (encode to HLS)
  await fetch('/api/upload/process-video', {
    method: 'POST',
    body: JSON.stringify({ courseId })
  });
};
```

### 3.3 Visualizador de Aulas

```typescript
// components/LessonViewer.tsx

export const LessonViewer = ({ lessonId, courseId }) => {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [watchedTime, setWatchedTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    // Auto-save watched time
    const interval = setInterval(() => {
      if (videoRef.current) {
        setWatchedTime(videoRef.current.currentTime);
        saveProgress();
      }
    }, 10000); // A cada 10 segundos

    return () => clearInterval(interval);
  }, []);

  const saveProgress = async () => {
    await fetch('/api/progress/update', {
      method: 'POST',
      body: JSON.stringify({
        lessonId,
        timeWatched: watchedTime,
        videoRef.current?.duration
      })
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Vídeo */}
      <div className="lg:col-span-3">
        <video
          ref={videoRef}
          src={lesson?.video_url}
          controls
          className="w-full"
        />
      </div>

      {/* Materiais e Chat */}
      <aside>
        <Tabs defaultValue="materials">
          <TabsList>
            <TabsTrigger value="materials">Materiais</TabsTrigger>
            <TabsTrigger value="chat">Chat</TabsTrigger>
          </TabsList>

          <TabsContent value="materials">
            {lesson?.materials_url.map(url => (
              <Button key={url} asChild className="w-full mb-2">
                <a href={url} download>📄 Descarregar</a>
              </Button>
            ))}
          </TabsContent>

          <TabsContent value="chat">
            <CourseForum courseId={courseId} lessonId={lessonId} />
          </TabsContent>
        </Tabs>
      </aside>
    </div>
  );
};
```

---

## FASE 4: SISTEMA DE PAGAMENTOS (Semana 5)

### 4.1 Implementar M-Pesa

```typescript
// backend/src/services/mpesa.service.ts

class MpesaService {
  private apiBaseUrl = 'https://api.sandbox.vm.vodacom.co.mz/v1';
  private clientId = process.env.MPESA_CLIENT_ID;
  private clientSecret = process.env.MPESA_CLIENT_SECRET;

  async getAuthToken(): Promise<string> {
    const response = await axios.post(
      `${this.apiBaseUrl}/oauth/authorize`,
      {
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret
      }
    );
    return response.data.access_token;
  }

  async initiateC2B(amount: number, phoneNumber: string, courseId: string) {
    const token = await this.getAuthToken();

    return axios.post(
      `${this.apiBaseUrl}/c2bpayment/singlestep`,
      {
        input_Amount: amount,
        input_CustomerMSISDN: this.formatPhoneNumber(phoneNumber),
        input_ServiceProviderCode: process.env.MPESA_SERVICE_PROVIDER_CODE,
        input_ThirdPartyConversationID: `COURSE_${courseId}_${Date.now()}`,
        input_PurchasedItemsDesc: `Curso EduGuard360 - ${courseId}`
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
  }

  private formatPhoneNumber(phone: string): string {
    return phone.startsWith('258') ? phone : `258${phone.replace(/^0/, '')}`;
  }

  async handleCallback(payload: any) {
    // Verificar status do pagamento
    if (payload.output_ResponseCode === 'INS-0') {
      // Sucesso!
      return { status: 'completed' };
    }
    return { status: 'failed' };
  }
}

export const mpesaService = new MpesaService();
```

### 4.2 Checkout com Múltiplas Opções

```typescript
// components/PaymentCheckout.tsx

export const PaymentCheckout = ({ courseId, price }) => {
  const [method, setMethod] = useState<'mpesa' | 'card' | 'bank' | 'voucher'>('mpesa');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/payments/create', {
        method: 'POST',
        body: JSON.stringify({
          courseId,
          amount: price,
          method,
          // ...outras opções conforme método
        })
      });

      const data = await response.json();

      if (method === 'card') {
        // Redirecionar para Stripe
        window.location.href = data.sessionUrl;
      } else if (method === 'mpesa') {
        // Mostrar modal com instruções
        showMpesaModal(data.mpesaRequestId);
      }
    } catch (error) {
      console.error('Erro:', error);
    }
    setLoading(false);
  };

  return (
    <Dialog>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Escolha como Pagar</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <PaymentOption
            id="mpesa"
            title="M-Pesa"
            description="Pagamento instantâneo"
            selected={method === 'mpesa'}
            onChange={() => setMethod('mpesa')}
          />
          <PaymentOption
            id="card"
            title="Cartão de Crédito"
            description="Visa, Mastercard"
            selected={method === 'card'}
            onChange={() => setMethod('card')}
          />
          <PaymentOption
            id="bank"
            title="Transferência Bancária"
            description="Depósito bancário"
            selected={method === 'bank'}
            onChange={() => setMethod('bank')}
          />
        </div>

        <Button onClick={handlePayment} loading={loading} className="w-full">
          Pagar MZN {price}
        </Button>
      </DialogContent>
    </Dialog>
  );
};
```

---

## FASE 5: PORTAL DE LITERATURA (Semana 6)

### 5.1 Integrar APIs de Literatura

```typescript
// backend/src/services/literature.service.ts

class LiteratureService {
  async searchBooks(query: string, filters: any) {
    const results = [];

    // 1. Project Gutenberg
    const gutenbergResults = await this.searchGutenberg(query);
    results.push(...gutenbergResults);

    // 2. Open Library
    const olResults = await this.searchOpenLibrary(query);
    results.push(...olResults);

    // 3. arXiv (papers)
    if (filters.type === 'academic') {
      const arxivResults = await this.searchArxiv(query);
      results.push(...arxivResults);
    }

    // 4. Repoarte (Moçambique)
    if (filters.country === 'mozambique') {
      const repoarteResults = await this.searchRepoarte(query);
      results.push(...repoarteResults);
    }

    return results;
  }

  private async searchGutenberg(query: string) {
    const response = await axios.get(
      'https://gutendex.com/books/search?q=' + encodeURIComponent(query)
    );
    return response.data.results.map(book => ({
      id: `gutenberg_${book.id}`,
      title: book.title,
      authors: book.authors.map(a => a.name).join(', '),
      cover_image_url: book.formats?.['image/jpeg'],
      file_url: book.formats?.['text/html'],
      license: 'public_domain',
      source: 'gutenberg'
    }));
  }

  private async searchOpenLibrary(query: string) {
    const response = await axios.get(
      `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`
    );
    return response.data.docs.map(book => ({
      id: `ol_${book.key}`,
      title: book.title,
      authors: book.author_name?.join(', '),
      cover_image_url: book.cover_id 
        ? `https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg`
        : null,
      file_url: book.has_fulltext ? `https://openlibrary.org${book.key}` : null,
      license: 'public_domain',
      source: 'openlibrary'
    }));
  }

  private async searchArxiv(query: string) {
    // Integração com arXiv API para papers científicos
    const response = await axios.get(
      `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(query)}&start=0&max_results=10`
    );
    // Parse XML e retornar papers
    return this.parseArxivResults(response.data);
  }

  private async searchRepoarte(query: string) {
    // Integração com repositório moçambicano
    const response = await axios.get(
      `https://repoarte.ac.mz/api/search?q=${encodeURIComponent(query)}`
    );
    return response.data.items;
  }
}

export const literatureService = new LiteratureService();
```

### 5.2 Leitor PDF com Anotações

```typescript
// components/PDFReader.tsx

export const PDFReader = ({ pdfUrl, bookId }) => {
  const [numPages, setNumPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [annotations, setAnnotations] = useState([]);
  const [highlighting, setHighlighting] = useState(false);

  const handleHighlight = (text: string) => {
    const annotation = {
      id: uuidv4(),
      text,
      page: currentPage,
      timestamp: new Date(),
      color: 'yellow'
    };

    setAnnotations([...annotations, annotation]);

    // Salvar no backend
    fetch(`/api/literature/${bookId}/annotations`, {
      method: 'POST',
      body: JSON.stringify(annotation)
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-screen">
      {/* PDF Viewer */}
      <div className="lg:col-span-3">
        <Document file={pdfUrl} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
          <Page pageNumber={currentPage} />
        </Document>

        {/* Controles */}
        <div className="flex items-center gap-4 mt-4">
          <Button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}>
            ← Anterior
          </Button>
          <span>{currentPage} / {numPages}</span>
          <Button onClick={() => setCurrentPage(Math.min(numPages, currentPage + 1))}>
            Próxima →
          </Button>
        </div>
      </div>

      {/* Anotações */}
      <aside className="bg-gray-50 p-4 overflow-auto">
        <h3 className="font-bold mb-3">Anotações</h3>
        {annotations.map(ann => (
          <div key={ann.id} className="bg-white p-2 mb-2 rounded border-l-4 border-yellow-400">
            <p className="text-xs font-semibold text-gray-600">p. {ann.page}</p>
            <p className="text-sm italic">"{ann.text}"</p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAnnotations(annotations.filter(a => a.id !== ann.id))}
            >
              ✕
            </Button>
          </div>
        ))}
      </aside>
    </div>
  );
};
```

---

## FASE 6: CERTIFICAÇÕES & GAMIFICAÇÃO (Semana 7)

### 6.1 Sistema de Certificados

```typescript
// backend/src/services/certificate.service.ts

class CertificateService {
  async generateCertificate(enrollmentId: string, courseId: string, studentId: string) {
    // 1. Verificar se o aluno completou 70%+ do curso
    const progress = await this.getEnrollmentProgress(enrollmentId);
    if (progress < 70) {
      throw new Error('Progresso insuficiente (mínimo 70%)');
    }

    // 2. Gerar PDF com dados do aluno
    const certificate = await this.createCertificatePDF({
      studentName: (await this.getStudent(studentId)).name,
      courseName: (await this.getCourse(courseId)).title,
      completionDate: new Date(),
      certificateNumber: `CERT-${uuidv4()}`
    });

    // 3. Upload para S3
    const certificateUrl = await this.uploadToS3(certificate, `certificates/${enrollmentId}.pdf`);

    // 4. Guardar no banco
    await db.query(
      'UPDATE course_enrollments SET certificate_url = $1, certificate_issued = true WHERE id = $2',
      [certificateUrl, enrollmentId]
    );

    // 5. Enviar email
    await emailService.send({
      to: (await this.getStudent(studentId)).email,
      subject: `Parabéns! Recebeu o certificado`,
      template: 'certificate-issued',
      attachments: [{ filename: 'certificate.pdf', path: certificateUrl }]
    });

    return certificateUrl;
  }

  private async createCertificatePDF(data: any) {
    const doc = new PDFDocument();
    
    // Desenhar certificado
    doc.fontSize(24).text('CERTIFICADO DE CONCLUSÃO', { align: 'center' });
    doc.fontSize(14).text(data.courseName, { align: 'center' });
    doc.fontSize(12).text(`Concluído por: ${data.studentName}`, { align: 'center' });
    doc.text(`Data: ${data.completionDate.toLocaleDateString('pt-PT')}`, { align: 'center' });
    doc.text(`Certificado: ${data.certificateNumber}`, { align: 'center' });

    return doc;
  }
}

export const certificateService = new CertificateService();
```

---

## FASE 7: DASHBOARD E ANALYTICS (Semana 8)

### 7.1 Analytics para Educadores

```sql
-- View para analytics de educador
CREATE VIEW educator_dashboard_v1 AS
SELECT 
  u.id as educator_id,
  u.name,
  COUNT(DISTINCT c.id) as total_courses,
  COUNT(DISTINCT ce.student_id) as total_students,
  ROUND(AVG(cr.rating)::numeric, 2) as avg_rating,
  SUM(CASE WHEN pt.status = 'completed' THEN pt.amount_mzn * 0.75 ELSE 0 END) as total_earnings,
  COUNT(DISTINCT CASE WHEN ce.is_completed THEN ce.id END) as students_completed,
  ROUND(100.0 * COUNT(DISTINCT CASE WHEN ce.is_completed THEN ce.id END) / 
        NULLIF(COUNT(DISTINCT ce.id), 0), 2) as avg_completion_rate
FROM users u
LEFT JOIN courses c ON u.id = c.educator_id
LEFT JOIN course_enrollments ce ON c.id = ce.course_id
LEFT JOIN course_reviews cr ON c.id = cr.course_id
LEFT JOIN payment_transactions pt ON ce.id = pt.enrollment_id
WHERE u.id = current_user_id
GROUP BY u.id, u.name;
```

### 7.2 Dashboard React

```typescript
// components/EducatorDashboard/Analytics.tsx

export const AnalyticsDashboard = ({ educatorId }) => {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [educatorId]);

  const fetchDashboardData = async () => {
    const response = await fetch(`/api/educator/${educatorId}/analytics`);
    const data = await response.json();
    setStats(data.stats);
    setChartData(data.charts);
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Ganhos" value={`MZN ${stats?.total_earnings}`} />
        <StatCard title="Alunos" value={stats?.total_students} />
        <StatCard title="Classificação" value={stats?.avg_rating?.toFixed(1)} />
        <StatCard title="Taxa Conclusão" value={`${stats?.avg_completion_rate}%`} />
      </div>

      {/* Charts */}
      <Card>
        <CardHeader>
          <CardTitle>Ganhos por Mês</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart data={chartData?.monthly_earnings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alunos por Curso</CardTitle>
        </CardHeader>
        <CardContent>
          <PieChart data={chartData?.students_per_course} />
        </CardContent>
      </Card>
    </div>
  );
};
```

---

## FASE 8: TESTES & DEPLOY (Semana 9-12)

### 8.1 Testes

```bash
# Frontend
npm test -- --coverage

# Backend
npm test -- --testPathPattern="src/tests" --coverage

# E2E
npm run test:e2e
```

### 8.2 Checklist Pre-Deploy

```markdown
- [ ] M-Pesa testado em sandbox
- [ ] Stripe testado com cartões de teste
- [ ] Uploads de vídeos funcionando
- [ ] Certificados gerando corretamente
- [ ] Emails sendo enviados
- [ ] Analytics dashboards carregando
- [ ] Performance: < 3s home page
- [ ] Mobile responsivo
- [ ] SSL/TLS configurado
- [ ] Backups automáticos
- [ ] CDN configurado para vídeos
- [ ] Rate limiting ativado
- [ ] Error tracking (Sentry)
- [ ] Logs centralizados
```

### 8.3 Deploy em Produção

```bash
# Backend (Heroku/Railway)
git push heroku main

# Frontend (Vercel)
npm run build
npm run deploy

# Database migrations
flyway migrate

# Email templates update
npm run sync:email-templates
```

---

## 📊 MÉTRICAS DE SUCESSO

Após 3 meses:
- ✅ 500+ educadores registados
- ✅ 2.000+ cursos publicados
- ✅ 20.000+ alunos inscritos
- ✅ MZN 500.000+ em transações

---

## 🔗 RECURSOS RELACIONADOS

- [ARCHITECTURE_COURSE_PLATFORM.md](./ARCHITECTURE_COURSE_PLATFORM.md)
- [database_schema_education.sql](./database_schema_education.sql)
- [payments.routes.js](./backend/src/routes/payments.routes.js)
- [CourseCircuit.tsx](./src/components/CourseCircuit.tsx)
- [LiteraturePortal.tsx](./src/components/LiteraturePortal.tsx)
- [EducatorDashboard.tsx](./src/components/EducatorDashboard.tsx)

---

## 📞 SUPORTE

Para dúvidas sobre implementação:
- Email: dev@eduguard360.mz
- GitHub Issues
- Documentação: https://docs.eduguard360.mz

