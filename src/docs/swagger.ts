import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'api/docs';
export const SWAGGER_JSON_PATH = 'api/docs-json';
export const SWAGGER_BEARER_AUTH = 'bearer';

export function configureSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('E-commerce Backend API')
    .setDescription(
      'NestJS and PostgreSQL e-commerce API with transactional checkout, ProductVariant inventory, and payment integration.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT returned by POST /auth/login.',
      },
      SWAGGER_BEARER_AUTH,
    )
    .build();

  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(SWAGGER_PATH, app, documentFactory, {
    jsonDocumentUrl: SWAGGER_JSON_PATH,
    customSiteTitle: 'E-commerce Backend API Docs',
  });
}
