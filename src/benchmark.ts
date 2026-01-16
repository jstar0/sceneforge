import { parseSnapshot } from "./model";
import { SceneStore } from "./store";

export interface SceneBenchmarkResult {
  benchmarkVersion: 1;
  operationCount: number;
  clampedOperationCount: number;
  nodeCount: number;
  selectedId: string | null;
  motionEnabled: boolean;
  snapshot: string;
}

const OPERATIONS = [
  { nodeId: "signal-orb", dx: 0.5, dz: 0.25 },
  { nodeId: "quiet-arch", dx: -0.75, dz: 0.5 },
  { nodeId: "field-block", dx: 100, dz: -100 },
  { nodeId: "warm-column", dx: -0.25, dz: -0.75 },
  { nodeId: "low-keystone", dx: 0.4, dz: 0.2 }
] as const;

export function runBenchmark(): SceneBenchmarkResult {
  const store = new SceneStore();
  let clampedOperationCount = 0;
  for (const operation of OPERATIONS) {
    store.select(operation.nodeId);
    const before = store.selectedNode();
    store.moveSelected(operation.dx, operation.dz);
    const after = store.selectedNode();
    if (!before || !after) throw new Error("benchmark selection unexpectedly missing");
    const actualDx = after.position.x - before.position.x;
    const actualDz = after.position.z - before.position.z;
    if (Math.abs(actualDx - operation.dx) > 1e-9 || Math.abs(actualDz - operation.dz) > 1e-9) {
      clampedOperationCount += 1;
    }
  }
  store.setMotionEnabled(false);
  const snapshot = store.exportSnapshot();
  const parsed = parseSnapshot(snapshot);
  return {
    benchmarkVersion: 1,
    operationCount: OPERATIONS.length,
    clampedOperationCount,
    nodeCount: parsed.nodes.length,
    selectedId: parsed.selectedId,
    motionEnabled: parsed.motionEnabled,
    snapshot
  };
}
