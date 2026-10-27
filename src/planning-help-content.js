import {XEDO_HARDWARE_PROFILE} from './planning-hardware-profile.js';
import {ESTIMATED_DEMO_PROFILE} from './planning-estimated-demo.js';
import {FIXED_PLANNING_SETTINGS,FIXED_SEARCH_SETTINGS} from './planning-fixed-settings.js';

const fixed=FIXED_PLANNING_SETTINGS;

/** Contextual, read-only help shared by the hosted and local-file planners. */
export const planningHelpTopics = {
  readiness: {
    title: 'Flight readiness',
    paragraphs: ['The three mission steps use four background calculators. This checklist shows the remaining planning checks beside the download button.'],
    bullets: ['Select a launch and return coordinate on the map. Routes include outbound and return travel.', 'Automatic takeoff is one hour after the first successful route analysis. Refreshing data keeps that anchor. Replan creates a new anchor; editing the times selects a manual schedule.', 'The mission window includes assessed flight duration, a five-minute scheduling buffer and ten minutes between sorties. These are scheduling assumptions.', 'A mission window can span at most 24 hours. Longer calculated times remain visible and block download; reduce the inspection area or split the work into shorter missions.', 'Forecast dates support five days back to seven days ahead. Terrain, land cover and selected-image quality can still load when the mission time is unsupported; an omitted forecast does not establish weather readiness.', 'GEE surface samples support a model comparison. They do not certify obstacles, launch-site suitability or flight clearance.', 'The route and current airspace review remains an explicit user check. Downloading a file does not command the aircraft.'],
    formulas: []
  },
  launch: {
    title: 'Launch and return point',
    paragraphs: ['Choose where the drone starts and returns. This is separate from the capsule release area.'],
    bullets: ['Choose Set launch point, then click the map. Move launch point replaces it; Clear point removes it.', 'The point may be outside the inspection polygon. Both travel legs are included in distance, battery and surface sampling.', 'Selecting a coordinate does not verify the physical site. Changing it revokes affected route reviews.'],
    formulas: []
  },
  terrain: {
    title: 'GEE surface comparison',
    paragraphs: ['Automatic GEE mode compares Home, inspection-area and sparse route samples from the 30 m Copernicus DSM in EGM2008. Missing samples remain unknown.'],
    bullets: ['The default two-metre tolerance is a configurable model comparison assumption, not a certified aircraft safety limit.', 'A ready comparison can supply the model Home height and the flat-reference assumption for this trial. The source remains labelled GEE model.', 'Large height differences or missing samples need review. Manual mode allows an independently reviewed reference instead.', 'The DSM can include vegetation and buildings. Sparse historical samples do not establish continuous terrain coverage or present obstacle clearance. The route remains constant height above Home.'],
    formulas: []
  },
  estimatedDemo: {
    title: 'Estimated demo',
    paragraphs: [
      'An optional software-test profile. The same three mission steps and four calculators use explicit assumptions instead of measured aircraft performance.',
      'Use mission inputs restores the form and boundary from before the demo. Satellite readiness and export confirmations require a fresh review. Reloading the demo keeps that original backup.'
    ],
    bullets: [
      'Starting usable energy: 177.6 Wh. Landing reserve: 44.4 Wh. Mission budget: 133.2 Wh. Average power: 600 W.',
      'Test wind threshold: 8 m/s. Test maximum airspeed: 12 m/s. Takeoff/climb: 30 s. Landing: 30 s. Each turn: 5 s.',
      ...ESTIMATED_DEMO_PROFILE.notes,
      'The demo reviews the bundled dated satellite image and calculates locally. When a local or hosted API is configured, it may read actual GEE terrain and historical land-cover samples, labelled separately from the aircraft estimates. Weather requests, selected-image GEE quality requests and saved-inspection writes remain paused. Changing the demo area retains its demo label.',
      'Demo snapshots include the profile and assumed inputs. Demo mission filenames are labelled; the existing export checks still apply.'
    ],
    formulas: ['Mission budget = 177.6 − 44.4 = 133.2 Wh', 'Budget duration at constant 600 W = 133.2 ÷ 600 × 60 = 13.32 minutes']
  },
  geospatial: {
    title: 'GEE planning data',
    paragraphs: [
      'GEE adds area-specific surface-elevation samples, historical water/mangrove coverage, selected-image quality and a takeoff-time GFS reference. The same three mission steps and four calculation engines remain in place.',
      'These layers support inspection planning. They do not supply aircraft performance, flight permission, oil confirmation or a material-release command.'
    ],
    bullets: [
      'Copernicus DEM GLO30_2024_1 is a roughly 30 m digital surface model in the EGM2008 height reference. Buildings and vegetation can be part of its surface. Model heights do not prove current terrain or obstacle clearance.',
      'Automatic surface mode uses a fresh, complete model comparison and a separately labelled GEE model Home height. Manual mode retains an independently reviewed height/reference option. The trial does not convert a GNSS ellipsoid height or certify AMSL. Changing Home revokes an unchanged owned estimate; a manually edited value remains your responsibility.',
      'WorldCover v200 describes 2021 land cover at 10 m, including permanent water and mangroves. Fractions are historical area estimates; they do not establish a current shoreline, channel current, protected-area boundary or official no-fly zone.',
      'Selected-image quality is calculated for the inspection area. Cloud probability or the documented SCL fallback is a classification estimate. Missing pixels remain Unknown, and neither image quality nor a dark water patch confirms oil.',
      'The GEE GFS reference describes 10 m wind and available gusts at one forecast time on a roughly 28 km grid. It is not 50 m flight wind or full-mission weather coverage; the existing automatic weather/current API remains the calculation source.',
      'Area, Home, image, time and route-sample changes cancel an older request. Context expires after at most ten minutes. Refresh GEE data retries the current request; failed or expired data cannot stay ready. Missing credentials, masked values, source errors, offline mode and file mode never become zero elevation, calm wind or a completed review.',
      'Some GEE data unavailable means a source or requested terrain sample is missing/unknown, or mapped/image-quality coverage is below 99%. Usable independent data stays visible. A data-ready badge does not approve the surface comparison, launch site or flight export.',
      'Request progress counts completed loading stages. While Earth Engine is processing, the waiting indicator and elapsed time do not claim a server-compute percentage. Failed requests distinguish offline, connection, timeout, busy, invalid-input and response-validation problems; only temporary failures are retried automatically.',
      'The 3D view can show available surface-model sample points alongside the flat flight-height illustration. Route heights, terrain following, airspace checks and onboard geofences are not generated from these layers.'
    ],
    formulas: ['Estimated sampled elevation range = highest available DSM sample − lowest available DSM sample']
  },
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
      'Hosted mode searches real GEE Sentinel-2 acquisitions by area and date, then waits for the selected image pixels to load. The background mosaic and the reviewed single acquisition have separate readiness checks; a failed request never silently selects the stored image.',
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
      'The selected Earth Engine acquisition includes approximately 1 km of surrounding display context. The cyan inspection boundary, image-coverage check and calculation area stay tied to the selected inspection area.',
      'Click or focus the map to zoom with the wheel; use the + and − controls anytime. Scrolling over an unfocused map scrolls the page.',
      'The background metadata request retries once for a transient timeout, connection failure or supported temporary server error. Changing the view cancels that retry. Missing configuration, invalid responses and empty imagery remain explicit errors; use Retry background map after a failed load.',
      'Forecast: purple outlines showing the nominal shifted boundary at arrival and survey end. Search envelope: the dashed amber box enclosing the supplied drift scenarios and margin.',
      'Route: pale yellow flight lines. Assessed sorties include outbound travel and return to the configured home; a geometric route can appear before those assessments are complete.',
      'In 3D, choose Diagram for the grid or Satellite for a geographically aligned Sentinel-2 mosaic across the same ground. The ground mosaic has its own acquisition dates and a native source resolution of 10 m; it is separate from the image selected for mission review. Orbit and zoom are preserved when switching. The ground remains flat and does not verify terrain, obstacles or clearance.'
    ],
    formulas: []
  },
  trial: {
    title: 'About this trial',
    paragraphs: [
      'Use three steps: select an area, review satellite imagery, then prepare a drone mission. Drift, flight, export and oil/material calculations run behind that flow. Mission settings holds the inputs; Calculation details explains the results.',
      'A fixed XEDO profile supplies candidate camera geometry, route assumptions and project model constants. View them through the profile Information button in Mission settings. Other unknown physical inputs stay blank. Estimated demo uses the same fixed profile with assumed aircraft, weather and material inputs; it does not turn the archived satellite image into a current oil observation.'
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
      'Each assessed sortie includes outbound transit, survey travel, return to the selected or supplied home, takeoff, landing and turn allowances. Each sortie starts with a fresh energy budget and retains the final reserve. Automatic scheduling adds five minutes of buffer and ten minutes between sorties; these are scheduling assumptions, not airborne energy use.',
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
      'Camera, wind and battery checks must pass. Review the real launch point. Automatic surface mode requires fresh matching GEE samples and labelled model Home-height provenance; manual surface mode requires an independently reviewed Home AMSL and flat reference. Exported heights are relative to home; this is not terrain following.',
      'Automatic takeoff is anchored one hour after route analysis. Its window includes assessed flight duration, a five-minute buffer and ten minutes between sorties. Replan creates a new anchor; add further delays through a reviewed manual schedule. An expired takeoff blocks download.',
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
