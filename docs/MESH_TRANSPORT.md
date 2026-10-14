# Rheo mesh packet and Bluetooth bridge v1

Portable packet:

```json
{"protocol":"rheo-mesh","version":1,"events":[]}
```

An event is an immutable signed claim, not a payment, balance or crypto asset.
Adapters exchange packets; only the core verification layer may commit them.
Events can be carried by a file, a BLE link or a future native relay. Imports
verify P-256 signatures and actor fingerprint binding before atomic merge.

## GATT peripheral

| Attribute | UUID | Properties |
|---|---|---|
| Service | `5248454f-0001-4000-8000-000000000001` | Advertised Rheo service |
| RX, central → peripheral | `5248454f-0001-4000-8000-000000000002` | Write with response |
| TX, peripheral → central | `5248454f-0001-4000-8000-000000000003` | Notify |

The peripheral advertises the service UUID; the browser asks the user to choose
one peripheral and establishes a GATT connection. RX receives UTF-8 JSON followed
by one LF byte (`0x0a`). The peripheral emits incoming packets using the same
framing on TX after notifications have been enabled.

JSON must encode newlines in string values as escaped characters. Transfer chunks
may split UTF-8 code points: the receiver assembles the byte stream before decoding.
Each packet is bounded to 2 MB, with a 30-second inactivity window for incomplete
transfers. The browser uses sequential acknowledged writes of at most 20 bytes
for the default ATT MTU. Larger MTUs and delta exchange are future optimizations.
No parallel packet writers may interleave on a characteristic.

A GATT write response only acknowledges bytes accepted by that peripheral. The UI
must not claim another peer received or verified the record. Application-level
receipts, resumable framing and peer inventories should be introduced in a new
transport version, with backwards compatibility, before field deployment.

The current bridge adapter is functional code, tested with an injected peripheral
characteristic. No compatible bridge hardware or native advertising app is shipped
or hardware-tested in this release. Browser support varies; the app exposes actual
capability and leaves file exchange usable when Web Bluetooth is unavailable.

## Native relay requirements

This architecture is a delay-tolerant application mesh over short BLE encounters,
not the Bluetooth SIG managed-flooding Mesh Profile. Native relays must:

- Implement both central discovery and peripheral advertising where supported.
- Keep shared packets local, bounded and consented; never relay private records.
- Verify before committing; a relay transport is not a trusted authority.
- Preserve the full signed event envelope and exact UTF-8 signature payload.
- Deduplicate event IDs and bound storage, traffic, radio time and forwarding.
- Exchange only missing records once inventory/delta negotiation is specified.
- Handle OS suspension, interrupted transfers and stale availability explicitly.
- Avoid advertising identity, sensitive location or trust relationships.
- Treat physical proximity as reachability, never as evidence of trust.

Android and iOS require native platform permissions and lifecycle handling. BLE
range and radio availability do not guarantee coverage; people carrying devices
provide store-and-forward movement between disconnected groups.

Primary platform references:

- [Chrome Web Bluetooth central/GATT capabilities](https://developer.chrome.com/docs/capabilities/bluetooth)
- [Android background Bluetooth communication](https://developer.android.com/develop/connectivity/bluetooth/ble/background)
- [Apple Core Bluetooth background processing](https://developer.apple.com/library/archive/documentation/NetworkingInternetWeb/Conceptual/CoreBluetooth_concepts/CoreBluetoothBackgroundProcessingForIOSApps/PerformingTasksWhileYourAppIsInTheBackground.html)
