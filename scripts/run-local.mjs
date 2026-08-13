import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, "..");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const nextBinary = process.platform === "win32"
  ? resolve(projectRoot, "node_modules", ".bin", "next.cmd")
  : resolve(projectRoot, "node_modules", ".bin", "next");

function run(args) {
  const result = spawnSync(npmCommand, args, {
    cwd: projectRoot,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (!existsSync(nextBinary)) {
  console.log("Installing locked dependencies...");
  run(["ci"]);
}

run(["run", "dev"]);
