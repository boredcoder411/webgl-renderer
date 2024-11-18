import { defineConfig } from 'vite';
import CompressionPlugin from 'vite-plugin-compression';

export default defineConfig({
  // General Vite build options
  build: {
    // Set the output directory for the build files (adjust as needed)
    outDir: 'dist', 
    
    // Minify the code for production
    minify: 'esbuild', 
    
    // Gzip is most useful in production mode, so ensure sourcemaps and other dev features are disabled
    sourcemap: false, 

    // Optional: To generate `.gz` files, you'll use the CompressionPlugin
    rollupOptions: {
      plugins: [
        CompressionPlugin({
          algorithm: 'gzip',  // Set the algorithm to gzip
          ext: '.gz',         // The extension for gzipped files
          threshold: 5120,   // Only compress files larger than 5KB
          deleteOriginalAssets: false,  // Keep the original (uncompressed) files
        })
      ],
    },
  },
  
  // Vite plugins
  plugins: [
    // Compression plugin for gzip
    CompressionPlugin({
      algorithm: 'gzip',  // Set the algorithm to gzip
      ext: '.gz',         // The extension for gzipped files
      threshold: 5120,   // Only compress files larger than 5KB
      deleteOriginalAssets: false,  // Keep the original (uncompressed) files
    }),
  ],

  // Base path for the project (adjust as needed)
  base: '/',
});
