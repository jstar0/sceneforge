# Architecture

SceneForge separates the scene graph from rendering and UI state:

```text
fixture -> validateScene -> SceneStore <-> DOM controls
                              ↓
                       SceneRenderer (Three.js)
```

`model.ts` owns serializable primitive nodes and bounds. `store.ts` applies selection, bounded movement, reset, and export/import transitions. `renderer.ts` maps each primitive to a disposable Three.js mesh, handles orbit/zoom gestures, and reports pointer selections back to the store. `main.ts` is the thin composition root; it does not own business rules and lazy-loads the optional renderer so the inspector can become interactive before the WebGL payload arrives.

The renderer is intentionally disposable and uses no remote textures or models. The DOM list and detail panel remain the accessible source of truth for selection; the canvas is an additional spatial view, not the only way to operate the scene. Imported copy is inserted with DOM text nodes rather than `innerHTML`, so a user-supplied snapshot cannot turn the inspector into an HTML injection surface.
