import { axiomLogger } from './axiomLogger';

describe('AxiomLogger', () => {
  it('should log information', () => {
    const consoleSpy = jest.spyOn(console, 'log');
    
    axiomLogger.info('Test log message', { 
      testContext: 'unit-test',
      timestamp: new Date().toISOString()
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[INFO]'),
      expect.stringContaining('Test log message'),
      expect.objectContaining({
        testContext: 'unit-test'
      })
    );

    consoleSpy.mockRestore();
  });

  it('should log errors', () => {
    const consoleSpy = jest.spyOn(console, 'error');
    
    axiomLogger.error('Test error message', { 
      errorContext: 'unit-test-error',
      timestamp: new Date().toISOString()
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('[ERROR]'),
      expect.stringContaining('Test error message'),
      expect.objectContaining({
        errorContext: 'unit-test-error'
      })
    );

    consoleSpy.mockRestore();
  });
});
