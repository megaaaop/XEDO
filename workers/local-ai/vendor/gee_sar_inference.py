"""Inference companion for XEDO GEE Sentinel-1 exports; no training or resizing.

Accepts the three genuine GEE exports (VH/VV TIFF, validity TIFF, GeoJSON).
Preserves the exported pixel grid. GEE-to-SNAP accuracy is not established.
"""
from __future__ import annotations
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import math
import platform
import re
import shutil
import uuid
import zipfile

import numpy as np
import rasterio
from affine import Affine
from rasterio.crs import CRS
from rasterio.enums import Resampling
from rasterio.windows import Window
import torch
from torch import nn
import torch.nn.functional as F

VERSION = "1.1.1"
MODEL_DRIVE_ID = "1tR1tiRBaSuB4DFT8Cef9T7G_zAj5rzY-"
MODEL_SHA256 = "41a2bd4b5b2382b17d3ad2d2ebce38b09d011f2e15dacd59e4ce46c032cfd46b"
BAND_ORDER = ["VH", "VV"]
TRAIN_MEAN = [-32.3369425438976, -20.364101023123585]
TRAIN_STD = [5.99492894673194, 5.298199562541159]
PATCH_SIZE = 512
DEFAULT_THRESHOLD = 0.3
DATA_NODATA = -9999.0
MASK_NODATA = 255
MAX_PIXELS = 100_000_000


def sha256(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as file:
        for block in iter(lambda: file.read(4 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


class ConvBlock(nn.Module):
    def __init__(self, inputs, outputs):
        super().__init__()
        self.net = nn.Sequential(
            nn.Conv2d(inputs, outputs, 3, padding=1),
            nn.GroupNorm(4, outputs), nn.ReLU(inplace=True),
            nn.Conv2d(outputs, outputs, 3, padding=1),
            nn.GroupNorm(4, outputs), nn.ReLU(inplace=True))

    def forward(self, value):
        return self.net(value)


class SARUNet(nn.Module):
    # Same layer names and forward pass as the training source sar_pipeline.py.
    def __init__(self, base=16):
        super().__init__()
        self.base = base
        self.e1 = ConvBlock(2, base)
        self.e2 = ConvBlock(base, base * 2)
        self.e3 = ConvBlock(base * 2, base * 4)
        self.bottom = ConvBlock(base * 4, base * 8)
        self.d3 = ConvBlock(base * 12, base * 4)
        self.d2 = ConvBlock(base * 6, base * 2)
        self.d1 = ConvBlock(base * 3, base)
        self.head = nn.Conv2d(base, 1, 1)

    def forward(self, value):
        e1 = self.e1(value)
        e2 = self.e2(F.max_pool2d(e1, 2))
        e3 = self.e3(F.max_pool2d(e2, 2))
        output = self.bottom(F.max_pool2d(e3, 2))
        for skip, layer in [(e3, self.d3), (e2, self.d2), (e1, self.d1)]:
            output = F.interpolate(output, size=skip.shape[-2:], mode="bilinear", align_corners=False)
            output = layer(torch.cat([output, skip], dim=1))
        return self.head(output)


def load_model(model_path, device="auto"):
    model_path = Path(model_path)
    if not model_path.is_file():
        raise FileNotFoundError(f"ไม่พบโมเดล: {model_path}")
    actual_hash = sha256(model_path)
    if actual_hash != MODEL_SHA256:
        raise ValueError("ไฟล์นี้ไม่ตรงกับ sar_best_export.pth ที่เลือกไว้ ตรวจไฟล์โมเดล SAR อีกครั้ง")
    checkpoint = torch.load(model_path, map_location="cpu", weights_only=True)
    if checkpoint.get("architecture") != "SARUNet" or checkpoint.get("base") != 16:
        raise ValueError("โครงสร้างโมเดลต้องเป็น SARUNet base=16")
    if checkpoint.get("canonical_band_order") != BAND_ORDER:
        raise ValueError("ลำดับ band ในโมเดลไม่ใช่ VH, VV")
    if checkpoint.get("config", {}).get("patch_size") != PATCH_SIZE:
        raise ValueError("ขนาด patch ของโมเดลไม่ใช่ 512")
    norm = checkpoint["normalization"]
    if norm.get("canonical_band_order") != BAND_ORDER:
        raise ValueError("ลำดับ band ใน normalization ไม่ตรง")
    if not np.allclose(norm["mean"], TRAIN_MEAN, rtol=0, atol=1e-8) or not np.allclose(norm["std"], TRAIN_STD, rtol=0, atol=1e-8):
        raise ValueError("ค่า normalization เปลี่ยนจากตอน train")
    if device == "auto":
        device = "cuda" if torch.cuda.is_available() else "cpu"
    selected_device = torch.device(device)
    model = SARUNet(base=16)
    model.load_state_dict(checkpoint["state_dict"], strict=True)
    model.to(selected_device).eval()
    contract = {
        "model_drive_id": MODEL_DRIVE_ID, "model_sha256": actual_hash,
        "architecture": "SARUNet", "base": 16, "band_order": BAND_ORDER,
        "normalization_mean": list(norm["mean"]), "normalization_std": list(norm["std"]),
        "patch_size": PATCH_SIZE, "best_epoch": checkpoint.get("best_epoch"),
        "split_sha256": checkpoint.get("split_sha256"), "device": str(selected_device),
        "precision": "float32; inference_mode; no autocast",
    }
    return model, norm, contract


def read_metadata(metadata_path, *, allow_fixture=False):
    with Path(metadata_path).open(encoding="utf-8-sig") as file:
        document = json.load(file)
    features = document.get("features", [])
    if document.get("type") != "FeatureCollection" or len(features) != 1:
        raise ValueError("metadata ต้องเป็น GeoJSON FeatureCollection ของหนึ่ง AOI จาก XEDO GEE")
    props = features[0].get("properties", {})
    is_fixture = allow_fixture and props.get("source") == "Synthetic software test fixture" and props.get("software_test_fixture") is True
    if (props.get("source") != "Google Earth Engine" and not is_fixture) or props.get("collection_id") != "COPERNICUS/S1_GRD":
        raise ValueError("metadata ไม่ใช่ข้อมูล Sentinel-1 GRD จาก GEE")
    if props.get("band_order") != BAND_ORDER or props.get("units") != "Sigma0_dB" or props.get("dtype") != "float32":
        raise ValueError("ต้องใช้ข้อมูล VH, VV แบบ float32 หน่วย Sigma0 dB ไม่ใช่ภาพ PNG/JPG")
    if props.get("nodata_value") != DATA_NODATA:
        raise ValueError("NoData ใน metadata ต้องเป็น -9999")
    expected_prefix = "SYNTHETIC/" if is_fixture else "COPERNICUS/S1_GRD/"
    if not isinstance(props.get("asset_id"), str) or not props["asset_id"].startswith(expected_prefix):
        raise ValueError("ไม่พบ asset_id ต้นทางที่ตรวจสอบได้")
    for key in ["data_file_prefix", "validity_file_prefix"]:
        name = props.get(key)
        if not isinstance(name, str) or not name or any(c in name for c in "/\\\r\n"):
            raise ValueError(f"ชื่อไฟล์ {key} ใน metadata ไม่ถูกต้อง")
    return props, document


def find_input_files(metadata_path, *, allow_fixture=False):
    metadata_path = Path(metadata_path)
    props, _ = read_metadata(metadata_path, allow_fixture=allow_fixture)
    found = []
    for key in ["data_file_prefix", "validity_file_prefix"]:
        paths = [p for p in metadata_path.parent.iterdir()
                 if p.is_file() and p.suffix.lower() in {".tif", ".tiff"} and p.name.startswith(props[key])]
        if len(paths) != 1:
            raise ValueError(f"ต้องพบ TIFF หนึ่งไฟล์สำหรับ {props[key]} แต่พบ {len(paths)} ไฟล์ "
                             "ตรวจว่าส่งออกครบแล้ว หรือเลือก AOI เล็กลงถ้า GEE แบ่งเป็นหลายไฟล์")
        found.append(paths[0])
    return found[0], found[1], metadata_path


def job_settings(properties, metadata_path, override_threshold=None):
    """Resolve an immutable GEE request; legacy exports keep the original default."""
    fallback_id = Path(metadata_path).name.removesuffix('_METADATA.geojson')
    job_id = properties.get('xedo_job_id', fallback_id)
    if not isinstance(job_id, str) or not re.fullmatch(r'[A-Za-z0-9_\-]+', job_id):
        raise ValueError('รหัสงานใน metadata ไม่ถูกต้อง')
    if 'xedo_job_id' in properties and job_id != fallback_id:
        raise ValueError('รหัสงานใน metadata ไม่ตรงชื่อไฟล์')
    if properties.get('analysis_model_sha256', MODEL_SHA256) != MODEL_SHA256:
        raise ValueError('งานนี้เลือกโมเดลคนละตัวกับ SAR checkpoint ในโน้ตบุ๊ก')
    requested = properties.get('analysis_threshold', DEFAULT_THRESHOLD)
    threshold = requested if override_threshold is None else override_threshold
    for value in (requested, threshold):
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not 0 < value < 1:
            raise ValueError('Threshold ในงานและค่าที่ใช้ต้องอยู่ระหว่าง 0 และ 1')
    return {'job_id': job_id, 'requested_threshold': requested, 'threshold': threshold,
            'threshold_source': 'Colab override' if override_threshold is not None else
                ('GEE metadata' if 'analysis_threshold' in properties else 'legacy default')}


def discover_jobs(input_folder, job_id='', *, allow_fixture=False):
    """List complete triplets only. An explicit job never falls back to another."""
    job_id = job_id.strip()
    if job_id and not re.fullmatch(r'[A-Za-z0-9_\-]+', job_id):
        raise ValueError('JOB_ID ต้องเป็นรหัสที่คัดลอกจาก GEE ไม่ใช่ชื่อไฟล์หรือ URL')
    folder = Path(input_folder)
    candidates = sorted(folder.glob('*_METADATA.geojson'), key=lambda p: p.stat().st_mtime, reverse=True)
    if job_id:
        candidates = [p for p in candidates if p.name == job_id + '_METADATA.geojson']
        if not candidates:
            raise FileNotFoundError('ยังไม่พบ metadata ของ JOB_ID นี้: ตรวจโฟลเดอร์และรอ Tasks ครบ')
    jobs, issues = [], []
    for path in candidates:
        try:
            props, _ = read_metadata(path, allow_fixture=allow_fixture)
            settings = job_settings(props, path)
            find_input_files(path, allow_fixture=allow_fixture)
            jobs.append({'metadata_path': str(path), 'properties': props, **settings})
        except (ValueError, OSError, KeyError) as error:
            if job_id:
                raise ValueError('งานที่เลือกยังไม่ครบหรือไม่ถูกต้อง: ' + str(error)) from error
            issues.append({'file': path.name, 'reason': str(error)})
    if not jobs:
        raise FileNotFoundError('ไม่พบชุดภาพที่ครบและถูกต้อง: รอทั้งสาม Tasks แล้วรันช่องเลือกงานใหม่')
    return jobs, issues


def prepare_gee_return(output_dir, summary):
    """Write portable import guidance; does not create or publish an EE asset."""
    output_dir = Path(output_dir)
    source = summary['source']
    asset_name = summary['run_name'] + '_score'
    properties = {'xedo_source_asset': source['asset_id'], 'xedo_run_name': summary['run_name'],
                  'xedo_job_id': summary['job_id'], 'xedo_model_sha256': MODEL_SHA256,
                  'xedo_threshold': summary['threshold'], 'xedo_experimental': 'true',
                  'xedo_synthetic_fixture': str(summary['input_is_synthetic_fixture']).lower()}
    receipt = {'status': 'ready_for_manual_import', 'earth_engine_asset_created': False,
               'file': 'oil_score.tif', 'suggested_asset_name': asset_name,
               'bands': 1, 'dtype': 'float32', 'nodata': DATA_NODATA,
               'pyramiding_policy': 'MEAN', 'optional_asset_properties': properties,
               'grid': summary['exported_grid'], 'job_id': summary['job_id'],
               'source_scene_id': source['scene_id'], 'input_is_synthetic_fixture': summary['input_is_synthetic_fixture']}
    (output_dir / 'gee_return.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2, allow_nan=False), encoding='utf-8')
    property_text = '\n'.join(f'- {key}: {value}' for key, value in properties.items())
    instructions = f'''# นำผลกลับไปดูใน GEE

งาน: {summary['job_id']}
ภาพต้นทาง: {source['scene_id']}
Threshold ขณะรัน: {summary['threshold']}
{'SYNTHETIC / ทดสอบซอฟต์แวร์เท่านั้น ไม่ใช่ภาพดาวเทียม' if summary['input_is_synthetic_fixture'] else 'ผลทดลอง ยังไม่ยืนยันคราบน้ำมันหรือ accuracy'}

1. ดาวน์โหลด oil_score.tif จากโฟลเดอร์ผลลัพธ์นี้ หรือแตก ZIP
2. เปิด https://code.earthengine.google.com/ → Assets → NEW → Image upload
3. เลือก oil_score.tif และใช้ชื่อ asset ใหม่ เช่น {asset_name}
4. Advanced: Pyramiding policy = Mean; Masking mode = No-data value; ค่า = -9999
5. เพิ่ม properties ด้านล่างเพื่อให้หน้าควบคุมตรวจว่าผลมาจากภาพที่เลือกไว้
6. กด UPLOAD และรอ Asset ingestion ใน Tasks สำเร็จ
7. คัดลอก Asset ID เต็มไปส่วน 06 ของหน้าควบคุม GEE แล้วกด โหลดผลกลับบนแผนที่
8. ปรับ Threshold และความทึบที่ GEE ได้ ไม่ต้องรันโมเดลใหม่เพื่อเปลี่ยนการแสดงผล

Properties (ถ้าไม่เพิ่ม ให้ตรวจ scene_id ใน summary.json เองก่อนเทียบภาพ):
{property_text}

โน้ตบุ๊กเตรียมไฟล์เท่านั้น ยังไม่ได้สร้าง asset อัตโนมัติ และไม่เปลี่ยนสิทธิ์แชร์
GeoTIFF ผลยังเป็นกริดเดิม PNG ใช้ดูภาพเท่านั้น
คู่มือ: https://developers.google.com/earth-engine/guides/image_upload
'''
    (output_dir / 'IMPORT_TO_GEE_TH.md').write_text(instructions, encoding='utf-8')
    return receipt


def copy_verified_file(source, target, digest=None):
    """Stage an interrupted copy separately; publish only verified complete bytes."""
    source, target = Path(source), Path(target)
    digest = digest or sha256(source)

    def existing_is_complete():
        if not target.exists():
            return False
        if not target.is_file() or sha256(target) != digest:
            raise FileExistsError('ไฟล์ปลายทางต่างจากผลรอบนี้ ไม่เขียนทับ: ' + target.name)
        return True

    if existing_is_complete():
        return digest
    # The digest binds this staging file to this exact source. An interrupted
    # staging file can be recopied without treating it as a completed output.
    partial = target.with_name('.' + target.name + '.' + digest + '.xedo-partial')
    if not partial.is_file() or sha256(partial) != digest:
        shutil.copyfile(source, partial)
    if sha256(partial) != digest:
        raise IOError('ตรวจไฟล์ที่บันทึกไม่ผ่าน: ' + target.name)
    # Recheck immediately before publication; preserve any conflicting final.
    if existing_is_complete():
        partial.unlink()
        return digest
    partial.replace(target)
    if sha256(target) != digest:
        raise IOError('ตรวจไฟล์ที่บันทึกไม่ผ่าน: ' + target.name)
    return digest


def save_result_bundle(output_dir, destination_root):
    """Copy a finished run to Drive; verify bytes before writing the completion receipt."""
    source = Path(output_dir).resolve()
    summary = json.loads((source / 'summary.json').read_text(encoding='utf-8'))
    if summary.get('status') != 'completed' or summary.get('run_name') != source.name:
        raise ValueError('รับเฉพาะโฟลเดอร์ผลที่ประมวลผลเสร็จแล้ว')
    for name in ['oil_score.tif', 'oil_candidate_mask.tif', 'preview.png', 'gee_return.json', 'IMPORT_TO_GEE_TH.md']:
        if not (source / name).is_file():
            raise FileNotFoundError('ผลลัพธ์ยังไม่ครบ: ' + name)
    root = Path(destination_root).resolve()
    if root == source or source in root.parents:
        raise ValueError('โฟลเดอร์ปลายทางต้องแยกจากโฟลเดอร์ผลต้นทาง')
    root.mkdir(parents=True, exist_ok=True)
    destination = root / source.name
    if destination == source:
        raise ValueError('ปลายทางตรงกับผลต้นทาง กรุณาเลือกโฟลเดอร์ Drive แยก')
    destination.mkdir(exist_ok=True)
    verified = {}
    # Existing identical runs are safe to resume; different bytes are never overwritten.
    for path in sorted(source.iterdir()):
        if not path.is_file():
            continue
        target = destination / path.name
        digest = sha256(path)
        copy_verified_file(path, target, digest)
        verified[path.name] = {'sha256': digest, 'bytes': path.stat().st_size}
    archive = zip_results(source)
    archive_target = destination / archive.name
    copy_verified_file(archive, archive_target)
    receipt = {'status': 'completed_and_verified', 'run_name': source.name, 'job_id': summary['job_id'],
               'files': verified, 'zip': {'name': archive_target.name, 'sha256': sha256(archive_target)},
               'earth_engine_asset_created': False}
    receipt_partial = destination / '.DRIVE_SAVE_VERIFIED.json.xedo-partial'
    receipt_partial.write_text(json.dumps(receipt, indent=2, allow_nan=False), encoding='utf-8')
    receipt_partial.replace(destination / 'DRIVE_SAVE_VERIFIED.json')
    return destination, receipt


def aligned_to_source(export_transform, source_coefficients):
    # A cropped GEE GeoTIFF may translate by whole pixels from its source origin.
    # Compare the pixel basis and integer offsets, not the two origins verbatim.
    if not isinstance(source_coefficients, list) or len(source_coefficients) != 6:
        return False
    if not np.isfinite(source_coefficients).all():
        return False
    original = Affine(*source_coefficients)
    if abs(original.determinant) < 1e-20:
        return False
    if not np.allclose([export_transform.a, export_transform.b, export_transform.d, export_transform.e],
                       [original.a, original.b, original.d, original.e], rtol=0, atol=1e-10):
        return False
    col, row = (~original) * (export_transform.c, export_transform.f)
    return abs(col - round(col)) <= 1e-5 and abs(row - round(row)) <= 1e-5


def validate_inputs(data_path, valid_path, metadata_path, *, allow_fixture=False):
    props, document = read_metadata(metadata_path, allow_fixture=allow_fixture)
    for file, key in [(data_path, "data_file_prefix"), (valid_path, "validity_file_prefix")]:
        if not Path(file).name.startswith(props[key]):
            raise ValueError("ชื่อ TIFF ไม่ตรงกับชุด metadata ที่เลือก")
    with rasterio.open(data_path) as data, rasterio.open(valid_path) as valid:
        if data.driver != "GTiff" or data.count != 2 or list(data.dtypes) != ["float32", "float32"]:
            raise ValueError("ภาพต้องเป็น GeoTIFF สอง band แบบ float32")
        if data.nodata != DATA_NODATA or not data.crs:
            raise ValueError("GeoTIFF ต้องมี CRS และ NoData=-9999")
        if tuple(data.scales) != (1.0, 1.0) or tuple(data.offsets) != (0.0, 0.0):
            raise ValueError("ภาพมี scale/offset เพิ่ม ต้องตรวจการแปลงค่าก่อน")
        if valid.driver != "GTiff" or valid.count != 1 or valid.dtypes[0] != "uint8" or valid.nodata != 0:
            raise ValueError("validity ต้องเป็น TIFF หนึ่ง band uint8 และ NoData=0")
        if (data.width, data.height, data.crs) != (valid.width, valid.height, valid.crs) or data.transform != valid.transform:
            raise ValueError("กริดของภาพและ validity ไม่ตรงกัน ห้าม resize ให้ตรงโดยอัตโนมัติ")
        if data.crs != CRS.from_user_input(props["crs"]) or not aligned_to_source(data.transform, props["crs_transform"]):
            raise ValueError("กริด GeoTIFF ไม่สอดคล้องกับกริดต้นทางใน metadata")
        if data.width * data.height > MAX_PIXELS:
            raise ValueError("ไฟล์เกิน 100 ล้านพิกเซล ให้ส่งออก AOI เล็กลงสำหรับการทดลองนี้")
        grid = {"width": data.width, "height": data.height, "crs": data.crs.to_string(),
                "transform": list(data.transform)[:6], "bounds": list(data.bounds)}
    return props, document, grid


def normalize_tile(data, valid, norm, size=PATCH_SIZE):
    mean = np.asarray(norm["mean"], np.float32)[:, None, None]
    std = np.asarray(norm["std"], np.float32)[:, None, None]
    normalized = (np.where(valid[None], data, mean) - mean) / std
    normalized[:, ~valid] = 0
    if not np.isfinite(normalized).all():
        raise ValueError("พบค่าที่ไม่เป็น finite หลัง normalization")
    tile = np.zeros((2, size, size), dtype=np.float32)
    tile[:, :data.shape[1], :data.shape[2]] = normalized
    return np.ascontiguousarray(tile)


def make_preview(data_path, valid_path, score_path, mask_path, output_path, *, fixture=False):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    with rasterio.open(data_path) as src, rasterio.open(valid_path) as validity, \
            rasterio.open(score_path) as scores, rasterio.open(mask_path) as masks:
        factor = max(1.0, max(src.width, src.height) / 1280)
        shape = (max(1, round(src.height / factor)), max(1, round(src.width / factor)))
        vv = src.read(2, out_shape=shape, resampling=Resampling.nearest)
        valid = validity.read(1, out_shape=shape, resampling=Resampling.nearest) == 1
        score = scores.read(1, out_shape=shape, resampling=Resampling.nearest)
        mask = masks.read(1, out_shape=shape, resampling=Resampling.nearest)
    valid &= np.isfinite(vv) & (vv != DATA_NODATA) & (score != DATA_NODATA)
    background = np.ma.masked_where(~valid, vv)
    probability = np.ma.masked_where(~valid, score)
    overlay = np.zeros((*shape, 4), dtype=np.float32)
    overlay[valid & (mask == 1)] = [1, 0.2, 0.15, 0.75]
    fig, axes = plt.subplots(1, 3, figsize=(15, 5), constrained_layout=True)
    for ax in axes:
        ax.set_facecolor("#e3e9ed")
        ax.set_xlabel("Exported pixel column"); ax.set_ylabel("Exported pixel row")
    axes[0].imshow(background, cmap="gray", vmin=-30, vmax=0)
    axes[0].set_title("Input VV (Sigma0 dB)")
    plotted = axes[1].imshow(probability, cmap="magma", vmin=0, vmax=1)
    axes[1].set_title("Model score (not calibrated)")
    fig.colorbar(plotted, ax=axes[1], fraction=0.046, pad=0.04)
    axes[2].imshow(background, cmap="gray", vmin=-30, vmax=0)
    axes[2].imshow(overlay)
    axes[2].set_title("Red = candidate; gray = NoData")
    title = "SYNTHETIC INPUT / software verification only" if fixture else "Experimental SAR prediction / GEE data accuracy not established"
    fig.suptitle(title, fontsize=13)
    fig.savefig(output_path, dpi=130)
    plt.close(fig)
    return str(output_path)


def run_inference(model, norm, contract, data_path, valid_path, metadata_path,
                  output_root, threshold=DEFAULT_THRESHOLD, batch_size=None, progress=None,
                  *, fixture=False, threshold_source='explicit inference parameter'):
    if not isinstance(threshold, (int, float)) or not math.isfinite(threshold) or not 0 < threshold < 1:
        raise ValueError("threshold ต้องมากกว่า 0 และน้อยกว่า 1")
    if batch_size is None:
        batch_size = 4 if next(model.parameters()).device.type == "cuda" else 1
    if not isinstance(batch_size, int) or not 1 <= batch_size <= 16:
        raise ValueError("batch_size ต้องเป็นจำนวนเต็ม 1–16")
    props, document, grid = validate_inputs(data_path, valid_path, metadata_path, allow_fixture=fixture)
    settings = job_settings(props, metadata_path, override_threshold=threshold)
    if contract.get("model_sha256") != MODEL_SHA256:
        raise ValueError("โมเดลไม่ได้ผ่านการตรวจ fingerprint")
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    run_name = f"XEDO_SAR_{stamp}_{uuid.uuid4().hex[:6]}"
    out = Path(output_root) / run_name
    out.mkdir(parents=True, exist_ok=False)
    score_path, mask_path = out / "oil_score.tif", out / "oil_candidate_mask.tif"
    started = datetime.now(timezone.utc)
    valid_count = candidate_count = processed = 0
    total_score = 0.0
    score_min, score_max = float("inf"), float("-inf")
    band_sum, band_square_sum = np.zeros(2, np.float64), np.zeros(2, np.float64)
    band_min, band_max = np.full(2, np.inf), np.full(2, -np.inf)
    device = next(model.parameters()).device
    model.eval()
    total_tiles = math.ceil(grid["width"] / PATCH_SIZE) * math.ceil(grid["height"] / PATCH_SIZE)
    with rasterio.open(data_path) as src, rasterio.open(valid_path) as validity:
        profile = dict(driver="GTiff", width=src.width, height=src.height, count=1,
                       crs=src.crs, transform=src.transform, compress="deflate",
                       tiled=True, blockxsize=256, blockysize=256, BIGTIFF="IF_SAFER")
        with rasterio.open(score_path, "w", dtype="float32", nodata=DATA_NODATA, **profile) as score_dst, \
                rasterio.open(mask_path, "w", dtype="uint8", nodata=MASK_NODATA, **profile) as mask_dst:
            score_dst.set_band_description(1, "oil_model_score")
            mask_dst.set_band_description(1, "oil_candidate_0_background_1_candidate_255_nodata")
            score_dst.update_tags(model_sha256=MODEL_SHA256, source_asset=props["asset_id"], experimental="true")
            mask_dst.update_tags(model_sha256=MODEL_SHA256, threshold=str(threshold), experimental="true")
            pending = []

            def flush():
                nonlocal valid_count, candidate_count, processed, total_score, score_min, score_max
                if not pending:
                    return
                inputs = torch.from_numpy(np.stack([item[0] for item in pending])).to(device)
                with torch.inference_mode():
                    outputs = model(inputs).float().sigmoid().cpu().numpy()[:, 0]
                if not np.isfinite(outputs).all():
                    raise ValueError("โมเดลให้ผลที่ไม่เป็น finite")
                for predicted, (_, win, valid, raw) in zip(outputs, pending):
                    height, width = valid.shape
                    predicted = predicted[:height, :width]
                    scores = np.where(valid, predicted, DATA_NODATA).astype(np.float32)
                    candidates = np.full(valid.shape, MASK_NODATA, np.uint8)
                    candidates[valid] = (predicted[valid] >= threshold).astype(np.uint8)
                    score_dst.write(scores, 1, window=win)
                    mask_dst.write(candidates, 1, window=win)
                    valid_count += int(valid.sum())
                    candidate_count += int((candidates == 1).sum())
                    values = predicted[valid]
                    total_score += float(values.sum(dtype=np.float64))
                    score_min = min(score_min, float(values.min()))
                    score_max = max(score_max, float(values.max()))
                    for index in range(2):
                        band = raw[index, valid].astype(np.float64)
                        band_sum[index] += band.sum()
                        band_square_sum[index] += np.square(band).sum()
                        band_min[index] = min(band_min[index], float(band.min()))
                        band_max[index] = max(band_max[index], float(band.max()))
                    processed += 1
                pending.clear()
                if progress:
                    progress(processed, total_tiles)

            for row in range(0, src.height, PATCH_SIZE):
                for col in range(0, src.width, PATCH_SIZE):
                    win = Window(col, row, min(PATCH_SIZE, src.width-col), min(PATCH_SIZE, src.height-row))
                    raw = src.read([1, 2], window=win).astype(np.float32, copy=False)
                    mask_values = validity.read(1, window=win)
                    if not np.isin(mask_values, [0, 1]).all():
                        raise ValueError("validity TIFF มีค่าอื่นนอกเหนือจาก 0/1")
                    valid = (mask_values == 1) & (src.read_masks([1, 2], window=win) > 0).all(axis=0)
                    valid &= np.isfinite(raw).all(axis=0) & (raw != DATA_NODATA).all(axis=0)
                    if not valid.any():
                        shape = (int(win.height), int(win.width))
                        score_dst.write(np.full(shape, DATA_NODATA, np.float32), 1, window=win)
                        mask_dst.write(np.full(shape, MASK_NODATA, np.uint8), 1, window=win)
                        processed += 1
                    else:
                        pending.append((normalize_tile(raw, valid, norm), win, valid, raw))
                        if len(pending) == batch_size:
                            flush()
            flush()
    if valid_count == 0:
        raise ValueError("ไม่พบพิกเซลที่มีข้อมูลครบทั้ง VH และ VV ในพื้นที่นี้")
    warnings = ["GEE-to-SNAP preprocessing compatibility and prediction accuracy are not validated.",
                "Scores are sigmoid model outputs, not calibrated probabilities or accuracy.",
                "Land and SAR lookalikes are not excluded; no sea-only mask or operational alarm is applied."]
    if fixture:
        warnings.insert(0, "SYNTHETIC INPUT: software verification only; not a satellite detection result.")
    input_mean = band_sum / valid_count
    input_std = np.sqrt(np.maximum(0, band_square_sum / valid_count - np.square(input_mean)))
    if np.any(np.abs(input_mean - np.asarray(norm["mean"])) / np.asarray(norm["std"]) > 5):
        warnings.append("Input band means differ by more than five training standard deviations; inspect the input data.")
    pixel_area_m2 = None
    with rasterio.open(data_path) as src:
        if src.crs.is_projected and src.crs.linear_units in {"metre", "meter"}:
            pixel_area_m2 = abs(src.transform.determinant)
    summary = {
        "status": "completed", "recipe_version": VERSION, "run_name": run_name,
        "job_id": settings['job_id'], "gee_requested_threshold": settings['requested_threshold'],
        "threshold_source": threshold_source,
        "started_utc": started.isoformat(), "completed_utc": datetime.now(timezone.utc).isoformat(),
        "model": contract, "source": props, "exported_grid": grid,
        "model_inference_performed": True, "experimental": True,
        "input_is_synthetic_fixture": fixture, "accuracy_validated_on_gee": False,
        "tiling": "nonoverlapping 512x512 on exported grid; normalized-zero padding; trim; no resize",
        "threshold": threshold, "frozen_validation_threshold": DEFAULT_THRESHOLD,
        "threshold_changed": threshold != DEFAULT_THRESHOLD, "batch_size": batch_size,
        "tiles_processed": processed, "valid_pixels": valid_count,
        "candidate_pixels": candidate_count, "candidate_percent_of_valid_pixels": 100 * candidate_count / valid_count,
        "mean_model_score": total_score / valid_count, "min_model_score": score_min, "max_model_score": score_max,
        "candidate_planimetric_area_m2": None if pixel_area_m2 is None else candidate_count * pixel_area_m2,
        "input_band_stats": {name: {"mean": float(input_mean[i]), "std": float(input_std[i]),
                                   "min": float(band_min[i]), "max": float(band_max[i])} for i, name in enumerate(BAND_ORDER)},
        "input_files": {"data": {"name": Path(data_path).name, "sha256": sha256(data_path)},
                        "validity": {"name": Path(valid_path).name, "sha256": sha256(valid_path)},
                        "metadata": {"name": Path(metadata_path).name, "sha256": sha256(metadata_path)}},
        "environment": {"python": platform.python_version(), "torch": torch.__version__,
                        "numpy": np.__version__, "rasterio": rasterio.__version__}, "warnings": warnings,
    }
    with (out / "source_metadata.geojson").open("w", encoding="utf-8") as file:
        json.dump(document, file, ensure_ascii=False, allow_nan=False)
    with (out / "summary.json").open("w", encoding="utf-8") as file:
        json.dump(summary, file, ensure_ascii=False, indent=2, allow_nan=False)
    make_preview(data_path, valid_path, score_path, mask_path, out / "preview.png", fixture=fixture)
    prepare_gee_return(out, summary)
    return out, summary


def zip_results(output_dir):
    output_dir = Path(output_dir)
    archive_path = output_dir.with_suffix(".zip")
    with zipfile.ZipFile(archive_path, "w", zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(output_dir.iterdir()):
            if path.is_file():
                archive.write(path, path.name)
    return archive_path
