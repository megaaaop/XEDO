// HTTPS hosting must not turn a standalone prototype into a missing API client.
export function planningRuntime(protocol, standaloneBuild = false) {
  const localFile = protocol === 'file:';
  const standalone = localFile || standaloneBuild === true;
  return {
    standalone,
    localFile,
    label: localFile ? 'Local planning' : standalone ? 'Inspection planner' : 'Planning workspace'
  };
}

export async function requestPlanningTrial(runtime, path, options = {}, fetchImpl = globalThis.fetch) {
  if (runtime.standalone) {
    const {fileTrialAPI} = await import('./planning-file-api.js');
    return fileTrialAPI(path, options);
  }
  const response = await fetchImpl('/api/v2/planning-trial' + path, {
    credentials: 'same-origin', redirect: 'error', cache: 'no-store', ...options,
    headers: {'Content-Type': 'application/json', ...options.headers}
  });
  if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('The server did not return API JSON. Check workspace access.');
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'The trial request failed.');
  return data;
}
