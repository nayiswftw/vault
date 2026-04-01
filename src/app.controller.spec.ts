import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const prismaServiceMock = {
      $queryRaw: jest.fn().mockResolvedValue([{ result: 1 }]),
    };

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: PrismaService,
          useValue: prismaServiceMock,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return service status', () => {
      expect(appController.getHealth()).toEqual({
        status: 'ok',
        service: 'finance-backend-api',
      });
    });
  });

  describe('readiness', () => {
    it('should return readiness status', async () => {
      const readiness = await appController.getReadiness();

      expect(readiness).toEqual(
        expect.objectContaining({
          status: 'ok',
          service: 'finance-backend-api',
          database: 'up',
        }),
      );
      expect(readiness.timestamp).toEqual(expect.any(String));
    });
  });
});
