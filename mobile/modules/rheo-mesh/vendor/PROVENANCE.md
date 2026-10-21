# Embedded Bitchat code

Upstream: https://github.com/permissionlesstech/bitchat
Pinned commit: 5e9287fae1e5fea80ca741d4ea669829dc16f144
License: Unlicense, included in BITCHAT-LICENSE.

`ios/BLEOutboundNotificationBuffer.swift` is copied unchanged from upstream
`bitchat/Services/BLE/BLEOutboundNotificationBuffer.swift` and used by Rheo's
CoreBluetooth notification pump to preserve backpressure and disconnected-target
handling. Rheo's fragment header adopts the upstream 8-byte stream ID + big-endian
UInt16 index + UInt16 total + 1-byte type layout, with an independent Rheo type
and service UUID. Radio, signed-record envelopes, Wi-Fi transport and replication
are Rheo-specific. This is not the full Bitchat chat stack or its Noise protocol.
It does not interoperate with unmodified Bitchat clients. Public Rheo records
are readable by nearby peers; a signature establishes key continuity, not truth,
identity, consent, accessibility or trust. No private messages are transported.
