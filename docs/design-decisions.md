# SceneForge design decisions and limits

SceneForge is a synthetic local 3D scene editor, not a CAD, game engine, or production asset pipeline.

## Decisions embodied in the implementation

1. **The scene is a typed flat graph with explicit transforms.** Rejected alternative: accept arbitrary Three.js object JSON.
2. **Import validates IDs, enums, geometry, transforms, and references before replacing state.** Rejected alternative: merge partial untrusted scene data.
3. **WebGL is lazy-loaded and has a DOM fallback.** Rejected alternative: make a graphics context a precondition for inspecting scene state.
4. **Selection and keyboard movement live in the store boundary.** Rejected alternative: mutate renderer objects directly.
5. **Benchmark artifacts serialize deterministic scene state rather than GPU timing.** Rejected alternative: advertise one-machine frame-rate measurements as general performance.

## Known weaknesses

1. **Scenes, labels, geometry, and interaction data are synthetic.**
2. **There is no hierarchy, animation system, physics, materials pipeline, undo history, collaboration, or asset import.**
3. **WebGL fallback proves basic access only, not rendering parity or accessibility acceptance.**
4. **Orbit and pointer interaction are local UI behavior, not cross-device performance evidence.**
5. **JSON is not signed, version-migrated, or source-authentic.**
6. **The editor has no persistence service, permissions, or concurrent conflict model.**
7. **Deterministic benchmarks do not establish 3D performance or production reliability.**

## Interview-safe description

Describe SceneForge as a typed, synthetic local 3D scene-state editor with safe import/export and DOM fallback.
