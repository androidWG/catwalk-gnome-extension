import Gio from "gi://Gio";
import GObject from "gi://GObject";

import * as Main from "resource:///org/gnome/shell/ui/main.js";
import * as QuickSettings from "resource:///org/gnome/shell/ui/quickSettings.js";

import { keyboardManager } from "./keyboardManager.js";

const KeyboardToggle = GObject.registerClass(
    class KeyboardToggle extends QuickSettings.QuickToggle {
        _init(onIcon, offIcon) {
            super._init({
                title: "Keyboard",
                subtitle: "Checking\u2026",
                gicon: onIcon,
                toggleMode: true,
            });

            this._onIcon = onIcon;
            this._offIcon = offIcon;

            this.connect("clicked", () => {
                const wasInhibited = keyboardManager.isInhibited();
                const nowInhibited = !wasInhibited;
                keyboardManager.setInhibited(nowInhibited);
                this.checked = !nowInhibited;
                this._refreshDisplay();
                this._showOSD(!nowInhibited);
            });
        }

        _refreshDisplay() {
            this.gicon = this.checked ? this._onIcon : this._offIcon;
            this.subtitle = this.checked ? "Keyboard On" : "Keyboard Off";
        }

        _showOSD(checked) {
            const icon = checked ? this._onIcon : this._offIcon;
            const label = checked ? "Keyboard On" : "Keyboard Off";
            const mgr = Main.osdWindowManager;
            if (typeof mgr.showAll === "function")
                mgr.showAll(icon, label, null, -1);
            else mgr.show(-1, icon, label, null, -1);
        }

        syncState() {
            const inhibited = keyboardManager.isInhibited();
            this.checked = !inhibited;
            this._refreshDisplay();
        }

        setPermissionError() {
            this.checked = false;
            this.subtitle = "Permission denied — run setup-permissions.sh";
        }

        handleExternalToggle(nowInhibited) {
            this.checked = !nowInhibited;
            this._refreshDisplay();
            this._showOSD(!nowInhibited);
        }
    },
);

const KeyboardIndicator = GObject.registerClass(
    class KeyboardIndicator extends QuickSettings.SystemIndicator {
        _init(extensionObject) {
            super._init();

            this._onIcon = new Gio.ThemedIcon({
                name: "input-keyboard-symbolic",
            });
            this._offIcon = new Gio.FileIcon({
                file: extensionObject.dir.get_child("keyboard-off.svg"),
            });

            this._indicator = this._addIndicator();
            this._indicator.gicon = this._onIcon;

            this._toggle = new KeyboardToggle(this._onIcon, this._offIcon);
            this.quickSettingsItems.push(this._toggle);

            const hasPermission = keyboardManager.probe();
            if (hasPermission) {
                this._toggle.syncState();
                this._updateIndicatorIcon();
                keyboardManager.startMonitor(() => {
                    this._toggle.syncState();
                    this._updateIndicatorIcon();
                });
            } else {
                this._toggle.setPermissionError();
            }
        }

        _updateIndicatorIcon() {
            this._indicator.gicon = this._toggle.checked
                ? this._onIcon
                : this._offIcon;
        }

        destroy() {
            keyboardManager.stopMonitor();
            this._toggle.destroy();
            super.destroy();
        }
    },
);

export { KeyboardIndicator };
