// The only impure layer: GATT connection and writing. Everything above it
// works, and is tested, with no printer present.
//
// Web Bluetooth is Chrome and Edge on Android, Windows, macOS and Linux. It
// does NOT work in any browser on iOS, including Chrome, because they all run
// on WebKit. So this module is always optional, and the share and browser-print
// paths in the Struk screen are the real fallback rather than an apology.

import { toEscPos } from './escpos.js';

/** Serial-over-BLE services these clones advertise. Which one varies by unit. */
const SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // most RPP02N / Panda clones
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 style modules
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // some ISSC based units
];

const CHUNK = 180;
const PAUSE = 20;

export const canPrintBluetooth = () =>
  typeof navigator !== 'undefined' && 'bluetooth' in navigator;

// The connection is not data: it belongs to this browsing session, never to
// Dexie. Held here so the cashier pairs once per session rather than per sale.
let connection = null;
const listeners = new Set();

export const printerState = () => ({
  connected: !!connection,
  name: connection?.device?.name ?? null,
});

export function onPrinterChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const announce = () => {
  for (const fn of listeners) fn(printerState());
};

/**
 * Must be called straight from a user gesture. Chrome will refuse the chooser
 * if the gesture has been lost to a timer or a settled promise chain.
 */
export async function connectPrinter() {
  if (!canPrintBluetooth()) throw new Error('printerTakDidukung');

  const device = await navigator.bluetooth.requestDevice({
    filters: SERVICES.map((s) => ({ services: [s] })),
    optionalServices: SERVICES,
  });

  const characteristic = await openCharacteristic(device);
  connection = { device, characteristic };

  // These printers drop the link when idle or low on battery, and the cashier
  // has to find that out before the next sale, not during it.
  device.addEventListener('gattserverdisconnected', () => {
    connection = null;
    announce();
  });

  announce();
  return printerState();
}

async function openCharacteristic(device) {
  const server = await device.gatt.connect();

  for (const uuid of SERVICES) {
    try {
      const service = await server.getPrimaryService(uuid);
      const chars = await service.getCharacteristics();
      // Never hardcode a characteristic UUID: the clones vary. Take the first
      // writable one the device actually exposes.
      const writable = chars.find(
        (c) => c.properties.write || c.properties.writeWithoutResponse,
      );
      if (writable) return writable;
    } catch {
      // Service absent on this unit. Try the next.
    }
  }

  throw new Error('printerTakDikenali');
}

export function disconnectPrinter() {
  connection?.device?.gatt?.disconnect();
  connection = null;
  announce();
}

/**
 * BLE has a small MTU. One big writeValue is the single most common reason a
 * printer connects and then prints nothing at all, so this chunks and paces.
 */
async function write(characteristic, bytes) {
  const noResponse = characteristic.properties.writeWithoutResponse;

  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.slice(i, i + CHUNK);
    if (noResponse) await characteristic.writeValueWithoutResponse(slice);
    else await characteristic.writeValue(slice);
    await new Promise((r) => setTimeout(r, PAUSE));
  }
}

/**
 * Prints, reconnecting if the printer dropped since the last sale. Called from
 * a button press, which is the gesture a reconnect may need.
 */
export async function printLines(lines, { drawer = false } = {}) {
  if (!connection) await connectPrinter();

  // Reconnect a device that is paired but whose GATT went away while idle.
  if (!connection.device.gatt.connected) {
    connection.characteristic = await openCharacteristic(connection.device);
    announce();
  }

  await write(connection.characteristic, toEscPos(lines, { drawer }));
}
