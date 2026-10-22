# Connect Raspberry Pi 5 to XEDO

The kit sends device heartbeats, optional sensor status, still images, and existing processing results. It does not operate a drone or dispenser. The software has been tested with local API fixtures; physical Pi 5 and camera acceptance is still required.

## 1. Prepare the board

Use Raspberry Pi OS (64-bit), Python 3.11 or later, and Wi-Fi or Ethernet internet access. Raspberry Pi Imager can configure your username, hostname, Wi-Fi and SSH before the first boot. Use a power supply suitable for Pi 5; Raspberry Pi recommends its 27 W USB-C supply. Follow the [official setup guide](https://www.raspberrypi.com/documentation/computers/getting-started.html).

## 2. Transfer the kit and private configuration

Download **xedo-pi5-kit.zip** from Monitor & Replay, then copy it onto the Pi. The public kit contains example settings only. The owner prepares `xedo-pi.env` separately, with the matching server device token and the existing private Site access token. That file is a credential file; keep it out of the public kit and source control.

Example from Windows PowerShell (replace the username, hostname and file paths):

```powershell
scp "C:\path\xedo-pi5-kit.zip" YOUR_USER@xedo-pi.local:~/
scp "C:\path\xedo-pi.env" YOUR_USER@xedo-pi.local:~/
ssh YOUR_USER@xedo-pi.local
```

If `.local` does not resolve, use the Pi's LAN IP address. SSH setup is covered in the [official remote access guide](https://www.raspberrypi.com/documentation/computers/remote-access.html).

## 3. Install on the Pi

Run these commands in the Pi terminal:

```bash
sudo apt update
sudo apt install -y python3 unzip
unzip xedo-pi5-kit.zip
cd xedo-pi5-kit
sudo bash install.sh
sudo install -o root -g root -m 600 ~/xedo-pi.env /etc/xedo-pi.env
```

The installer creates an `xedo-pi` service account and installs the uploader under `/opt/xedo-pi`. The service stores its queue in `/var/lib/xedo-pi`. It starts only after the next step.

## 4. Check the connection, then enable automatic startup

```bash
sudo python3 /opt/xedo-pi/run_agent.py --config /etc/xedo-pi.env doctor
```

Success returns `api_reachable: true` and `device_authenticated: true`. This checks credentials without uploading a heartbeat or claiming hardware validation.

```bash
sudo systemctl enable --now xedo-pi
sudo systemctl status xedo-pi --no-pager
sudo journalctl -u xedo-pi -n 30 --no-pager
```

Open **Monitor & Replay → Live Pi data**. During normal connectivity, the uploader targets a heartbeat every 2 seconds. Network timeouts can make the interval longer. The dashboard currently labels a last reading stale after 5 seconds and disconnected after 15 seconds.

## Optional sensors and camera

GPS, drone battery and dispenser measurements remain unknown until a real adapter supplies them. Set `XEDO_PI_STATUS_JSON=/var/lib/xedo-pi/status.json` only when an adapter writes this file. Use the included `status.example.json` format and write updates atomically. Files older than 10 seconds are marked stale and their measurements are withheld. This timeout is configurable using `XEDO_PI_STATUS_MAX_AGE_S`.

Use `XEDO_PI_CLOCK_QUALITY=synced` only after verifying that the Pi's clock is synchronised. After configuration edits, restart with `sudo systemctl restart xedo-pi`.

For still-image uploads, use the [Pi image guide](pi-agent-en.md) and the [official camera software guide](https://www.raspberrypi.com/documentation/computers/camera_software.html). A Pi 5 camera connection needs a cable that matches its camera connector and your camera. Verify the camera on the board before uploading an image. GPS location does not georeference every pixel of a camera image.

## Troubleshooting

| Result | Check |
|---|---|
| HTTP 401/403 or a sign-in response | Private Site access and the matching device token |
| HTTP 503 / DEVICE_NOT_CONFIGURED | The server device token and deployed environment revision |
| Network or DNS error | Internet connection and the configured HTTPS origin |
| Unknown measurements | Sensor adapter and its status file |
| status_file_stale | The sensor adapter has stopped updating its file |
| queued / rejected packets | Network delivery or invalid packets; inspect the service log |

Queued data is retained for retries. A second uploader cannot use the same spool at the same time on Linux. To stop automatic uploads: `sudo systemctl disable --now xedo-pi`.
