import { ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { isObservable, lastValueFrom } from 'rxjs';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = super.canActivate(context);
      return await (isObservable(result) ? lastValueFrom(result) : result);
    } catch (applicationTokenError) {
      if (!(applicationTokenError instanceof UnauthorizedException)) {
        throw applicationTokenError;
      }

      const request = context.switchToHttp().getRequest<any>();
      const authorization = String(request?.headers?.authorization || '');
      const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
      const supabaseUrl = String(process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
      const supabaseApiKey = String(process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

      if (!token || !supabaseUrl || !supabaseApiKey) throw applicationTokenError;

      let response: Response;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      try {
        response = await fetch(`${supabaseUrl}/auth/v1/user`, {
          headers: {
            apikey: supabaseApiKey,
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });
      } catch {
        throw new ServiceUnavailableException('Unable to verify the Supabase session.');
      } finally {
        clearTimeout(timeout);
      }

      if (response.status >= 500) {
        throw new ServiceUnavailableException('The Supabase authentication service is unavailable.');
      }
      if (!response.ok) {
        throw new UnauthorizedException('The supplied session is invalid or expired.');
      }

      let parsedUser: unknown;
      try {
        parsedUser = await response.json();
      } catch {
        throw new ServiceUnavailableException('Supabase returned an unreadable session response.');
      }
      if (!parsedUser || typeof parsedUser !== 'object' || Array.isArray(parsedUser)) {
        throw new ServiceUnavailableException('Supabase returned an invalid session response.');
      }
      const user = parsedUser as {
        id?: string;
        email?: string;
        app_metadata?: Record<string, unknown>;
        user_metadata?: Record<string, unknown>;
      };
      if (!user.id) throw new UnauthorizedException('Supabase returned an invalid user session.');

      const appMetadata = user.app_metadata || {};
      const role = appMetadata.building360_role || appMetadata.role || null;
      const tenantId = appMetadata.building360_tenant_id || appMetadata.tenant_id || null;
      const schoolId = appMetadata.building360_school_id || appMetadata.school_id || null;
      request.user = {
        sub: user.id,
        id: user.id,
        email: user.email || null,
        name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        role,
        perfil: role,
        tenantId,
        tenant_id: tenantId,
        schoolId,
        school_id: schoolId,
        building360_organization_id: appMetadata.building360_organization_id || null,
        building360_site_id: appMetadata.building360_site_id || null,
        building360_building_id: appMetadata.building360_building_id || null,
      };
      return true;
    }
  }
}
