# SceneForge

SceneForge is a small, self-contained spatial-interface lab. It treats a procedural 3D scene as typed data first, then exposes the same state through a Three.js stage and an accessible DOM inspector.

## What it demonstrates

- **State before pixels:** a versioned scene graph is validated, cloned, serialized, and restored independently of the GPU.
- **Spatial interaction with a keyboard path:** choose a form in the inspector, nudge it with arrow keys, orbit with a pointer drag, and zoom with the wheel.
- **Graceful degradation:** if WebGL is unavailable, the inspector, bounded movement, import/export, and announcements remain usable.
- **Reproducible by default:** five synthetic primitives, no remote textures/models, no analytics, and a locked pnpm toolchain.
- **Safety-conscious import:** imported JSON is schema-checked and rendered with DOM `textContent`; arbitrary titles/descriptions never become HTML.
