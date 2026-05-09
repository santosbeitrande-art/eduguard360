import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Rating } from './entities/rating.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Rating)
    private ratingsRepository: Repository<Rating>,
  ) {}

  async getProfile(userId: string): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

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

  async updateProfile(userId: string, updateUserDto: UpdateUserDto): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

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

  async getUserRatings(userId: string, page: number = 1, limit: number = 10): Promise<any> {
    const [ratings, total] = await this.ratingsRepository.findAndCount({
      where: { toUserId: userId },
      relations: ['fromUser'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: ratings.map((rating) => ({
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
