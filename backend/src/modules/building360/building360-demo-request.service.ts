import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { AuditLog } from '../enterprise/entities/audit-log.entity';
import { Building360DemoRequest } from './entities/demo-request.entity';
import { BuildingOrganization } from './entities/organization.entity';
import { BuildingSite } from './entities/site.entity';
import { BuildingBuilding } from './entities/building.entity';
import { BuildingPerson } from './entities/person.entity';
import { BuildingRoleAssignment } from './entities/role-assignment.entity';
import { CreateDemoRequestDto } from './dto/create-demo-request.dto';

type ApprovalActor = {
  role?: string | null;
  userId?: string | null;
  userName?: string | null;
};

@Injectable()
export class Building360DemoRequestService {
  constructor(
    @InjectRepository(Building360DemoRequest)
    private readonly requestRepository: Repository<Building360DemoRequest>,
    @InjectRepository(AuditLog)
    private readonly auditRepository: Repository<AuditLog>,
    @InjectRepository(BuildingOrganization)
    private readonly organizationRepository: Repository<BuildingOrganization>,
    @InjectRepository(BuildingSite)
    private readonly siteRepository: Repository<BuildingSite>,
    @InjectRepository(BuildingBuilding)
    private readonly buildingRepository: Repository<BuildingBuilding>,
    @InjectRepository(BuildingPerson)
    private readonly personRepository: Repository<BuildingPerson>,
    @InjectRepository(BuildingRoleAssignment)
    private readonly roleAssignmentRepository: Repository<BuildingRoleAssignment>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async submit(payload: CreateDemoRequestDto) {
    let saved: Building360DemoRequest;
    try {
      saved = await this.dataSource.transaction(async (manager) => {
        const requestRepository = manager.getRepository(Building360DemoRequest);
        const auditRepository = manager.getRepository(AuditLog);
        const request = await requestRepository.save(requestRepository.create({
          name: payload.name.trim(),
          organizationName: payload.organizationName.trim(),
          email: payload.email.trim().toLowerCase(),
          phone: payload.phone?.trim() || null,
          city: payload.city.trim(),
          buildingName: payload.buildingName.trim(),
          plan: payload.plan,
          message: payload.message?.trim() || null,
          status: 'pending',
          privacyConsentAt: new Date(),
        }));
        await auditRepository.save(auditRepository.create({
          action: 'building360.demo_request.submitted',
          resourceType: 'building360_demo_request',
          resourceId: request.id,
          actorId: null,
          actorName: request.name,
          actorRole: null,
          schoolId: null,
          tenantId: null,
          severity: 'info',
          metadata: { plan: request.plan },
          ipAddress: null,
          userAgent: null,
        }));
        return request;
      });
    } catch (error) {
      if ((error as { code?: string })?.code === '23505') {
        throw new ConflictException('A pending demo request already exists for this email.');
      }
      throw error;
    }
    return { requestId: saved.id, status: saved.status };
  }

  async list(status: string | undefined, actor: ApprovalActor) {
    this.assertPlatformAdmin(actor);
    const allowedStatuses = ['pending', 'provisioning', 'invitation_failed', 'approved', 'rejected'];
    if (status && !allowedStatuses.includes(status)) {
      throw new BadRequestException('Unsupported demo request status.');
    }
    return this.requestRepository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    });
  }

  async reject(id: string, actor: ApprovalActor) {
    this.assertPlatformAdmin(actor);
    return this.dataSource.transaction(async (manager) => {
      const requestRepository = manager.getRepository(Building360DemoRequest);
      const request = await requestRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!request) throw new NotFoundException('Demo request not found.');
      if (request.status !== 'pending') {
        throw new ConflictException('Only pending demo requests can be rejected.');
      }
      request.status = 'rejected';
      request.reviewedBy = actor.userId || null;
      request.reviewedAt = new Date();
      const saved = await requestRepository.save(request);
      const auditRepository = manager.getRepository(AuditLog);
      await auditRepository.save(auditRepository.create({
        action: 'building360.demo_request.rejected',
        resourceType: 'building360_demo_request',
        resourceId: request.id,
        actorId: actor.userId || null,
        actorName: actor.userName || null,
        actorRole: actor.role || null,
        schoolId: null,
        tenantId: null,
        severity: 'info',
        metadata: { email: request.email },
        ipAddress: null,
        userAgent: null,
      }));
      return { requestId: saved.id, status: saved.status };
    });
  }

  async approve(id: string, actor: ApprovalActor) {
    this.assertPlatformAdmin(actor);
    const config = this.getSupabaseConfig();
    let request = await this.requestRepository.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Demo request not found.');

    if (request.status === 'pending') {
      const tenantId = randomUUID();
      const claim = await this.requestRepository.update(
        { id: request.id, status: 'pending' },
        {
          status: 'provisioning',
          reviewedBy: actor.userId || null,
          reviewedAt: new Date(),
          tenantId,
          provisioningError: null,
        },
      );
      if (!claim.affected) throw new ConflictException('This demo request is already being processed.');
      request = { ...request, status: 'provisioning', tenantId };
    } else if (request.status === 'invitation_failed') {
      if (!request.tenantId || !request.organizationId || !request.siteId || !request.buildingId) {
        throw new ConflictException('Provisioning records are incomplete; contact platform support.');
      }
      const claim = await this.requestRepository.update(
        { id: request.id, status: 'invitation_failed' },
        { status: 'provisioning', provisioningError: null },
      );
      if (!claim.affected) throw new ConflictException('This invitation is already being retried.');
      request = { ...request, status: 'provisioning', provisioningError: null };
    } else if (request.status === 'provisioning') {
      const staleBefore = new Date(Date.now() - 15 * 60 * 1000);
      if (!request.updatedAt || new Date(request.updatedAt).getTime() >= staleBefore.getTime()) {
        throw new ConflictException('This demo request is already being processed.');
      }
      const now = new Date();
      const claim = await this.requestRepository.createQueryBuilder()
        .update(Building360DemoRequest)
        .set({ reviewedAt: now, provisioningError: null })
        .where('"id" = :id AND "status" = :status AND "updatedAt" < :staleBefore', {
          id: request.id,
          status: 'provisioning',
          staleBefore,
        })
        .execute();
      if (!claim.affected) throw new ConflictException('This demo request is already being retried.');
      request = { ...request, reviewedAt: now, provisioningError: null };
    } else {
      throw new ConflictException('This demo request is not awaiting provisioning.');
    }

    if (!request.tenantId) throw new ConflictException('Provisioning tenant id is missing.');
    if (!request.organizationId || !request.siteId || !request.buildingId) {
      try {
        await this.provisionTenant(request, actor);
      } catch (error) {
        request.status = 'pending';
        request.tenantId = null;
        request.organizationId = null;
        request.siteId = null;
        request.buildingId = null;
        request.provisioningError = this.safeErrorMessage(error);
        await this.requestRepository.save(request);
        throw error;
      }
    }

    let invitedUserId = request.invitedUserId;
    try {
      if (!invitedUserId) {
        invitedUserId = await this.inviteAdministrator(request, config);
        request.invitedUserId = invitedUserId;
        await this.requestRepository.save(request);
      }
      await this.setTrustedUserMetadata(invitedUserId, request, config);
    } catch (error) {
      request.status = 'invitation_failed';
      request.provisioningError = this.safeErrorMessage(error);
      await this.requestRepository.save(request);
      throw new ServiceUnavailableException(
        'The tenant was provisioned, but the administrator invitation could not be completed. Review the request and retry or contact platform support.',
      );
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const requestRepository = manager.getRepository(Building360DemoRequest);
      const currentRequest = await requestRepository.findOne({
        where: { id: request.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!currentRequest || currentRequest.status !== 'provisioning') {
        throw new ConflictException('Demo request status changed during approval.');
      }
      currentRequest.status = 'approved';
      currentRequest.provisioningError = null;
      currentRequest.reviewedBy = actor.userId || currentRequest.reviewedBy;
      currentRequest.reviewedAt = new Date();
      const approved = await requestRepository.save(currentRequest);
      const auditRepository = manager.getRepository(AuditLog);
      await auditRepository.save(auditRepository.create({
        action: 'building360.demo_request.approved',
        resourceType: 'building360_demo_request',
        resourceId: request.id,
        actorId: actor.userId || null,
        actorName: actor.userName || null,
        actorRole: actor.role || null,
        schoolId: null,
        tenantId: request.tenantId,
        severity: 'info',
        metadata: {
          email: request.email,
          organizationId: request.organizationId,
          siteId: request.siteId,
          buildingId: request.buildingId,
          plan: request.plan,
        },
        ipAddress: null,
        userAgent: null,
      }));
      return approved;
    });
    return {
      requestId: saved.id,
      status: saved.status,
      tenantId: saved.tenantId,
      organizationId: saved.organizationId,
      siteId: saved.siteId,
      buildingId: saved.buildingId,
      invitedUserId: saved.invitedUserId,
    };
  }

  private assertPlatformAdmin(actor: ApprovalActor) {
    if (!['super_admin', 'platform_admin'].includes(actor.role || '')) {
      throw new ForbiddenException('Only platform administrators can manage demo requests.');
    }
  }

  private getSupabaseConfig() {
    const url = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
    const serviceRoleKey = String(process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    if (!url || !serviceRoleKey) {
      throw new ServiceUnavailableException('Supabase admin credentials are not configured on the server.');
    }
    const redirectUrl = String(
      process.env.BUILDING360_INVITE_REDIRECT_URL
      || 'https://eduguard360.co.mz/auth/recovery?returnTo=%2Fbuilding360%2Fdashboard&mode=update-password',
    ).trim();
    try {
      const parsedUrl = new URL(url);
      const parsedRedirect = new URL(redirectUrl);
      if (process.env.NODE_ENV === 'production' && (parsedUrl.protocol !== 'https:' || parsedRedirect.protocol !== 'https:')) {
        throw new Error('Production URLs must use HTTPS.');
      }
    } catch {
      throw new ServiceUnavailableException('Supabase URL or Building360 invitation redirect URL is invalid.');
    }
    return { url, serviceRoleKey, redirectUrl };
  }

  private async provisionTenant(request: Building360DemoRequest, actor: ApprovalActor) {
    const tenantId = request.tenantId;
    if (!tenantId) throw new BadRequestException('Tenant id was not allocated.');

    const created = await this.dataSource.transaction(async (manager) => {
      const organizations = manager.getRepository(BuildingOrganization);
      const sites = manager.getRepository(BuildingSite);
      const buildings = manager.getRepository(BuildingBuilding);
      const people = manager.getRepository(BuildingPerson);
      const assignments = manager.getRepository(BuildingRoleAssignment);
      const organization = await organizations.save(organizations.create({
        tenantId,
        schoolId: null,
        name: request.organizationName,
        code: `B360-${request.id.slice(0, 8).toUpperCase()}`,
        status: 'active',
        isActive: true,
      }));
      const site = await sites.save(sites.create({
        tenantId,
        schoolId: null,
        organizationId: organization.id,
        portfolioId: null,
        name: request.buildingName,
        city: request.city,
        type: 'residential',
        code: `SITE-${request.id.slice(0, 8).toUpperCase()}`,
        status: 'active',
        isActive: true,
      }));
      const building = await buildings.save(buildings.create({
        tenantId,
        schoolId: null,
        organizationId: organization.id,
        portfolioId: null,
        siteId: site.id,
        name: request.buildingName,
        code: `BLD-${request.id.slice(0, 8).toUpperCase()}`,
        floors: 1,
        status: 'active',
        isActive: true,
      }));
      const person = await people.save(people.create({
        tenantId,
        schoolId: null,
        organizationId: organization.id,
        unitId: null,
        fullName: request.name,
        code: `ADMIN-${request.id.slice(0, 8).toUpperCase()}`,
        email: request.email,
        phone: request.phone,
        status: 'active',
        isActive: true,
      }));
      await assignments.save(assignments.create({
        tenantId,
        schoolId: null,
        personId: person.id,
        organizationId: organization.id,
        siteId: site.id,
        buildingId: building.id,
        unitId: null,
        role: 'building_manager',
        status: 'active',
        isActive: true,
      }));

      const currentRequest = await manager.getRepository(Building360DemoRequest).findOne({
        where: { id: request.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!currentRequest || currentRequest.status !== 'provisioning') {
        throw new ConflictException('Demo request state changed during provisioning.');
      }
      currentRequest.organizationId = organization.id;
      currentRequest.siteId = site.id;
      currentRequest.buildingId = building.id;
      await manager.getRepository(Building360DemoRequest).save(currentRequest);

      const auditRepository = manager.getRepository(AuditLog);
      await auditRepository.save(auditRepository.create({
        action: 'building360.tenant.provisioned',
        resourceType: 'building360_demo_request',
        resourceId: request.id,
        actorId: actor.userId || null,
        actorName: actor.userName || null,
        actorRole: actor.role || null,
        schoolId: null,
        tenantId,
        severity: 'info',
        metadata: {
          organizationId: organization.id,
          siteId: site.id,
          buildingId: building.id,
          plan: request.plan,
        },
        ipAddress: null,
        userAgent: null,
      }));
      return { organization, site, building };
    });

    request.organizationId = created.organization.id;
    request.siteId = created.site.id;
    request.buildingId = created.building.id;
  }

  private async inviteAdministrator(request: Building360DemoRequest, config: { url: string; serviceRoleKey: string; redirectUrl: string }) {
    const inviteUrl = new URL(`${config.url}/auth/v1/invite`);
    inviteUrl.searchParams.set('redirect_to', config.redirectUrl);
    const response = await fetch(inviteUrl, {
      method: 'POST',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: request.email,
        data: { full_name: request.name },
      }),
    });
    const body = await this.readSupabaseResponse(response);
    if (!response.ok) {
      throw new BadRequestException(
        body.message || body.msg || `Supabase invitation failed with HTTP ${response.status}.`,
      );
    }
    if (typeof body.id !== 'string' || !body.id) {
      throw new ServiceUnavailableException('Supabase did not return the invited user id.');
    }
    return body.id;
  }

  private async setTrustedUserMetadata(
    userId: string,
    request: Building360DemoRequest,
    config: { url: string; serviceRoleKey: string; redirectUrl: string },
  ) {
    const response = await fetch(`${config.url}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
      method: 'PUT',
      headers: {
        apikey: config.serviceRoleKey,
        Authorization: `Bearer ${config.serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_metadata: {
          building360_role: 'building_manager',
          building360_tenant_id: request.tenantId,
          building360_organization_id: request.organizationId,
          building360_site_id: request.siteId,
          building360_building_id: request.buildingId,
        },
      }),
    });
    const body = await this.readSupabaseResponse(response);
    if (!response.ok) {
      throw new BadRequestException(
        body.message || body.msg || `Supabase user metadata update failed with HTTP ${response.status}.`,
      );
    }
  }

  private async readSupabaseResponse(response: Response): Promise<Record<string, any>> {
    const text = await response.text();
    if (!text) return {};
    try {
      const value = JSON.parse(text);
      return value && typeof value === 'object' ? value : {};
    } catch {
      return { message: `Supabase returned an unreadable response (HTTP ${response.status}).` };
    }
  }

  private safeErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message.slice(0, 1000);
    return 'Unexpected provisioning error.';
  }
}
