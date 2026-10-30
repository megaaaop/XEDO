"""Bounded local SAR contracts. No network or model imports."""
from __future__ import annotations
import hashlib
import json
import math
import os
from datetime import datetime, timezone
from pathlib import Path

MODEL_SHA256 = '41a2bd4b5b2382b17d3ad2d2ebce38b09d011f2e15dacd59e4ce46c032cfd46b'
ENGINE_SHA256 = '1eaada3453be40bf69b3d9dada5a8d17d5dc4aaa9fc34ec7ca4e6ae6b37c1466'
MAX_PIXELS = 2_000_000
MAX_DIMENSION = 4096
MAX_GRID_M2 = 200_000_000
MAX_DOWNLOAD_BYTES = 32_000_000
RECIPE = 'xedo-local-sar/1'

class PipelineError(Exception):
    def __init__(self, code, message):
        super().__init__(message)
        self.code = code

def now():
    return datetime.now(timezone.utc).isoformat()

def encoded(value):
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode('utf-8')

def digest(path):
    with Path(path).open('rb') as source:
        return hashlib.file_digest(source, 'sha256').hexdigest()

def save(path, value):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_bytes(encoded(value))
    temporary.replace(path)

def geometry(value):
    from shapely.geometry import shape, mapping
    from shapely.errors import ShapelyError
    if not isinstance(value,dict):
        raise PipelineError('AOI_INVALID','Choose a GeoJSON Polygon object.')
    if value.get('type') == 'FeatureCollection':
        if not isinstance(value.get('features'),list) or len(value['features']) != 1 or not isinstance(value['features'][0],dict):
            raise PipelineError('AOI_INVALID', 'Choose exactly one area.')
        value = value['features'][0]
    if value.get('type') == 'Feature':
        value = value.get('geometry', {})
    if not isinstance(value,dict) or value.get('type') != 'Polygon':
        raise PipelineError('AOI_INVALID', 'The search area must be a Polygon.')
    try:
        poly = shape(value)
        rings = [poly.exterior, *poly.interiors]
        points = [p for ring in rings for p in ring.coords]
        if poly.is_empty or not poly.is_valid or sum(len(r.coords)-1 for r in rings) > 120 or len(rings) > 8:
            raise ValueError()
        if any(len(p) != 2 or not all(math.isfinite(n) for n in p) or not -180 <= p[0] <= 180 or not -80 <= p[1] <= 84 for p in points):
            raise ValueError()
        west, south, east, north = poly.bounds
        if east-west > 5 or north-south > 5:
            raise PipelineError('GRID_LIMIT', 'The area is too large or crosses the antimeridian. Reduce or split it.')
        return mapping(poly)
    except PipelineError:
        raise
    except (ValueError, TypeError, KeyError, ShapelyError):
        raise PipelineError('AOI_INVALID', 'Choose a finite, valid area with at most 120 corners.') from None

def grid_limits(width, height, transform, crs):
    from rasterio.crs import CRS
    crs = CRS.from_user_input(crs)
    if not crs.is_projected or abs(crs.linear_units_factor[1] - 1) > 1e-12:
        raise PipelineError('GRID_UNSUPPORTED', 'A projected native grid in metres is required.')
    if not all(math.isfinite(v) for v in tuple(transform)[:6]) or abs(transform.determinant) <= 0:
        raise PipelineError('GRID_INVALID', 'The source grid is invalid.')
    if width <= 0 or height <= 0 or width > MAX_DIMENSION or height > MAX_DIMENSION or width*height > MAX_PIXELS or width*height*abs(transform.determinant) > MAX_GRID_M2 + 0.001:
        raise PipelineError('GRID_LIMIT', 'The export rectangle exceeds 2 million pixels, 4096 pixels per side or 200 km2. Reduce or split the area.')

def local_config(env_file):
    """Read only named GEE settings. Never return them in public receipts."""
    values = {}
    env_file = Path(env_file).resolve()
    if env_file.exists():
        for line in env_file.read_text(encoding='utf-8-sig').splitlines():
            name, sep, value = line.strip().partition('=')
            if sep and name in ('GEE_PROJECT_ID', 'GEE_SERVICE_ACCOUNT_FILE', 'GEE_SERVICE_ACCOUNT_JSON'):
                value = value.strip()
                if len(value) > 1 and value[0] == value[-1] and value[0] in ('"', "'"):
                    value = value[1:-1]
                values[name] = value
    values.update({k: v for k, v in os.environ.items() if k in ('GEE_PROJECT_ID','GEE_SERVICE_ACCOUNT_FILE','GEE_SERVICE_ACCOUNT_JSON')})
    project = values.get('GEE_PROJECT_ID')
    raw = values.get('GEE_SERVICE_ACCOUNT_JSON')
    if not raw and values.get('GEE_SERVICE_ACCOUNT_FILE'):
        path = (env_file.parent / values['GEE_SERVICE_ACCOUNT_FILE']).resolve()
        try:
            if path.stat().st_size > 65536:
                raise PipelineError('GEE_CONFIG_INVALID', 'The local GEE credential is too large.')
            raw = path.read_text(encoding='utf-8-sig')
        except OSError:
            raise PipelineError('GEE_CONFIG_INVALID','The configured local GEE credential file cannot be read.') from None
    try:
        account = json.loads(raw or '{}')
        if not project or account.get('type') != 'service_account' or not account.get('private_key') or not account.get('client_email'):
            raise ValueError()
    except (ValueError, TypeError):
        raise PipelineError('GEE_CONFIG_INVALID', 'Configure the existing GEE project and local service-account file.') from None
    return project, raw, account['client_email']
