import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { AuthGuard } from '../auth/auth.guard';

describe('OrdersController', () => {
  let controller: OrdersController;
  const ordersService = { checkout: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: ordersService }],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates checkout using only the authenticated user id', async () => {
    ordersService.checkout.mockResolvedValue({ id: 10 });
    const dto = { items: [{ variantId: 3, quantity: 2 }] };
    await expect(
      controller.checkout(
        { id: 7, email: 'user@example.test', role: 'user' } as never,
        dto,
      ),
    ).resolves.toEqual({ id: 10 });
    expect(ordersService.checkout).toHaveBeenCalledWith(7, dto);
  });
});
