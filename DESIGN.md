# SceneForge design contract

The visual direction is informed by the managed Apple design analysis: a gallery-like stage, high-contrast display type, quiet chrome, and one action-blue interaction color. No brand logo, font file, image, or copy is included. The scene itself is generated from primitive geometry; interface chrome remains deliberately flat and legible.

## Tokens

- Stage: near-black `#101114`; surfaces: pearl `#f7f7f5` and charcoal `#1d1f24`.
- Ink: `#16181d`; muted ink: `#73777f`; action blue: `#0066cc`.
- Status colors are paired with text labels and never used as the sole signal.
- System fonts only; a compact mono face is used for coordinates and diagnostics.
- Motion is optional. `prefers-reduced-motion` disables ambient rotation and the UI exposes the same switch.

## Interaction contract

- Every state-changing action is a native button with a visible focus ring.
- Selecting a stage object updates an adjacent textual detail panel and an `aria-live` announcement.
- Arrow keys move the selected object within a bounded scene; `R` resets the fixture.
- Export is a local JSON download of the synthetic scene graph; no network or persistence service is implied.
