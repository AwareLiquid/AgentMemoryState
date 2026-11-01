import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const output = resolve(root, "artifacts/account-conformance");
mkdirSync(output, { recursive: true });
// Public test-only keys. This runner never connects to an external network.
const payer = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
const authorityKey = `0x${"a11ce".padStart(64, "0")}`;
const zero = `0x${"00".repeat(32)}`;
const server = createServer();
server.listen(0, "127.0.0.1");
await once(server, "listening");
const port = server.address().port;
await new Promise((done) => server.close(done));
const rpcUrl = `http://127.0.0.1:${port}`;
const anvil = spawn("anvil", ["--host", "127.0.0.1", "--port", String(port),
  "--hardfork", "prague", "--chain-id", "31337", "--mnemonic",
  "test test test test test test test test test test test junk", "--silent"],
  { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
let nodeLog = "";
let startupError;
anvil.stdout.on("data", (b) => { nodeLog += b; });
anvil.stderr.on("data", (b) => { nodeLog += b; });
anvil.on("error", (error) => { startupError = error; });
const report = { schema: "erc8350/7702-transaction/v1", network: "ephemeral-local-anvil",
  chainId: 31337, result: "fail", transactions: [] };

function cast(args) {
  const command = args.slice(0, 2).join(" ");
  if (["send", "call"].includes(args[0])) args.splice(1, 0, "--no-proxy");
  const r = spawnSync("cast", args, { cwd: root, encoding: "utf8", timeout: 60_000,
    maxBuffer: 8 * 1024 * 1024, env: { ...process.env,
      NO_PROXY: "127.0.0.1,localhost", no_proxy: "127.0.0.1,localhost" } });
  if (r.error || r.status !== 0) throw new Error(`cast ${command} failed: ${r.error?.message ?? r.stderr}`);
  return r.stdout.trim();
}
async function rpc(method, params = []) {
  const response = await fetch(rpcUrl, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }), signal: AbortSignal.timeout(5000) });
  const data = await response.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.result;
}
function send(args) {
  const receipt = JSON.parse(cast(["send", "--rpc-url", rpcUrl, "--private-key", payer,
    "--json", "--timeout", "30", ...args]));
  assert.equal(BigInt(receipt.status), 1n);
  report.transactions.push(receipt);
  return receipt;
}
function call(address, signature, ...args) {
  return JSON.parse(cast(["call", "--rpc-url", rpcUrl, "--json", address, signature, ...args]));
}
function deploy(path) {
  const artifact = JSON.parse(readFileSync(resolve(root, path)));
  return send(["--create", artifact.bytecode.object]).contractAddress;
}
function authorize(delegate, nonce) {
  return cast(["wallet", "sign-auth", delegate, "--nonce", String(nonce), "--chain", "31337",
    "--private-key", authorityKey]);
}
function signature(registry, structHash) {
  const digest = call(registry, "signingDigest(bytes32)(bytes32)", structHash)[0];
  return cast(["wallet", "sign", "--no-hash", digest, "--private-key", authorityKey]);
}

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (startupError) throw startupError;
    if (anvil.exitCode !== null) throw new Error(`Anvil exited: ${nodeLog}`);
    try { assert.equal(await rpc("eth_chainId"), "0x7a69"); ready = true; break; }
    catch { await new Promise((done) => setTimeout(done, 100)); }
  }
  assert.ok(ready, "Anvil did not start");
  const authority = cast(["wallet", "address", "--private-key", authorityKey]);
  const delegate = deploy("account-conformance/out/RealAccounts.t.sol/DelegationWithoutPolicy.json");
  const replacement = deploy("account-conformance/out/RealAccounts.t.sol/DelegationWithoutPolicy.json");
  const registry = deploy("contracts/out/AgentMemoryStateRegistry.sol/AgentMemoryStateRegistry.json");
  const attached = send([authority, "ping()", "--auth", authorize(delegate, 0)]);
  assert.equal((await rpc("eth_getTransactionByHash", [attached.transactionHash])).type, "0x4");
  const code = `0xef0100${delegate.slice(2).toLowerCase()}`;
  assert.equal(await rpc("eth_getCode", [authority, "latest"]), code);
  assert.equal(BigInt(await rpc("eth_getTransactionCount", [authority, "latest"])), 1n);

  // EIP-7702 skips a stale authorization; the outer transaction can still succeed.
  const stale = send([authority, "ping()", "--auth", authorize(replacement, 0)]);
  assert.equal((await rpc("eth_getTransactionByHash", [stale.transactionHash])).type, "0x4");
  assert.equal(await rpc("eth_getCode", [authority, "latest"]), code);
  assert.equal(BigInt(await rpc("eth_getTransactionCount", [authority, "latest"])), 1n);

  const salt = `0x${"11".repeat(32)}`;
  const space = call(registry, "deriveSpaceId(address,bytes32)(bytes32)", authority, salt)[0];
  const registration = call(registry, "hashSpaceRegistration(bytes32,address,address)(bytes32)", space, authority, authority)[0];
  send([registry, "registerSpace(bytes32,address,address,bytes32,bytes)", space, authority, authority, salt,
    signature(registry, registration)]);
  const delta = `(${space},1,${zero},0x${"22".repeat(32)},${zero},0x${"33".repeat(32)},${zero})`;
  const tuple = "(bytes32,uint64,bytes32,bytes32,bytes32,bytes32,bytes32)";
  const transition = call(registry, `hashExperienceDelta(${tuple})(bytes32)`, delta)[0];
  send([registry, `commitTransition(${tuple},bytes)`, delta, signature(registry, transition)]);
  const head = call(registry, "head(bytes32)(bytes32,bytes32,uint64)", space);
  assert.equal(head[0], transition);
  assert.equal(BigInt(head[2]), 1n);
  report.authority = authority;
  report.delegate = delegate;
  report.registry = registry;
  report.authorityNonce = "1";
  report.delegationCode = code;
  report.head = head;
  report.claims = ["mined type-4 delegation", "authority nonce increment", "stale authorization skipped",
    "delegated EOA registry registration and transition via ECDSA fallback"];
  report.result = "pass";
  console.log("Local type-4 transaction, nonce, stale authorization and Registry transition: PASS");
} catch (error) {
  report.error = error.message;
  process.exitCode = 1;
  console.error(error.message);
} finally {
  report.generatedAt = new Date().toISOString();
  writeFileSync(resolve(output, "7702-transactions.json"), `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(resolve(output, "anvil.txt"), nodeLog);
  if (anvil.exitCode === null && !startupError) {
    const exited = once(anvil, "exit");
    anvil.kill("SIGTERM");
    await exited;
  }
}
