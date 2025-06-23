import { HealthController } from '../controllers/healthController';

describe('Minimal Import Test', () => {
  it('should be able to import HealthController', () => {
    // Simply test that the import works
    const controller = new HealthController();
    expect(controller).toBeDefined();
  });
});
