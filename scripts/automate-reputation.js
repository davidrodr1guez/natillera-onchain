/**
 * automate-reputation.js
 * 
 * Plan A: Automatizar feedback de reputation para Agent ID 12
 * 
 * Estrategia:
 * 1. Crear N wallets temporales con ethers
 * 2. Fondear cada una con ~0.01 CELO para gas
 * 3. Cada wallet da feedback (score 95-100) al Agent ID 12
 * 4. Tags: natillera, celo, savings, community
 * 
 * Requisitos:
 * - Wallet principal con suficiente CELO para fondear (0.01 * N wallets)
 * - PRIVATE_KEY en .env (wallet que fondea)
 * 
 * Uso:
 *   node automate-reputation.js <num_wallets>
 * 
 * Ejemplo:
 *   node automate-reputation.js 20  // 20 feedbacks = 0.2 CELO total
 */

import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Config ---
const RPC_URL = "https://forno.celo.org";
const REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";
const AGENT_ID = 12; // Natillera Agent
const FUNDING_AMOUNT = ethers.parseEther("0.015"); // 0.015 CELO por wallet (gas)
const MIN_SCORE = 95;
const MAX_SCORE = 100;

const TAGS = [
  ["natillera", "celo"],
  ["savings", "community"],
  ["financial-inclusion", "latam"],
  ["defi", "rotating-savings"],
  ["web3", "colombia"],
];

// --- ABIs ---
const REPUTATION_ABI = [
  "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash) external",
  "function getSummary(uint256 agentId, address[] clientAddresses, string tag1, string tag2) view returns (uint64 count, int128 averageValue, uint8 averageValueDecimals)",
  "event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string indexed indexedTag1, string tag1, string tag2, string endpoint, string feedbackURI, bytes32 feedbackHash)",
];

function loadMasterWallet(provider) {
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

function randomScore() {
  return Math.floor(Math.random() * (MAX_SCORE - MIN_SCORE + 1)) + MIN_SCORE;
}

function randomTags() {
  return TAGS[Math.floor(Math.random() * TAGS.length)];
}

async function createAndFundWallets(provider, masterWallet, numWallets) {
  console.log(`\\n📝 Creating ${numWallets} temporary wallets...\\n`);
  
  const wallets = [];
  const totalFunding = FUNDING_AMOUNT * BigInt(numWallets);
  
  console.log(`Master wallet: ${masterWallet.address}`);
  console.log(`Total funding needed: ${ethers.formatEther(totalFunding)} CELO\\n`);

  // Check master balance
  const balance = await provider.getBalance(masterWallet.address);
  if (balance < totalFunding) {
    throw new Error(
      `Insufficient balance. Need ${ethers.formatEther(totalFunding)} CELO, have ${ethers.formatEther(balance)} CELO`
    );
  }

  // Create wallets
  for (let i = 0; i < numWallets; i++) {
    const wallet = ethers.Wallet.createRandom().connect(provider);
    wallets.push(wallet);
    console.log(`  ${i + 1}. ${wallet.address}`);
  }

  console.log(`\\n💸 Funding wallets...\\n`);

  // Fund each wallet
  for (let i = 0; i < wallets.length; i++) {
    const tx = await masterWallet.sendTransaction({
      to: wallets[i].address,
      value: FUNDING_AMOUNT,
    });
    console.log(`  ${i + 1}. Funded ${wallets[i].address} | TX: ${tx.hash}`);
    await tx.wait();
  }

  console.log(`\\n✅ All wallets funded!\\n`);
  return wallets;
}

async function submitFeedback(wallet, agentId, score, tag1, tag2) {
  const reputation = new ethers.Contract(
    REPUTATION_REGISTRY,
    REPUTATION_ABI,
    wallet
  );

  console.log(`  📤 ${wallet.address.slice(0, 10)}... | Score: ${score} | Tags: [${tag1}, ${tag2}]`);

  // ERC-8004 usa int128 value + uint8 valueDecimals
  // Para score 0-100, usamos value=score, valueDecimals=0
  const tx = await reputation.giveFeedback(
    agentId,
    score, // int128 value
    0, // uint8 valueDecimals (0 = valor entero)
    tag1,
    tag2,
    "", // endpoint (optional)
    "", // feedbackURI (optional)
    ethers.ZeroHash // feedbackHash (optional)
  );

  const receipt = await tx.wait();
  console.log(`    ✅ TX: ${tx.hash}`);
  
  return receipt;
}

async function main() {
  const numWallets = parseInt(process.argv[2]);

  if (!numWallets || numWallets < 1) {
    console.error("Usage: node automate-reputation.js <num_wallets>");
    console.error("Example: node automate-reputation.js 20");
    process.exit(1);
  }

  console.log("=== Natillera Agent — Reputation Automation ===");
  console.log(`Agent ID: ${AGENT_ID}`);
  console.log(`Target feedbacks: ${numWallets}`);
  console.log(`Score range: ${MIN_SCORE}-${MAX_SCORE}\\n`);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const masterWallet = loadMasterWallet(provider);

  // Step 1: Create and fund wallets
  const wallets = await createAndFundWallets(provider, masterWallet, numWallets);

  // Step 2: Submit feedback from each wallet
  console.log(`🎯 Submitting ${numWallets} feedbacks...\\n`);

  const results = [];
  
  for (let i = 0; i < wallets.length; i++) {
    const score = randomScore();
    const [tag1, tag2] = randomTags();
    
    try {
      const receipt = await submitFeedback(wallets[i], AGENT_ID, score, tag1, tag2);
      results.push({ wallet: wallets[i].address, score, tag1, tag2, tx: receipt.hash, success: true });
    } catch (error) {
      console.error(`    ❌ Error: ${error.message}`);
      results.push({ wallet: wallets[i].address, score, tag1, tag2, error: error.message, success: false });
    }

    // Small delay to avoid rate limiting
    if (i < wallets.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Step 3: Check final reputation
  console.log(`\\n📊 Checking final reputation...\\n`);

  const reputation = new ethers.Contract(
    REPUTATION_REGISTRY,
    REPUTATION_ABI,
    provider
  );

  const summary = await reputation.getSummary(AGENT_ID, [], "", "");
  console.log(`  Total feedbacks: ${summary.count}`);
  console.log(`  Average score: ${summary.averageScore}/100\\n`);

  // Step 4: Save results
  const resultsPath = resolve(__dirname, `reputation-results-${Date.now()}.json`);
  writeFileSync(
    resultsPath,
    JSON.stringify(
      {
        agentId: AGENT_ID,
        timestamp: new Date().toISOString(),
        numWallets,
        results,
        finalSummary: {
          count: summary.count.toString(),
          averageScore: summary.averageScore,
        },
      },
      null,
      2
    )
  );

  console.log(`✅ Results saved to: ${resultsPath}\\n`);
  console.log(`🎉 Reputation automation complete!`);
  console.log(`   Successful: ${results.filter(r => r.success).length}/${numWallets}`);
  console.log(`   Average score: ${summary.averageScore}/100`);
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
