# Catwalk — Keyboard Toggle

GNOME Shell extension that adds a keyboard toggle to the Quick Settings menu.
Enable or disable your laptop's internal keyboard at runtime — no reboot required.

Uses the kernel `inhibited` sysfs interface (Linux 5.11+).

## Install

```bash
# Grant write access to the keyboard's sysfs files (run once)
./setup-permissions.sh

# Symlink into GNOME's extensions directory
ln -s "$(pwd)" ~/.local/share/gnome-shell/extensions/catwalk@neufter.dev
```

Then log out and back in (or disable/enable via Extension Manager).

## Usage

Open Quick Settings (top-right panel). Click the keyboard toggle.
An OSD overlay confirms the state — same style as volume/brightness popups.

## Hardware

The sysfs paths in `keyboardManager.js` and `setup-permissions.sh` are configured
for a Lenovo 82CG IdeaPad. To find paths for other hardware:

```bash
for d in /sys/class/input/input*/name; do echo "$d: $(cat $d)"; done
```

Then locate `<device>/inhibited` in the matching `/sys/devices/` tree and update
both files.

## Troubleshooting

**Toggle does nothing:**
```bash
./setup-permissions.sh   # re-run permission setup
```

**Check logs:**
```bash
journalctl -q /usr/bin/gnome-shell --no-hostname | grep keyboardManager
```

## Docs

See [`AGENTS.md`](AGENTS.md) for development and debugging details.
