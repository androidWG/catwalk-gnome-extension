import Gio from "gi://Gio";

const INHIBITED_PATHS = [
    "/sys/devices/platform/i8042/serio0/input/input2/inhibited",
    "/sys/devices/pci0000:00/0000:00:1f.0/PNP0C09:00/VPC2004:00/input/input24/inhibited",
];

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let _monitors = [];

function _writeSysfs(path, value) {
    const file = Gio.File.new_for_path(path);
    try {
        const ioStream = file.open_readwrite(null);
        const outStream = ioStream.get_output_stream();
        outStream.write_all(encoder.encode(value), null);
        ioStream.close(null);
    } catch (e) {
        logError(e, `keyboardManager: cannot write to ${path}`);
    }
}

function _readSysfs(path) {
    try {
        const file = Gio.File.new_for_path(path);
        const [ok, contents] = file.load_contents(null);
        if (ok) {
            const text = decoder.decode(contents);
            return text.trim() === "1";
        }
    } catch (e) {
        logError(e, `keyboardManager: cannot read ${path}`);
    }
    return false;
}

function _canWrite(path) {
    try {
        const file = Gio.File.new_for_path(path);
        if (!file.query_exists(null)) {
            logError(null, `keyboardManager: path not found: ${path}`);
            return false;
        }
        const info = file.query_info(
            "access::can-write",
            Gio.FileQueryInfoFlags.NONE,
            null,
        );
        return info.get_attribute_boolean("access::can-write");
    } catch (e) {
        logError(e, `keyboardManager: cannot stat ${path}`);
        return false;
    }
}

export const keyboardManager = {
    isInhibited() {
        for (const path of INHIBITED_PATHS) {
            if (_readSysfs(path)) {
                return true;
            }
        }
        return false;
    },

    setInhibited(inhibited) {
        const value = inhibited ? "1\n" : "0\n";
        for (const path of INHIBITED_PATHS) {
            _writeSysfs(path, value);
        }
    },

    probe() {
        const writable = INHIBITED_PATHS.map((path) => _canWrite(path));
        return writable.every(Boolean);
    },

    startMonitor(callback) {
        for (const path of INHIBITED_PATHS) {
            const file = Gio.File.new_for_path(path);
            const monitor = file.monitor_file(Gio.FileMonitorFlags.NONE, null);
            const signalId = monitor.connect(
                "changed",
                (_mon, _f, _other, eventType) => {
                    if (eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT) {
                        callback();
                    }
                },
            );
            _monitors.push({ monitor, signalId });
        }
    },

    stopMonitor() {
        for (const { monitor, signalId } of _monitors) {
            monitor.disconnect(signalId);
            monitor.cancel();
        }
        _monitors = [];
    },
};
