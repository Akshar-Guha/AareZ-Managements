#!/usr/bin/env node
import { exec, execSync } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function compileTypescript() {
  console.log('Starting TypeScript compilation...');
  try {
    // Compile TypeScript files with specific configuration
    execSync('npx tsc --project tsconfig.json --outDir dist/api', { stdio: 'inherit' });
    console.log('TypeScript compilation completed successfully.');
  } catch (error) {
    console.error('TypeScript compilation failed:', error);
    process.exit(1);
  }
}

async function prepareBuildOutput() {
  console.log('Preparing build output...');
  
  // Ensure dist/api directory exists
  const distApiPath = path.resolve('dist/api');
  fs.mkdirSync(distApiPath, { recursive: true });

  // Copy necessary files to dist
  const filesToCopy = [
    'index.html',
    'package.json'
  ];

  filesToCopy.forEach(file => {
    const sourcePath = path.resolve(file);
    const destPath = path.resolve('dist', file);
    
    if (fs.existsSync(sourcePath)) {
      fs.copyFileSync(sourcePath, destPath);
      console.log(`Copied ${file} to ${destPath}`);
    } else {
      console.warn(`File not found: ${sourcePath}`);
    }
  });

  // Create a package.json in dist for module resolution
  const distPackageJson = {
    type: "module",
    name: "aarez-mgnmt-vercel-build"
  };
  fs.writeFileSync(path.resolve('dist/package.json'), JSON.stringify(distPackageJson, null, 2));
}

async function main() {
  try {
    // Run Vite build first
    await execAsync('npm run build');
    
    // Compile TypeScript files
    compileTypescript();
    
    // Prepare build output
    prepareBuildOutput();
    
    console.log('Vercel build completed successfully.');
  } catch (error) {
    console.error('Vercel build failed:', error);
    process.exit(1);
  }
}

main();
