import { parseSnapshot } from "../src/model";
import { runBenchmark } from "../src/benchmark";

describe("SceneForge benchmark", () => {
  it("exercises deterministic operations and one bounds clamp", () => {
    const result = runBenchmark();
    expect(result.benchmarkVersion).toBe(1);
    expect(result.operationCount).toBe(5);
    expect(result.clampedOperationCount).toBe(1);
    expect(result.nodeCount).toBe(5);
    expect(result.selectedId).toBe("low-keystone");
    expect(result.motionEnabled).toBe(false);
  });

  it("produces byte-stable snapshot output", () => {
    expect(runBenchmark()).toEqual(runBenchmark());
  });

  it("emits a snapshot accepted by the public parser", () => {
    const result = runBenchmark();
    const snapshot = parseSnapshot(result.snapshot);
    expect(snapshot.nodes).toHaveLength(result.nodeCount);
    expect(snapshot.selectedId).toBe(result.selectedId);
    expect(snapshot.motionEnabled).toBe(false);
  });
});
