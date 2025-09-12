#!/usr/bin/env node

const token = process.env.VITE_AXIOM_TOKEN;
const dataset = process.env.VITE_AXIOM_DATASET;

console.log('Axiom Token:', token ? token.substring(0, 10) + '...' : 'Not Set');
console.log('Axiom Dataset:', dataset || 'Not Set');
