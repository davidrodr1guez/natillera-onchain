/**
 * register-agent.js
 * Registers the Natillera Agent in the ERC-8004 IdentityRegistry on Celo Mainnet.
 * Mints an ERC-721 NFT representing the agent identity.
 */

import { ethers } from "ethers";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Config ---
const RPC_URL = "https://forno.celo.org";
const CHAIN_ID = 42220;
const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

// The registration JSON is hosted on GitHub raw (after push) or can be IPFS.
// For now, we use a raw GitHub URL — update after first push.
const AGENT_URI =
  "https://raw.githubusercontent.com/darodriguez15/natillera-onchain/main/agent/registration.json";

// --- ABIs (minimal) ---
const IDENTITY_ABI = [
  "function register(string agentURI) external returns (uint256 agentId)",
  "function register() external returns (uint256 agentId)",
  "function register(string agentURI, tuple(string metadataKey, bytes metadataValue)[] metadata) external returns (uint256 agentId)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function balanceOf(address owner) view returns (uint256)",
  "function getAgentWallet(uint256 agentId) view returns (address)",
  "function setAgentURI(uint256 agentId, string newURI) external",
  "function setMetadata(uint256 agentId, string metadataKey, bytes metadataValue) external",
  "function getMetadata(uint256 agentId, string metadataKey) view returns (bytes)",
  "event Registered(uint256 indexed agentId, string agentURI, address indexed owner)",
];

async function main() {
  console.log("=== Natillera Agent — ERC-8004 Registration ===\n");

  // Load private key from parent .env
  const envPath = resolve(__dirname, "../.env");
  const envContent = readFileSync(envPath, "utf8");
  const privateKey = envContent
    .split("\n")
    .find((l) => l.startsWith("PRIVATE_KEY="))
    ?.split("=")[1]
    ?.trim();

  if (!privateKey) {
    console.error("PRIVATE_KEY not found in ../.env");
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = new ethers.Wallet(privateKey, provider);
  const address = wallet.address;

  console.log(`Wallet:   ${address}`);
  console.log(`Chain:    Celo Mainnet (${CHAIN_ID})`);
  console.log(`Registry: ${IDENTITY_REGISTRY}`);
  console.log(`URI:      ${AGENT_URI}\n`);

  const identity = new ethers.Contract(IDENTITY_REGISTRY, IDENTITY_ABI, wallet);

  // Check if already registered
  const balance = await identity.balanceOf(address);
  if (balance > 0n) {
    console.log(`Already registered! You own ${balance} agent NFT(s).`);
    // Try to find our agentId by looking at past events
    const filter = identity.filters.Registered(null, null, address);
    const events = await identity.queryFilter(filter, 0, "latest");
    if (events.length > 0) {
      const agentId = events[events.length - 1].args.agentId;
      const uri = await identity.tokenURI(agentId);
      const agentWallet = await identity.getAgentWallet(agentId);
      console.log(`Agent ID:     ${agentId}`);
      console.log(`Token URI:    ${uri}`);
      console.log(`Agent Wallet: ${agentWallet}`);

      // Update URI if different
      if (uri !== AGENT_URI) {
        console.log(`\nUpdating URI to: ${AGENT_URI}`);
        const tx = await identity.setAgentURI(agentId, AGENT_URI);
        console.log(`TX: ${tx.hash}`);
        await tx.wait();
        console.log("URI updated!");
      }
    }
    return;
  }

  // Register the agent with URI
  console.log("Registering agent...");

  const tx = await identity["register(string)"](AGENT_URI);
  console.log(`TX submitted: ${tx.hash}`);
  console.log("Waiting for confirmation...");

  const receipt = await tx.wait();
  console.log(`Confirmed in block ${receipt.blockNumber}`);

  // Parse Registered event
  const registeredEvent = receipt.logs
    .map((log) => {
      try {
        return identity.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e) => e?.name === "Registered");

  if (registeredEvent) {
    const agentId = registeredEvent.args.agentId;
    console.log(`\nAgent registered successfully!`);
    console.log(`Agent ID: ${agentId}`);
    console.log(`Owner:    ${address}`);
    console.log(`URI:      ${AGENT_URI}`);

    // Set on-chain metadata
    console.log("\nSetting on-chain metadata...");

    const metaTx1 = await identity.setMetadata(
      agentId,
      "agentName",
      ethers.toUtf8Bytes("Natillera Agent")
    );
    await metaTx1.wait();
    console.log("  Set agentName");

    const metaTx2 = await identity.setMetadata(
      agentId,
      "chain",
      ethers.toUtf8Bytes("celo")
    );
    await metaTx2.wait();
    console.log("  Set chain = celo");

    const metaTx3 = await identity.setMetadata(
      agentId,
      "category",
      ethers.toUtf8Bytes("defi-savings")
    );
    await metaTx3.wait();
    console.log("  Set category = defi-savings");

    console.log(`\nView on 8004scan: https://8004scan.io/agent/${agentId}`);

    // Update registration.json with agentId
    const regPath = resolve(__dirname, "registration.json");
    const reg = JSON.parse(readFileSync(regPath, "utf8"));
    reg.registrations = [
      {
        agentId: Number(agentId),
        agentRegistry: `eip155:${CHAIN_ID}:${IDENTITY_REGISTRY}`,
      },
    ];
    const { writeFileSync } = await import("fs");
    writeFileSync(regPath, JSON.stringify(reg, null, 2) + "\n");
    console.log("Updated registration.json with agentId");
  } else {
    console.log("Registration TX confirmed but could not parse event.");
    console.log("Check on Celoscan:", `https://celoscan.io/tx/${tx.hash}`);
  }
}

main().catch((err) => {
  console.error("Registration failed:", err.message || err);
  process.exit(1);
});
