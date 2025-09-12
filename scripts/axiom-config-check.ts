import { Axiom } from '@axiomhq/axiom';

async function checkAxiomConfig() {
  console.log('Checking Axiom Configuration...');

  const token = process.env.VITE_AXIOM_TOKEN;
  const dataset = process.env.VITE_AXIOM_DATASET || 'aarez-mgnmt-logs';

  console.log('Token:', token ? token.substring(0, 10) + '...' : 'Not Set');
  console.log('Dataset:', dataset);

  if (!token) {
    console.error('ERROR: Axiom token is not set');
    return;
  }

  console.log('Axiom Configuration Check Complete.');
}

checkAxiomConfig();
