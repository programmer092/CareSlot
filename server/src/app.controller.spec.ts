import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('GET /health', () => {
    it('reports the service as up', () => {
      const body = appController.health();
      expect(body.status).toBe('ok');
      expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    });
  });
});
