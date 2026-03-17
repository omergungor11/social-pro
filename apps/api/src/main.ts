import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./modules/common/filters/http-exception.filter";
import { ResponseInterceptor } from "./modules/common/interceptors/response.interceptor";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Global prefix
  app.setGlobalPrefix("api/v1");

  // CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  // Global exception filter — formats all HttpExceptions as { error: { ... } }
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global response interceptor — wraps successful responses in { data, meta? }
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle("Social Pro API")
    .setDescription("Agency social media management API")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document);

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`Social Pro API running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
