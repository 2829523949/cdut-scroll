import { build } from 'esbuild';
await build({entryPoints:['worker.js'],outfile:'dist/worker.mjs',format:'esm',bundle:true,platform:'browser',target:'es2022',plugins:[{name:'admin-assets',setup(build){build.onLoad({filter:/[\\/]ui[\\/]admin\.(html|js|css)$/},async args=>({contents:await (await import('node:fs/promises')).readFile(args.path,'utf8'),loader:'text'}));}}]});
console.log('Built result service and admin interface.');
