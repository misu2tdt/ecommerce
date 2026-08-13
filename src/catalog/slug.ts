import { BadRequestException } from '@nestjs/common';

export function createSlug(value: string): string {
  const slug = value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!slug) {
    throw new BadRequestException(
      'Name must contain characters that can form a slug',
    );
  }

  return slug;
}
