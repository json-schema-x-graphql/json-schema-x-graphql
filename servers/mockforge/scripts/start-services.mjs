#!/usr/bin/env node
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockforgeRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(mockforgeRoot, "..", "..", "..");
const registryPath = path.join(repoRoot, "src", "data", "system-registry.json");

function loadMockSystems() {
  if (!fs.existsSync(registryPath)) {
    throw new Error(`System registry not found: ${registryPath}`);
  }

  const registry = JSON.parse(fs.readFileSync(registryPath, "utf8"));
  const systems = Array.isArray(registry.systems) ? registry.systems : [];

  return systems
    .filter(system => system?.mock?.enabled)
    .map(system => ({
      id: system.id,
      port: Number(system?.mock?.port || 0) || null,
    }))
    .filter(system => system.id && system.port);
}

const children = [];

function stopAll(exitCode = 0) {
  for (const child of children) {
    try {
      child.kill("SIGTERM");
    } catch {
      // ignore
    }
  }

  setTimeout(() => {
    for (const child of children) {
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    }
    process.exit(exitCode);
  }, 1200);
}

async function main() {
  const systems = loadMockSystems();
  if (systems.length === 0) {
    throw new Error("No mock-enabled systems found in src/data/system-registry.json");
  }

  const mockServerPath = path.join(mockforgeRoot, "mock-server.js");
  if (!fs.existsSync(mockServerPath)) {
    throw new Error(
      `mock-server.js not found at ${mockServerPath}. Run 'pnpm install' inside dev/pocs/mockforge/ and ensure mock-server.js has been built.`
    );
  }

  console.log("Starting mock services from system registry:");
  for (const system of systems) {
    console.log(`  - ${system.id} on :${system.port}`);
  }

  for (const system of systems) {
    const child = spawn(process.execPath, ["mock-server.js"], {
      cwd: mockforgeRoot,
      stdio: "inherit",
      env: {
        ...process.env,
        PORT: String(system.port),
        SYSTEM: system.id,
      },
    });

    child.on("exit", (code, signal) => {
      if (code !== 0) {
        console.error(
          `Mock service ${system.id} exited with code ${code ?? "unknown"} (signal: ${signal || "none"})`
        );
      }
    });

    children.push(child);
  }

  process.on("SIGINT", () => stopAll(0));
  process.on("SIGTERM", () => stopAll(0));
}

main().catch(error => {
  console.error("Failed to start mock services:", error.message);
  process.exit(1);
});
