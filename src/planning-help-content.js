/** Contextual, read-only help shared by the hosted and local-file planners. */
export const planningHelpTopics = {
  area: {
    title: 'Inspection area',
    paragraphs: [
      'Draw the area you want to inspect. This boundary defines a search area; it does not confirm an oil spill or measure the oil itself.'
    ],
    bullets: [
      'Choose Draw polygon, select at least three corners, then double-click or choose Finish area. One polygon with 3–120 corners and no holes is supported.',
      'Cancel drawing keeps the previous area. Escape also cancels drawing. Clear area removes the selected trial boundary and its current results.',
      'Use Fit to bring the selected area back into view. You can also import a Polygon GeoJSON or a trial snapshot.',
      'Changing the boundary clears the current image review. Survey the new area before preparing a flight plan.'
    ],
    formulas: []
  },
  satellite: {
    title: 'Satellite imagery',
    paragraphs: [
      'Review the image inside your inspection boundary before preparing the mission. The image must cover the whole boundary and finish loading.',
      'The acquisition date is when the satellite captured the image. It is not the time you opened this page. An archived image is not a live GEE observation.'
    ],
    bullets: [
      'The standalone prototype contains a stored Sentinel-2 image captured on 29 September 2026. Areas outside its prepared crop cannot use that image.',
      'The full workspace, when configured, uses its image catalogue and saved image sources. A saved survey reopens its original frozen boundary and image.',
      'A stored preview and an original image asset are different display sources. Source identity, coverage and acquisition time must match the selected inspection.',
      'Viewing an image does not confirm oil. This trial does not automatically detect or confirm a spill with AI.'
    ],
    formulas: []
  },
  map: {
    title: 'Map layers & route preview',
    paragraphs: [
      'The hosted map loads a Google Earth Engine Sentinel-2 background before you draw an area. It combines recent acquisitions; the displayed date range describes the source imagery. Draw your inspection boundary over the map. A route drawn on the map is not, by itself, an assessed flight.'
    ],
    bullets: [
      'Inspection area: the cyan boundary selected for satellite review. Background imagery is navigation context; Review area image loads a single dated acquisition before mission preparation.',
      'Forecast: purple outlines showing the nominal shifted boundary at arrival and survey end. Search envelope: the dashed amber box enclosing the supplied drift scenarios and margin.',
      'Route: pale yellow flight lines. Assessed sorties include outbound travel and return to the configured home; a geometric route can appear before those assessments are complete.',
      'The 3D view is a flat-surface height diagram. It does not verify terrain, obstacles or clearance. Use 2D to review the source image and boundary.'
    ],
    formulas: []
  },
  trial: {
    title: 'About this trial',
    paragraphs: [
      'Use three steps: select an area, review satellite imagery, then prepare a drone mission. Drift, flight, export and oil/material calculations run behind that flow. Mission settings holds the inputs; Calculation details explains the results.',
      'Unknown physical inputs stay blank. Load test example fills synthetic aircraft, weather and material inputs; it does not turn the archived satellite image into a current oil observation.'
    ],
    bullets: [
      'In the standalone prototype, including static hosting, the calculators, stored image and downloads work without an API server. Basemap tiles need internet. Saved survey lookup by ID needs the separate full workspace service.',
      'Calculations do not fetch current weather, currents, official airspace restrictions or AI predictions. GEE imagery and historical terrain are separate from live environmental data.',
      'Results update after satellite review and relevant setting changes. Missing inputs and failed checks remain visible beside the affected result.',
      'Downloading a file does not upload or start a mission. Aircraft control, arming, camera triggers and capsule release are not connected in this trial.'
    ],
    formulas: []
  },
  drift: {
    title: 'Drift model',
    paragraphs: [
      'Estimate movement between the observation, arrival and survey-end times using constant surface-current and 10 m wind vectors. Missing vectors remain unknown; calm conditions are not assumed.'
    ],
    bullets: [
      'Current components point toward true east and north in m/s. Wind uses its FROM bearing, clockwise from true north; the calculator converts this to the direction the wind blows.',
      'Project windage defaults are 0.03 nominal and 0.025–0.04 for the scenario range. They are editable assumptions, not a calibrated site model.',
      'The search envelope is a local-grid bounding box covering the shifted boundary from arrival through survey end, plus your margin. It is not measured oil extent or a probability region.',
      'The horizon is limited to 24 hours. Waves, diffusion, shoreline effects and changing vectors are absent. Drift-enabled export requires the envelope window to cover the full scheduled flight window.'
    ],
    formulas: [
      'Slick velocity = current velocity + windage × wind velocity',
      'Displacement = slick velocity × seconds since observation'
    ]
  },
  flight: {
    title: 'Flight model',
    paragraphs: [
      'Camera geometry sets line and photo spacing. Wind and battery inputs then assess the route and split it into sorties. Enter the actual hardware settings; NoIR presets are candidates to verify against the installed module, lens and active image crop.'
    ],
    bullets: [
      'Geometry assumes a nadir camera over a flat surface, with image width across track. Height is in m AGL; sensor dimensions and focal length are in mm. Enter overlap as percent in the interface; the formulas use the equivalent fraction.',
      'Speed is commanded ground speed. Required airspeed is estimated from each route leg and the supplied wind. Wind and airspeed limits are checked separately.',
      'Each assessed sortie includes outbound transit, survey travel, return to the manually entered home, takeoff, landing and turn allowances. Each sortie starts with a fresh energy budget and retains the final reserve.',
      'The model uses uniform power and fixed ground speed. Payload effects, battery ageing, manoeuvres, terrain and obstacles require aircraft-specific validation. Downloaded files do not contain camera-trigger commands.'
    ],
    formulas: [
      'Image footprint = height × sensor dimension ÷ focal length',
      'Line spacing = across-track footprint × (1 − side overlap)',
      'Photo spacing = along-track footprint × (1 − front overlap)',
      'Energy used (Wh) = uniform power (W) × total sortie duration (s) ÷ 3600',
      'Flight energy budget (Wh) = usable starting energy − final reserve'
    ]
  },
  export: {
    title: 'Flight file & constraint checks',
    paragraphs: [
      'This trial exports one QGroundControl .plan file per selected sortie for the explicitly chosen PX4 or ArduPilot multicopter profile. The adapter targets QGroundControl 5.1.x. DJI KMZ export is not implemented.'
    ],
    bullets: [
      'Camera, wind and battery checks must pass. Confirm the real home, home AMSL altitude and the reviewed flat surface at the same ground level as home. Exported heights are relative to home; this is not terrain following.',
      'Supply the ceiling, constraint source, planned time, validity, corridor and reviewed no-go polygons. An explicit empty collection means no polygons were found in your review; missing constraints remain unknown.',
      'The full outbound, survey and return route is checked against the supplied polygons and corridor. These are manual inputs, with no automatic CAAT/NOTAM lookup. The checks do not install onboard geofences or verify obstacle clearance.',
      'Recheck the manual confirmations when inputs change. Download sends no commands to an aircraft. Native QGC import, firmware compatibility and isolated SITL acceptance remain untested.'
    ],
    formulas: []
  },
  oil: {
    title: 'Oil & capsule model',
    paragraphs: [
      'Use independently reviewed oil pixels with ground scale, or a separately measured oil area. Supply a supported thickness range. The inspection boundary and drift envelope are never substituted for oil area.',
      'RGB/NoIR appearance does not automatically establish thickness. A missing upper thickness leaves the upper quantity unknown. Results are an estimated mass range, not capsule count or release instructions.'
    ],
    bullets: [
      'GSD is in m/pixel, area in m², thickness in µm, density in g/mL and capacity in g oil per g dry whole capsules.',
      'Project defaults are density 0.86 g/mL, capacity 3.42 g/g, allowance 1.5 and target oil fraction 1. The capacity is project-supplied; this calculator does not verify laboratory or field performance.',
      'For emulsion-layer thickness, enter the measured oil volume fraction. Retained oil is not necessarily recovered oil. The allowance is a multiplier, not a confidence interval.'
    ],
    formulas: [
      'Oil area (m²) = oil pixel count × GSD X × GSD Y',
      'Oil volume (L) = area (m²) × thickness (µm) × 0.001 × oil volume fraction',
      'Capsule mass (g) = volume (L) × density (g/mL) × 1000 ÷ capacity (g/g) × allowance × target oil fraction'
    ]
  },
  snapshots: {
    title: 'Boundaries & snapshots',
    paragraphs: [
      'A trial snapshot stores inputs, source information, results and an input hash in a local JSON file. Restoring it restores the inputs and requires fresh calculations and export review.'
    ],
    bullets: [
      'A saved Quick mission survey uses its original frozen boundary and image source. Trial calculations and exports do not modify that saved inspection.',
      'Local-file mode cannot verify a survey ID against the database. An imported snapshot boundary becomes a local trial boundary with unverified database linkage.',
      'The input hash identifies a calculation input set. It is not a digital signature, approval or proof that the source is current.',
      'Restoring clears manual export confirmations. Boundary, home and constraint changes also clear the relevant review state; check dates and validity again before download.'
    ],
    formulas: []
  }
};
