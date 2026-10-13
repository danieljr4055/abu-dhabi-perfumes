import {defineConfig} from 'vite';
import vinext from 'vinext';
import {fileURLToPath} from 'node:url';
export default defineConfig({
 plugins:[vinext({rscOutDir:'dist-railway/server',ssrOutDir:'dist-railway/server/ssr',clientOutDir:'dist-railway/client'}),{name:'railway-client-output',enforce:'post',config(){return{environments:{client:{build:{outDir:'dist-railway/client',emptyOutDir:false}}}};}}],
 resolve:{alias:{'cloudflare:workers':fileURLToPath(new URL('./src/server/railway-env.ts',import.meta.url))}},
 build:{outDir:'dist-railway',emptyOutDir:false}
});
