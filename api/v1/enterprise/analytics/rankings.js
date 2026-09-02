import { cors, proxyBusinessApi, requireEnterpriseScope, resolveScope } from '../../../_lib/businessApiProxy.js';

export default function handler(req, res) {
  cors(res);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method-not-allowed' });
    return;
  }

  proxyBusinessApi(req, '/api/v1/enterprise/analytics/rankings').then((upstream) => {
    if (upstream.ok && upstream.data && typeof upstream.data === 'object') {
      res.status(200).json(upstream.data);
      return;
    }

    const scope = resolveScope(req);
    const guard = requireEnterpriseScope(scope, { domain: 'analytics', action: 'read' });
    if (!guard.ok) {
      res.status(guard.status).json(guard.body);
      return;
    }

    res.status(200).json({
      courses: [
        { id: 'course-1', label: 'Matematica Aplicada', score: 42, subtitle: 'Status: published' },
        { id: 'course-2', label: 'Gestao Operacional', score: 33, subtitle: 'Status: published' },
        { id: 'course-3', label: 'Ingles Tecnico', score: 27, subtitle: 'Status: draft' },
        { id: 'course-4', label: 'Fisica Avancada', score: 24, subtitle: 'Status: published' },
      ],
      professors: [
        { id: 'prof-1', label: 'Prof. Isabel M.', score: 31, subtitle: '4 cursos · 31 conclusoes' },
        { id: 'prof-2', label: 'Prof. Daniel C.', score: 27, subtitle: '3 cursos · 27 conclusoes' },
        { id: 'prof-3', label: 'Prof. Celina A.', score: 22, subtitle: '2 cursos · 22 conclusoes' },
        { id: 'prof-4', label: 'Prof. Mauro T.', score: 19, subtitle: '2 cursos · 19 conclusoes' },
      ],
      generatedAt: new Date().toISOString(),
      source: 'fallback',
    });
  });
}
