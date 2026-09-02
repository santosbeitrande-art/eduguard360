import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Building360Service } from './building360.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { RunBillingDto } from './dto/run-billing.dto';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { CreateSiteDto } from './dto/create-site.dto';
import { UpdateSiteDto } from './dto/update-site.dto';
import { CreateBuildingDto } from './dto/create-building.dto';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { CreateFloorDto } from './dto/create-floor.dto';
import { UpdateFloorDto } from './dto/update-floor.dto';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { CreateRoleAssignmentDto } from './dto/create-role-assignment.dto';
import { UpdateRoleAssignmentDto } from './dto/update-role-assignment.dto';
import { DeactivateCoreDto } from './dto/deactivate-core.dto';
import { ImportOnboardingCsvDto } from './dto/import-onboarding-csv.dto';
import { CreateContractDto } from './dto/create-contract.dto';
import { GenerateChargeDto } from './dto/generate-charge.dto';
import { IssueInvoiceDto } from './dto/issue-invoice.dto';
import { RegisterPaymentDto } from './dto/register-payment.dto';
import { FinanceFiltersDto } from './dto/finance-filters.dto';
import { EnterpriseRbacGuard } from '../enterprise/guards/enterprise-rbac.guard';
import { RequireEnterprisePermission } from '../enterprise/decorators/enterprise-permission.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const scopeFromRequest = (req: any) => req?.enterprisePrincipal || {};

@Controller('building360')
@UseGuards(JwtAuthGuard, EnterpriseRbacGuard)
export class Building360Controller {
  constructor(private readonly building360Service: Building360Service) {}

  @Get('overview')
  @RequireEnterprisePermission('analytics', 'read')
  getOverview(@Req() req: any) {
    return this.building360Service.getOverview(scopeFromRequest(req));
  }

  @Get('sites')
  @RequireEnterprisePermission('schools', 'read')
  getSites(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('portfolioId') portfolioId?: string,
  ) {
    return this.building360Service.getSitesScoped(scopeFromRequest(req), {
      tenantId,
      organizationId,
      portfolioId,
    });
  }

  @Get('buildings')
  @RequireEnterprisePermission('schools', 'read')
  getBuildings(
    @Req() req: any,
    @Query('siteId') siteId?: string,
    @Query('tenantId') tenantId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('portfolioId') portfolioId?: string,
  ) {
    return this.building360Service.getBuildingsScoped(scopeFromRequest(req), {
      tenantId,
      organizationId,
      portfolioId,
      siteId,
    });
  }

  @Get('units')
  @RequireEnterprisePermission('students', 'read')
  getUnits(
    @Req() req: any,
    @Query('siteId') siteId?: string,
    @Query('buildingId') buildingId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.building360Service.getUnitsScoped(scopeFromRequest(req), {
      tenantId,
      siteId,
      buildingId,
      type,
      status,
    });
  }

  @Get('assets')
  @RequireEnterprisePermission('security', 'read')
  getAssets(
    @Req() req: any,
    @Query('siteId') siteId?: string,
    @Query('buildingId') buildingId?: string,
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.building360Service.getAssetsScoped(scopeFromRequest(req), {
      tenantId,
      siteId,
      buildingId,
      status,
    });
  }

  @Get('work-orders')
  @RequireEnterprisePermission('workflow', 'read')
  getWorkOrders(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('tenantId') tenantId?: string,
  ) {
    return this.building360Service.getWorkOrdersScoped(scopeFromRequest(req), {
      tenantId,
      status,
    });
  }

  @Post('work-orders')
  @RequireEnterprisePermission('workflow', 'create')
  createWorkOrder(@Req() req: any, @Body() body: CreateWorkOrderDto) {
    return this.building360Service.createWorkOrder(body, scopeFromRequest(req));
  }

  @Patch('work-orders/:id')
  @RequireEnterprisePermission('workflow', 'update')
  updateWorkOrder(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { status?: 'open' | 'in_progress' | 'done' | 'cancelled'; note?: string },
  ) {
    return this.building360Service.updateWorkOrder(id, body, scopeFromRequest(req));
  }

  @Post('billing/run')
  @RequireEnterprisePermission('payments', 'create')
  runBilling(@Req() req: any, @Body() body: RunBillingDto) {
    return this.building360Service.runBilling(body, scopeFromRequest(req));
  }

  @Get('finance/contracts')
  @RequireEnterprisePermission('payments', 'read')
  listContracts(@Req() req: any, @Query('tenantId') tenantId?: string, @Query('status') status?: string) {
    return this.building360Service.listContracts(scopeFromRequest(req), { tenantId, status });
  }

  @Post('finance/contracts')
  @RequireEnterprisePermission('payments', 'create')
  createContract(@Req() req: any, @Body() body: CreateContractDto) {
    return this.building360Service.createContract(body, scopeFromRequest(req));
  }

  @Post('finance/charges/generate')
  @RequireEnterprisePermission('payments', 'create')
  generateCharge(@Req() req: any, @Body() body: GenerateChargeDto) {
    return this.building360Service.generateCharge(body, scopeFromRequest(req));
  }

  @Post('finance/invoices/issue')
  @RequireEnterprisePermission('payments', 'create')
  issueInvoice(@Req() req: any, @Body() body: IssueInvoiceDto) {
    return this.building360Service.issueInvoice(body, scopeFromRequest(req));
  }

  @Get('finance/invoices')
  @RequireEnterprisePermission('payments', 'read')
  listInvoices(@Req() req: any, @Query() query: FinanceFiltersDto) {
    return this.building360Service.listInvoices(scopeFromRequest(req), query);
  }

  @Post('finance/payments/register')
  @RequireEnterprisePermission('payments', 'create')
  registerPayment(@Req() req: any, @Body() body: RegisterPaymentDto) {
    return this.building360Service.registerPayment(body, scopeFromRequest(req));
  }

  @Get('finance/receipts')
  @RequireEnterprisePermission('payments', 'read')
  listReceipts(@Req() req: any, @Query('tenantId') tenantId?: string) {
    return this.building360Service.listReceipts(scopeFromRequest(req), { tenantId });
  }

  @Get('core/organizations')
  @RequireEnterprisePermission('schools', 'read')
  listOrganizations(@Req() req: any, @Query('tenantId') tenantId?: string) {
    return this.building360Service.listOrganizations(scopeFromRequest(req), { tenantId });
  }

  @Post('core/organizations')
  @RequireEnterprisePermission('schools', 'create')
  createOrganization(@Req() req: any, @Body() body: CreateOrganizationDto) {
    return this.building360Service.createOrganization(body, scopeFromRequest(req));
  }

  @Patch('core/organizations/:id')
  @RequireEnterprisePermission('schools', 'update')
  updateOrganization(@Req() req: any, @Param('id') id: string, @Body() body: UpdateOrganizationDto) {
    return this.building360Service.updateOrganization(id, body, scopeFromRequest(req));
  }

  @Patch('core/organizations/:id/deactivate')
  @RequireEnterprisePermission('schools', 'update')
  deactivateOrganization(@Req() req: any, @Param('id') id: string, @Body() body: DeactivateCoreDto) {
    return this.building360Service.deactivateOrganization(id, scopeFromRequest(req), body.tenantId);
  }

  @Get('core/portfolios')
  @RequireEnterprisePermission('schools', 'read')
  listPortfolios(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('organizationId') organizationId?: string,
  ) {
    return this.building360Service.listPortfolios(scopeFromRequest(req), { tenantId, organizationId });
  }

  @Post('core/portfolios')
  @RequireEnterprisePermission('schools', 'create')
  createPortfolio(@Req() req: any, @Body() body: CreatePortfolioDto) {
    return this.building360Service.createPortfolio(body, scopeFromRequest(req));
  }

  @Patch('core/portfolios/:id')
  @RequireEnterprisePermission('schools', 'update')
  updatePortfolio(@Req() req: any, @Param('id') id: string, @Body() body: UpdatePortfolioDto) {
    return this.building360Service.updatePortfolio(id, body, scopeFromRequest(req));
  }

  @Patch('core/portfolios/:id/deactivate')
  @RequireEnterprisePermission('schools', 'update')
  deactivatePortfolio(@Req() req: any, @Param('id') id: string, @Body() body: DeactivateCoreDto) {
    return this.building360Service.deactivatePortfolio(id, scopeFromRequest(req), body.tenantId);
  }

  @Post('core/sites')
  @RequireEnterprisePermission('schools', 'create')
  createSite(@Req() req: any, @Body() body: CreateSiteDto) {
    return this.building360Service.createSite(body, scopeFromRequest(req));
  }

  @Patch('core/sites/:id')
  @RequireEnterprisePermission('schools', 'update')
  updateSite(@Req() req: any, @Param('id') id: string, @Body() body: UpdateSiteDto) {
    return this.building360Service.updateSite(id, body, scopeFromRequest(req));
  }

  @Patch('core/sites/:id/deactivate')
  @RequireEnterprisePermission('schools', 'update')
  deactivateSite(@Req() req: any, @Param('id') id: string, @Body() body: DeactivateCoreDto) {
    return this.building360Service.deactivateSite(id, scopeFromRequest(req), body.tenantId);
  }

  @Post('core/buildings')
  @RequireEnterprisePermission('schools', 'create')
  createBuilding(@Req() req: any, @Body() body: CreateBuildingDto) {
    return this.building360Service.createBuilding(body, scopeFromRequest(req));
  }

  @Patch('core/buildings/:id')
  @RequireEnterprisePermission('schools', 'update')
  updateBuilding(@Req() req: any, @Param('id') id: string, @Body() body: UpdateBuildingDto) {
    return this.building360Service.updateBuilding(id, body, scopeFromRequest(req));
  }

  @Patch('core/buildings/:id/deactivate')
  @RequireEnterprisePermission('schools', 'update')
  deactivateBuilding(@Req() req: any, @Param('id') id: string, @Body() body: DeactivateCoreDto) {
    return this.building360Service.deactivateBuilding(id, scopeFromRequest(req), body.tenantId);
  }

  @Get('core/floors')
  @RequireEnterprisePermission('schools', 'read')
  listFloors(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('buildingId') buildingId?: string,
  ) {
    return this.building360Service.listFloors(scopeFromRequest(req), { tenantId, buildingId });
  }

  @Post('core/floors')
  @RequireEnterprisePermission('schools', 'create')
  createFloor(@Req() req: any, @Body() body: CreateFloorDto) {
    return this.building360Service.createFloor(body, scopeFromRequest(req));
  }

  @Patch('core/floors/:id')
  @RequireEnterprisePermission('schools', 'update')
  updateFloor(@Req() req: any, @Param('id') id: string, @Body() body: UpdateFloorDto) {
    return this.building360Service.updateFloor(id, body, scopeFromRequest(req));
  }

  @Patch('core/floors/:id/deactivate')
  @RequireEnterprisePermission('schools', 'update')
  deactivateFloor(@Req() req: any, @Param('id') id: string, @Body() body: DeactivateCoreDto) {
    return this.building360Service.deactivateFloor(id, scopeFromRequest(req), body.tenantId);
  }

  @Post('core/units')
  @RequireEnterprisePermission('students', 'create')
  createUnit(@Req() req: any, @Body() body: CreateUnitDto) {
    return this.building360Service.createUnit(body, scopeFromRequest(req));
  }

  @Patch('core/units/:id')
  @RequireEnterprisePermission('students', 'update')
  updateUnit(@Req() req: any, @Param('id') id: string, @Body() body: UpdateUnitDto) {
    return this.building360Service.updateUnit(id, body, scopeFromRequest(req));
  }

  @Patch('core/units/:id/deactivate')
  @RequireEnterprisePermission('students', 'update')
  deactivateUnit(@Req() req: any, @Param('id') id: string, @Body() body: DeactivateCoreDto) {
    return this.building360Service.deactivateUnit(id, scopeFromRequest(req), body.tenantId);
  }

  @Get('core/people')
  @RequireEnterprisePermission('users', 'read')
  listPeople(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('organizationId') organizationId?: string,
    @Query('unitId') unitId?: string,
  ) {
    return this.building360Service.listPeople(scopeFromRequest(req), { tenantId, organizationId, unitId });
  }

  @Post('core/people')
  @RequireEnterprisePermission('users', 'create')
  createPerson(@Req() req: any, @Body() body: CreatePersonDto) {
    return this.building360Service.createPerson(body, scopeFromRequest(req));
  }

  @Patch('core/people/:id')
  @RequireEnterprisePermission('users', 'update')
  updatePerson(@Req() req: any, @Param('id') id: string, @Body() body: UpdatePersonDto) {
    return this.building360Service.updatePerson(id, body, scopeFromRequest(req));
  }

  @Patch('core/people/:id/deactivate')
  @RequireEnterprisePermission('users', 'update')
  deactivatePerson(@Req() req: any, @Param('id') id: string, @Body() body: DeactivateCoreDto) {
    return this.building360Service.deactivatePerson(id, scopeFromRequest(req), body.tenantId);
  }

  @Get('core/role-assignments')
  @RequireEnterprisePermission('users', 'read')
  listRoleAssignments(
    @Req() req: any,
    @Query('tenantId') tenantId?: string,
    @Query('personId') personId?: string,
    @Query('role') role?: string,
  ) {
    return this.building360Service.listRoleAssignments(scopeFromRequest(req), { tenantId, personId, role });
  }

  @Post('core/role-assignments')
  @RequireEnterprisePermission('users', 'update')
  createRoleAssignment(@Req() req: any, @Body() body: CreateRoleAssignmentDto) {
    return this.building360Service.createRoleAssignment(body, scopeFromRequest(req));
  }

  @Patch('core/role-assignments/:id')
  @RequireEnterprisePermission('users', 'update')
  updateRoleAssignment(@Req() req: any, @Param('id') id: string, @Body() body: UpdateRoleAssignmentDto) {
    return this.building360Service.updateRoleAssignment(id, body, scopeFromRequest(req));
  }

  @Patch('core/role-assignments/:id/deactivate')
  @RequireEnterprisePermission('users', 'update')
  deactivateRoleAssignment(@Req() req: any, @Param('id') id: string, @Body() body: DeactivateCoreDto) {
    return this.building360Service.deactivateRoleAssignment(id, scopeFromRequest(req), body.tenantId);
  }

  @Post('core/onboarding/import-csv')
  @RequireEnterprisePermission('users', 'create')
  importOnboardingCsv(@Req() req: any, @Body() body: ImportOnboardingCsvDto) {
    return this.building360Service.importOnboardingCsv(body, scopeFromRequest(req));
  }
}
