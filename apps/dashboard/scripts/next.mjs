import { spawn } from "node:child_process";
import path from "node:path";
import { config as loadDotEnv } from "dotenv";

loadDotEnv({ path: path.resolve(process.cwd(), "../..", ".env") });

const command = process.argv[2] ?? "dev";
const forwardedArgs = process.argv.slice(3);
const nextBin = path.resolve("node_modules/next/dist/bin/next");
const args = [nextBin, command];

if (command === "dev" || command === "start") {
  args.push("-p", process.env.DASHBOARD_PORT || "3001");
}

if (command === "build") {
  args.push("--webpack");
}

args.push(...forwardedArgs);

const child = spawn(process.execPath, args, {
  stdio: "inherit",
  shell: false,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
