import { axiomLogger } from '../src/lib/axiomLogger';

async function runLoggingTests() {
  console.log('Starting Axiom Logging Tests...');

  try {
    // Info Log Test
    axiomLogger.info('System Startup', {
      version: '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString()
    });

    // Debug Log Test
    axiomLogger.debug('Diagnostic Information', {
      systemTime: new Date().toISOString(),
      memoryUsage: process.memoryUsage()
    });

    // Error Log Test
    try {
      throw new Error('Simulated Error for Testing');
    } catch (error) {
      axiomLogger.error('Test Error Scenario', {
        errorMessage: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : 'No stack trace'
      });
    }

    // User Activity Tracking Test
    axiomLogger.trackUserActivity('system', 'logging-test', {
      testType: 'comprehensive',
      timestamp: new Date().toISOString()
    });

    console.log('Axiom Logging Tests Completed Successfully! 🎉');
  } catch (testError) {
    console.error('Axiom Logging Test Failed:', testError);
  }
}

runLoggingTests();
