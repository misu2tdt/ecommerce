import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { User } from '../users/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async login(email: string, pass: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    
    if (!user) {
      throw new UnauthorizedException('Email hoặc Mật khẩu không chính xác!');
    }

    const isMatch = await bcrypt.compare(pass, user.password);
    
    if (!isMatch) {
      throw new UnauthorizedException('Email hoặc Mật khẩu không chính xác!');
    }

    const payload = { sub: user.id, email: user.email }; 
    
    return {
      message: 'Đăng nhập thành công!',
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}