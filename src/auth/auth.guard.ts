import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Chặn khách lại ở cửa và nhìn vào "Sảnh chờ" (Headers) xem khách có cầm thẻ không
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);
    
    if (!token) {
      throw new UnauthorizedException('Bạn chưa xuất trình Thẻ từ (Token)!');
    }
    
    try {
      // 2. Lấy thẻ đút vào Máy quét (verifyAsync) để xem thẻ thật, thẻ giả hay hết hạn
      const payload = await this.jwtService.verifyAsync(token);
      
      // 3. Nếu thẻ thật: Đeo cái "Biển tên" (payload) lên áo khách để Lễ tân bên trong biết là ai
      request['user'] = payload;
    } catch {
      // Nếu máy quét báo lỗi (thẻ fake, thẻ hết hạn) -> Đuổi cổ!
      throw new UnauthorizedException('Thẻ từ không hợp lệ hoặc đã hết hạn!');
    }
    
    // 4. Mở cửa cho khách bước vào
    return true; 
  }

  // Tuyệt chiêu soi thẻ của bảo vệ: Thẻ phải nằm trong túi "Authorization" và có chữ "Bearer" đi kèm
  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}