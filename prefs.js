import Gio from "gi://Gio";
import Adw from "gi://Adw";
import Gtk from "gi://Gtk";
import Gdk from "gi://Gdk";
import GLib from "gi://GLib";
import GObject from "gi://GObject";

import {
    ExtensionPreferences,
    gettext as _,
} from "resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js";

const ShortcutDialog = GObject.registerClass(
    {
        Signals: {
            "shortcut-entered": { param_types: [GObject.TYPE_STRING] },
        },
    },
    class ShortcutDialog extends Adw.Dialog {
        _init() {
            super._init({
                title: _("Set Shortcut"),
                content_width: 400,
                content_height: 300,
            });

            this._shortcutsInhibited = false;

            this._keyController = new Gtk.EventControllerKey({
                propagation_phase: Gtk.PropagationPhase.CAPTURE,
            });
            this._keyController.connect("key-pressed", this._keyPressed.bind(this));
            this.add_controller(this._keyController);

            const toolbarView = new Adw.ToolbarView();
            const headerBar = new Adw.HeaderBar();
            toolbarView.add_top_bar(headerBar);

            const instructionLabel = new Gtk.Label({
                label: _("Enter new shortcut"),
                halign: Gtk.Align.CENTER,
                margin_top: 24,
            });

            const backspaceRow = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
                halign: Gtk.Align.CENTER,
            });
            backspaceRow.append(
                new Adw.ShortcutLabel({ accelerator: "BackSpace" }),
            );
            backspaceRow.append(
                new Gtk.Label({ label: _("Disable Shortcut") }),
            );

            const escapeRow = new Gtk.Box({
                orientation: Gtk.Orientation.HORIZONTAL,
                spacing: 12,
                halign: Gtk.Align.CENTER,
            });
            escapeRow.append(
                new Adw.ShortcutLabel({ accelerator: "Escape" }),
            );
            escapeRow.append(
                new Gtk.Label({ label: _("Cancel") }),
            );

            const contentBox = new Gtk.Box({
                orientation: Gtk.Orientation.VERTICAL,
                valign: Gtk.Align.CENTER,
                spacing: 12,
                margin_top: 24,
                margin_bottom: 24,
                margin_start: 24,
                margin_end: 24,
            });
            contentBox.append(instructionLabel);
            contentBox.append(backspaceRow);
            contentBox.append(escapeRow);

            toolbarView.set_content(contentBox);
            this.set_child(toolbarView);
        }

        _isValidBinding(keyval, _keycode, mask) {
            if (!Gtk.accelerator_valid(keyval, mask)) return false;

            if (
                (mask === 0 || mask === Gdk.ModifierType.SHIFT_MASK)
                && _keycode !== 0
            ) {
                if (
                    (keyval >= Gdk.KEY_a && keyval <= Gdk.KEY_z) ||
                    (keyval >= Gdk.KEY_A && keyval <= Gdk.KEY_Z) ||
                    (keyval >= Gdk.KEY_0 && keyval <= Gdk.KEY_9)
                )
                    return false;
            }

            const navKeys = [
                Gdk.KEY_Home,
                Gdk.KEY_Left,
                Gdk.KEY_Up,
                Gdk.KEY_Right,
                Gdk.KEY_Down,
                Gdk.KEY_Page_Up,
                Gdk.KEY_Page_Down,
                Gdk.KEY_End,
                Gdk.KEY_Tab,
                Gdk.KEY_KP_Enter,
                Gdk.KEY_Return,
            ];
            if (navKeys.includes(keyval) && mask === 0) return false;

            return true;
        }

        _keyPressed(_controller, keyval, keycode, state) {
            const mask =
                (state & Gtk.accelerator_get_default_mod_mask()) &
                ~Gdk.ModifierType.LOCK_MASK;

            if (mask === 0) {
                if (keyval === Gdk.KEY_Escape) {
                    this.close();
                } else if (keyval === Gdk.KEY_BackSpace) {
                    this.emit("shortcut-entered", "");
                    this.close();
                }
                return Gdk.EVENT_STOP;
            }

            if (this._isValidBinding(keyval, keycode, mask)) {
                const display = Gdk.Display.get_default();
                const name = Gtk.accelerator_name_with_keycode(
                    display,
                    keyval,
                    keycode,
                    mask,
                );
                this.emit("shortcut-entered", name);
                this.close();
            }

            return Gdk.EVENT_STOP;
        }

        vfunc_map() {
            super.vfunc_map();
            if (this._shortcutsInhibited) return;
            const native = this.get_native();
            const surface = native?.get_surface();
            if (surface instanceof Gdk.Toplevel) {
                surface.inhibit_system_shortcuts(null);
                this._shortcutsInhibited = true;
            }
        }

        vfunc_unmap() {
            if (this._shortcutsInhibited) {
                const native = this.get_native();
                const surface = native?.get_surface();
                if (surface instanceof Gdk.Toplevel)
                    surface.restore_system_shortcuts();
                this._shortcutsInhibited = false;
            }
            super.vfunc_unmap();
        }
    },
);

const ShortcutRow = GObject.registerClass(
    {
        Properties: {
            shortcuts: GObject.ParamSpec.boxed(
                "shortcuts",
                "",
                "",
                GObject.ParamFlags.READWRITE,
                GLib.strv_get_type(),
            ),
        },
    },
    class ShortcutRow extends Adw.ActionRow {
        _init(title) {
            super._init({
                title,
                activatable: true,
            });

            this._shortcuts = [];
            this._shortcutLabel = new Adw.ShortcutLabel({
                valign: Gtk.Align.CENTER,
                disabled_text: _("Disabled"),
            });
            this.add_suffix(this._shortcutLabel);
        }

        get shortcuts() {
            return this._shortcuts;
        }

        set shortcuts(value) {
            const arr = Array.isArray(value) ? value : [];
            this._shortcuts = arr;
            const filtered = arr.filter((s) => s !== "");
            const joined = filtered.join(" ");
            this._shortcutLabel.accelerator = joined || null;
            this.notify("shortcuts");
        }

        vfunc_activate() {
            const dialog = new ShortcutDialog();
            dialog.connect("shortcut-entered", (_dlg, shortcut) => {
                this.shortcuts = shortcut ? [shortcut] : [];
            });
            dialog.present(this);
        }
    },
);

function makeResettable(row, settings, ...keys) {
    const defaults = keys.map((k) => settings.get_default_value(k));
    if (defaults.some((d) => d === null)) return;

    const resetButton = new Gtk.Button({
        icon_name: "edit-undo-symbolic",
        css_classes: ["flat"],
        valign: Gtk.Align.CENTER,
    });

    function updateSensitivity() {
        const differs = keys.some((k, i) =>
            !settings.get_value(k).equal(defaults[i]),
        );
        resetButton.sensitive = differs;
    }

    resetButton.connect("clicked", () => {
        for (const key of keys) {
            settings.reset(key);
        }
    });

    updateSensitivity();
    for (const key of keys) {
        settings.connect(`changed::${key}`, updateSensitivity);
    }

    row.add_suffix(resetButton);
}

export default class CatwalkPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        window._settings = this.getSettings();

        const page = new Adw.PreferencesPage({
            title: _("General"),
            icon_name: "preferences-system-symbolic",
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: _("Keyboard Shortcut"),
            description:
                _("Global keybinding to toggle the internal keyboard on/off"),
        });
        page.add(group);

        const shortcutRow = new ShortcutRow(_("Toggle Keyboard"));
        group.add(shortcutRow);

        window._settings.bind(
            "toggle-keyboard-shortcut",
            shortcutRow,
            "shortcuts",
            Gio.SettingsBindFlags.DEFAULT,
        );

        makeResettable(
            shortcutRow,
            window._settings,
            "toggle-keyboard-shortcut",
        );
    }
}
