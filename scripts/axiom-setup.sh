#!/bin/bash

# Axiom Setup Script

# Check if Axiom token is provided
if [ -z "$AXIOM_TOKEN" ]; then
  echo "Error: AXIOM_TOKEN is not set. Please provide your Axiom API token."
  exit 1
fi

# Create or update .env.local file
echo "VITE_AXIOM_TOKEN=$AXIOM_TOKEN" > .env.local
echo "VITE_AXIOM_DATASET=aarez-mgnmt-logs" >> .env.local

# Verify Axiom dataset
npx @axiomhq/axiom dataset list | grep "aarez-mgnmt-logs" > /dev/null
if [ $? -ne 0 ]; then
  echo "Creating Axiom dataset: aarez-mgnmt-logs"
  npx @axiomhq/axiom dataset create aarez-mgnmt-logs
fi

# Test logging
node -e "
const { axiomLogger } = require('./dist/lib/axiomLogger.js');
axiomLogger.info('Axiom setup complete', { 
  timestamp: new Date().toISOString(), 
  context: 'setup-script' 
});
"

echo "Axiom setup completed successfully!"
