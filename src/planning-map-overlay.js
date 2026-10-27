import VectorLayer from 'ol/layer/Vector.js';
import VectorSource from 'ol/source/Vector.js';
import GeoJSON from 'ol/format/GeoJSON.js';
import {Style, Stroke, Fill, Text, Circle as CircleStyle} from 'ol/style.js';

const COLORS = Object.freeze({original:'#4cd0ce', nominal:'#b6a0ff', scenario:'#b6a0ff80', envelope:'#e8ae63', route:'#ffda8c', home:'#ffffff'});

function makeStyle(role, color) {
  return new Style({
    stroke: new Stroke({color, width:role === 'route' ? 2.5 : 2, lineDash:role === 'envelope' ? [7,5] : undefined}),
    fill: new Fill({color:role === 'route' ? 'transparent' : color.slice(0,7) + '12'}),
    image: new CircleStyle({radius:role === 'home' ? 8 : 6, fill:new Fill({color}), stroke:new Stroke({color:'#102031', width:2})}),
    text: role === 'home' ? new Text({text:'Launch / Return', offsetY:-22, font:'600 13px sans-serif', fill:new Fill({color:'#fff'}), stroke:new Stroke({color:'#102031', width:4})}) : undefined,
  });
}

// Share one style per role and one route feature across all independent lines.
// A periodic UI refresh must not recreate hundreds of map features or styles.
export function createPlanningMapOverlay({format = new GeoJSON()} = {}) {
  const source = new VectorSource();
  const styles = Object.fromEntries(Object.entries(COLORS).map(([role, color]) => [role, makeStyle(role, color)]));
  const layer = new VectorLayer({source, style:feature => styles[feature.get('role')] || styles.original});
  layer.setZIndex(20);
  let renderedKey = null;

  function update({geometry = null, drift = null, plan = null, sorties = null, home = null} = {}) {
    const entries = [];
    const add = (shape, role) => { if (shape) entries.push({type:'Feature', geometry:shape, properties:{role}}); };
    add(geometry, 'original');
    if (drift?.geometry) {
      add(drift.geometry, 'envelope');
      add(drift.nominalArriveGeometry, 'nominal');
      add(drift.nominalGeometry, 'nominal');
    }
    const routes = sorties?.length
      ? sorties.map(sortie => sortie.waypoints.map(waypoint => waypoint.position))
      : plan?.status === 'generated'
        ? plan.segments.map(segment => [plan.waypoints[segment.from].position, plan.waypoints[segment.to].position])
        : [];
    if (routes.length) add({type:'MultiLineString', coordinates:routes}, 'route');
    if (Array.isArray(home) && home.length === 2 && home.every(Number.isFinite)) add({type:'Point', coordinates:home}, 'home');
    const key = JSON.stringify(entries);
    if (key === renderedKey) return false;
    // Parse before replacing the current features so bad data cannot erase them.
    const features = format.readFeatures({type:'FeatureCollection', features:entries}, {dataProjection:'EPSG:4326', featureProjection:'EPSG:3857'});
    source.clear(true);
    source.addFeatures(features);
    renderedKey = key;
    return true;
  }

  return {source, layer, update};
}
