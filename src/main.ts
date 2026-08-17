import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureSwagger } from './docs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim();
  if (frontendOrigin) {
    app.enableCors({ origin: frontendOrigin });
  }
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  configureSwagger(app);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
