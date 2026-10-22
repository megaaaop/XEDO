#!/usr/bin/env bash
set -euo pipefail
if [[ ${EUID} -ne 0 ]]; then
  echo 'Run: sudo bash install.sh' >&2
  exit 1
fi
source_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
python3 -c 'import sys; assert sys.version_info >= (3, 11), "Python 3.11+ required"'
command -v systemctl >/dev/null
if ! id xedo-pi >/dev/null 2>&1; then
  useradd --system --user-group --home-dir /var/lib/xedo-pi --shell /usr/sbin/nologin xedo-pi
fi
install -d -m 755 /opt/xedo-pi
install -d -o xedo-pi -g xedo-pi -m 700 /var/lib/xedo-pi
install -m 644 "$source_dir/agent.py" "$source_dir/run_agent.py" /opt/xedo-pi/
install -m 644 "$source_dir/xedo-pi.service" /etc/systemd/system/xedo-pi.service
if [[ ! -f /etc/xedo-pi.env ]]; then
  install -m 600 "$source_dir/pi.env.example" /etc/xedo-pi.env
fi
if [[ ! -f /var/lib/xedo-pi/status.json ]]; then
  install -o xedo-pi -g xedo-pi -m 600 "$source_dir/status.example.json" /var/lib/xedo-pi/status.json
fi
systemctl daemon-reload
echo 'Installed. Edit /etc/xedo-pi.env, run doctor, then enable the service.'
echo 'sudo python3 /opt/xedo-pi/run_agent.py --config /etc/xedo-pi.env doctor'
echo 'sudo systemctl enable --now xedo-pi'
