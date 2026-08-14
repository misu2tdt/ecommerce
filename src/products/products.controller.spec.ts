import { Test, TestingModule } from '@nestjs/testing';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { ProductImagesService } from './product-images.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { ProductVariantsService } from './product-variants.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  const productImagesService = { uploadForProduct: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        { provide: ProductsService, useValue: {} },
        { provide: ProductImagesService, useValue: productImagesService },
        { provide: ProductVariantsService, useValue: {} },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('passes multipart metadata and file to the upload service', async () => {
    const file = { buffer: Buffer.from('file') } as Express.Multer.File;
    const dto = { altText: 'Front', position: 10, isPrimary: true };
    productImagesService.uploadForProduct.mockResolvedValue({ id: 1 });

    await controller.createImage(42, dto, file);

    expect(productImagesService.uploadForProduct).toHaveBeenCalledWith(
      42,
      dto,
      file,
    );
  });
});
