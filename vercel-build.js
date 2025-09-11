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
    await execAsync('npx tsc --project tsconfig.json --outDir dist/api');
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

  // Copy necessary files to dist/api
  const filesToCopy = [
    'api/index.ts',
    'api/app.ts',
    'package.json'
  ];

  filesToCopy.forEach(file => {
    const sourcePath = path.resolve(file);
    const destPath = path.resolve(distApiPath, path.basename(file).replace('.ts', '.js'));
    
    if (fs.existsSync(sourcePath)) {
      // Compile individual file if not already compiled
      try {
        execAsync(`npx tsc ${sourcePath} --outDir ${distApiPath} --module ESNext`);
        console.log(`Compiled and copied ${file} to ${destPath}`);
      } catch (error) {
        console.error(`Failed to compile ${file}:`, error);
      }
    } else {
      console.warn(`File not found: ${sourcePath}`);
    }
  });

  // Create a package.json in dist for module resolution
  const distPackageJson = {
    type: "module"
  };
  fs.writeFileSync(path.resolve('dist/package.json'), JSON.stringify(distPackageJson, null, 2));
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
