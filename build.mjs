import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const outdir = 'docs';

// Ensure output directory exists
if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir, { recursive: true });
}

async function build() {
  try {
    // Build the JavaScript bundle
    await esbuild.build({
      entryPoints: ['src/index.tsx'],
      bundle: true,
      outfile: path.join(outdir, 'bundle.js'),
      format: 'iife',
      target: ['es2022'],
      minify: process.env.NODE_ENV === 'production',
      sourcemap: process.env.NODE_ENV !== 'production',
      jsx: 'automatic',
      jsxImportSource: 'preact',
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
        'process.browser': 'true',
        'global': 'window',
      },
      alias: {
        'stream': 'stream-browserify',
        'util': 'util',
        'buffer': 'buffer',
      },
      inject: ['./src/polyfills.js'],
      loader: {
        '.ts': 'ts',
        '.tsx': 'tsx',
      },
    });

    // Copy HTML
    fs.copyFileSync('src/index.html', path.join(outdir, 'index.html'));

    // Copy CSS
    fs.copyFileSync('src/styles.css', path.join(outdir, 'styles.css'));

    console.log('Build complete! Output in', outdir);
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
