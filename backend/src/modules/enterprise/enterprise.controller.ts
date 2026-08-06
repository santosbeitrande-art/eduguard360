import { Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { EnterpriseService } from './enterprise.service';

@Controller('enterprise')
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  @Get('overview')
  async overview() {
    return this.enterpriseService.getOverview();
  }

  @Get('audit')
  async listAudit(
    @Query('limit') limit?: number,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
  ) {
    return this.enterpriseService.listAuditLogs({
      limit: limit ? Number(limit) : 50,
      actorId,
      action,
    });
  }

  @Post('audit')
  async createAudit(@Body() body: any) {
    return this.enterpriseService.createAuditLog(body);
  }

  @Get('sessions')
  async listSessions(
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.enterpriseService.listSessions({ userId, status });
  }

  @Post('sessions')
  async upsertSession(@Body() body: any) {
    return this.enterpriseService.upsertSession(body);
  }

  @Patch('sessions/:id/revoke')
  async revokeSession(@Param('id') id: string, @Body('actorName') actorName?: string) {
    return this.enterpriseService.revokeSession(id, actorName || 'system');
  }

  @Get('security/policies')
  async listPolicies() {
    return this.enterpriseService.listPolicies();
  }

  @Put('security/policies/:key')
  async updatePolicy(@Param('key') key: string, @Body() body: any) {
    return this.enterpriseService.updatePolicy(key, body?.value || {}, body?.updatedBy || 'system');
  }

  @Get('security/mfa')
  async listMfa(@Query('userId') userId?: string) {
    return this.enterpriseService.listMfaEnrollments(userId);
  }

  @Post('security/mfa')
  async createMfa(@Body() body: any) {
    return this.enterpriseService.enrollMfa(body);
  }

  @Patch('security/mfa/:id/verify')
  async verifyMfa(@Param('id') id: string, @Body('verified') verified?: boolean) {
    return this.enterpriseService.verifyMfa(id, verified !== false);
  }

  @Get('workflows')
  async listWorkflows(@Query('status') status?: string) {
    return this.enterpriseService.listWorkflows(status);
  }

  @Post('workflows')
  async createWorkflow(@Body() body: any) {
    return this.enterpriseService.createWorkflow({
      title: body?.title,
      type: body?.type || 'generic',
      requester: body?.requester,
      owner: body?.owner,
      priority: body?.priority || 'medium',
      steps: Array.isArray(body?.steps) ? body.steps : ['Pedido', 'Secretaria', 'Direção', 'Concluído'],
      initialStatus: body?.initialStatus,
    });
  }

  @Patch('workflows/:id/advance')
  async advanceWorkflow(@Param('id') id: string, @Body() body: any) {
    return this.enterpriseService.advanceWorkflow(id, {
      actor: body?.actor,
      notes: body?.notes,
      targetStatus: body?.targetStatus,
    });
  }
}
