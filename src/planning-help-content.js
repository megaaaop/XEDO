import {XEDO_HARDWARE_PROFILE} from './planning-hardware-profile.js';
import {FIXED_PLANNING_SETTINGS,FIXED_SEARCH_SETTINGS} from './planning-fixed-settings.js';

const fixed=FIXED_PLANNING_SETTINGS;

/** Contextual, read-only help shared by the hosted and local-file planners. */
export const planningHelpTopics = {
  environment: {
    title: 'Automatic mission conditions',
    paragraphs: [
      'Select an inspection polygon and a planned takeoff/end time. The local or hosted API retrieves up to five in-area forecast samples and hourly values across that window. The interface keeps the same three mission steps.',
      'The trial receives NOAA GFS wind and Copernicus SMOC surface-current estimates through Open-Meteo. It checks the provider model run, availability, time coverage, units and grid location. A recent web request does not make an old model fresh.'
    ],
    bullets: [
      'Automatic checks run when the area or relevant times change, every ten minutes while the page is active, and again when needed before export. Failed, expired, masked or incomplete inputs remain Unknown. Offline and local-file mode cannot query the backend.',
      '10 m wind is used for the drift scenario. At the fixed 50 m flight height, wind vectors are linearly interpolated from the 10 m and 80 m GFS levels. This is an explicit model estimate. Wind assessment considers sampled vectors and available 10 m gusts; it does not validate actual flight conditions.',
      'SMOC currents already include tides and Stokes drift. These components are not added a second time. The separate project windage range remains uncalibrated.',
      'The current grid is a regional sea estimate around 9 km. It does not resolve every shoreline, river discharge, estuary or mangrove channel. Choose Estuary / mangrove channel to keep automatic local drift unavailable; independently reviewed local currents can be entered in Manual mode.',
      'The existing drift calculation uses an equivalent spatial/time mean over the supplied window, not a validated changing-current particle model. It retains the original observation time and the 24-hour limit. Old satellite images are not reset to the present.',
      'Synthetic test inputs remain separate. Manual mode lets a reviewer supply independent conditions; switching modes never approves home, surface or airspace checks. Source updates revoke affected export reviews.',
      'Weather/currents do not supply battery performance, official flight permission, measured oil thickness or a capsule-release command.'
    ],
    formulas: []
  },
  hardware: {
    title: 'XEDO equipment profile',
    paragraphs: [
      'The equipment list is fixed in the ' + XEDO_HARDWARE_PROFILE.name + ' profile. Only Raspberry Pi 5 was confirmed by the project owner; other model identifications came from an AI interpretation of a photograph.',
      XEDO_HARDWARE_PROFILE.cameraLabel + ' stock optics at full sensor size: ' + fixed.flight.sensorWidthMm + ' × ' + fixed.flight.sensorHeightMm + ' mm, ' + fixed.flight.focalLengthMm + ' mm focal length, ' + fixed.flight.imageWidthPx + ' × ' + fixed.flight.imageHeightPx + ' pixels. Fixed trial settings are ' + fixed.flight.altitudeM + ' m AGL, ' + fixed.flight.speedMps + ' m/s, ' + fixed.flight.sideOverlap * 100 + '% side overlap, ' + fixed.flight.frontOverlap * 100 + '% front overlap and a ' + fixed.flight.minTriggerIntervalS + ' s minimum capture interval. These are project assumptions, not verified flight performance.',
      'Project constants are held in one configuration and hidden from mission entry. Changing them requires updating the project profile. A snapshot with explicitly different constants is rejected before the current mission changes. Battery, wind, real home, firmware and oil evidence remain unknown until supplied.',
      'Fixed drift settings: windage ' + fixed.drift.alpha + ' (' + fixed.drift.alphaMin + '–' + fixed.drift.alphaMax + ') and additional margin ' + fixed.drift.marginM + ' m. Fixed material settings: density ' + fixed.oil.densityGml + ' g/mL, sorption capacity ' + fixed.oil.capacityGg + ' g/g, allowance ' + fixed.oil.allowance + ' and target fraction ' + fixed.oil.targetFraction + '.',
      'The export target is QGroundControl ' + fixed.export.qgcVersion + ', with a ' + fixed.export.relativeHeightM + ' m home-relative route. The surface and home reference still require review. Image search starts with the past ' + FIXED_SEARCH_SETTINGS.lookbackDays + ' days and uses a fixed scene-cloud threshold of ' + FIXED_SEARCH_SETTINGS.maxCloud + '%. You can change the acquisition dates.'
    ],
    bullets: XEDO_HARDWARE_PROFILE.components.map(component =>
      component.label + ': ' + (component.model || 'Unknown') + ' · ' +
      (component.status === 'confirmed' ? 'Owner-confirmed' : component.status === 'candidate' ? 'Unverified candidate' : 'Unknown') +
      (component.frequencyMHz ? ' · ' + component.frequencyMHz + ' MHz' : '') +
      (component.diameterRangeIn ? ' · ' + component.diameterRangeIn.join('–') + ' in candidate range' : '') +
      (component.variants ? ' · ' + component.variants.join(' / ') : '') +
      (component.alternatives ? ' · Alternatives: ' + component.alternatives.join(' / ') : '') +
      (component.notes ? '. ' + component.notes : '')
    ),
    formulas: []
  },
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
      'A fixed XEDO profile supplies candidate camera geometry, route assumptions and project model constants. View them through the profile Information button in Mission settings. Other unknown physical inputs stay blank. Load test example uses the same fixed profile with synthetic mission, weather and material inputs; it does not turn the archived satellite image into a current oil observation.'
    ],
    bullets: [
      'In the standalone prototype, including static hosting, the calculators, stored image and downloads work without an API server. Basemap tiles need internet. Saved survey lookup by ID needs the separate full workspace service.',
      'Automatic mission conditions use a separate weather/current API. GEE imagery and historical terrain remain separate. Official airspace restrictions and AI oil detection are not fetched by this trial.',
      'Results update after satellite review and relevant setting changes. Automatic conditions refresh independently; missing inputs and failed checks remain visible beside the affected result.',
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
      'Project windage is fixed at ' + fixed.drift.alpha + ' nominal and ' + fixed.drift.alphaMin + '–' + fixed.drift.alphaMax + ' for the scenario range. Additional margin is fixed at ' + fixed.drift.marginM + ' m. These are project assumptions, not a calibrated site model.',
      'The search envelope is a local-grid bounding box covering the shifted boundary from arrival through survey end, plus the profile margin. Automatic mode supplies an equivalent vector mean from the sampled data; varying intermediate transport is not modelled. It is not measured oil extent or a probability region.',
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
      'Camera geometry sets line and photo spacing. Wind and battery inputs then assess the route and split it into sorties. This XEDO trial locks candidate NoIR v2 optics and route assumptions in the project profile. Verify the installed module, lens, active image crop and actual aircraft before updating that profile for field use.'
    ],
    bullets: [
      'Geometry assumes a nadir camera over a flat surface, with image width across track. Height is in m AGL; sensor dimensions and focal length are in mm. The fixed overlap settings are ' + fixed.flight.sideOverlap * 100 + '% across track and ' + fixed.flight.frontOverlap * 100 + '% along track; formulas use the equivalent fractions.',
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
      'This trial exports one QGroundControl .plan file per selected sortie for the explicitly chosen PX4 or ArduPilot multicopter profile. The fixed target version is ' + fixed.export.qgcVersion + '. Firmware remains unknown until checked against the controller. DJI KMZ export is not implemented.'
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
      'Fixed project constants are density ' + fixed.oil.densityGml + ' g/mL, capacity ' + fixed.oil.capacityGg + ' g/g, allowance ' + fixed.oil.allowance + ' and target oil fraction ' + fixed.oil.targetFraction + '. The capacity is project-supplied; this calculator does not verify laboratory or field performance.',
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
      'A trial snapshot stores inputs, source information, results and an input hash in a local JSON file. Restoring it restores compatible mission inputs and requires fresh calculations and export review. Missing profile constants are filled from this version; explicitly different constants are rejected without changing your current mission.'
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
