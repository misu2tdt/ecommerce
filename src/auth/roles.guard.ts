import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  // Reflector giống như cái kính lúp, giúp bảo vệ đọc được cái "Biển báo" treo tít trên cao
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Nhìn lên cửa xem có treo biển báo @Roles() không
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    
    if (!requiredRoles) {
      return true; // Nếu không treo biển gì -> Ai qua được cổng chính là được vào đây
    }
    
    // 2. Tóm lấy ông khách đang đứng trước cửa
    const request = context.switchToHttp().getRequest();
    const user = request.user; // Thông tin này do ông AuthGuard (Bảo vệ cổng) nhét vào lúc nãy
    
    // 3. So sánh: Chức vụ trong thẻ (user.role) CÓ NẰM TRONG danh sách cho phép (requiredRoles) không?
    if (!user || !requiredRoles.includes(user.role)) {
      // Nhớ khái niệm bài trước không em? Sai quyền -> Lỗi 403 Forbidden
      throw new ForbiddenException('Quyền lực không đủ! Chỉ Admin mới được vào đây.');
    }
    
    return true; // Đúng quyền -> Mời sếp vào!
  }
}