import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Rating } from './entities/rating.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { EnterpriseScope } from '../enterprise/enterprise.service';
import { normalizeEnterpriseRole } from '../enterprise/rbac.matrix';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Rating)
    private ratingsRepository: Repository<Rating>,
  ) {}

  private normalizeScope(input?: Partial<EnterpriseScope>): EnterpriseScope {
    return {
      role: normalizeEnterpriseRole(input?.role),
      userId: input?.userId || null,
      userName: input?.userName || null,
      schoolId: input?.schoolId || null,
      tenantId: input?.tenantId || input?.schoolId || null,
    };
  }

  private enforceTenantScope(scope: EnterpriseScope): void {
    if (scope.role === 'super_admin') return;
    if (scope.schoolId || scope.tenantId) return;
    throw new ForbiddenException('school_id or tenant_id is required for this role.');
  }

  private assertScopeRecordAccess(
    scope: EnterpriseScope,
    record: { schoolId?: string | null; tenantId?: string | null },
  ) {
    if (scope.role === 'super_admin') return;
    const recordScope = String(record.tenantId || record.schoolId || '').trim();
    const viewerScope = String(scope.tenantId || scope.schoolId || '').trim();
    if (recordScope && viewerScope && recordScope !== viewerScope) {
      throw new ForbiddenException('Cannot access records outside your tenant scope.');
    }
  }

  async getProfile(userId: string, scopeInput?: Partial<EnterpriseScope>): Promise<any> {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertScopeRecordAccess(scope, user);

    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      email: user.email,
      avatarUrl: user.avatarUrl,
      rating: user.rating,
      totalReviews: user.totalReviews,
      bio: user.bio,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(
    userId: string,
    updateUserDto: UpdateUserDto,
    scopeInput?: Partial<EnterpriseScope>,
  ): Promise<any> {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.assertScopeRecordAccess(scope, user);

    Object.assign(user, updateUserDto);
    const updated = await this.usersRepository.save(user);

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      bio: updated.bio,
      avatarUrl: updated.avatarUrl,
      updatedAt: updated.updatedAt,
    };
  }

  async getUserRatings(
    userId: string,
    page: number = 1,
    limit: number = 10,
    scopeInput?: Partial<EnterpriseScope>,
  ): Promise<any> {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const targetUser = await this.usersRepository.findOne({ where: { id: userId } });
    if (!targetUser) {
      throw new NotFoundException('User not found');
    }
    this.assertScopeRecordAccess(scope, targetUser);

    const [ratings, total] = await this.ratingsRepository.findAndCount({
      where: { toUserId: userId },
      relations: ['fromUser'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: ratings.map((rating: Rating) => ({
        id: rating.id,
        fromUser: {
          id: rating.fromUser.id,
          name: rating.fromUser.name,
          avatarUrl: rating.fromUser.avatarUrl,
        },
        score: rating.score,
        comment: rating.comment,
        createdAt: rating.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
      },
    };
  }
}
