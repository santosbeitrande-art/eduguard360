import { Body, Controller, Get, Param, Patch, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { EnterpriseService } from './enterprise.service';
import { RequireEnterprisePermission } from './decorators/enterprise-permission.decorator';
import { EnterpriseRbacGuard } from './guards/enterprise-rbac.guard';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const scopeFromRequest = (req: any) => req?.enterprisePrincipal || {};

@Controller('enterprise')
@UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
export class EnterpriseController {
  constructor(private readonly enterpriseService: EnterpriseService) {}

  @Get('rbac/matrix')
  matrix() {
    return this.enterpriseService.getRbacMatrix();
  }

  @Post('rbac/resolve')
  resolveAccess(@Body() body: any) {
    return this.enterpriseService.resolveAccessProfile({
      role: body?.role,
      schoolId: body?.schoolId,
      tenantId: body?.tenantId,
      userId: body?.userId,
    });
  }

  @Get('overview')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('analytics', 'read')
  async overview(@Req() req: any) {
    return this.enterpriseService.getOverview(scopeFromRequest(req));
  }

  @Get('analytics/overview')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('analytics', 'read')
  async analyticsOverview(@Req() req: any) {
    return this.enterpriseService.getAnalyticsOverview(scopeFromRequest(req));
  }

  @Get('analytics/rankings')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('analytics', 'read')
  async analyticsRankings(@Req() req: any) {
    return this.enterpriseService.getAnalyticsRankings(scopeFromRequest(req));
  }

  @Get('audit')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('security', 'read')
  async listAudit(
    @Req() req: any,
    @Query('limit') limit?: number,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
  ) {
    return this.enterpriseService.listAuditLogs({
      limit: limit ? Number(limit) : 50,
      actorId,
      action,
    }, scopeFromRequest(req));
  }

  @Post('audit')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('security', 'create')
  async createAudit(@Req() req: any, @Body() body: any) {
    return this.enterpriseService.createAuditLog(body, scopeFromRequest(req));
  }

  @Get('sessions')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('security', 'read')
  async listSessions(
    @Req() req: any,
    @Query('userId') userId?: string,
    @Query('status') status?: string,
  ) {
    return this.enterpriseService.listSessions({ userId, status }, scopeFromRequest(req));
  }

  @Post('sessions')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('security', 'update')
  async upsertSession(@Req() req: any, @Body() body: any) {
    return this.enterpriseService.upsertSession(body, scopeFromRequest(req));
  }

  @Patch('sessions/:id/revoke')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('security', 'approve')
  async revokeSession(@Req() req: any, @Param('id') id: string, @Body('actorName') actorName?: string) {
    return this.enterpriseService.revokeSession(id, actorName || 'system', scopeFromRequest(req));
  }

  @Get('security/policies')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('security', 'read')
  async listPolicies() {
    return this.enterpriseService.listPolicies();
  }

  @Put('security/policies/:key')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('security', 'update')
  async updatePolicy(@Param('key') key: string, @Body() body: any) {
    return this.enterpriseService.updatePolicy(key, body?.value || {}, body?.updatedBy || 'system');
  }

  @Get('security/mfa')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('security', 'read')
  async listMfa(@Req() req: any, @Query('userId') userId?: string) {
    return this.enterpriseService.listMfaEnrollments(userId, scopeFromRequest(req));
  }

  @Post('security/mfa')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('security', 'create')
  async createMfa(@Req() req: any, @Body() body: any) {
    return this.enterpriseService.enrollMfa(body, scopeFromRequest(req));
  }

  @Patch('security/mfa/:id/verify')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('security', 'approve')
  async verifyMfa(@Req() req: any, @Param('id') id: string, @Body('verified') verified?: boolean) {
    return this.enterpriseService.verifyMfa(id, verified !== false, scopeFromRequest(req));
  }

  @Get('workflows')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('workflow', 'read')
  async listWorkflows(@Req() req: any, @Query('status') status?: string) {
    return this.enterpriseService.listWorkflows(status, scopeFromRequest(req));
  }

  @Post('workflows')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('workflow', 'create')
  async createWorkflow(@Req() req: any, @Body() body: any) {
    return this.enterpriseService.createWorkflow({
      title: body?.title,
      type: body?.type || 'generic',
      requester: body?.requester,
      owner: body?.owner,
      priority: body?.priority || 'medium',
      steps: Array.isArray(body?.steps)
        ? body.steps
        : [
            { stepName: 'Submissão', ownerRole: 'secretaria' },
            { stepName: 'Validação Pedagógica', ownerRole: 'coordenador' },
            { stepName: 'Aprovação Institucional', ownerRole: 'director' },
            { stepName: 'Confirmação Financeira', ownerRole: 'financeiro' },
            { stepName: 'Concluído', ownerRole: 'administrator' },
          ],
      initialStatus: body?.initialStatus,
    }, scopeFromRequest(req));
  }

  @Patch('workflows/:id/advance')
  @UseGuards(EnterpriseRbacGuard)
  @RequireEnterprisePermission('workflow', 'update')
  async advanceWorkflow(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.enterpriseService.advanceWorkflow(id, {
      actor: body?.actor,
      notes: body?.notes,
      targetStatus: body?.targetStatus,
    }, scopeFromRequest(req));
  }
}
