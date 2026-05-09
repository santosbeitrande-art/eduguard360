import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Reservation } from './entities/reservation.entity';
import { Listing } from '../listings/entities/listing.entity';

@Injectable()
export class ReservationsService {
  constructor(
    @InjectRepository(Reservation)
    private reservationsRepository: Repository<Reservation>,
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
  ) {}

  async createReservation(listingId: string, buyerId: string): Promise<any> {
    const listing = await this.listingsRepository.findOne({
      where: { id: listingId },
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
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

  async cancelReservation(reservationId: string, userId: string): Promise<any> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id: reservationId },
      relations: ['listing'],
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

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

  async completeReservation(reservationId: string, userId: string): Promise<any> {
    const reservation = await this.reservationsRepository.findOne({
      where: { id: reservationId },
      relations: ['listing'],
    });

    if (!reservation) {
      throw new NotFoundException('Reservation not found');
    }

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

  async getReservations(userId: string, role: string, page: number = 1, limit: number = 10) {
    let query = this.reservationsRepository.createQueryBuilder('reservation');

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
