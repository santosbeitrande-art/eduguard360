import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  DeleteDateColumn,
  Index,
} from 'typeorm';
import { Listing } from '../../listings/entities/listing.entity';
import { Reservation } from '../../reservations/entities/reservation.entity';
import { Rating } from './rating.entity';

@Entity('users')
@Index(['phone'], { unique: true })
@Index(['email'], { unique: true, where: 'email IS NOT NULL' })
@Index(['schoolId'])
@Index(['tenantId'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 15, unique: true })
  phone!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
  email!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  schoolId!: string | null;

  @Column({ type: 'varchar', length: 64, nullable: true })
  tenantId!: string | null;

  @Column({ type: 'varchar', length: 50, default: 'both' })
  // 'seller', 'buyer', 'both'
  role!: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  avatarUrl!: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 5.0 })
  rating!: number;

  @Column({ type: 'int', default: 0 })
  totalReviews!: number;

  @Column({ type: 'boolean', default: false })
  isVerified!: boolean;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'text', nullable: true })
  bio!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @DeleteDateColumn({ nullable: true })
  deletedAt!: Date;

  @OneToMany(() => Listing, (listing: Listing) => listing.user)
  listings!: Listing[];

  @OneToMany(() => Reservation, (reservation: Reservation) => reservation.buyer)
  purchases!: Reservation[];

  @OneToMany(() => Reservation, (reservation: Reservation) => reservation.seller)
  sales!: Reservation[];

  @OneToMany(() => Rating, (rating: Rating) => rating.toUser)
  receivedRatings!: Rating[];

  @OneToMany(() => Rating, (rating: Rating) => rating.fromUser)
  givenRatings!: Rating[];
}
