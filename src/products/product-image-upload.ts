import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  PayloadTooLargeException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { memoryStorage } from 'multer';
import type { FileFilterCallback } from 'multer';
import { Observable, catchError } from 'rxjs';
import { ProductImageUpload } from '../image-storage/image-storage.service';

export const MAX_PRODUCT_IMAGE_SIZE = 5 * 1024 * 1024;
export const PRODUCT_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export function productImageFileFilter(
  _request: Request,
  file: Express.Multer.File,
  callback: FileFilterCallback,
): void {
  if (!PRODUCT_IMAGE_MIME_TYPES.includes(file.mimetype as never)) {
    callback(new BadRequestException('Unsupported image type'));
    return;
  }
  callback(null, true);
}

export function validateProductImageFile(
  file: (ProductImageUpload & { size?: number }) | undefined,
): asserts file is ProductImageUpload & { size?: number } {
  if (!file?.buffer?.length) {
    throw new BadRequestException('Image file is required');
  }
  if (
    !PRODUCT_IMAGE_MIME_TYPES.includes(file.mimetype as never) ||
    !matchesImageSignature(file.buffer, file.mimetype)
  ) {
    throw new BadRequestException('Unsupported image type');
  }
  if ((file.size ?? file.buffer.length) > MAX_PRODUCT_IMAGE_SIZE) {
    throw new BadRequestException('Image must not exceed 5 MB');
  }
}

const MulterProductImageInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_PRODUCT_IMAGE_SIZE },
  fileFilter: productImageFileFilter,
});

@Injectable()
export class ProductImageUploadInterceptor implements NestInterceptor {
  private readonly multerInterceptor = new MulterProductImageInterceptor();

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    let result: Observable<unknown>;
    try {
      result = await this.multerInterceptor.intercept(context, next);
    } catch (error) {
      throw mapUploadError(error);
    }
    return result.pipe(
      catchError((error: unknown) => {
        throw mapUploadError(error);
      }),
    );
  }
}

function mapUploadError(error: unknown): unknown {
  if (error instanceof PayloadTooLargeException) {
    return new BadRequestException('Image must not exceed 5 MB');
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    (('code' in error && error.code === 'LIMIT_FILE_SIZE') ||
      ('message' in error && error.message === 'File too large'))
  ) {
    return new BadRequestException('Image must not exceed 5 MB');
  }
  return error;
}

function matchesImageSignature(buffer: Buffer, mimetype: string): boolean {
  if (mimetype === 'image/jpeg') {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }
  if (mimetype === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  );
}
