import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { createConnection } from "node:net";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const children = new Set();
const closingSignals = new Set(["SIGINT", "SIGTERM"]);
let stopping = false;

function readEnvFile(path) {
  if (!existsSync(path)) return {};
  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/)
      .flatMap((line) => {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match) return [];
        return [[match[1], match[2].replace(/^(['"])(.*)\1$/, "$2")]];
      }),
  );
}

function findBackend() {
  const configured = process.env.GULSAGA_BACKEND_DIR;
  const candidates = configured
    ? [isAbsolute(configured) ? configured : resolve(root, configured)]
    : [join(root, "backend"), resolve(root, "..", "Gulsaga-main", "Gulsaga-main", "backend")];
  return candidates.find(
    (candidate) =>
      existsSync(join(candidate, "package.json")) &&
      existsSync(join(candidate, "src", "server.js")),
  );
}

function getApiBaseUrl(backendDir) {
  const frontendEnv = readEnvFile(join(root, ".env.local"));
  const backendEnv = readEnvFile(join(backendDir, ".env"));
  return (
    process.env.VITE_API_BASE_URL ||
    frontendEnv.VITE_API_BASE_URL ||
    `${backendEnv.API_PUBLIC_URL || "http://127.0.0.1:4000"}/api`
  ).replace(/\/+$/, "");
}

function canConnect(host, port, timeout = 1200) {
  return new Promise((resolveConnection) => {
    const socket = createConnection({ host, port });
    const finish = (connected) => {
      socket.destroy();
      resolveConnection(connected);
    };
    socket.setTimeout(timeout, () => finish(false));
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
  });
}

async function ensureLocalDatabase(backendDir) {
  const backendEnv = readEnvFile(join(backendDir, ".env"));
  let databaseUrl;
  try {
    databaseUrl = new URL(backendEnv.DATABASE_URL);
  } catch {
    throw new Error("The backend DATABASE_URL is missing or invalid.");
  }

  const host = databaseUrl.hostname;
  const localHost = ["localhost", "127.0.0.1", "::1"].includes(host);
  if (!localHost) return;

  const port = Number(databaseUrl.port || 3306);
  if (await canConnect(host, port)) {
    console.log(`MySQL is ready at ${host}:${port}.`);
    return;
  }

  if (process.platform !== "win32") {
    throw new Error(`MySQL is not reachable at ${host}:${port}. Start MySQL and try again.`);
  }

  const serviceName = process.env.MYSQL_SERVICE_NAME || "MySQL80";
  console.log(`MySQL is not running; attempting to start Windows service "${serviceName}"…`);
  const result = spawnSync("net.exe", ["start", serviceName], {
    cwd: root,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) {
    throw new Error(`Could not start MySQL service "${serviceName}": ${result.error.message}`);
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await canConnect(host, port)) {
      console.log(`MySQL is ready at ${host}:${port}.`);
      return;
    }
    await delay(500);
  }
  throw new Error(`MySQL service "${serviceName}" did not become available at ${host}:${port}.`);
}

function startProcess(command, args, cwd, env = process.env) {
  const child = spawn(command, args, {
    cwd,
    env,
    stdio: "inherit",
    windowsHide: true,
  });
  children.add(child);
  child.once("error", (error) => {
    console.error(`Could not start ${command}: ${error.message}`);
    void stopChildren(1);
  });
  child.once("exit", (code) => {
    children.delete(child);
    if (!stopping) void stopChildren(code ?? 1);
  });
  return child;
}

async function apiIsReady(apiBaseUrl) {
  try {
    const response = await fetch(`${apiBaseUrl}/public/site-content`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForApi(apiBaseUrl) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (await apiIsReady(apiBaseUrl)) return true;
    await delay(500);
  }
  return false;
}

async function stopChildren(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  await Promise.all(
    [...children].map(
      (child) =>
        new Promise((resolveExit) => {
          if (child.exitCode !== null || child.signalCode !== null) {
            resolveExit();
          } else {
            child.once("exit", resolveExit);
          }
        }),
    ),
  );
  process.exit(exitCode);
}

for (const signal of closingSignals) {
  process.once(signal, () => void stopChildren(signal === "SIGINT" ? 130 : 143));
}

try {
  const backendDir = findBackend();
  if (!backendDir) {
    throw new Error(
      "Backend not found. Put it in ./backend or set GULSAGA_BACKEND_DIR to its folder.",
    );
  }

  await ensureLocalDatabase(backendDir);
  const apiBaseUrl = getApiBaseUrl(backendDir);
  let apiStartedHere = false;
  if (await apiIsReady(apiBaseUrl)) {
    console.log(`Reusing the running API at ${apiBaseUrl}.`);
  } else {
    console.log(`Starting the Gulsaga API from ${backendDir}…`);
    const backendEnv = readEnvFile(join(backendDir, ".env"));
    const allowedOrigins = new Set(
      (backendEnv.CORS_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    );
    for (let port = 8080; port <= 8090; port += 1) {
      allowedOrigins.add(`http://127.0.0.1:${port}`);
      allowedOrigins.add(`http://localhost:${port}`);
    }
    startProcess(process.execPath, ["--env-file=.env", "--watch", "src/server.js"], backendDir, {
      ...process.env,
      CORS_ALLOWED_ORIGINS: [...allowedOrigins].join(","),
    });
    apiStartedHere = true;
    if (!(await waitForApi(apiBaseUrl))) {
      throw new Error(
        `The API did not become ready at ${apiBaseUrl}. Check the backend startup and database errors above.`,
      );
    }
    console.log(`API is ready at ${apiBaseUrl}.`);
  }

  // WhatsApp gateway (OpenWA, Node 22). Optional: set OPENWA_DIR / OPENWA_NODE or keep the default sibling folders.
  const openwaDir = process.env.OPENWA_DIR || resolve(root, "..", "OpenWA");
  const openwaNode =
    process.env.OPENWA_NODE ||
    resolve(root, "..", "OpenWA-node22", "node_modules", "node", "bin", "node.exe");
  if (await canConnect("127.0.0.1", 2785)) {
    console.log("OpenWA WhatsApp gateway is already running.");
  } else if (existsSync(join(openwaDir, "dist", "main.js")) && existsSync(openwaNode)) {
    console.log("Starting the OpenWA WhatsApp gateway…");
    startProcess(openwaNode, ["--enable-source-maps", "dist/main"], openwaDir);
  }

  const viteCli = join(root, "node_modules", "vite", "bin", "vite.js");
  if (!existsSync(viteCli)) throw new Error("Vite is not installed. Run npm install first.");
  console.log("Starting the frontend…");
  startProcess(process.execPath, [viteCli, "dev", ...process.argv.slice(2)], root);

  if (!apiStartedHere) {
    console.log("The existing API will keep running when the frontend stops.");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not start the application.");
  await stopChildren(1);
}
