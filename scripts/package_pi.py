"""Package only the installation allowlist; no credentials or live data."""
import hashlib
import pathlib
import zipfile

root = pathlib.Path(__file__).resolve().parents[1]
target = root / 'public/downloads/xedo-pi5-kit.zip'
target.parent.mkdir(parents=True, exist_ok=True)
names = ['agent.py', 'run_agent.py', 'install.sh', 'xedo-pi.service', 'pi.env.example', 'status.example.json']
with zipfile.ZipFile(target, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
    for name in names:
        archive.writestr('xedo-pi5-kit/' + name, (root / 'pi-agent' / name).read_text(encoding='utf-8').replace('\r\n', '\n'))
    archive.writestr('xedo-pi5-kit/README.md', (root / 'public/docs/pi5-setup.md').read_text(encoding='utf-8'))
    archive.writestr('xedo-pi5-kit/pi-agent-en.md', (root / 'public/docs/pi-agent-en.md').read_text(encoding='utf-8'))
print('Pi 5 kit:', target.name, 'sha256=' + hashlib.sha256(target.read_bytes()).hexdigest())
