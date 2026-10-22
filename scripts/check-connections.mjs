import {runtimeConfig} from './runtime-config.mjs';
import {probeGEE} from '../src/gee-connection.js';
import {probeSupabase} from '../src/supabase-connection.js';

// Read-only service checks. Never print environment variables or provider bodies.
const env=await runtimeConfig();
const configuration=env.GEE_CONFIGURATION;
const [supabase,gee]=await Promise.all([
  probeSupabase(process.env),
  configuration.state==='configured'
    ? probeGEE(env)
    : Promise.resolve({state:configuration.state,code:configuration.code,message:configuration.message,upstream_ms:null})
]);
console.log(JSON.stringify({supabase,gee:{project:env.GEE_PROJECT_ID||null,...gee}},null,2));
if(supabase.state!=='connected'||gee.state!=='connected')process.exitCode=1;
