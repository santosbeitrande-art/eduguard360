const FALLBACK_COURSES = [
  {
    id: 'fallback-react',
    title: 'Programação Web com React',
    description: 'Aprenda a criar aplicações web modernas com React e JavaScript.',
    educator_name: 'João Nhambu',
    category: 'tech',
    price_mzn: 299,
    total_lessons: 12,
    rating: 4.8,
    review_count: 1250,
    duration_minutes: 240,
    student_count: 1250,
    is_free: false,
    status: 'published',
    cover_image_url: buildCoursePlaceholderImage('React', '#2563eb'),
  },
  {
    id: 'fallback-marketing',
    title: 'Digital Marketing Essentials',
    description: 'Domine as estratégias de marketing digital e redes sociais.',
    educator_name: 'Marta Simango',
    category: 'business',
    price_mzn: 199,
    total_lessons: 10,
    rating: 4.6,
    review_count: 890,
    duration_minutes: 180,
    student_count: 890,
    is_free: false,
    status: 'published',
    cover_image_url: buildCoursePlaceholderImage('Marketing', '#7c3aed'),
  },
  {
    id: 'fallback-finance',
    title: 'Contabilidade Básica',
    description: 'Fundamentos de contabilidade para pequenos negócios.',
    educator_name: 'Carlos Zunguze',
    category: 'business',
    price_mzn: 149,
    total_lessons: 8,
    rating: 4.7,
    review_count: 650,
    duration_minutes: 120,
    student_count: 650,
    is_free: false,
    status: 'published',
    cover_image_url: buildCoursePlaceholderImage('Finanças', '#0f766e'),
  },
];

export function buildCoursePlaceholderImage(label: string, accent = '#2563eb'): string {
  const title = String(label || 'EduGuard').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="900" height="520" viewBox="0 0 900 520">
      <defs>
        <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${accent}"/>
          <stop offset="100%" stop-color="#0f172a"/>
        </linearGradient>
      </defs>
      <rect width="900" height="520" fill="url(#g)" />
      <circle cx="760" cy="110" r="120" fill="rgba(255,255,255,0.12)"/>
      <circle cx="150" cy="420" r="180" fill="rgba(255,255,255,0.08)"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700">${title}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function normalizeCourseList(data?: unknown): any[] {
  if (Array.isArray(data)) {
    return data.map((course) => normalizeCourseRecord(course));
  }

  if (data && typeof data === 'object' && Array.isArray((data as any).courses)) {
    return (data as any).courses.map((course: any) => normalizeCourseRecord(course));
  }

  return FALLBACK_COURSES.map((course) => ({ ...course }));
}

export function normalizeCourseRecord(course: any): any {
  if (!course || typeof course !== 'object') {
    return null;
  }

  return {
    ...course,
    id: course.id ?? `course-${Math.random().toString(36).slice(2, 9)}`,
    title: course.title ?? 'Curso EduGuard',
    description: course.description ?? 'Descrição em breve.',
    educator_name: course.educator_name ?? course.instructor ?? 'Educador EduGuard',
    category: course.category ?? 'tech',
    price_mzn: course.price_mzn ?? course.price ?? 0,
    total_lessons: course.total_lessons ?? (Array.isArray(course.content) ? course.content.length : 8),
    rating: course.rating ?? 0,
    review_count: course.review_count ?? course.students ?? 0,
    duration_minutes: course.duration_minutes ?? 120,
    student_count: course.student_count ?? course.students ?? 0,
    is_free: Boolean(course.is_free),
    status: course.status ?? 'published',
    cover_image_url: course.cover_image_url || buildCoursePlaceholderImage(course.title || 'EduGuard', '#2563eb'),
  };
}

export async function safeJsonFetch<T>(input: RequestInfo | URL, fallback: T, init: RequestInit = {}): Promise<T> {
  try {
    const response = await fetch(input, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init.headers ?? {}),
      },
    });

    if (!response.ok) {
      return fallback;
    }

    const text = await response.text();
    if (!text.trim()) {
      return fallback;
    }

    const json = text.trim().startsWith('{') || text.trim().startsWith('[')
      ? JSON.parse(text)
      : fallback;

    return json as T;
  } catch {
    return fallback;
  }
}
