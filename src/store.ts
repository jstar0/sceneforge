import {
  cloneNodes,
  createFixture,
  moveNode,
  parseSnapshot,
  serializeSnapshot,
  validateScene,
  type SceneNode,
  type SceneSnapshot
} from "./model";

export type StoreListener = (snapshot: SceneSnapshot) => void;

export class SceneStore {
  private readonly initialNodes: SceneNode[];
  private state: SceneSnapshot;
  private readonly listeners = new Set<StoreListener>();

  constructor(nodes: readonly SceneNode[] = createFixture()) {
    validateScene(nodes);
    this.initialNodes = cloneNodes(nodes);
    this.state = {
      schemaVersion: 1,
      nodes: cloneNodes(nodes),
      selectedId: null,
      motionEnabled: true
    };
  }

  getSnapshot(): SceneSnapshot {
    return {
      ...this.state,
      nodes: cloneNodes(this.state.nodes)
    };
  }

  selectedNode(): SceneNode | null {
    const selected = this.state.nodes.find((node) => node.id === this.state.selectedId);
    return selected ? { ...selected, position: { ...selected.position }, scale: { ...selected.scale } } : null;
  }

  subscribe(listener: StoreListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => this.listeners.delete(listener);
  }

  select(nodeId: string | null): void {
    if (nodeId !== null && !this.state.nodes.some((node) => node.id === nodeId)) {
      throw new Error(`unknown scene node: ${nodeId}`);
    }
    this.state = { ...this.state, selectedId: nodeId };
    this.notify();
  }

  moveSelected(dx: number, dz: number): void {
    if (this.state.selectedId === null) return;
    this.state = {
      ...this.state,
      nodes: moveNode(this.state.nodes, this.state.selectedId, dx, dz)
    };
    this.notify();
  }

  setMotionEnabled(enabled: boolean): void {
    this.state = { ...this.state, motionEnabled: enabled };
    this.notify();
  }

  reset(): void {
    this.state = {
      schemaVersion: 1,
      nodes: cloneNodes(this.initialNodes),
      selectedId: null,
      motionEnabled: this.state.motionEnabled
    };
    this.notify();
  }

  exportSnapshot(): string {
    return serializeSnapshot(this.getSnapshot());
  }

  importSnapshot(raw: string): void {
    const snapshot = parseSnapshot(raw);
    this.state = {
      ...snapshot,
      nodes: cloneNodes(snapshot.nodes)
    };
    this.notify();
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}
