#!/bin/bash
set -euo pipefail

LINUX_USER=birkan
export DEBIAN_FRONTEND=noninteractive

if ! id -u "$LINUX_USER" >/dev/null 2>&1; then
  useradd -m -s /bin/bash -G sudo "$LINUX_USER"
fi

printf '%s ALL=(ALL) NOPASSWD:ALL\n' "$LINUX_USER" > "/etc/sudoers.d/$LINUX_USER"
chmod 440 "/etc/sudoers.d/$LINUX_USER"

cat > /etc/wsl.conf <<EOF
[boot]
systemd=true

[user]
default=$LINUX_USER
EOF

apt-get update
apt-get install -y ca-certificates curl
curl -fsSL https://get.docker.com | sh
usermod -aG docker "$LINUX_USER"

if command -v systemctl >/dev/null 2>&1; then
  systemctl enable --now docker || service docker start || true
else
  service docker start || true
fi

docker --version
docker compose version
id "$LINUX_USER"
