#!/usr/bin/env bash
# Keyboard Toggle — grant write access to kernel keyboard inhibit sysfs files
#
# Run this ONCE after installing the extension:
#   ./setup-permissions.sh
#
# Do NOT run this script with sudo — it will call sudo internally where needed.
#
# This creates a systemd-tmpfiles entry that persists across reboots and
# rpm-ostree upgrades on Bazzite/Fedora Atomic.

set -euo pipefail

if [ "$(id -u)" = "0" ]; then
    echo "ERROR: Do not run this script with sudo."
    echo "  This script calls sudo internally for the commands that need it."
    echo "  Run it as your normal user: ./setup-permissions.sh"
    exit 1
fi

CONF_FILE="/etc/tmpfiles.d/keyboard-toggle.conf"

KBD_PATH="/sys/devices/platform/i8042/serio0/input/input2/inhibited"
BTN_PATH="/sys/devices/pci0000:00/0000:00:1f.0/PNP0C09:00/VPC2004:00/input/input24/inhibited"

USER_GROUP=$(id -gn)

echo "==> Keyboard Toggle Permission Setup"
echo "    User:  $USER"
echo "    Group: $USER_GROUP"
echo "    Config: $CONF_FILE"
echo ""

# Check that sysfs paths exist
for p in "$KBD_PATH" "$BTN_PATH"; do
    if [ ! -f "$p" ]; then
        echo "ERROR: sysfs path not found: $p"
        echo "  Your hardware may use different input device paths."
        echo "  Run this to find your keyboard devices:"
        echo "    for d in /sys/class/input/input*/name; do echo \"\$d: \$(cat \$d)\"; done"
        echo "  Then update the paths in this script and in keyboardManager.js."
        exit 1
    fi
    echo "  [OK] Found: $p"
done

echo ""
echo "Writing $CONF_FILE ..."
sudo tee "$CONF_FILE" > /dev/null << EOF
# Keyboard Toggle extension — allow user to toggle internal keyboard via inhibited sysfs
z $KBD_PATH 0664 root $USER_GROUP -
z $BTN_PATH 0664 root $USER_GROUP -
EOF

echo "  [OK] Config written"

echo ""
echo "Applying permissions now..."
sudo systemd-tmpfiles --create "$CONF_FILE"
echo "  [OK] Permissions applied"

# Verify
echo ""
echo "Verifying write access..."
FAILED=0
for p in "$KBD_PATH" "$BTN_PATH"; do
    if [ -w "$p" ]; then
        echo "  [OK] Writable: $p"
    else
        echo "  [WARN] Not writable: $p"
	FAILED=1
    fi
done

if [ "$FAILED" = "1" ]; then
    echo ""
    echo "  Write access not fully available yet."
    echo "  You may need to log out and back in for group changes to apply."
    echo ""
    echo "  SELinux troubleshooting: if the issue persists, check for denials:"
    echo "    sudo ausearch -m avc -ts recent | grep inhibited"
fi

echo ""
echo "Done. After logging out and back in, the keyboard toggle extension"
echo "should be able to write to the inhibited sysfs files."
