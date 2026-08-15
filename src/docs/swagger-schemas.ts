const integerVnd = {
  type: 'integer',
  example: 24990000,
  description: 'Integer VND.',
};

const publicProductProperties = {
  id: { type: 'integer', example: 1 },
  name: { type: 'string', example: 'Example Laptop' },
  slug: { type: 'string', example: 'example-laptop' },
  description: {
    type: 'string',
    nullable: true,
    example: 'A fictional catalog product.',
  },
  status: { type: 'string', enum: ['active'], example: 'active' },
  categoryId: { type: 'integer', example: 1 },
  brandId: { type: 'integer', nullable: true, example: 1 },
  minPrice: { ...integerVnd, nullable: true },
  maxPrice: { ...integerVnd, nullable: true },
  inStock: { type: 'boolean', example: true },
  averageRating: {
    type: 'number',
    nullable: true,
    example: 4.75,
  },
  reviewCount: { type: 'integer', example: 12 },
};

export const publicProductListSchema = {
  type: 'array',
  items: {
    type: 'object',
    properties: publicProductProperties,
  },
};

export const publicProductDetailSchema = {
  type: 'object',
  properties: {
    ...publicProductProperties,
    variants: {
      type: 'array',
      description: 'Active purchasable ProductVariant SKUs.',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 10 },
          sku: { type: 'string', example: 'LAPTOP-16-512-BLK' },
          name: { type: 'string', example: '16 GB / 512 GB / Black' },
          price: integerVnd,
          stock: { type: 'integer', example: 25, minimum: 0 },
          attributes: {
            type: 'object',
            additionalProperties: { type: 'string' },
            example: { ram: '16GB', storage: '512GB', color: 'black' },
          },
          position: { type: 'integer', example: 0, minimum: 0 },
        },
      },
    },
  },
};
