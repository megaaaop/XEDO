import Map from 'ol/Map.js';
import View from 'ol/View.js';
import Feature from 'ol/Feature.js';
import TileLayer from 'ol/layer/Tile.js';
import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import OSM from 'ol/source/OSM.js';
import Point from 'ol/geom/Point.js';
import LineString from 'ol/geom/LineString.js';
import {Style, Stroke, Fill, Circle, Icon, Text} from 'ol/style.js';
import {fromLonLat} from 'ol/proj.js';
import {ScaleLine, defaults} from 'ol/control.js';
import {metres, summarizeTrack, validFix} from './drone-track.js';
import './tracking.css';

const route = [[101.2181,12.6617],[101.2181,12.6662],[101.2215,12.6662],[101.2215,12.6623],[101.2249,12.6623],[101.2249,12.6662],[101.2283,12.6662],[101.2283,12.6617],[101.2181,12.6617]];
const legs = route.slice(1).map((p, i) => metres(route[i], p));
const length = legs.reduce((a,b) => a+b,0), steps = 180;
function demoPoint(index) {
  let distance = length * Math.min(steps, index) / steps;
  for (let i=0; i<legs.length; i++) {
    if (distance <= legs[i] || i === legs.length-1) {
      const fraction = Math.min(1,distance/legs[i]);
      return route[i].map((v,k)=>v+(route[i+1][k]-v)*fraction);
    }
    distance -= legs[i];
  }
}
const droneSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><circle cx="32" cy="32" r="29" fill="#0b2534" stroke="#5ce3cf" stroke-width="2"/><g stroke="#eefcfa" stroke-width="3" fill="none"><path d="M23 23l18 18M41 23L23 41"/><circle cx="20" cy="20" r="7"/><circle cx="44" cy="20" r="7"/><circle cx="20" cy="44" r="7"/><circle cx="44" cy="44" r="7"/></g><rect x="27" y="26" width="10" height="13" rx="3" fill="#5ce3cf"/><path d="M32 9l-4 6h8z" fill="#5ce3cf"/></svg>';
const droneIcon = 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(droneSVG);
const labels = {waiting:'Waiting for GPS',invalid:'GPS fix unavailable',clock_unknown:'GPS time unverified',disconnected:'Signal lost',stale:'Position outdated',current:'Receiving GPS'};
const format = (value, digits=1) => Number.isFinite(value) ? value.toLocaleString('en-GB',{maximumFractionDigits:digits}) : '—';
const clock = value => value && Number.isFinite(Date.parse(value)) ? new Intl.DateTimeFormat('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',timeZone:'Asia/Bangkok'}).format(new Date(value)) : '—';

export function initTracking({api, esc, toast}) {
  const panel = document.querySelector('#tracking-page');
  panel.innerHTML = `
    <div class="tracking-toolbar">
      <div class="tracking-modes" role="group" aria-label="Position source">
        <button type="button" data-track-mode="preview" aria-pressed="true" class="active">Preview</button>
        <button type="button" data-track-mode="live" aria-pressed="false">Live device</button>
      </div>
      <label id="tracking-device-control" hidden>Device<select id="tracking-device"><option value="pi-001">Team Raspberry Pi · pi-001</option></select></label>
      <div class="tracking-actions" id="tracking-demo-controls">
        <button type="button" id="tracking-play" class="button primary">Pause preview</button>
        <button type="button" id="tracking-loss" class="button secondary" aria-pressed="false">Try signal loss</button>
        <button type="button" id="tracking-reset" class="button quiet">Reset</button>
      </div>
    </div>
    <div id="tracking-source-note" class="tracking-source-note">SIMULATED DATA · A sample flight near Rayong. No drone is connected.</div>
    <div class="tracking-layout">
      <section class="panel tracking-map-panel" aria-label="Drone position map">
        <div class="tracking-map-heading"><div><span class="tracking-kicker" id="tracking-map-kicker">RAYONG · SAMPLE FLIGHT</span><h2 id="tracking-map-title">XEDO Preview 01</h2></div><span id="tracking-status" class="tracking-status" role="status">Preview running</span></div>
        <div class="tracking-map-wrap"><div id="tracking-map" tabindex="0" aria-label="Map showing the latest drone position and received route"></div>
          <div id="tracking-map-notice" class="tracking-map-notice" hidden></div>
          <div class="tracking-map-tools"><button type="button" id="tracking-follow" aria-pressed="true">Follow drone</button><button type="button" id="tracking-fit">Show route</button></div>
          <div class="tracking-map-legend"><span><i class="tracking-line"></i>Received track</span><span id="tracking-planned-legend"><i class="tracking-dash"></i>Sample route</span><span><i class="tracking-start"></i><span id="tracking-start-legend">Sample start</span></span></div>
        </div>
        <div class="tracking-map-footer"><span id="tracking-count">0 position samples</span><span>WGS84 · Times in ICT (UTC+7)</span></div>
      </section>
      <aside class="tracking-details">
        <section id="tracking-position" class="panel tracking-position"><div class="tracking-detail-heading"><h2>Latest position</h2><span id="tracking-fix-label">SIMULATED</span></div>
          <dl class="tracking-coordinates"><div><dt>Latitude</dt><dd id="tracking-lat">—</dd></div><div><dt>Longitude</dt><dd id="tracking-lon">—</dd></div></dl>
          <div class="tracking-position-time"><span id="tracking-time">—</span><span id="tracking-age">—</span></div>
          <p id="tracking-position-note">Position values are simulated.</p>
        </section>
        <section class="panel tracking-metrics" aria-label="Latest telemetry">
          <article><span>Altitude</span><strong id="tracking-altitude">—</strong><small id="tracking-altitude-ref">No measurement</small></article>
          <article><span>Speed</span><strong id="tracking-speed">—</strong><small>Calculated from GPS</small></article>
          <article><span>Battery</span><strong id="tracking-battery">—</strong><small id="tracking-battery-source">No measurement</small></article>
          <article><span>Track distance</span><strong id="tracking-distance">—</strong><small>Received segments only</small></article>
        </section>
        <section class="panel tracking-feed"><div class="tracking-detail-heading"><h2>Position updates</h2><span>ICT</span></div><ol id="tracking-updates"></ol><div class="tracking-export"><button type="button" id="tracking-export" class="button secondary">Export track GeoJSON</button></div></section>
      </aside>
    </div>
    <div class="tracking-bottom-note"><p id="tracking-connection-note">Preview updates every second. Pause or interrupt the signal to see how tracking behaves.</p><a class="text-link" href="/docs/drone-tracking.md" target="_blank" rel="noopener">Connect a real drone</a></div>`;
  const $ = id => panel.querySelector('#tracking-'+id);
  let mode='preview', active=false, running=true, lost=false, follow=true, timer=null, busy=false, generation=0;
  let events=[], state=null, frame=12, receivedAt=performance.now(), serverNow=Date.now(), error=null, centered=false, devicesLoaded=false;
  const source=new VectorSource(), planned=new VectorSource(), tiles=new OSM();
  const projected = coordinates => coordinates.map(coordinate => fromLonLat(coordinate));
  const lineStyle=new Style({stroke:new Stroke({color:'#5ce3cf',width:3})});
  const startStyle=new Style({image:new Circle({radius:6,fill:new Fill({color:'#0b2534'}),stroke:new Stroke({color:'#f2c879',width:3})}),text:new Text({text:'START',offsetY:18,font:'600 11px DM Sans',fill:new Fill({color:'#f5e3b8'}),stroke:new Stroke({color:'#102535',width:4})})});
  const markerStyle=new Style({image:new Icon({src:droneIcon,scale:.72})});
  const map=new Map({target:$('map'),layers:[new TileLayer({source:tiles}),new VectorLayer({source:planned,style:new Style({stroke:new Stroke({color:'#758a98',width:2,lineDash:[7,8]})})}),new VectorLayer({source,style:f=>f.get('role')==='drone'?markerStyle:f.get('role')==='start'?startStyle:lineStyle})],view:new View({center:fromLonLat(route[3]),zoom:15}),controls:defaults({rotate:false}).extend([new ScaleLine()])});
  const allCoordinates = () => events.filter(validFix).map(e=>[e.position.longitude,e.position.latitude]);
  function fit() {
    const coords=mode==='preview'?route:allCoordinates();
    if(!coords.length)return;
    const geometry=new LineString(projected(coords));
    map.getView().fit(geometry.getExtent(),{padding:[60,60,85,60],maxZoom:16,duration:250});
    centered=true;
  }
  map.on('pointerdrag',()=>{follow=false;updateFollow();});
  function updateFollow() {$('follow').setAttribute('aria-pressed',String(follow));$('follow').textContent=follow?'Following drone':'Follow drone';}
  tiles.on('tileloaderror',()=>{$('map-notice').hidden=false;$('map-notice').textContent='Map tiles unavailable. The GPS track remains visible.';});
  tiles.on('tileloadend',()=>{$('map-notice').hidden=true;});
  function demoEvent(index, time) {
    const p=demoPoint(index);
    return {event_id:'preview-'+index,device_id:'preview-only',boot_id:'preview-flight',sequence:index,source_mode:'simulated',clock_quality:'simulation_clock',observed_at:new Date(time).toISOString(),received_at:new Date(time).toISOString(),position:{valid:true,longitude:p[0],latitude:p[1],altitude_m:48+Math.sin(index/13)*3,altitude_reference:'AGL'},battery:{percent:Math.max(55,98-index*.2)},health:{agent:'online'}};
  }
  function seedDemo() {
    const now=Date.now();frame=12;
    events=Array.from({length:frame+1},(_,i)=>demoEvent(i,now-(frame-i)*1000));
    state={latest:events.at(-1),connection:'online',configured:false};
    error=null;receivedAt=performance.now();serverNow=now;centered=false;
  }
  function currentSummary() {
    const now=serverNow+(performance.now()-receivedAt);
    return {...summarizeTrack(state||{},events,now),now};
  }
  function render() {
    const summary=currentSummary(), fix=summary.fix, latest=state?.latest;
    const live=mode==='live', current=live && !error && summary.position_status==='current';
    const label=live?(error?'Connection unavailable':labels[summary.position_status]):(lost?'Signal interrupted · preview':!running?'Preview paused':frame>=steps?'Preview complete':'Preview running');
    $('status').textContent=label;$('status').dataset.state=current?'current':live||lost?'warning':'preview';
    $('fix-label').textContent=live?(current?'DEVICE GPS':fix?'LAST KNOWN':'NO FIX'):'SIMULATED';
    $('lat').textContent=fix?fix.position.latitude.toFixed(6)+'°':'—';
    $('lon').textContent=fix?fix.position.longitude.toFixed(6)+'°':'—';
    $('time').textContent=fix?clock(fix.observed_at)+' ICT':'No position received';
    $('age').textContent=fix?format(Math.floor(summary.position_age_s),0)+' s ago':'—';
    $('position').classList.toggle('tracking-last-known',live&&!current);
    $('position-note').textContent=!live?'Position values are simulated.':current?'Latest GPS reported by the device.':fix?'Last known position. The drone’s current location is not confirmed.':'Waiting for a valid GPS fix from the selected device.';
    $('altitude').textContent=fix&&Number.isFinite(fix.position.altitude_m)?format(fix.position.altitude_m)+' m':'—';
    $('altitude-ref').textContent=fix?.position.altitude_reference==='AGL'?'Above ground':fix?.position.altitude_reference==='MSL'?'Above mean sea level':fix?.position.altitude_reference==='ellipsoid'?'Above WGS84 ellipsoid':'Reference unknown';
    $('speed').textContent=(!live||current)&&Number.isFinite(summary.speed_m_s)?format(summary.speed_m_s)+' m/s':'—';
    $('battery').textContent=Number.isFinite(latest?.battery?.percent)?format(latest.battery.percent,0)+'%':'—';
    $('battery-source').textContent=!live?'Simulated battery':latest?.battery?.percent==null?'No measurement':current?'Device measurement':'Last reported value';
    $('distance').textContent=fix?format(summary.distance_m,0)+' m':'—';
    $('count').textContent=events.length+' samples · '+(!live?'Preview flight':state?.truncated?'Most recent 300 in this session':'Current device session');
    $('updates').innerHTML=events.slice(-4).reverse().map(e=>`<li><time>${clock(e.observed_at)}</time><div><strong>${validFix(e)?'Position '+(e.sequence+1):'GPS unavailable'}</strong><span>${validFix(e)?e.position.latitude.toFixed(5)+'°, '+e.position.longitude.toFixed(5)+'°':'No valid coordinates in this update'}</span></div></li>`).join('')||'<li class="tracking-empty">No position updates yet.</li>';
    $('export').disabled=!fix;
    source.clear();
    for(const segment of summary.segments)if(segment.length>1)source.addFeature(new Feature({geometry:new LineString(projected(segment)),role:'track'}));
    const first=events.find(validFix);
    if(first)source.addFeature(new Feature({geometry:new Point(fromLonLat([first.position.longitude,first.position.latitude])),role:'start'}));
    if(fix) {
      const coord=fromLonLat([fix.position.longitude,fix.position.latitude]);
      markerStyle.getImage().setOpacity(live&&!current ? .48 : 1);
      source.addFeature(new Feature({geometry:new Point(coord),role:'drone'}));
      if(!centered)fit();
      if(follow && (current||!live&&!lost))map.getView().setCenter(coord);
    }
    if(live) {
      $('source-note').textContent='LIVE DEVICE DATA · '+(current?'Latest GPS reported by the selected device.':'Current position is not confirmed.');
      $('connection-note').textContent=error?'Unable to read device data. Retrying every 2 seconds.':!state?.configured?'The device upload connection is not configured yet. Preview is available while hardware is being connected.':'GPS refreshes every 2 seconds. Values older than 5 seconds are marked outdated; after 15 seconds the signal is marked lost.';
    }
    $('play').textContent=running&&frame<steps?'Pause preview':frame>=steps?'Restart preview':'Resume preview';
    $('play').disabled=lost;
    $('loss').textContent=lost?'Restore signal':'Try signal loss';$('loss').setAttribute('aria-pressed',String(lost));
  }
  async function loadDevices() {
    if(devicesLoaded)return;
    try {
      const result=await api('v1/devices');
      const devices=result.items.filter(d=>d.sourceMode==='live');
      if(devices.length)$('device').innerHTML=devices.map(d=>`<option value="${esc(d.id)}">${esc(d.name)} · ${esc(d.id)}</option>`).join('');
      devicesLoaded=true;
    } catch {/* The known default device remains selectable. */}
  }
  async function poll() {
    if(!active||mode!=='live'||busy)return;
    busy=true;const token=generation, device=$('device').value;
    try {
      const result=await api('v1/devices/'+encodeURIComponent(device)+'/track?mode=live');
      if(token!==generation||mode!=='live'||!active)return;
      events=result.events;state=result;error=null;
      serverNow=Date.parse(result.server_time);receivedAt=performance.now();render();
    } catch(e) {
      if(token!==generation||mode!=='live'||!active)return;
      error=e.message;render();
    } finally {busy=false;}
  }
  let tick=0;
  function startTimer() {
    clearInterval(timer);tick=0;
    timer=setInterval(()=>{
      if(!active||document.hidden)return;
      if(mode==='preview') {
        if(running&&!lost&&frame<steps){frame++;const now=Date.now();events.push(demoEvent(frame,now));state.latest=events.at(-1);serverNow=now;receivedAt=performance.now();}
        render();
      } else {render();if(++tick%2===0)poll();}
    },1000);
  }
  async function setMode(next) {
    generation++;mode=next;events=[];state=null;error=null;centered=false;follow=true;updateFollow();
    for(const button of panel.querySelectorAll('[data-track-mode]')){const selected=button.dataset.trackMode===mode;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));}
    const live=mode==='live';$('device-control').hidden=!live;$('demo-controls').hidden=live;$('planned-legend').hidden=live;
    $('source-note').textContent=live?'LIVE DEVICE DATA · Waiting for GPS from your connected drone.':'SIMULATED DATA · A sample flight near Rayong. No drone is connected.';
    $('source-note').dataset.mode=mode;
    $('map-kicker').textContent=live?'CONNECTED DEVICE · GPS TELEMETRY':'RAYONG · SAMPLE FLIGHT';
    $('map-title').textContent=live?$('device').selectedOptions[0].textContent:'XEDO Preview 01';
    $('start-legend').textContent=live?'First received fix':'Sample start';
    startStyle.getText().setText(live?'FIRST FIX':'START');
    $('connection-note').textContent='Preview updates every second. Pause or interrupt the signal to see how tracking behaves.';
    planned.clear();
    if(!live){running=true;lost=false;seedDemo();planned.addFeature(new Feature(new LineString(projected(route))));}
    render();
    if(active){map.updateSize();startTimer();if(!live)fit();else{await loadDevices();$('map-title').textContent=$('device').selectedOptions[0].textContent;poll();}}
  }
  for(const button of panel.querySelectorAll('[data-track-mode]'))button.onclick=()=>{if(mode!==button.dataset.trackMode)setMode(button.dataset.trackMode);};
  $('play').onclick=()=>{if(frame>=steps){seedDemo();running=true;}else running=!running;render();};
  $('reset').onclick=()=>{lost=false;running=true;seedDemo();fit();render();};
  $('loss').onclick=()=>{lost=!lost;if(!lost){serverNow=Date.now();receivedAt=performance.now();}render();};
  $('follow').onclick=()=>{follow=!follow;updateFollow();render();};
  $('fit').onclick=()=>{follow=false;updateFollow();fit();};
  $('device').onchange=()=>setMode('live');
  $('export').onclick=()=>{
    const summary=currentSummary();
    const metadata={device_id:mode==='preview'?'preview-only':$('device').value,source_mode:mode==='preview'?'simulated':'live',boot_id:state?.latest?.boot_id,exported_at:new Date().toISOString(),coverage:state?.truncated?'last_300_samples':'current_session',position_status:mode==='preview'?'simulated':summary.position_status};
    const features=summary.segments.filter(s=>s.length>1).map(s=>({type:'Feature',properties:{...metadata,kind:'received_track'},geometry:{type:'LineString',coordinates:s}}));
    features.push(...events.filter(validFix).map(e=>({type:'Feature',properties:{...metadata,kind:'position',observed_at:e.observed_at,sequence:e.sequence,altitude_m:e.position.altitude_m??null,altitude_reference:e.position.altitude_reference??'unknown'},geometry:{type:'Point',coordinates:[e.position.longitude,e.position.latitude]}})));
    const url=URL.createObjectURL(new Blob([JSON.stringify({type:'FeatureCollection',metadata,features},null,2)],{type:'application/geo+json'}));
    const link=document.createElement('a');link.href=url;link.download='XEDO-'+metadata.source_mode+'-track.geojson';link.hidden=true;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);toast('Track exported · '+metadata.source_mode);
  };
  setMode('preview');
  return {page(page){active=page==='tracking';generation++;clearInterval(timer);timer=null;if(active){requestAnimationFrame(()=>{map.updateSize();if(!centered)fit();});startTimer();if(mode==='live'){loadDevices().then(poll);}render();}},suspend(){active=false;generation++;clearInterval(timer);timer=null;}};
}
