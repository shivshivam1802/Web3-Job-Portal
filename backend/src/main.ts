import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  const config = new DocumentBuilder()
    .setTitle('Web3 Freelance Marketplace API')
    .setDescription('Secure Escrow, Milestones, SIWE auth, Proposals & Chat APIs documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`Backend server running on port ${port}. API Swagger docs at http://localhost:${port}/api`);
}
bootstrap();
