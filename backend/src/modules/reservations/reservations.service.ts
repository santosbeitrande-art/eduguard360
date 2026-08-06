import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { Listing } from '../listings/entities/listing.entity';
import { EnterpriseScope } from '../enterprise/enterprise.service';
import { normalizeEnterpriseRole } from '../enterprise/rbac.matrix';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
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

  private assertReservationInScope(scope: EnterpriseScope, reservation: Reservation): void {
    if (scope.role === 'super_admin') return;
    const reservationScope = String(reservation.tenantId || reservation.schoolId || '').trim();
    const viewerScope = String(scope.tenantId || scope.schoolId || '').trim();
    if (reservationScope && viewerScope && reservationScope !== viewerScope) {
      throw new ForbiddenException('Cannot access reservations outside your tenant scope.');
    }
  }

  async createReservation(
    listingId: string,
    buyerId: string,
    scopeInput?: Partial<EnterpriseScope>,
  ): Promise<any> {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const listing = await this.listingsRepository.findOne({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    if (scope.role !== 'super_admin') {
      const listingScope = String(listing.tenantId || listing.schoolId || '').trim();
      const viewerScope = String(scope.tenantId || scope.schoolId || '').trim();
      if (listingScope && viewerScope && listingScope !== viewerScope) {
        throw new ForbiddenException('Cannot reserve listings outside your tenant scope.');
      }
    }

    if (listing.status !== 'available') {
      throw new ConflictException({
        error: 'Listing is not available',
        code: 'NOT_AVAILABLE',
      });
    }

    // Verificar se já existe reserva ativa
    const existingReservation = await this.reservationsRepository.findOne({
      where: {
        listingId,
        status: 'active',
      },
    });

    if (existingReservation) {
      throw new ConflictException({
        error: 'Listing already reserved',
        code: 'ALREADY_RESERVED',
      });
    }

    // Criar reserva
    const reservation = this.reservationsRepository.create({
      listingId,
      buyerId,
      sellerId: listing.userId,
      schoolId: listing.schoolId || scope.schoolId,
      tenantId: listing.tenantId || scope.tenantId,
      expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 horas
      status: 'active',
    });

    const saved = await this.reservationsRepository.save(reservation);

    // Atualizar status do anúncio
    listing.status = 'reserved';
    await this.listingsRepository.save(listing);

    return {
      id: saved.id,
      listingId: saved.listingId,
      buyerId: saved.buyerId,
      status: saved.status,
      reservedAt: saved.reservedAt,
      expiresAt: saved.expiresAt,
    };
  }

  async cancelReservation(
    reservationId: string,
    userId: string,
    scopeInput?: Partial<EnterpriseScope>,
  ): Promise<any> {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const reservation = await this.reservationsRepository.findOne({
      where: { id: reservationId },
      relations: ['listing'],
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    this.assertReservationInScope(scope, reservation);

    if (reservation.buyerId !== userId && reservation.sellerId !== userId) {
      throw new ConflictException('You can only cancel your own reservations');
    }

    reservation.status = 'cancelled';
    reservation.cancelledAt = new Date();
    const saved = await this.reservationsRepository.save(reservation);

    // Atualizar listing para available
    reservation.listing.status = 'available';
    await this.listingsRepository.save(reservation.listing);

    return {
      id: saved.id,
      status: saved.status,
      cancelledAt: saved.cancelledAt,
    };
  }

  async completeReservation(
    reservationId: string,
    userId: string,
    scopeInput?: Partial<EnterpriseScope>,
  ): Promise<any> {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const reservation = await this.reservationsRepository.findOne({
      where: { id: reservationId },
      relations: ['listing'],
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

    this.assertReservationInScope(scope, reservation);

    if (reservation.sellerId !== userId && reservation.buyerId !== userId) {
      throw new ConflictException('You can only complete your own reservations');
    }

    reservation.status = 'completed';
    reservation.completedAt = new Date();
    const saved = await this.reservationsRepository.save(reservation);

    // Atualizar listing
    reservation.listing.status = 'completed';
    reservation.listing.completedAt = new Date();
    await this.listingsRepository.save(reservation.listing);

    return {
      id: saved.id,
      status: saved.status,
      completedAt: saved.completedAt,
    };
  }

  async getReservations(
    userId: string,
    role: string,
    page: number = 1,
    limit: number = 10,
    scopeInput?: Partial<EnterpriseScope>,
  ) {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    let query = this.reservationsRepository.createQueryBuilder('reservation');

    if (scope.role !== 'super_admin') {
      const scopedTenant = scope.tenantId || scope.schoolId;
      query = query.andWhere('(reservation.tenantId = :tenantId OR reservation.schoolId = :schoolId)', {
        tenantId: scopedTenant,
        schoolId: scope.schoolId || scopedTenant,
      });
    }

    if (role === 'buyer') {
      query = query.where('reservation.buyerId = :userId', { userId });
    } else if (role === 'seller') {
      query = query.where('reservation.sellerId = :userId', { userId });
    }

    const [reservations, total] = await query
      .leftJoinAndSelect('reservation.listing', 'listing')
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('reservation.createdAt', 'DESC')
      .getManyAndCount();

    return {
      data: reservations,
      pagination: { page, limit, total },
    };
  }
}
