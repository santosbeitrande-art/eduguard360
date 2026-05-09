import { Listing } from './entities/listing.entity';
import { Image } from './entities/image.entity';
import { ListingsService } from './listings.service';

const mockListingRepository = {
  createQueryBuilder: jest.fn(),
};

const mockImageRepository = {};

describe('ListingsService', () => {
  it('should create query builder and return empty results when none found', async () => {
    const mockQueryBuilder: any = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    mockListingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

    const service = new ListingsService(
      mockListingRepository as any,
      mockImageRepository as any,
    );

    const result = await service.getListings({ latitude: 38.72, longitude: -9.14, radius: 5 }, 1, 10);

    expect(mockListingRepository.createQueryBuilder).toHaveBeenCalledWith('listing');
    expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    expect(result.pagination.total).toBe(0);
    expect(result.data).toEqual([]);
  });
});
