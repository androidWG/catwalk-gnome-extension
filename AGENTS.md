# Catwalk — Keyboard Toggle GNOME Extension

Adds a keyboard icon toggle to the GNOME Quick Settings menu to enable/disable the internal laptop keyboard at runtime via the kernel `inhibited` sysfs interface (Linux 5.11+).

## Project Structure

```
catwalk@neufter.dev/
├── extension.js         # Entry point — registers indicator with Quick Settings
├── indicator.js         # QuickSettings.SystemIndicator + QuickToggle widget
├── keyboardManager.js   # Reads/writes kernel inhibited sysfs files
├── metadata.json        # GNOME Shell extension manifest
├── stylesheet.css       # Extension styles (currently empty)
├── setup-permissions.sh # One-time permission setup (systemd-tmpfiles)
├── AGENTS.md            # This file
└── .slim/deepwork/      # Deepwork session state (gitignored)
```

## How the Toggle Works

Two sysfs paths are toggled together:
- Keyboard: `/sys/devices/platform/i8042/serio0/input/input2/inhibited`
- Ideapad extra buttons: `/sys/devices/pci0000:00/0000:00:1f.0/PNP0C09:00/VPC2004:00/input/input24/inhibited`

These paths are **hardware-specific** (Lenovo 82CG IdeaPad). To find paths on other hardware:

```bash
for d in /sys/class/input/input*/name; do echo "$d: $(cat $d)"; done
```

Then look for `<device>/inhibited` in the corresponding `/sys/devices/` tree.

## Installation

```bash
# One-time setup: grant write access to inhibited sysfs files
./setup-permissions.sh

# Symlink the extension into GNOME's extensions directory
ln -s "$(pwd)" ~/.local/share/gnome-shell/extensions/catwalk@neufter.dev

# Restart GNOME Shell (Wayland: log out/in; X11: Alt+F2 → r → Enter)
# Or use Extension Manager to disable/re-enable
```

The folder name MUST match the `uuid` field in `metadata.json` — `catwalk@neufter.dev`.

## Debugging

### 1. Check the extension loaded correctly

```bash
journalctl -q /usr/bin/gnome-shell -f --no-hostname
```

Filter for this extension's output:
```bash
journalctl -q /usr/bin/gnome-shell --no-hostname | grep keyboardManager
```

### 2. Looking Glass (built-in GNOME debugger)

Press `Alt+F2`, type `lg`, press Enter. Go to the **Extensions** tab. Any errors from the extension appear in the **Errors** tab.

### 3. Verify sysfs permissions

```bash
# Check if the user can write to inhibited files
test -w /sys/devices/platform/i8042/serio0/input/input2/inhibited && echo "Writable" || echo "Not writable"
```

If not writable, re-run `./setup-permissions.sh` and log out/in for group changes to apply.

### 4. Watch Looking Glass errors in the terminal

```bash
journalctl -q /usr/bin/gnome-shell -f | grep -i "error\|keyboard\|catwalk"
```

### 5. SELinux

If write access is confirmed but toggling fails, check for SELinux denials:
```bash
sudo ausearch -m avc -ts recent | grep inhibited
```

## Development Workflow

1. Make changes to source files in this repo
2. Restart GNOME Shell to reload (log out/in on Wayland)
   - Or use Extension Manager → disable → enable
   - Or run: `busctl --user call org.gnome.Shell /org/gnome/Shell org.gnome.Shell Eval s 'Meta.restart("Restarting…")'` (may crash extensions)
3. Check logs with journalctl for errors

## Known Quirks

- **inhibited paths are hardware-specific**: The paths in `keyboardManager.js` and `setup-permissions.sh` must match. If you change hardware, update both files.
- **Bazzite/Fedora Atomic**: `setup-permissions.sh` uses `systemd-tmpfiles` (not udev rules) which survives rpm-ostree upgrades.
- **Wayland restrictions**: `Alt+F2` + `r` doesn't work on Wayland. You must log out/in to fully reload extensions.
- **`Gio.FileIOStream`**: Has no `.write()` method. Must call `.get_output_stream()` then `.write_all()`.

## References

- [GJS Guide — Creating Extensions](https://gjs.guide/extensions/development/creating.html)
- [GJS Guide — Quick Settings](https://gjs.guide/extensions/overview/quick-settings.html)
- [GNOME Shell Extensions documentation](https://gjs.guide/extensions/)
- [GNOME Shell JavaScript source](https://gitlab.gnome.org/GNOME/gnome-shell/tree/main/js/ui)
- [Kernel inhibitable input devices (LWN)](https://lwn.net/Articles/843142/)
