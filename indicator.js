import Gio from 'gi://Gio';
import GObject from 'gi://GObject';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as QuickSettings from 'resource:///org/gnome/shell/ui/quickSettings.js';

import {keyboardManager} from './keyboardManager.js';

const KeyboardToggle = GObject.registerClass(
    class KeyboardToggle extends QuickSettings.QuickToggle {
        _init() {
            super._init({
                title: 'Keyboard',
                subtitle: 'Checking\u2026',
                iconName: 'input-keyboard-symbolic',
                toggleMode: true,
            });

            this.connect('clicked', () => {
                keyboardManager.setInhibited(!this.checked);
                this._updateSubtitle();
                this._showOSD(this.checked);
            });
        }

        _updateSubtitle() {
            this.subtitle = this.checked
                ? 'Keyboard On'
                : 'Keyboard Off';
        }

        _showOSD(checked) {
            const icon = new Gio.ThemedIcon({name: 'input-keyboard-symbolic'});
            const label = checked ? 'Keyboard On' : 'Keyboard Off';
            const mgr = Main.osdWindowManager;
            if (typeof mgr.showAll === 'function')
                mgr.showAll(icon, label, null, -1);
            else
                mgr.show(-1, icon, label, null, -1);
        }

        syncState() {
            const inhibited = keyboardManager.isInhibited();
            this.checked = !inhibited;
            this._updateSubtitle();
        }

        setPermissionError() {
            this.checked = false;
            this.subtitle = 'Permission denied — run setup-permissions.sh';
        }
    },
);

const KeyboardIndicator = GObject.registerClass(
    class KeyboardIndicator extends QuickSettings.SystemIndicator {
        _init() {
            super._init();

            this._indicator = this._addIndicator();
            this._indicator.icon_name = 'input-keyboard-symbolic';

            this._toggle = new KeyboardToggle();
            this.quickSettingsItems.push(this._toggle);

            const hasPermission = keyboardManager.probe();
            if (hasPermission) {
                this._toggle.syncState();
                keyboardManager.startMonitor(() => {
                    this._toggle.syncState();
                });
            } else {
                this._toggle.setPermissionError();
            }
        }

        destroy() {
            keyboardManager.stopMonitor();
            this._toggle.destroy();
            super.destroy();
        }
    },
);

export {KeyboardIndicator};
