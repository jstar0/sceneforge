import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { runBenchmark } from "../src/benchmark";

const outputDir = resolve(process.cwd(), readOutputDir(process.argv.slice(2)));
mkdirSync(outputDir, { recursive: true });

const result = runBenchmark();
const snapshotPath = resolve(outputDir, "scene.json");
const metricsPath = resolve(outputDir, "metrics.json");
const manifestPath = resolve(outputDir, "manifest.json");
const reportPath = resolve(outputDir, "report.md");

const snapshot = result.snapshot;
const metrics = {
  benchmarkVersion: result.benchmarkVersion,
  operationCount: result.operationCount,
  clampedOperationCount: result.clampedOperationCount,
  nodeCount: result.nodeCount,
  selectedId: result.selectedId,
  motionEnabled: result.motionEnabled,
  snapshotSha256: sha256(snapshot)
};
writeFileSync(snapshotPath, snapshot, "utf8");
writeFileSync(metricsPath, `${JSON.stringify(metrics, null, 2)}\n`, "utf8");
writeFileSync(
  reportPath,
  [
    "# SceneForge benchmark",
    "",
    `- operations: ${metrics.operationCount}`,
    `- clamped operations: ${metrics.clampedOperationCount}`,
    `- nodes: ${metrics.nodeCount}`,
    `- selected node: ${metrics.selectedId ?? "none"}`,
    `- ambient motion: ${metrics.motionEnabled ? "enabled" : "paused"}`,
    `- snapshot SHA-256: \`${metrics.snapshotSha256}\``,
    "",
    "All values are produced from the synthetic fixture and contain no network or customer data.",
    ""
  ].join("\n"),
  "utf8"
);

// Write the report before hashing the public artifact set. Keeping this order
// explicit prevents a fresh output directory from producing a manifest that
// references a file which does not exist yet.
const files = [snapshotPath, metricsPath, reportPath];
const manifest = {
  schemaVersion: 1,
  files: files.map((path) => ({
    name: path.slice(outputDir.length + 1),
    bytes: Buffer.byteLength(requireFile(path), "utf8"),
    sha256: sha256(requireFile(path))
  }))
};
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(JSON.stringify({ outputDir, ...metrics }, null, 2));

function readOutputDir(args: string[]): string {
  const index = args.indexOf("--output-dir");
  const value = index >= 0 ? args[index + 1] : undefined;
  if (!value || value.startsWith("-")) return "artifacts/benchmark";
  return value;
}

function requireFile(path: string): string {
  // Keep the benchmark script dependency-free beyond Node's standard library.
  return readFileSync(path, "utf8");
}

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
