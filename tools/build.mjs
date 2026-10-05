import {build} from 'esbuild';
await build({entryPoints:['src/index.js','src/video.js','src/image.js','src/gallery.js','src/lightbox.js'],outdir:'dist',bundle:true,splitting:true,minify:true,format:'esm',target:'es2022',legalComments:'eof'});
await build({entryPoints:['src/styles.css'],outfile:'dist/styles.css',bundle:true,minify:true});
await build({entryPoints:['src/lightbox.css'],outfile:'dist/lightbox.css',bundle:true,minify:true});
