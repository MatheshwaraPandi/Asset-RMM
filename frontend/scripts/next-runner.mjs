import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const command = process.argv[2] || "dev";
const extraArgs = process.argv.slice(3);
const nextBin = path.join(__dirname, "..", "node_modules", "next", "dist", "bin", "next");
const nodeModulesPath = path.join(__dirname, "..", "node_modules");

const env = {
  ...process.env,
  NODE_PATH: process.env.NODE_PATH || nodeModulesPath,
};

const args = [nextBin, command];
if (command === "build") {
  args.push("--webpack");
}
args.push(...extraArgs);

const child = spawn(process.execPath, args, {
  cwd: path.join(__dirname, ".."),
  env,
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
