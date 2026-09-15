# SceneForge

SceneForge is a small, self-contained spatial-interface lab. It treats a procedural 3D scene as typed data first, then exposes the same state through a Three.js stage and an accessible DOM inspector.

## What it demonstrates

- **State before pixels:** a versioned scene graph is validated, cloned, serialized, and restored independently of the GPU.
- **Spatial interaction with a keyboard path:** choose a form in the inspector, nudge it with arrow keys, orbit with a pointer drag, and zoom with the wheel.
- **Graceful degradation:** if WebGL is unavailable, the inspector, bounded movement, import/export, and announcements remain usable.
- **Reproducible by default:** five synthetic primitives, no remote textures/models, no analytics, and a locked pnpm toolchain.
- **Safety-conscious import:** imported JSON is schema-checked and rendered with DOM `textContent`; arbitrary titles/descriptions never become HTML.

## Run locally

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm lint
pnpm dev
```

Then open the local Vite URL printed by the dev server. The production build lazy-loads the optional renderer and keeps the initial UI bundle small; the Three.js payload is isolated in its own cacheable chunk.

## Controls

| Action | Input |
| --- | --- |
| Select a form | Click the stage or a form card |
| Move the selected form | Arrow keys; movement is clamped to the scene bounds |
| Navigate form cards | Arrow keys, `Home`, `End` while a card is focused |
| Inspect the stage | Drag to orbit; wheel to zoom |
| Reset | `R` or **Reset scene** |
| Pause motion | **Ambient motion**; also respects `prefers-reduced-motion` |
| Save / restore | **Export JSON** and **Import JSON** |

## Architecture

```text
model.ts  ->  SceneStore  ->  DOM inspector
                 |
                 +---------> lazy SceneRenderer (Three.js)
```

`src/model.ts` owns the schema, validation, bounds, and snapshot format. `src/store.ts` owns state transitions and listener notifications. `src/renderer.ts` is disposable and maps primitive nodes to meshes; it never becomes the source of truth. `src/main.ts` composes controls and keeps the WebGL fallback path alive.

The snapshot schema is intentionally tiny:

```json
{
  "schemaVersion": 1,
  "nodes": [],
  "selectedId": null,
  "motionEnabled": true
}
```

## Quality gates

The CI workflow runs 27 model/store tests, strict TypeScript compilation, a Vite production build, and ESLint with zero warnings. Browser acceptance additionally checks DOM selection, keyboard movement, reset, motion state, import failure preservation, and the WebGL fallback behavior. See [`docs/architecture.md`](docs/architecture.md) and [`docs/benchmark.md`](docs/benchmark.md) for the contracts.

## Scope

This is an independent implementation built from a general spatial-interface brief. It contains no client source, client assets, private copy, remote resources, or tracking.

Released under the MIT license. Contributions must keep the fixture synthetic, deterministic, and accessible.
