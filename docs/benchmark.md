# Interaction and performance contract

SceneForge does not claim a device-independent FPS number. Instead, the fixture and checks make a small contract reproducible:

- five procedural nodes are created from a fixed scene graph;
- selection, reset, bounded arrow-key movement, export/import, and reduced-motion state are testable without a GPU;
- the renderer caps pixel ratio at two, supports bounded orbit/zoom gestures, and exposes object/draw-call counters in the diagnostics rail;
- the initial UI bundle is lazy-loadable and the Three.js payload is isolated as a cacheable chunk;
- browser QA verifies that a user can select a node through the DOM, see the textual detail, move it with keys, reset, and toggle ambient motion.

## Deterministic state benchmark

```bash
pnpm benchmark --output-dir /tmp/sceneforge-benchmark
```

The command applies five fixed operations (one deliberately exceeds the bounds), writes `scene.json`, `metrics.json`, `manifest.json`, and `report.md`, and binds the artifacts with SHA-256. On 2026-09-04 the snapshot digest was `42e9c791acb69fd96370f238d00b5dc3362682656756b06e884521fbe6c26967`; two independent runs matched byte-for-byte. The benchmark is a state/reproducibility check, not a claim about rendering throughput.

Any future performance claim must record browser, viewport, device-pixel ratio, and whether motion is enabled. A screenshot alone is not a benchmark.
