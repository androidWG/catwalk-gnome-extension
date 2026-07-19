# Catwalk - easy keyboard toggle for GNOME (and your cat)

> *"Enable or disable your laptop's internal keyboard at runtime - no reboot required!"*

Your cat can now freely walk on top of your keyboard while you work; and when you
use your Linux computer on-the-go, easily disable it via a Quick Settings toggle!

Uses the kernel `inhibited` sysfs interface (Linux 5.11+). All you need is a `systemd`
Linux OS, a laptop, and (optional) a cat.

> [!WARNING]
> The extension has paths **hardwired** to the keyboard devices of my specific laptop. You'll need to change this to your computer. See [the relevant section](#hardware) for more info.

## How it Works

The extension adds a keyboard icon to the GNOME Quick Settings panel. When toggled,
it writes `1` or `0` directly to the kernel's `/sys/.../inhibited` files, which is the
kernel input subsystem's built-in mechanism for temporarily ignoring events from
a device at runtime. An OSD overlay then confirms the new state.

The install script creates a `systemd-tmpfiles` rule so your user can write to those files
without `sudo`.

## Install

You'll most likely want to adapt the extension for you device. See [the relevant section](#hardware) for more info.

Grant write access to the keyboard's sysfs files:

```bash
./setup-permissions.sh
```

Copy into GNOME's extensions directory:

```bash
cp -r . ~/.local/share/gnome-shell/extensions/catwalk@neufter.dev
```

Alternatively, you can first package the extension using `gnome-extensions pack`, and
then run:

```bash
gnome-extensions install catwalk@neufter.dev.shell-extension.zip
```

Then log out and back in and manage via
[Extension Manager](https://flathub.org/en/apps/com.mattjakeman.ExtensionManager)
or GNOME's builtin Extensions app.

## Usage

Open Quick Settings (top-right panel). Click the keyboard toggle. You should see
an OSD message confirming the state of the keyboard.

## Hardware

The sysfs paths in `keyboardManager.js` and `setup-permissions.sh` are configured
for a Lenovo IdeaPad Gaming 3i from circa 2021. If you have this laptop, today is your lucky day! If not, this is how you can adapt the extension for your case:

### 1. Find your keyboard's device name

```bash
for d in /sys/class/input/input*/name; do echo "$d: $(cat $d)"; done
```

Most internal keyboard laptops are named . Note the `inputN` number in the path -
e.g. `/sys/class/input/input2/name` means your keyboard is `input2`.

### 2. Verify the inhibited file exists

Using the `inputN` from above, check for the inhibited attribute:

```bash
cat /sys/class/input/input2/device/inhibited
```

or, if that fails, search the device tree:

```bash
find "/sys/devices" -path "*/input/input2/inhibited"
```

If the file doesn't exist, your kernel is too old (5.11+ required) or the
device driver doesn't expose the attribute.

### 3. Test it manually

```bash
# Disable
echo 1 | sudo tee /sys/devices/platform/i8042/serio0/input/input2/inhibited
# Re-enable
echo 0 | sudo tee /sys/devices/platform/i8042/serio0/input/input2/inhibited
```

Replace the path with the one found in step 2. If the keyboard stops/starts
responding, you've got the right path.

### 4. Update the extension

Once confirmed, update the paths in both files so they stay in sync:

- **`keyboardManager.js`** — the `INHIBITED_PATHS` array (line 3)
- **`setup-permissions.sh`** — the `KBD_PATH` variable (line 23)

If your laptop has extra hardware buttons (normally for multimedia a.k.a. the function
keys), find and add those paths too if you'd like. List all input devices from step 1
and repeat steps 2–4 for any you want to toggle alongside the keyboard.

### 5. (Re-)run the permission script

```bash
./setup-permissions.sh
```

This writes the new paths into the systemd-tmpfiles rule.

## Troubleshooting

You can check the logs from the extension using:

```bash
journalctl -q /usr/bin/gnome-shell --no-hostname | grep keyboardManager
```
