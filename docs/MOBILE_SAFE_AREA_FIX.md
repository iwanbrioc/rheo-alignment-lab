# Private access screen spacing, 23 September 2026

The private access modal now measures its own safe area. Its existing 24-point
content padding sits below the iPhone status bar, keeping the lotus and wordmark
clear of the clock. Scroll-view inset adjustment is disabled to avoid applying the
safe area twice. Main-screen layout and access/storage behaviour are unchanged.

Source commit: `ea3d03407d76b53d65e7fb891c63b506b4ff650e`, on
`codex/rheo-v0.10-upstream-hypotheses`, pushed without merging. Changed files:
`mobile/src/components/BetaAccessPanel.tsx` and `mobile/smoke_private_beta.mjs`.
No dependencies or permissions were added.

[Install iPhone version 0.2.0, build 3](https://expo.dev/accounts/rheocracy/projects/rheo-mobile/builds/a6ed7ee6-a539-40b2-a4fa-06e0f546f047).
This replaces iPhone build 2. Install over the existing app; deletion is unnecessary.
The Android download from the earlier report has not been rebuilt for this fix.

Verification:

- Regression smoke failed before the fix and passed afterward.
- Typecheck and all 14 mobile smoke scripts passed, with 16 PASS summaries.
- Local Expo Doctor and the iPhone cloud build both passed 21/21 checks.
- An iPhone 16e simulator visual check showed the logo below the status bar. This
  reused the existing native simulator app with newly exported production JavaScript.
  That harness displayed a secure-storage error, so this was a layout check, not a
  successful simulator access/login test.
- EAS build finished successfully. The downloaded IPA passed strict signature,
  version, HTTPS configuration, provisioning and invitation-exclusion checks.
- The existing invitation was accepted by the hosted access endpoint (HTTP 200),
  without invoking AI. Its expiry remains 2 October 2026.

Physical-phone verification of this updated layout remains with the tester.
Saved notes remain unencrypted local storage, and live place search remains disabled.
