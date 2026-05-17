import { createFixture } from "../src/model";
import { SceneStore } from "../src/store";

describe("SceneStore", () => {
  it("starts with a detached copy of the fixture", () => {
    const store = new SceneStore();
    const snapshot = store.getSnapshot();
    expect(snapshot.selectedId).toBeNull();
    expect(snapshot.motionEnabled).toBe(true);
    expect(snapshot.nodes).toHaveLength(5);
    snapshot.nodes[0]!.position.x = 99;
    expect(store.getSnapshot().nodes[0]!.position.x).not.toBe(99);
  });

  it("accepts a custom valid scene and rejects an invalid one", () => {
    const custom = createFixture().slice(0, 1);
    expect(new SceneStore(custom).getSnapshot().nodes).toHaveLength(1);
    custom[0]!.scale.x = -1;
    expect(() => new SceneStore(custom)).toThrow(/positive scale/);
  });

  it("notifies subscribers immediately and after state changes", () => {
    const store = new SceneStore();
    const snapshots: string[] = [];
    const unsubscribe = store.subscribe((snapshot) => snapshots.push(snapshot.selectedId ?? "none"));
    store.select("signal-orb");
    store.select(null);
    expect(snapshots).toEqual(["none", "signal-orb", "none"]);
    unsubscribe();
    store.select("quiet-arch");
    expect(snapshots).toEqual(["none", "signal-orb", "none"]);
  });

  it("selects a known node and exposes a detached selected node", () => {
    const store = new SceneStore();
    store.select("field-block");
    const selected = store.selectedNode();
    expect(selected?.id).toBe("field-block");
    if (selected) selected.position.x = 99;
    expect(store.selectedNode()?.position.x).not.toBe(99);
  });

  it("rejects unknown selections", () => {
    const store = new SceneStore();
    expect(() => store.select("unknown")).toThrow(/unknown scene node/);
  });

  it("moves the selected node and ignores movement without selection", () => {
    const store = new SceneStore();
    const before = store.getSnapshot();
    store.moveSelected(1, 1);
    expect(store.getSnapshot()).toEqual(before);
    store.select("signal-orb");
    store.moveSelected(0.5, 0);
    expect(store.selectedNode()?.position.x).toBeCloseTo(-2.3);
  });

  it("keeps movement inside scene bounds", () => {
    const store = new SceneStore();
    store.select("signal-orb");
    store.moveSelected(100, 100);
    expect(store.selectedNode()?.position).toMatchObject({ x: 4.2, z: 2.8 });
  });

  it("toggles motion without changing geometry", () => {
    const store = new SceneStore();
    const before = store.getSnapshot().nodes;
    store.setMotionEnabled(false);
    expect(store.getSnapshot().motionEnabled).toBe(false);
    expect(store.getSnapshot().nodes).toEqual(before);
  });

  it("resets geometry and selection while preserving motion preference", () => {
    const store = new SceneStore();
    store.select("quiet-arch");
    store.moveSelected(1, 1);
    store.setMotionEnabled(false);
    store.reset();
    const snapshot = store.getSnapshot();
    expect(snapshot.selectedId).toBeNull();
    expect(snapshot.motionEnabled).toBe(false);
    expect(snapshot.nodes[1]!.position).toEqual(createFixture()[1]!.position);
  });

  it("exports and imports a complete snapshot", () => {
    const store = new SceneStore();
    store.select("warm-column");
    store.moveSelected(-0.75, 0.25);
    store.setMotionEnabled(false);
    const raw = store.exportSnapshot();

    const restored = new SceneStore();
    restored.importSnapshot(raw);
    expect(restored.getSnapshot()).toEqual(store.getSnapshot());
  });

  it("does not retain caller-owned data during import", () => {
    const store = new SceneStore();
    const raw = store.exportSnapshot();
    store.importSnapshot(raw);
    const exported = store.getSnapshot();
    exported.nodes[0]!.position.z = 88;
    expect(store.getSnapshot().nodes[0]!.position.z).not.toBe(88);
  });

  it("surfaces invalid imports without replacing current state", () => {
    const store = new SceneStore();
    store.select("low-keystone");
    const before = store.getSnapshot();
    expect(() => store.importSnapshot("{\"schemaVersion\":2,\"nodes\":[]}")).toThrow(/unsupported/);
    expect(store.getSnapshot()).toEqual(before);
  });
});
