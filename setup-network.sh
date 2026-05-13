#!/bin/bash

echo "🌐 Setting up network (Windows <-> WSL) for phone access..."

# ---------- 1. Get Windows LAN IP ----------
echo "📡 Fetching Windows LAN IP..."
WINDOWS_IP=$(powershell.exe -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { \$_.InterfaceAlias -match 'Wi-Fi|Ethernet' -and \$_.PrefixOrigin -eq 'Dhcp' }).IPAddress" 2>/dev/null | tr -d '\r')

if [ -z "$WINDOWS_IP" ]; then
  echo "❌ Could not detect Windows LAN IP. Falling back to alternative..."
  # fallback: use the nameserver from resolv.conf (often the Windows host virtual IP)
  WINDOWS_IP=$(cat /etc/resolv.conf | grep nameserver | awk '{ print $2 }')
fi

echo "   Windows LAN IP: $WINDOWS_IP"

# ---------- 2. Get WSL’s own IP ----------
WSL_IP=$(hostname -I | awk '{print $1}')
echo "   WSL IP        : $WSL_IP"

# ---------- 3. Add portproxy on Windows ----------
echo "🔁 Setting up port forwarding (Windows:5000 -> WSL:5000)..."
powershell.exe -Command "netsh interface portproxy delete v4tov4 listenport=5000 listenaddress=0.0.0.0" 2>/dev/null
powershell.exe -Command "netsh interface portproxy add v4tov4 listenport=5000 listenaddress=0.0.0.0 connectport=5000 connectaddress=$WSL_IP"

# ---------- 4. Add firewall rule ----------
echo "🛡️  Allowing port 5000 through Windows Firewall..."
powershell.exe -Command "New-NetFirewallRule -DisplayName 'Allow TCP 5000' -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow" 2>/dev/null

# ---------- 5. Update frontend BASE_URL ----------
echo "✏️  Updating frontend/App.js with Windows IP..."
sed -i "s|const BASE_URL = .*|const BASE_URL = 'http://${WINDOWS_IP}:5000';|" frontend/App.js

# ---------- 6. Restart suggestion ----------
echo ""
echo "✅ Network setup complete!"
echo "   Test from your phone browser: http://${WINDOWS_IP}:5000/api/menu"
echo ""
echo "🚀 Now restart your POS servers:"
echo "   ./start-all.sh"
