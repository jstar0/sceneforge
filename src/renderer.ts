import {
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  GridHelper,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  TorusGeometry,
  Vector2,
  Vector3,
  WebGLRenderer
} from "three";

import type { SceneNode, SceneSnapshot } from "./model";
import { SceneStore } from "./store";

export interface RendererDiagnostics {
  objects: number;
  drawCalls: number;
  pixelRatio: number;
}

type SceneMesh = Mesh<BufferGeometry, MeshStandardMaterial>;

export class SceneRenderer {
  private readonly renderer: WebGLRenderer;
  private readonly scene = new Scene();
  private readonly camera = new PerspectiveCamera(42, 1, 0.1, 100);
  private readonly root = new Group();
  private readonly meshes = new Map<string, SceneMesh>();
  private readonly raycaster = new Raycaster();
  private readonly pointer = new Vector2();
  private readonly lookTarget = new Vector3(0, 0.5, 0);
  private readonly canvas: HTMLCanvasElement;
  private readonly onSelect: (nodeId: string) => void;
  private readonly unsubscribe: () => void;
  private animationFrame = 0;
  private disposed = false;
  private motionEnabled = true;
  private selectedId: string | null = null;
  private orbitYaw = 0;
  private orbitPitch = 0.42;
  private orbitDistance = 8.6;
  private activePointerId: number | null = null;
  private pointerDragged = false;
  private pointerStartX = 0;
  private pointerStartY = 0;

  constructor(canvas: HTMLCanvasElement, store: SceneStore, onSelect: (nodeId: string) => void) {
    this.canvas = canvas;
    this.onSelect = onSelect;
    this.renderer = new WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x101114, 1);
    this.scene.background = new Color(0x101114);
    this.scene.add(this.root);

    this.applyCameraOrbit();
    this.scene.add(new HemisphereLight(0xe8eef8, 0x151821, 2.2));
    const keyLight = new DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(-3, 7, 4);
    this.scene.add(keyLight);
    const floor = new Mesh(
      new PlaneGeometry(16, 12),
      new MeshStandardMaterial({ color: 0x191b21, roughness: 0.82, metalness: 0.08 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.02;
    this.scene.add(floor);
    const grid = new GridHelper(14, 28, 0x353941, 0x25282f);
    grid.position.y = 0;
    this.scene.add(grid);

    this.unsubscribe = store.subscribe((snapshot) => this.sync(snapshot));
    this.canvas.addEventListener("pointerdown", this.handlePointerDown);
    this.canvas.addEventListener("pointermove", this.handlePointerMove);
    this.canvas.addEventListener("pointerup", this.handlePointerUp);
    this.canvas.addEventListener("pointercancel", this.handlePointerUp);
    this.canvas.addEventListener("wheel", this.handleWheel, { passive: false });
    window.addEventListener("resize", this.resize);
    this.resize();
    this.animate();
  }

  diagnostics(): RendererDiagnostics {
    return {
      objects: this.meshes.size,
      drawCalls: this.renderer.info.render.calls,
      pixelRatio: this.renderer.getPixelRatio()
    };
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    cancelAnimationFrame(this.animationFrame);
    this.unsubscribe();
    this.canvas.removeEventListener("pointerdown", this.handlePointerDown);
    this.canvas.removeEventListener("pointermove", this.handlePointerMove);
    this.canvas.removeEventListener("pointerup", this.handlePointerUp);
    this.canvas.removeEventListener("pointercancel", this.handlePointerUp);
    this.canvas.removeEventListener("wheel", this.handleWheel);
    window.removeEventListener("resize", this.resize);
    for (const mesh of this.meshes.values()) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    this.meshes.clear();
    this.renderer.dispose();
  }

  private sync(snapshot: SceneSnapshot): void {
    this.motionEnabled = snapshot.motionEnabled;
    this.selectedId = snapshot.selectedId;
    const nextIds = new Set(snapshot.nodes.map((node) => node.id));
    for (const [id, mesh] of this.meshes) {
      if (!nextIds.has(id)) {
        mesh.geometry.dispose();
        mesh.material.dispose();
        this.root.remove(mesh);
        this.meshes.delete(id);
      }
    }
    snapshot.nodes.forEach((node, index) => {
      let mesh = this.meshes.get(node.id);
      if (!mesh) {
        mesh = this.createMesh(node, index);
        this.meshes.set(node.id, mesh);
        this.root.add(mesh);
      }
      mesh.position.set(node.position.x, node.position.y, node.position.z);
      mesh.scale.set(node.scale.x, node.scale.y, node.scale.z);
      mesh.rotation.y = node.rotationY;
      mesh.material.color.set(node.color);
      mesh.material.emissive.set(node.id === this.selectedId ? node.accent : 0x000000);
      mesh.material.emissiveIntensity = node.id === this.selectedId ? 0.65 : 0;
      mesh.userData.nodeId = node.id;
      mesh.userData.baseRotation = node.rotationY;
      mesh.userData.speed = 0.00018 + index * 0.00004;
    });
  }

  private createMesh(node: SceneNode, index: number): SceneMesh {
    let geometry: BufferGeometry;
    switch (node.kind) {
      case "orb":
        geometry = new IcosahedronGeometry(0.82, 2);
        break;
      case "ring":
        geometry = new TorusGeometry(0.72, 0.2, 16, 48);
        break;
      case "cylinder":
        geometry = new CylinderGeometry(0.62, 0.78, 1.55, 8);
        break;
      case "box":
        geometry = new BoxGeometry(1.2, 1.2, 1.2);
        break;
    }
    const material = new MeshStandardMaterial({
      color: node.color,
      roughness: 0.32,
      metalness: 0.18,
      flatShading: node.kind !== "orb"
    });
    const mesh = new Mesh(geometry, material);
    mesh.userData.nodeId = node.id;
    mesh.userData.baseRotation = node.rotationY;
    mesh.userData.speed = 0.00018 + index * 0.00004;
    return mesh;
  }

  private animate = (): void => {
    if (this.disposed) return;
    const time = performance.now();
    for (const mesh of this.meshes.values()) {
      const baseRotation = Number(mesh.userData.baseRotation ?? 0);
      const speed = Number(mesh.userData.speed ?? 0);
      mesh.rotation.y = baseRotation + (this.motionEnabled ? time * speed : 0);
    }
    this.renderer.render(this.scene, this.camera);
    this.animationFrame = requestAnimationFrame(this.animate);
  };

  private resize = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(320, Math.floor(rect.width || this.canvas.parentElement?.clientWidth || 800));
    const height = Math.max(260, Math.floor(rect.height || 520));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  private handlePointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.activePointerId !== null) return;
    this.activePointerId = event.pointerId;
    this.pointerDragged = false;
    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
    this.canvas.setPointerCapture?.(event.pointerId);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    const dx = event.clientX - this.pointerStartX;
    const dy = event.clientY - this.pointerStartY;
    if (Math.abs(dx) + Math.abs(dy) < 2) return;
    this.pointerDragged = true;
    this.orbitYaw -= (event.movementX || dx) * 0.006;
    this.orbitPitch = clamp(this.orbitPitch + (event.movementY || dy) * 0.004, 0.12, 0.92);
    this.pointerStartX = event.clientX;
    this.pointerStartY = event.clientY;
    this.applyCameraOrbit();
    event.preventDefault();
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activePointerId) return;
    if (!this.pointerDragged) this.selectAt(event);
    this.canvas.releasePointerCapture?.(event.pointerId);
    this.activePointerId = null;
    this.pointerDragged = false;
  };

  private handleWheel = (event: WheelEvent): void => {
    this.orbitDistance = clamp(this.orbitDistance + event.deltaY * 0.006, 5.8, 12.5);
    this.applyCameraOrbit();
    event.preventDefault();
  };

  private selectAt(event: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects([...this.meshes.values()], false)[0];
    const nodeId = hit?.object.userData.nodeId;
    if (typeof nodeId === "string") this.onSelect(nodeId);
  }

  private applyCameraOrbit(): void {
    const horizontal = Math.cos(this.orbitPitch) * this.orbitDistance;
    this.camera.position.set(
      Math.sin(this.orbitYaw) * horizontal,
      this.lookTarget.y + Math.sin(this.orbitPitch) * this.orbitDistance,
      Math.cos(this.orbitYaw) * horizontal
    );
    this.camera.lookAt(this.lookTarget);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
