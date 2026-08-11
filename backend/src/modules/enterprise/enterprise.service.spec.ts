import { EnterpriseService } from './enterprise.service';

type MockRepository = {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
  find: jest.Mock;
  count: jest.Mock;
  createQueryBuilder: jest.Mock;
};

const createMockRepository = (): MockRepository => ({
  create: jest.fn((payload) => payload),
  save: jest.fn(async (payload) => payload),
  findOne: jest.fn(),
  find: jest.fn(async () => []),
  count: jest.fn(async () => 0),
  createQueryBuilder: jest.fn(),
});

describe('EnterpriseService workflow ownership', () => {
  let service: EnterpriseService;
  let auditRepository: MockRepository;
  let sessionRepository: MockRepository;
  let policyRepository: MockRepository;
  let mfaRepository: MockRepository;
  let workflowRepository: MockRepository;
  let stepRepository: MockRepository;

  beforeEach(() => {
    auditRepository = createMockRepository();
    sessionRepository = createMockRepository();
    policyRepository = createMockRepository();
    mfaRepository = createMockRepository();
    workflowRepository = createMockRepository();
    stepRepository = createMockRepository();

    service = new EnterpriseService(
      auditRepository as any,
      sessionRepository as any,
      policyRepository as any,
      mfaRepository as any,
      workflowRepository as any,
      stepRepository as any,
    );
  });

  it('rejects advanceWorkflow when active step ownerRole differs from caller role', async () => {
    const process = {
      id: 'wf-1',
      schoolId: 's1',
      tenantId: 't1',
      status: 'pending',
      currentStep: 0,
      steps: [
        { id: 'st-1', stepOrder: 0, stepName: 'Submissão', ownerRole: 'secretaria', status: 'active' },
        { id: 'st-2', stepOrder: 1, stepName: 'Aprovação Institucional', ownerRole: 'director', status: 'pending' },
      ],
    };

    workflowRepository.findOne.mockResolvedValue(process);

    await expect(
      service.advanceWorkflow(
        'wf-1',
        { actor: 'Professor', notes: 'Tentativa inválida' },
        { role: 'professor', schoolId: 's1', tenantId: 't1', userId: 'u1', userName: 'Professor' },
      ),
    ).rejects.toThrow('Only role secretaria can execute the active workflow step.');

    expect(stepRepository.save).not.toHaveBeenCalled();
    expect(workflowRepository.save).not.toHaveBeenCalled();
  });

  it('allows super_admin to advance workflow even when ownerRole is different', async () => {
    const process = {
      id: 'wf-2',
      schoolId: 's1',
      tenantId: 't1',
      status: 'pending',
      currentStep: 0,
      steps: [
        { id: 'st-1', stepOrder: 0, stepName: 'Submissão', ownerRole: 'secretaria', status: 'active', actor: null, notes: null, actedAt: null },
        { id: 'st-2', stepOrder: 1, stepName: 'Aprovação Institucional', ownerRole: 'director', status: 'pending' },
      ],
    } as any;

    workflowRepository.findOne.mockResolvedValue(process);
    workflowRepository.save.mockImplementation(async (payload) => payload);

    const result = await service.advanceWorkflow(
      'wf-2',
      { actor: 'Root', notes: 'Execução global', targetStatus: 'approved' },
      { role: 'super_admin', userId: 'root', userName: 'Root', schoolId: null, tenantId: null },
    );

    expect(stepRepository.save).toHaveBeenCalled();
    expect(workflowRepository.save).toHaveBeenCalled();
    expect(result).toBeTruthy();
  });

  it('persists ownerRole when creating workflow with structured steps', async () => {
    workflowRepository.save.mockImplementation(async (payload) => ({ ...payload, id: 'wf-3' }));
    workflowRepository.findOne.mockResolvedValue({ id: 'wf-3', steps: [] });

    await service.createWorkflow(
      {
        title: 'Fluxo RH',
        type: 'employees',
        owner: 'rh',
        requester: 'Sistema',
        steps: [
          { stepName: 'Cadastro', ownerRole: 'rh' },
          { stepName: 'Aprovação Institucional', ownerRole: 'director' },
        ],
      },
      { role: 'super_admin', schoolId: null, tenantId: null, userId: 'root', userName: 'Root' },
    );

    expect(stepRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        stepOrder: 0,
        stepName: 'Cadastro',
        ownerRole: 'rh',
      }),
    );

    expect(stepRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        stepOrder: 1,
        stepName: 'Aprovação Institucional',
        ownerRole: 'director',
      }),
    );
  });
});
