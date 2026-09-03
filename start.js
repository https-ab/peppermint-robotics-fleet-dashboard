import { spawn } from "child_process";

console.log("[start] Starting backend...");

const backend = spawn(
  process.execPath,
  ["backend/server.js"],
  {
    stdio: "inherit",
    env: {
      ...process.env
    }
  }
);

console.log("[start] Starting simulator...");

const simulator = spawn(
  process.execPath,
  ["simulator/simulator.js"],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      BACKEND_WS_URL:
        process.env.BACKEND_WS_URL ||
        `ws://localhost:${process.env.PORT || 3001}/ws/robots`
    }
  }
);

function shutdown() {
  console.log("[start] Shutting down...");

  backend.kill("SIGTERM");
  simulator.kill("SIGTERM");
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

backend.on("exit", (code) => {
  console.log(`[start] Backend exited with code ${code}`);
  process.exit(code ?? 1);
});

simulator.on("exit", (code) => {
  console.log(`[start] Simulator exited with code ${code}`);
});
