import {
  SCENE_BOUNDS,
  cloneNodes,
  createFixture,
  moveNode,
  parseSnapshot,
  serializeSnapshot,
  validateScene,
  type SceneNode,
  type SceneSnapshot
} from "../src/model";

describe("scene model", () => {
  it("creates a stable five-form fixture", () => {
    const fixture = createFixture();
    expect(fixture).toHaveLength(5);
    expect(fixture.map((node) => node.id)).toEqual([
      "signal-orb",
      "quiet-arch",
      "field-block",
      "warm-column",
      "low-keystone"
    ]);
    expect(fixture.every((node) => node.color.startsWith("#"))).toBe(true);
  });

  it("accepts the fixture as a valid scene", () => {
    expect(() => validateScene(createFixture())).not.toThrow();
  });

  it("rejects an empty scene", () => {
    expect(() => validateScene([])).toThrow(/between 1 and 64/);
  });

  it("rejects duplicate or unsafe ids", () => {
    const fixture = createFixture();
    fixture[1]!.id = fixture[0]!.id;
    expect(() => validateScene(fixture)).toThrow(/invalid or duplicate/);

    const unsafe = createFixture();
    unsafe[0]!.id = "Signal Orb";
    expect(() => validateScene(unsafe)).toThrow(/invalid or duplicate/);
  });

  it("rejects blank copy and invalid colors", () => {
    const blank = createFixture();
    blank[0]!.title = "   ";
    expect(() => validateScene(blank)).toThrow(/needs a title/);

    const invalidColor = createFixture();
    invalidColor[0]!.accent = "teal";
    expect(() => validateScene(invalidColor)).toThrow(/invalid color/);
  });

  it("rejects unsupported primitives, non-finite values, and non-positive scales", () => {
    const primitive = createFixture();
    primitive[0]!.kind = "cone" as SceneNode["kind"];
    expect(() => validateScene(primitive)).toThrow(/unsupported primitive/);

    const nonFinite = createFixture();
    nonFinite[0]!.position.x = Number.NaN;
    expect(() => validateScene(nonFinite)).toThrow(/non-finite/);

    const nonPositive = createFixture();
    nonPositive[0]!.scale.y = 0;
    expect(() => validateScene(nonPositive)).toThrow(/positive scale/);
  });

  it("deep-clones positions and scales without sharing references", () => {
    const fixture = createFixture();
    const copy = cloneNodes(fixture);
    expect(copy).toEqual(fixture);
    expect(copy).not.toBe(fixture);
    expect(copy[0]!.position).not.toBe(fixture[0]!.position);
    expect(copy[0]!.scale).not.toBe(fixture[0]!.scale);
    copy[0]!.position.x = 99;
    expect(fixture[0]!.position.x).not.toBe(99);
  });

  it("moves only the requested node and preserves the input", () => {
    const fixture = createFixture();
    const moved = moveNode(fixture, "signal-orb", 0.5, -0.25);
    expect(moved[0]!.position.x).toBeCloseTo(-2.3);
    expect(moved[0]!.position.z).toBeCloseTo(-0.65);
    expect(moved[1]!.position).toEqual(fixture[1]!.position);
    expect(fixture[0]!.position.x).toBeCloseTo(-2.8);
  });

  it("clamps movement to the scene bounds", () => {
    const fixture = createFixture();
    const moved = moveNode(fixture, "signal-orb", 100, -100);
    expect(moved[0]!.position.x).toBe(SCENE_BOUNDS.maxX);
    expect(moved[0]!.position.z).toBe(SCENE_BOUNDS.minZ);
  });

  it("rejects non-finite movement deltas", () => {
    expect(() => moveNode(createFixture(), "signal-orb", Infinity, 0)).toThrow(/finite/);
    expect(() => moveNode(createFixture(), "signal-orb", 0, Number.NaN)).toThrow(/finite/);
  });

  it("leaves the scene unchanged when the node id is absent", () => {
    const fixture = createFixture();
    const moved = moveNode(fixture, "missing", 1, 1);
    expect(moved).toEqual(fixture);
    expect(moved).not.toBe(fixture);
  });

  it("round-trips a snapshot with deterministic formatting", () => {
    const snapshot: SceneSnapshot = {
      schemaVersion: 1,
      nodes: createFixture(),
      selectedId: "quiet-arch",
      motionEnabled: false
    };
    const raw = serializeSnapshot(snapshot);
    expect(raw.endsWith("\n")).toBe(true);
    expect(parseSnapshot(raw)).toEqual(snapshot);
    expect(serializeSnapshot(parseSnapshot(raw))).toBe(raw);
  });

  it("defaults motion to enabled and selection to empty when omitted", () => {
    const snapshot = {
      schemaVersion: 1,
      nodes: createFixture()
    };
    expect(parseSnapshot(JSON.stringify(snapshot))).toMatchObject({
      schemaVersion: 1,
      selectedId: null,
      motionEnabled: true
    });
  });

  it("rejects unsupported snapshot schemas and invalid selections", () => {
    expect(() => parseSnapshot(JSON.stringify({ schemaVersion: 2, nodes: [] }))).toThrow(/unsupported/);
    const snapshot: SceneSnapshot = {
      schemaVersion: 1,
      nodes: createFixture(),
      selectedId: "not-in-scene",
      motionEnabled: true
    };
    expect(() => serializeSnapshot(snapshot)).toThrow(/selectedId/);
  });

  it("rejects malformed JSON", () => {
    expect(() => parseSnapshot("{not-json")).toThrow();
  });
});

describe("array payloads are not objects", () => {
  it("rejects an array-shaped snapshot", () => {
    expect(() => parseSnapshot("[]")).toThrow(/unsupported scene snapshot/);
  });
});
