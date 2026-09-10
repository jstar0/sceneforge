# Contributing to SceneForge

Keep the scene procedural, deterministic, and accessible.

```bash
pnpm install --frozen-lockfile
pnpm test
pnpm build
pnpm lint
pnpm benchmark --output-dir /tmp/sceneforge-benchmark
pnpm dev
```

Do not add client assets, copyrighted 3D models, remote textures, analytics, or network calls. New interaction behavior needs a model/store test and a keyboard or reduced-motion consideration.
