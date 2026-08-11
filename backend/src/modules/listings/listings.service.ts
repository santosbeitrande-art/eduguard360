import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Listing } from './entities/listing.entity';
import { Image } from './entities/image.entity';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { EnterpriseScope } from '../enterprise/enterprise.service';
import { normalizeEnterpriseRole } from '../enterprise/rbac.matrix';

@Injectable()
export class ListingsService {
  constructor(
    @InjectRepository(Listing)
    private listingsRepository: Repository<Listing>,
    @InjectRepository(Image)
    private imagesRepository: Repository<Image>,
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

  private assertListingInScope(scope: EnterpriseScope, listing: Listing): void {
    if (scope.role === 'super_admin') return;
    const listingScope = String(listing.tenantId || listing.schoolId || '').trim();
    const viewerScope = String(scope.tenantId || scope.schoolId || '').trim();
    if (listingScope && viewerScope && listingScope !== viewerScope) {
      throw new ForbiddenException('Cannot access listings outside your tenant scope.');
    }
  }

  async createListing(
    userId: string,
    createListingDto: CreateListingDto,
    scopeInput?: Partial<EnterpriseScope>,
  ): Promise<any> {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const listing = this.listingsRepository.create({
      ...createListingDto,
      userId,
      schoolId: scope.schoolId,
      tenantId: scope.tenantId,
      status: 'available',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
    });

    const saved = await this.listingsRepository.save(listing);

    // Salvar imagens se existirem
    if (createListingDto.images && createListingDto.images.length > 0) {
      for (let i = 0; i < createListingDto.images.length; i++) {
        const image = this.imagesRepository.create({
          listingId: saved.id,
          url: createListingDto.images[i],
          orderIndex: i,
        });
        await this.imagesRepository.save(image);
      }
      saved.imagesCount = createListingDto.images.length;
      await this.listingsRepository.save(saved);
    }

    return this.formatListing(saved);
  }

  async getListings(
    filters: any,
    page: number = 1,
    limit: number = 20,
    scopeInput?: Partial<EnterpriseScope>,
  ): Promise<{ data: any[]; pagination: any }> {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    let query = this.listingsRepository.createQueryBuilder('listing');

    if (scope.role !== 'super_admin') {
      const scopedTenant = scope.tenantId || scope.schoolId;
      query = query.andWhere('(listing.tenantId = :tenantId OR listing.schoolId = :schoolId)', {
        tenantId: scopedTenant,
        schoolId: scope.schoolId || scopedTenant,
      });
    }

    // Filtros
    if (filters.type) {
      query = query.andWhere('listing.type = :type', { type: filters.type });
    }

    if (filters.status) {
      query = query.andWhere('listing.status = :status', { status: filters.status });
    } else {
      query = query.andWhere('listing.status = :status', { status: 'available' });
    }

    if (filters.minPrice) {
      query = query.andWhere('listing.price >= :minPrice', { minPrice: filters.minPrice });
    }

    if (filters.maxPrice) {
      query = query.andWhere('listing.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    if (filters.latitude != null && filters.longitude != null) {
      const latitude = Number(filters.latitude);
      const longitude = Number(filters.longitude);
      const radiusKm = filters.radius != null ? Number(filters.radius) : 10;

      if (!Number.isNaN(latitude) && !Number.isNaN(longitude)) {
        const latDelta = radiusKm / 110.574;
        const lngDelta = radiusKm / (111.320 * Math.cos((latitude * Math.PI) / 180));

        const minLat = latitude - latDelta;
        const maxLat = latitude + latDelta;
        const minLng = longitude - lngDelta;
        const maxLng = longitude + lngDelta;

        query = query
          .andWhere('listing.latitude BETWEEN :minLat AND :maxLat', { minLat, maxLat })
          .andWhere('listing.longitude BETWEEN :minLng AND :maxLng', { minLng, maxLng });
      }
    }

    // Adicionar deleted_at IS NULL
    query = query.andWhere('listing.deletedAt IS NULL');

    // Ordenação
    if (filters.sortBy === 'price_asc') {
      query = query.orderBy('listing.price', 'ASC');
    } else if (filters.sortBy === 'price_desc') {
      query = query.orderBy('listing.price', 'DESC');
    } else {
      query = query.orderBy('listing.createdAt', 'DESC');
    }

    // Paginação
    const [listings, total] = await query
      .leftJoinAndSelect('listing.images', 'images')
      .leftJoinAndSelect('listing.user', 'user')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: listings.map((listing: Listing) => this.formatListing(listing)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getListingById(id: string, scopeInput?: Partial<EnterpriseScope>): Promise<any> {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const listing = await this.listingsRepository.findOne({
      where: { id },
      relations: ['user', 'images', 'reservations'],
    });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    this.assertListingInScope(scope, listing);

    // Incrementar view count
    listing.viewCount++;
    await this.listingsRepository.save(listing);

    return this.formatListing(listing);
  }

  async updateListing(
    userId: string,
    id: string,
    updateListingDto: UpdateListingDto,
    scopeInput?: Partial<EnterpriseScope>,
  ): Promise<any> {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const listing = await this.listingsRepository.findOne({ where: { id } });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    this.assertListingInScope(scope, listing);

    if (listing.userId !== userId) {
      throw new BadRequestException('You can only update your own listings');
    }

    Object.assign(listing, updateListingDto);
    const updated = await this.listingsRepository.save(listing);

    return this.formatListing(updated);
  }

  async deleteListing(userId: string, id: string, scopeInput?: Partial<EnterpriseScope>): Promise<void> {
    const scope = this.normalizeScope(scopeInput);
    this.enforceTenantScope(scope);

    const listing = await this.listingsRepository.findOne({ where: { id } });

    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    this.assertListingInScope(scope, listing);

    if (listing.userId !== userId) {
      throw new BadRequestException('You can only delete your own listings');
    }

    await this.listingsRepository.softDelete(id);
  }

  private formatListing(listing: Listing): any {
    return {
      id: listing.id,
      title: listing.title,
      description: listing.description,
      type: listing.type,
      weight: listing.weight,
      price: listing.price,
      status: listing.status,
      latitude: listing.latitude,
      longitude: listing.longitude,
      address: listing.address,
      city: listing.city,
      postalCode: listing.postalCode,
      images: listing.images?.map((img) => img.url) || [],
      imagesCount: listing.imagesCount,
      viewCount: listing.viewCount,
      user: listing.user
        ? {
            id: listing.user.id,
            name: listing.user.name,
            avatarUrl: listing.user.avatarUrl,
            rating: listing.user.rating,
          }
        : undefined,
      createdAt: listing.createdAt,
      expiresAt: listing.expiresAt,
    };
  }
}
