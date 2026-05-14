#!/usr/bin/env bash
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run with sudo: sudo bash $0" >&2
  exit 1
fi

echo "==> Installing curl + ca-certificates"
apt-get update -y
apt-get install -y curl ca-certificates

echo "==> Installing monolith"
if ! command -v monolith &>/dev/null; then
  MONOLITH_VERSION=v2.10.1
  case "$(uname -m)" in
    x86_64)  MONOLITH_ARCH=x86_64 ;;
    aarch64) MONOLITH_ARCH=aarch64 ;;
    *) echo "unsupported arch: $(uname -m)" >&2; exit 1 ;;
  esac
  curl -fsSL -o /usr/local/bin/monolith \
    "https://github.com/Y2Z/monolith/releases/download/${MONOLITH_VERSION}/monolith-gnu-linux-${MONOLITH_ARCH}"
  chmod 0755 /usr/local/bin/monolith
fi

echo "==> Installing Tailscale"
if ! command -v tailscale &>/dev/null; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi

echo "==> Creating ronin user + directories"
if ! id ronin &>/dev/null; then
  useradd --system --home /var/lib/ronin --shell /usr/sbin/nologin ronin
fi
install -d -o ronin -g ronin -m 0755 /var/lib/ronin
install -d -o root  -g root  -m 0755 /etc/ronin

if [[ ! -f /etc/ronin/env ]]; then
  echo "==> Setting PASSPHRASE"
  read -rsp "PASSPHRASE for Ronin login: " passphrase
  echo
  umask 077
  printf 'PASSPHRASE=%s\n' "$passphrase" > /etc/ronin/env
  chown root:ronin /etc/ronin/env
  chmod 0640 /etc/ronin/env
fi

echo "==> Installing systemd unit"
install -m 0644 /tmp/ronin.service /etc/systemd/system/ronin.service
systemctl daemon-reload
systemctl enable ronin

cat <<'EOF'

==> Bootstrap done.

Next steps (run as root on this server):
  1. Bring up Tailscale:
       sudo tailscale up
     Follow the printed auth URL once.

  2. In the Tailscale admin console (https://login.tailscale.com/admin/dns)
     enable MagicDNS and HTTPS. Required for the .ts.net cert.

  3. Expose Ronin over HTTPS to your tailnet (persists across reboots):
       sudo tailscale serve --bg 8080

  4. From your laptop, deploy the binary:
       make deploy DEPLOY_HOST=<user>@<server>

Your Ronin URL will be https://<hostname>.<tailnet>.ts.net
EOF
