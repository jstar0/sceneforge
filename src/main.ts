import "./style.css";

import { SceneStore } from "./store";
import type { SceneSnapshot } from "./model";
import type { SceneRenderer } from "./renderer";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("#app mount is missing");

app.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <a class="wordmark" href="/" aria-label="SceneForge home"><span>SCENE</span>FORGE</a>
      <div class="topbar-meta"><span class="status-dot" aria-hidden="true"></span><span>LOCAL / SYNTHETIC</span></div>
    </header>
    <section class="hero" aria-labelledby="hero-title">
      <p class="eyebrow">PROCEDURAL SPATIAL LAB / 01</p>
      <h1 id="hero-title">Make space<br /><em>legible.</em></h1>
      <p class="hero-copy">A small scene graph, rendered as a living stage. Select a form, move it with keys, and keep the model—not the pixels—as the source of truth.</p>
    </section>
    <div class="workspace">
      <section class="stage-panel" aria-label="Procedural 3D stage">
        <div class="stage-header"><div><span class="section-kicker">STAGE / 3D PREVIEW</span><span id="stage-status" class="stage-status">READY</span></div><span class="stage-index">05 FORMS</span></div>
        <div class="stage-wrap"><canvas id="scene-canvas" aria-label="Interactive procedural scene"></canvas><div class="stage-fallback" id="stage-fallback" hidden>3D preview unavailable in this browser. The textual scene controls remain fully usable.</div></div>
        <div class="stage-footer"><span>DRAG TO INSPECT</span><span>ARROW KEYS TO NUDGE</span><span id="diagnostics">0 OBJECTS / 0 CALLS</span></div>
      </section>
      <aside class="inspector" aria-label="Scene inspector">
        <div class="inspector-heading"><div><span class="section-kicker">INSPECTOR</span><h2 id="selected-title">Nothing selected</h2></div><span id="selected-index" class="selected-index">—</span></div>
        <p id="selected-description" class="selected-description">Choose a form from the list or click it on the stage.</p>
        <dl class="coordinates" aria-label="Selected form coordinates"><div><dt>X</dt><dd id="coord-x">—</dd></div><div><dt>Y</dt><dd id="coord-y">—</dd></div><div><dt>Z</dt><dd id="coord-z">—</dd></div></dl>
        <div class="list-heading"><span class="section-kicker">FORMS / 05</span><span class="list-hint">SELECT ONE</span></div>
        <div id="node-list" class="node-list" role="listbox" aria-label="Scene forms"></div>
        <div class="action-stack"><button id="reset-button" class="button button-primary" type="button">Reset scene <span>R</span></button><div class="button-row"><button id="motion-button" class="button button-secondary" type="button">Ambient motion</button><button id="export-button" class="button button-secondary" type="button">Export JSON</button><button id="import-button" class="button button-secondary" type="button">Import JSON</button></div><input id="import-input" type="file" accept="application/json,.json" hidden /><p id="import-error" class="inline-error" role="alert" hidden></p></div>
        <p id="announcement" class="sr-only" aria-live="polite"></p>
      </aside>
    </div>
    <footer class="footer"><span>SCENE GRAPH / v1</span><span>NO REMOTE ASSETS · NO TRACKING</span><span>KEYBOARD READY</span></footer>
  </div>
`;

const store = new SceneStore();
const canvas = document.querySelector<HTMLCanvasElement>("#scene-canvas");
if (!canvas) throw new Error("scene canvas is missing");
const sceneCanvas = canvas;
const stageStatus = document.querySelector<HTMLSpanElement>("#stage-status");
const fallback = document.querySelector<HTMLDivElement>("#stage-fallback");
const diagnostics = document.querySelector<HTMLSpanElement>("#diagnostics");
const list = document.querySelector<HTMLDivElement>("#node-list");
const selectedTitle = document.querySelector<HTMLHeadingElement>("#selected-title");
const selectedDescription = document.querySelector<HTMLParagraphElement>("#selected-description");
const selectedIndex = document.querySelector<HTMLSpanElement>("#selected-index");
const announcement = document.querySelector<HTMLParagraphElement>("#announcement");
const motionButton = document.querySelector<HTMLButtonElement>("#motion-button");
const importButton = document.querySelector<HTMLButtonElement>("#import-button");
const importInput = document.querySelector<HTMLInputElement>("#import-input");
const importError = document.querySelector<HTMLParagraphElement>("#import-error");
const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
if (reducedMotion) store.setMotionEnabled(false);

let renderer: SceneRenderer | undefined;
store.subscribe(render);
if (stageStatus) stageStatus.textContent = "LOADING";
void loadRenderer();

document.querySelector<HTMLButtonElement>("#reset-button")?.addEventListener("click", () => {
  store.reset();
  announce("Scene reset to the synthetic fixture.");
});

motionButton?.addEventListener("click", () => {
  const next = !store.getSnapshot().motionEnabled;
  store.setMotionEnabled(next);
  announce(next ? "Ambient motion enabled." : "Ambient motion paused.");
});

document.querySelector<HTMLButtonElement>("#export-button")?.addEventListener("click", () => {
  const blob = new Blob([store.exportSnapshot()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "sceneforge-scene.json";
  anchor.click();
  URL.revokeObjectURL(url);
  announce("Synthetic scene JSON exported.");
});

importButton?.addEventListener("click", () => importInput?.click());
importInput?.addEventListener("change", async () => {
  const file = importInput.files?.[0];
  importInput.value = "";
  if (!file) return;
  try {
    store.importSnapshot(await file.text());
    showImportError(null);
    announce(`Imported ${file.name}.`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The selected file is not a valid SceneForge snapshot.";
    showImportError(message);
    announce("Import failed. The current scene was kept.");
  }
});

window.addEventListener("keydown", (event) => {
  const target = event.target as HTMLElement | null;
  if (target?.tagName === "BUTTON" || target?.tagName === "INPUT" || target?.tagName === "TEXTAREA") {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
  }
  if (event.key.toLowerCase() === "r") {
    store.reset();
    announce("Scene reset to the synthetic fixture.");
    return;
  }
  if (event.key === "Escape") {
    store.select(null);
    announce("Selection cleared.");
    return;
  }
  const delta: Record<string, [number, number]> = {
    ArrowLeft: [-0.25, 0],
    ArrowRight: [0.25, 0],
    ArrowUp: [0, -0.25],
    ArrowDown: [0, 0.25]
  };
  const movement = delta[event.key];
  if (movement && store.getSnapshot().selectedId) {
    event.preventDefault();
    store.moveSelected(...movement);
    announce("Selected form moved within scene bounds.");
  }
});

async function loadRenderer(): Promise<void> {
  try {
    const { SceneRenderer: Renderer } = await import("./renderer");
    renderer = new Renderer(sceneCanvas, store, (nodeId) => store.select(nodeId));
    if (stageStatus) stageStatus.textContent = "LIVE";
    updateDiagnostics();
    window.setInterval(updateDiagnostics, 500);
  } catch (error) {
    if (stageStatus) stageStatus.textContent = "DOM FALLBACK";
    if (fallback) fallback.hidden = false;
    console.warn("Scene renderer unavailable; keeping DOM controls active.", error);
  }
}

function updateDiagnostics(): void {
  if (!renderer || !diagnostics) return;
  const info = renderer.diagnostics();
  diagnostics.textContent = `${info.objects} OBJECTS / ${info.drawCalls} CALLS`;
}

function render(snapshot: SceneSnapshot): void {
  if (!list || !selectedTitle || !selectedDescription || !selectedIndex || !motionButton) return;
  const activeElement = document.activeElement;
  const activeNodeId = activeElement instanceof HTMLButtonElement ? activeElement.dataset.nodeId : undefined;
  list.replaceChildren();
  snapshot.nodes.forEach((node, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "node-card";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(node.id === snapshot.selectedId));
    button.dataset.nodeId = node.id;
    button.tabIndex = node.id === snapshot.selectedId || (snapshot.selectedId === null && index === 0) ? 0 : -1;
    const swatch = document.createElement("span");
    swatch.className = "node-swatch";
    swatch.style.setProperty("--swatch", node.color);
    const copy = document.createElement("span");
    copy.className = "node-copy";
    const title = document.createElement("strong");
    title.textContent = node.title;
    const kind = document.createElement("small");
    kind.textContent = `${node.kind.toUpperCase()} / ${String(index + 1).padStart(2, "0")}`;
    copy.append(title, kind);
    const arrow = document.createElement("span");
    arrow.className = "node-arrow";
    arrow.setAttribute("aria-hidden", "true");
    arrow.textContent = "↗";
    button.append(swatch, copy, arrow);
    button.addEventListener("click", () => {
      store.select(node.id);
      announce(`${node.title} selected.`);
    });
    button.addEventListener("keydown", (event) => {
      const direction = event.key === "ArrowDown" || event.key === "ArrowRight" ? 1 : event.key === "ArrowUp" || event.key === "ArrowLeft" ? -1 : 0;
      if (event.key === "Home") {
        event.preventDefault();
        event.stopPropagation();
        focusNode(snapshot.nodes[0]?.id);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        event.stopPropagation();
        focusNode(snapshot.nodes.at(-1)?.id);
        return;
      }
      if (!direction) return;
      event.preventDefault();
      event.stopPropagation();
      const nextIndex = Math.min(snapshot.nodes.length - 1, Math.max(0, index + direction));
      const next = snapshot.nodes[nextIndex];
      if (next) focusNode(next.id);
    });
    list.append(button);
  });
  if (activeNodeId) {
    list.querySelector<HTMLButtonElement>(`[data-node-id="${CSS.escape(activeNodeId)}"]`)?.focus();
  }
  const selected = store.selectedNode();
  if (selected) {
    selectedTitle.textContent = selected.title;
    selectedDescription.textContent = selected.description;
    selectedIndex.textContent = String(snapshot.nodes.findIndex((node) => node.id === selected.id) + 1).padStart(2, "0");
    setText("coord-x", selected.position.x.toFixed(2));
    setText("coord-y", selected.position.y.toFixed(2));
    setText("coord-z", selected.position.z.toFixed(2));
  } else {
    selectedTitle.textContent = "Nothing selected";
    selectedDescription.textContent = "Choose a form from the list or click it on the stage.";
    selectedIndex.textContent = "—";
    setText("coord-x", "—");
    setText("coord-y", "—");
    setText("coord-z", "—");
  }
  motionButton.textContent = snapshot.motionEnabled ? "Pause motion" : "Ambient motion";
  if (stageStatus && fallback?.hidden === false) stageStatus.textContent = "DOM FALLBACK";
}

function setText(id: string, value: string): void {
  const element = document.querySelector<HTMLElement>(`#${id}`);
  if (element) element.textContent = value;
}

function announce(message: string): void {
  if (announcement) announcement.textContent = message;
}

function focusNode(nodeId: string | undefined): void {
  if (!nodeId) return;
  store.select(nodeId);
  document.querySelector<HTMLButtonElement>(`[data-node-id="${CSS.escape(nodeId)}"]`)?.focus();
  const selected = store.selectedNode();
  if (selected) announce(`${selected.title} selected.`);
}

function showImportError(message: string | null): void {
  if (!importError) return;
  importError.hidden = message === null;
  importError.textContent = message ?? "";
}
