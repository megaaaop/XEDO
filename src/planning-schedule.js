import {missionWindowProblem} from './planning-time-window.js';
const HOUR_MS = 60 * 60 * 1000;
const FALLBACK_DURATION_S = 1800;
const VERSION = 1;

function plainRecord(value, label) {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new TypeError(`${label} must be a plain object.`);
  }
  return value;
}

function nonnegative(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) throw new TypeError(`${label} must be a nonnegative number.`);
  return value;
}

// Require an explicit offset so a saved schedule cannot change with browser timezone.
function timestamp(value, label) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string') throw new TypeError(`${label} must be an ISO timestamp with a timezone.`);
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) throw new TypeError(`${label} must be an ISO timestamp with a timezone.`);
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , offset] = match;
  const [year, month, day, hour, minute, second] = [yearText, monthText, dayText, hourText, minuteText, secondText ?? 0].map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month < 1 || month > 12 || day < 1 || day > days[month - 1] || hour > 23 || minute > 59 || second > 59 ||
      (offset !== 'Z' && (Number(offset.slice(1, 3)) > 23 || Number(offset.slice(4)) > 59))) {
    throw new TypeError(`${label} is not a valid calendar timestamp.`);
  }
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) throw new TypeError(`${label} is not a valid timestamp.`);
  return new Date(milliseconds).toISOString();
}

function iso(milliseconds) {
  if (!Number.isFinite(milliseconds) || Math.abs(milliseconds) > 8.64e15) throw new TypeError('Schedule time is out of range.');
  return new Date(milliseconds).toISOString();
}

function durationFor(flight) {
  const positive = value => typeof value === 'number' && Number.isFinite(value) && value > 0;
  const duration = flight.battery?.totalDurationS;
  const estimate = flight.plan?.estimates?.durationS;
  return positive(duration) ? duration : positive(estimate) ? estimate : FALLBACK_DURATION_S;
}

/** A local schedule, anchored once to successful route analysis rather than each refresh. */
export function createPlanningSchedule({ now = Date.now, bufferS = 300, turnaroundS = 600 } = {}) {
  if (typeof now !== 'function') throw new TypeError('now must be a function.');
  nonnegative(bufferS, 'bufferS');
  nonnegative(turnaroundS, 'turnaroundS');

  const empty = () => ({
    version: VERSION,
    mode: 'idle',
    pending: false,
    analysedAt: null,
    flightDurationS: null,
    sortieCount: 0,
    schedulingBufferS: bufferS,
    turnaroundS,
    windowDurationS: null,
  });
  let schedule = empty();
  let plannedTakeoffAt = null;
  let plannedEndAt = null;

  function clock() {
    const value = now();
    if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError('now must return a finite timestamp.');
    iso(value);
    return value;
  }

  function getPatch() {
    return { plannedTakeoffAt, plannedEndAt, schedule: { ...schedule } };
  }

  function begin() {
    const takeoff = clock() + HOUR_MS;
    const nextTakeoff = iso(takeoff);
    const nextEnd = iso(takeoff + FALLBACK_DURATION_S * 1000);
    schedule = { ...empty(), mode: 'automatic', pending: true };
    plannedTakeoffAt = nextTakeoff;
    plannedEndAt = nextEnd;
    return getPatch();
  }

  function complete(flight) {
    if (schedule.mode !== 'automatic' || flight?.plan?.status !== 'generated') return getPatch();
    const analysedAt = schedule.pending ? iso(clock()) : schedule.analysedAt;
    const durationS = durationFor(flight);
    const sortieCount = Math.max(1, Array.isArray(flight.battery?.sorties) ? flight.battery.sorties.length : 0);
    const windowDurationS = durationS + schedule.schedulingBufferS + (sortieCount - 1) * schedule.turnaroundS;
    const takeoff = Date.parse(analysedAt) + HOUR_MS;
    const nextTakeoff = iso(takeoff);
    const nextEnd = iso(takeoff + windowDurationS * 1000);
    schedule = { ...schedule, pending: false, analysedAt, flightDurationS: durationS, sortieCount, windowDurationS };
    plannedTakeoffAt = nextTakeoff;
    plannedEndAt = nextEnd;
    return getPatch();
  }

  function setManual(fields) {
    plainRecord(fields, 'fields');
    const nextTakeoff = timestamp(fields.plannedTakeoffAt, 'plannedTakeoffAt');
    const nextEnd = timestamp(fields.plannedEndAt, 'plannedEndAt');
    schedule = { ...empty(), mode: 'manual' };
    plannedTakeoffAt = nextTakeoff;
    plannedEndAt = nextEnd;
    return getPatch();
  }

  function reset() {
    schedule = empty();
    plannedTakeoffAt = null;
    plannedEndAt = null;
    return getPatch();
  }

  function restore(metadata, fields = {}) {
    plainRecord(fields, 'fields');
    if (metadata != null) plainRecord(metadata, 'metadata');
    const takeoff = timestamp(fields.plannedTakeoffAt, 'plannedTakeoffAt');
    const end = timestamp(fields.plannedEndAt, 'plannedEndAt');
    let next = { ...empty(), mode: takeoff || end ? 'manual' : 'idle' };
    if (metadata?.version === VERSION && metadata.mode === 'automatic') {
      if (typeof metadata.pending !== 'boolean' || !takeoff || !end || Date.parse(end) <= Date.parse(takeoff)) {
        throw new TypeError('Automatic schedule has invalid timestamps or pending state.');
      }
      const analysedAt = timestamp(metadata.analysedAt, 'analysedAt');
      const schedulingBufferS = nonnegative(metadata.schedulingBufferS, 'schedulingBufferS');
      const restoredTurnaroundS = nonnegative(metadata.turnaroundS, 'turnaroundS');
      if (metadata.pending) {
        if (analysedAt || metadata.flightDurationS != null || metadata.windowDurationS != null || metadata.sortieCount !== 0) {
          throw new TypeError('Pending automatic schedule must not contain an analysis anchor.');
        }
      } else {
        if (!analysedAt || typeof metadata.flightDurationS !== 'number' || !Number.isFinite(metadata.flightDurationS) || metadata.flightDurationS <= 0 ||
            !Number.isInteger(metadata.sortieCount) || metadata.sortieCount < 1) {
          throw new TypeError('Automatic schedule has invalid flight duration or sortie count.');
        }
        const expectedWindow = metadata.flightDurationS + schedulingBufferS + (metadata.sortieCount - 1) * restoredTurnaroundS;
        if (metadata.windowDurationS !== expectedWindow || Date.parse(takeoff) !== Date.parse(analysedAt) + HOUR_MS ||
            end !== iso(Date.parse(takeoff) + expectedWindow * 1000)) {
          throw new TypeError('Automatic schedule timestamps do not match the saved analysis.');
        }
      }
      next = {
        version: VERSION, mode: 'automatic', pending: metadata.pending, analysedAt,
        flightDurationS: metadata.pending ? null : metadata.flightDurationS,
        sortieCount: metadata.pending ? 0 : metadata.sortieCount,
        schedulingBufferS, turnaroundS: restoredTurnaroundS,
        windowDurationS: metadata.pending ? null : metadata.windowDurationS,
      };
    } else if (metadata?.version === VERSION && metadata.mode === 'manual') {
      next.mode = 'manual';
    }
    schedule = next;
    plannedTakeoffAt = takeoff;
    plannedEndAt = end;
    return getPatch();
  }

  function getReadiness() {
    const expiresAt = plannedTakeoffAt;
    if (schedule.mode === 'idle') return { status: 'waiting', message: 'Analyse a route to schedule takeoff.', expiresAt };
    if (schedule.pending) return { status: 'waiting', message: 'Waiting for successful route analysis.', expiresAt };
    if (!plannedTakeoffAt || !plannedEndAt) return { status: 'blocked', message: 'Set both takeoff and mission end times.', expiresAt };
    if (Date.parse(plannedEndAt) <= Date.parse(plannedTakeoffAt)) {
      return { status: 'blocked', message: 'Mission end must be later than takeoff.', expiresAt };
    }
    if (Date.parse(plannedTakeoffAt) <= clock()) return { status: 'expired', message: 'Takeoff time has passed. Replan or choose a future time.', expiresAt };
    const problem=missionWindowProblem(plannedTakeoffAt,plannedEndAt,{now:clock()});
    if(problem)return {status:'blocked',message:problem.message,expiresAt};
    return { status: 'ready', message: schedule.mode === 'automatic' ? 'Takeoff is scheduled one hour after route analysis.' : 'Manual schedule is ready.', expiresAt };
  }

  return {
    begin, complete, setManual, reset, restore, getPatch, getReadiness,
    getState: () => ({ ...schedule, plannedTakeoffAt, plannedEndAt }),
  };
}
