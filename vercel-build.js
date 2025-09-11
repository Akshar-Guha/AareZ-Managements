#!/usr/bin/env node
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function compileTypescript() {
  console.log('Starting TypeScript compilation...');
  try {
    // Compile TypeScript files
    await execAsync('npx tsc --project tsconfig.json');
    console.log('TypeScript compilation completed successfully.');
  } catch (error) {
    console.error('TypeScript compilation failed:', error);
    process.exit(1);
  }
}

async function prepareBuildOutput() {
  console.log('Preparing build output...');
  
  // Ensure dist directory exists
  const distPath = path.resolve('dist');
  if (!fs.existsSync(distPath)) {
    fs.mkdirSync(distPath);
  }

  // Copy necessary files to dist
  const filesToCopy = [
    'api/index.js',
    'api/app.js',
    'package.json'
  ];

  filesToCopy.forEach(file => {
    const sourcePath = path.resolve(file);
    const destPath = path.resolve(distPath, path.basename(file));
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied ${file} to ${destPath}`);
    } else {
      console.warn(`File not found: ${sourcePath}`);
    }
  });
}

async function main() {
  try {
    // Run Vite build first
    await execAsync('npm run build');
    
    // Compile TypeScript files
    await compileTypescript();
    
    // Prepare build output
    await prepareBuildOutput();
    
    console.log('Vercel build completed successfully.');
  } catch (error) {
    console.error('Vercel build failed:', error);
    process.exit(1);
  }
}

main();
