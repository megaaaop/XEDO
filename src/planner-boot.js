// Inline type=module defers this bootstrap until the body has been parsed.
// The import promise resolves only after the entire entry module evaluates.
export async function runPlannerBoot(doc=document,load=url=>import(url),reload=()=>location.reload()){
  const status=doc.getElementById('planner-startup');
  try{
    await load(doc.getElementById('planner-boot').dataset.entry);
    for(const shell of doc.querySelectorAll('[data-planner-shell]'))shell.removeAttribute('inert');
    status.remove();
  }catch{
    status.setAttribute('role','alert');
    status.querySelector('span').textContent='Planner could not load. Check your connection and reload.';
    const retry=status.querySelector('button');retry.hidden=false;retry.onclick=reload;
  }
}
if(typeof document!=='undefined')void runPlannerBoot();
