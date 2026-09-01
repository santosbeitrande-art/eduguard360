import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class AuthService {
  // Simulando armazenamento de OTP em memória (em produção usar Redis)
  private otpStorage: Map<string, { code: string; attempts: number; expiresAt: Date }> =
    new Map();

  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async sendOtp(sendOtpDto: SendOtpDto): Promise<{ success: boolean; expiresIn: number }> {
    const { phone } = sendOtpDto;

    // Validar formato do telefone
    if (!this.isValidPhone(phone)) {
      throw new BadRequestException({
        error: 'Invalid phone format',
        code: 'INVALID_PHONE',
      });
    }

    // Verificar se há tentativas demais
    const existing = this.otpStorage.get(phone);
    if (existing && existing.attempts >= 5) {
      throw new BadRequestException({
        error: 'Too many OTP attempts. Please try again later.',
        code: 'TOO_MANY_ATTEMPTS',
      });
    }

    // Gerar código OTP (6 dígitos)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    // Armazenar OTP
    this.otpStorage.set(phone, {
      code,
      attempts: (existing?.attempts || 0) + 1,
      expiresAt,
    });

    // TODO: Enviar SMS via Twilio
    console.log(`📱 OTP para ${phone}: ${code}`);

    return {
      success: true,
      expiresIn: 600, // 10 minutos em segundos
    };
  }

  async verifyOtp(verifyOtpDto: VerifyOtpDto): Promise<{
    success: boolean;
    user: any;
    tokens: { accessToken: string; refreshToken: string; expiresIn: number };
  }> {
    const { phone, code } = verifyOtpDto;

    const otpData = this.otpStorage.get(phone);

    if (!otpData) {
      throw new UnauthorizedException({
        error: 'OTP expired or not found',
        code: 'OTP_NOT_FOUND',
      });
    }

    if (new Date() > otpData.expiresAt) {
      this.otpStorage.delete(phone);
      throw new UnauthorizedException({
        error: 'OTP expired',
        code: 'OTP_EXPIRED',
      });
    }

    if (otpData.code !== code) {
      otpData.attempts++;
      throw new UnauthorizedException({
        error: 'Invalid OTP',
        code: 'INVALID_OTP',
        attemptsLeft: 5 - otpData.attempts,
      });
    }

    // Limpar OTP
    this.otpStorage.delete(phone);

    // Buscar ou criar utilizador
    let user = await this.usersRepository.findOne({ where: { phone } });
    let isNew = false;

    if (!user) {
      isNew = true;
      user = this.usersRepository.create({
        phone,
        name: `User ${phone.slice(-4)}`, // Nome temporário
      });
      user = await this.usersRepository.save(user);
    }

    // Gerar tokens JWT
    // Fetch product memberships for this user (if memberships table exists)
    let memberships: Array<{productId: string; organizationId: string; role: string}> = [];
    try {
      // In production: query core_memberships WHERE user_id = user.id AND status = 'active'
      // For now: encode the user's primary role as their membership in the relevant products
      const role = user.role || 'student';
      const orgId = user.schoolId || user.tenantId || null;
      if (orgId && role) {
        const productMap: Record<string, string[]> = {
          director:      ['security', 'enterprise', 'analytics'],
          administrator: ['security', 'enterprise', 'building360'],
          secretaria:    ['security', 'enterprise'],
          financeiro:    ['security', 'enterprise', 'analytics'],
          professor:     ['security', 'enterprise', 'edumarket'],
          seguranca:     ['security'],
          student:       ['security', 'literature'],
          parent:        ['security', 'literature'],
        };
        const products = productMap[role] || ['enterprise'];
        memberships = products.map((productId) => ({ productId, organizationId: orgId, role }));
      }
    } catch { /* non-critical */ }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email || null,
      role: user.role || null,
      perfil: user.role || null,
      schoolId: user.schoolId || null,
      tenantId: user.tenantId || user.schoolId || null,
      memberships,   // per-product role claims
    });

    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-key',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
      },
    );

    return {
      success: true,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        isNew,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: 3600, // 1 hora em segundos
      },
    };
  }

  async getCurrentUser(userId: string): Promise<any> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      phone: user.phone,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarUrl,
      rating: user.rating,
      totalReviews: user.totalReviews,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  private isValidPhone(phone: string): boolean {
    // Validar formato português: +351XXXXXXXXX ou similar
    const phoneRegex = /^\+?351\d{9}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }
}
