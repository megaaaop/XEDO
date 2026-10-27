import {INSPECTOR_PROJECT_URL,INSPECTOR_PUBLISHABLE_KEY} from '../src/inspector-project.js';
const response=await fetch(INSPECTOR_PROJECT_URL+'/auth/v1/settings',{headers:{apikey:INSPECTOR_PUBLISHABLE_KEY},signal:AbortSignal.timeout(12000)});
if(!response.ok)throw Error('Supabase public Auth settings check failed: '+response.status);
const settings=await response.json();
console.log(JSON.stringify({projectRef:'tstmjnlhwidwtzetqxbu',authReachable:true,emailEnabled:settings.external?.email===true,signupDisabled:settings.disable_signup===true,checkedAt:new Date().toISOString(),scope:'Read-only public settings; no login, real accounts or mission writes tested.'},null,2));
