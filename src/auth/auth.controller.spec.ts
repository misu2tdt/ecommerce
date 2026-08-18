import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '../users/entities/user-role.enum';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: { login: jest.fn() } }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns the authenticated identity supplied by AuthGuard', () => {
    const user = {
      id: 12,
      email: 'shopper@example.test',
      role: UserRole.USER,
    };

    expect(controller.me(user)).toEqual(user);
  });
});
