import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { MongoMemoryServer } from 'mongodb-memory-server';
import * as fs from 'fs';
import * as path from 'path';
import { AppModule } from '../src/app.module';

async function generate() {
  console.log('Starting in-memory MongoDB server...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();

  // Inject required variables to prevent bootstrap crash
  process.env.MONGODB_URI = uri;
  process.env.JWT_SECRET = 'test-secret-at-least-32-chars-long-for-hmac-sha256';
  process.env.REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long';
  process.env.REDIS_PASSWORD = 'test';
  process.env.CORS_ORIGIN = 'http://localhost:3000';

  console.log('Bootstrapping NestJS application...');
  const app = await NestFactory.create(AppModule);

  console.log('Generating OpenAPI specification...');
  const config = new DocumentBuilder()
    .setTitle('AI Mentor OS - API')
    .setDescription('Modular adaptive learning engine REST API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const specPath = path.join(__dirname, '../../frontend/src/shared/services/api/swagger-spec.json');
  fs.mkdirSync(path.dirname(specPath), { recursive: true });
  fs.writeFileSync(specPath, JSON.stringify(document, null, 2));
  console.log(`OpenAPI specification written successfully to: ${specPath}`);

  await app.close();
  await mongod.stop();
  console.log('Done!');
  process.exit(0);
}

generate().catch((err) => {
  console.error('Error generating OpenAPI spec:', err);
  process.exit(1);
});
