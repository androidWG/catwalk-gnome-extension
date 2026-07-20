import { Extension } from "resource:///org/gnome/shell/extensions/extension.js";
import * as Main from "resource:///org/gnome/shell/ui/main.js";

import Meta from "gi://Meta";
import Shell from "gi://Shell";

import { KeyboardIndicator } from "./indicator.js";
import { keyboardManager } from "./keyboardManager.js";

export default class KeyboardToggleExtension extends Extension {
    enable() {
        this._indicator = new KeyboardIndicator();
        Main.panel.statusArea.quickSettings.addExternalIndicator(
            this._indicator,
        );

        this._settings = this.getSettings();
        this._settingsChangedId = null;
        this._registerShortcut();
    }

    disable() {
        this._unregisterShortcut();
        this._settings = null;

        if (this._indicator) {
            this._indicator.destroy();
            this._indicator = null;
        }
    }

    _registerShortcut() {
        this._bindingAdded = Main.wm.addKeybinding(
            "toggle-keyboard-shortcut",
            this._settings,
            Meta.KeyBindingFlags.NONE,
            Shell.ActionMode.NORMAL,
            this._handleShortcut.bind(this),
        );

        if (!this._bindingAdded) {
            logError(
                null,
                "Catwalk: Failed to register global keyboard shortcut",
            );
        }

        this._settingsChangedId = this._settings.connect(
            "changed::toggle-keyboard-shortcut",
            () => {
                this._unregisterShortcut();
                this._registerShortcut();
            },
        );
    }

    _unregisterShortcut() {
        if (this._settingsChangedId) {
            this._settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        Main.wm.removeKeybinding("toggle-keyboard-shortcut");
        this._bindingAdded = false;
    }

    _handleShortcut() {
        const wasInhibited = keyboardManager.isInhibited();
        const nowInhibited = !wasInhibited;
        keyboardManager.setInhibited(nowInhibited);

        this._indicator?._toggle?.handleExternalToggle(nowInhibited);
    }
}
