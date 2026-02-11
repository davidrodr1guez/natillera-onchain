/**
 * post-feedback.js
 * Posts feedback to the ERC-8004 ReputationRegistry for a given agent.
 *
 * Usage:
 *   node post-feedback.js <agentId> <score> [tag1] [tag2] [comment]
 *
 * Examples:
 *   node post-feedback.js 42 95 reliable fast
 *   node post-feedback.js 42 80 "good-service" "savings-group"
 *
 * Note: The feedback submitter MUST NOT be the agent owner (ERC-8004 spec).
 *       Use a different wallet if you are the agent owner.
 */

import { ethers } from "ethers";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Config ---
const RPC_URL = "https://forno.celo.org";
const REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";
const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";

// --- ABIs ---
const REPUTATION_ABI = [
  "function giveFeedback(uint256 agentId, uint8 score, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external",
  "function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, uint8 averageScore)",
  "function readFeedback(uint256 agentId, address clientAddress, uint64 index) view returns (uint8 score, string tag1, string tag2, bool isRevoked)",
  "function getClients(uint256 agentId) view returns (address[])",
  "function readAllFeedback(uint256 agentId, address[] clientAddresses, string tag1, string tag2, bool includeRevoked) view returns (address[] clients, uint64[] feedbackIndexes, uint8[] scores, string[] tag1s, string[] tag2s, bool[] revokedStatuses)",
  "event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, uint8 score, string indexed tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)",
];

const IDENTITY_ABI = [
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function ownerOf(uint256 tokenId) view returns (address)",
];

function loadWallet(provider) {
  const envPath = resolve(__dirname, "../.env");
  const envContent = readFileSync(envPath, "utf8");
  const privateKey = envContent
    .split("\n")
    .find((l) => l.startsWith("PRIVATE_KEY="))
    ?.split("=")[1]
    ?.trim();

  if (!privateKey) {
    throw new Error("PRIVATE_KEY not found in ../.env");
  }
  return new ethers.Wallet(privateKey, provider);
}

async function postFeedback(agentId, score, tag1 = "", tag2 = "") {
  console.log("=== ERC-8004 Reputation — Post Feedback ===\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const wallet = loadWallet(provider);

  console.log(`Sender:   ${wallet.address}`);
  console.log(`Agent ID: ${agentId}`);
  console.log(`Score:    ${score}/100`);
  if (tag1) console.log(`Tag1:     ${tag1}`);
  if (tag2) console.log(`Tag2:     ${tag2}`);
  console.log();

  const identity = new ethers.Contract(
    IDENTITY_REGISTRY,
    IDENTITY_ABI,
    provider
  );
  const reputation = new ethers.Contract(
    REPUTATION_REGISTRY,
    REPUTATION_ABI,
    wallet
  );

  // Verify agent exists
  try {
    const owner = await identity.ownerOf(agentId);
    console.log(`Agent owner: ${owner}`);

    if (owner.toLowerCase() === wallet.address.toLowerCase()) {
      console.log(
        "\nWARNING: You are the agent owner. ERC-8004 spec says feedback submitter MUST NOT be the agent owner."
      );
      console.log("The transaction may revert. Use a different wallet.\n");
    }
  } catch {
    console.error(`Agent ID ${agentId} does not exist in the registry.`);
    process.exit(1);
  }

  // Submit feedback
  console.log("Submitting feedback...");
  const tx = await reputation.giveFeedback(
    agentId,
    score,
    tag1,
    tag2,
    "", // endpoint
    "", // feedbackURI
    ethers.ZeroHash // feedbackHash
  );

  console.log(`TX: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Confirmed in block ${receipt.blockNumber}`);

  // Parse event
  const event = receipt.logs
    .map((log) => {
      try {
        return reputation.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e) => e?.name === "NewFeedback");

  if (event) {
    console.log(`\nFeedback posted!`);
    console.log(`  Feedback Index: ${event.args.feedbackIndex}`);
    console.log(`  Score:          ${event.args.score}/100`);
  }

  // Get updated summary
  console.log("\nReputation summary:");
  const [count, avgScore] = await reputation.getSummary(agentId, [], "", "");
  console.log(`  Total feedback: ${count}`);
  console.log(`  Average score:  ${avgScore}/100`);
}

async function viewReputation(agentId) {
  console.log("=== ERC-8004 Reputation — View ===\n");

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const reputation = new ethers.Contract(
    REPUTATION_REGISTRY,
    REPUTATION_ABI,
    provider
  );
  const identity = new ethers.Contract(
    IDENTITY_REGISTRY,
    IDENTITY_ABI,
    provider
  );

  try {
    const owner = await identity.ownerOf(agentId);
    const uri = await identity.tokenURI(agentId);
    console.log(`Agent ID: ${agentId}`);
    console.log(`Owner:    ${owner}`);
    console.log(`URI:      ${uri}`);
  } catch {
    console.error(`Agent ID ${agentId} not found.`);
    return;
  }

  const [count, avgScore] = await reputation.getSummary(agentId, [], "", "");
  console.log(`\nReputation:`);
  console.log(`  Total feedback: ${count}`);
  console.log(`  Average score:  ${avgScore}/100`);

  if (count > 0n) {
    const clients = await reputation.getClients(agentId);
    console.log(`  Unique clients: ${clients.length}`);

    const [addrs, indexes, scores, tag1s, tag2s, revoked] =
      await reputation.readAllFeedback(agentId, [], "", "", false);
    console.log(`\n  Feedback entries:`);
    for (let i = 0; i < scores.length; i++) {
      console.log(
        `    [${indexes[i]}] Score: ${scores[i]} | Tags: ${tag1s[i] || "-"}, ${tag2s[i] || "-"} | From: ${addrs[i].slice(0, 10)}...`
      );
    }
  }
}

// --- CLI ---
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === "--help") {
  console.log("Usage:");
  console.log(
    "  node post-feedback.js <agentId> <score> [tag1] [tag2]  — Post feedback"
  );
  console.log(
    "  node post-feedback.js --view <agentId>                 — View reputation"
  );
  process.exit(0);
}

if (args[0] === "--view") {
  const agentId = parseInt(args[1]);
  if (isNaN(agentId)) {
    console.error("Invalid agentId");
    process.exit(1);
  }
  viewReputation(agentId).catch((err) => {
    console.error("Error:", err.message || err);
    process.exit(1);
  });
} else {
  const agentId = parseInt(args[0]);
  const score = parseInt(args[1]);

  if (isNaN(agentId) || isNaN(score) || score < 0 || score > 100) {
    console.error("Usage: node post-feedback.js <agentId> <score 0-100> [tag1] [tag2]");
    process.exit(1);
  }

  const tag1 = args[2] || "";
  const tag2 = args[3] || "";

  postFeedback(agentId, score, tag1, tag2).catch((err) => {
    console.error("Error:", err.message || err);
    process.exit(1);
  });
}
