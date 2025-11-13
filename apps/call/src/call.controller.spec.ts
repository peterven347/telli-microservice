import { Test, TestingModule } from '@nestjs/testing';
import { CallController } from './call.controller';
import { CallService } from './call.service';

describe('CallServiceController', () => {
  let callController: CallController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [CallController],
      providers: [CallService],
    }).compile();

    callController = app.get<CallController>(CallController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(callController.getHello()).toBe('Hello World!');
    });
  });
});
