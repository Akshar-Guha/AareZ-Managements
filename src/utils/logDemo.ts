import Logger from '../lib/logger';

export function runLoggingDiagnostics() {
  console.log('Starting Logging Diagnostics...');

  // System Startup Log
  Logger.info('System Startup', {
    version: '0.1.0',
    environment: import.meta.env.MODE,
    timestamp: new Date().toISOString(),
    systemInfo: {
      platform: navigator.platform,
      userAgent: navigator.userAgent
    }
  });

  // Simulated User Activities
  const simulateUserActivities = () => {
    const userActivities = [
      { userId: 'user_001', action: 'login', success: true },
      { userId: 'user_002', action: 'profile_update', success: true },
      { userId: 'user_003', action: 'purchase', success: false }
    ];

    userActivities.forEach(activity => {
      Logger.info('User Activity', {
        userId: activity.userId,
        action: activity.action,
        success: activity.success,
        timestamp: new Date().toISOString()
      });
    });
  };

  // Error Simulation
  const simulateErrors = () => {
    const errorScenarios = [
      { type: 'network', message: 'Connection timeout' },
      { type: 'validation', message: 'Invalid input data' },
      { type: 'authentication', message: 'Unauthorized access attempt' }
    ];

    errorScenarios.forEach(scenario => {
      Logger.error(`Simulated ${scenario.type} error`, {
        errorType: scenario.type,
        errorMessage: scenario.message,
        timestamp: new Date().toISOString()
      });
    });
  };

  // Performance Logging
  const measurePerformance = () => {
    const start = performance.now();
    // Simulate some work
    for (let i = 0; i < 1000000; i++) {
      Math.sqrt(i);
    }
    const end = performance.now();

    Logger.debug('Performance Measurement', {
      operation: 'heavy_computation',
      duration: end - start,
      timestamp: new Date().toISOString()
    });
  };

  // Run diagnostic functions
  simulateUserActivities();
  simulateErrors();
  measurePerformance();

  console.log('Logging Diagnostics Complete.');
}

// Run diagnostics only in development
if (import.meta.env.DEV) {
  runLoggingDiagnostics();
}
