export type PrimitiveKind = "box" | "cylinder" | "orb" | "ring";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface SceneNode {
  id: string;
  title: string;
  description: string;
  kind: PrimitiveKind;
  color: string;
  accent: string;
  position: Vec3;
  scale: Vec3;
  rotationY: number;
}

export interface SceneSnapshot {
  schemaVersion: 1;
  nodes: SceneNode[];
  selectedId: string | null;
  motionEnabled: boolean;
}

export const SCENE_BOUNDS = {
  minX: -4.2,
  maxX: 4.2,
  minZ: -2.8,
  maxZ: 2.8
} as const;

const SAFE_ID = /^[a-z0-9-]{1,48}$/;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function createFixture(): SceneNode[] {
  return [
    {
      id: "signal-orb",
      title: "Signal Orb",
      description: "A compact marker for directional light and motion studies.",
      kind: "orb",
      color: "#5eead4",
      accent: "#99f6e4",
      position: { x: -2.8, y: 1.25, z: -0.4 },
      scale: { x: 1, y: 1, z: 1 },
      rotationY: 0
    },
    {
      id: "quiet-arch",
      title: "Quiet Arch",
      description: "A ring primitive that makes camera parallax easy to read.",
      kind: "ring",
      color: "#fbbf24",
      accent: "#fde68a",
      position: { x: -0.7, y: 0.95, z: 0.6 },
      scale: { x: 1.1, y: 1.1, z: 1.1 },
      rotationY: 0.28
    },
    {
      id: "field-block",
      title: "Field Block",
      description: "A grounded volume for testing bounded keyboard movement.",
      kind: "box",
      color: "#60a5fa",
      accent: "#bfdbfe",
      position: { x: 1.4, y: 0.7, z: -0.6 },
      scale: { x: 1.35, y: 1.35, z: 1.35 },
      rotationY: -0.18
    },
    {
      id: "warm-column",
      title: "Warm Column",
      description: "A vertical anchor with a deliberately different silhouette.",
      kind: "cylinder",
      color: "#fb7185",
      accent: "#fecdd3",
      position: { x: 2.9, y: 0.95, z: 1.1 },
      scale: { x: 0.85, y: 1.5, z: 0.85 },
      rotationY: 0.42
    },
    {
      id: "low-keystone",
      title: "Low Keystone",
      description: "A low-profile piece that keeps the horizon legible.",
      kind: "box",
      color: "#c084fc",
      accent: "#e9d5ff",
      position: { x: 0.1, y: 0.35, z: -1.7 },
      scale: { x: 1.8, y: 0.55, z: 0.9 },
      rotationY: 0.08
    }
  ];
}

export function validateScene(nodes: readonly SceneNode[]): void {
  if (nodes.length === 0 || nodes.length > 64) {
    throw new Error("scene must contain between 1 and 64 nodes");
  }
  const ids = new Set<string>();
  for (const node of nodes) {
    if (!SAFE_ID.test(node.id) || ids.has(node.id)) {
      throw new Error(`invalid or duplicate node id: ${node.id}`);
    }
    ids.add(node.id);
    if (!node.title.trim() || !node.description.trim()) {
      throw new Error(`node ${node.id} needs a title and description`);
    }
    if (!HEX_COLOR.test(node.color) || !HEX_COLOR.test(node.accent)) {
      throw new Error(`node ${node.id} has an invalid color`);
    }
    if (!["box", "cylinder", "orb", "ring"].includes(node.kind)) {
      throw new Error(`node ${node.id} has an unsupported primitive`);
    }
    for (const value of [
      node.position.x,
      node.position.y,
      node.position.z,
      node.scale.x,
      node.scale.y,
      node.scale.z,
      node.rotationY
    ]) {
      if (!Number.isFinite(value)) {
        throw new Error(`node ${node.id} contains a non-finite value`);
      }
    }
    if (node.scale.x <= 0 || node.scale.y <= 0 || node.scale.z <= 0) {
      throw new Error(`node ${node.id} must have positive scale`);
    }
  }
}

export function cloneNodes(nodes: readonly SceneNode[]): SceneNode[] {
  return nodes.map((node) => ({
    ...node,
    position: { ...node.position },
    scale: { ...node.scale }
  }));
}

export function moveNode(
  nodes: readonly SceneNode[],
  nodeId: string,
  dx: number,
  dz: number
): SceneNode[] {
  if (!Number.isFinite(dx) || !Number.isFinite(dz)) {
    throw new Error("movement delta must be finite");
  }
  return nodes.map((node) => {
    if (node.id !== nodeId) return { ...node, position: { ...node.position }, scale: { ...node.scale } };
    return {
      ...node,
      position: {
        ...node.position,
        x: clamp(node.position.x + dx, SCENE_BOUNDS.minX, SCENE_BOUNDS.maxX),
        z: clamp(node.position.z + dz, SCENE_BOUNDS.minZ, SCENE_BOUNDS.maxZ)
      },
      scale: { ...node.scale }
    };
  });
}

export function serializeSnapshot(snapshot: SceneSnapshot): string {
  validateScene(snapshot.nodes);
  if (snapshot.schemaVersion !== 1) throw new Error("unsupported scene schema");
  if (snapshot.selectedId !== null && !snapshot.nodes.some((node) => node.id === snapshot.selectedId)) {
    throw new Error("selectedId must refer to a scene node");
  }
  return `${JSON.stringify(snapshot, null, 2)}\n`;
}

export function parseSnapshot(raw: string): SceneSnapshot {
  const parsed: unknown = JSON.parse(raw);
  if (!isRecord(parsed) || parsed.schemaVersion !== 1 || !Array.isArray(parsed.nodes)) {
    throw new Error("unsupported scene snapshot");
  }
  const snapshot: SceneSnapshot = {
    schemaVersion: 1,
    nodes: parsed.nodes as SceneNode[],
    selectedId: typeof parsed.selectedId === "string" ? parsed.selectedId : null,
    motionEnabled: parsed.motionEnabled !== false
  };
  serializeSnapshot(snapshot);
  return snapshot;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
