/**
 * link-erc8004.js
 * 
 * Link existing ERC-8004 Agent ID 12 with SelfClaw
 */

import { readFileSync } from "fs";
import { createPrivateKey, sign } from "crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Config
const SELFCLAW_API = "https://selfclaw.ai/api/selfclaw/v1";
const PUBLIC_KEY_HEX = "835b80f94b40e0d575fdc5110cbad83bb26866747382f76ee954c3ac168b620f";
const AGENT_ID = 12;
const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
const CHAIN_ID = 42220; // Celo Mainnet

// Load private key
const privateKeyPath = resolve(__dirname, "agent-ed25519-priv.key");
const privateKeyPkcs8 = readFileSync(privateKeyPath, "utf8").trim();
const privateKeyDer = Buffer.from(privateKeyPkcs8, "base64");
const privateKey = createPrivateKey({ 
  key: privateKeyDer, 
  format: "der", 
  type: "pkcs8" 
});

// Generate random nonce
function generateNonce() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Create signed auth payload
function createAuthPayload() {
  const publicKeySpki = readFileSync(resolve(__dirname, "agent-ed25519-pub.key"), "utf8").trim();
  const timestamp = Date.now();
  const nonce = generateNonce();
  
  // Sign the exact JSON structure
  const payload = JSON.stringify({
    agentPublicKey: publicKeySpki,
    timestamp,
    nonce
  });
  
  const signature = sign(null, Buffer.from(payload), privateKey).toString("hex");
  
  return {
    agentPublicKey: publicKeySpki,
    signature,
    timestamp,
    nonce
  };
}

async function confirmErc8004() {
  console.log("=== Linking ERC-8004 Agent ID with SelfClaw ===\n");
  
  console.log(`Agent ID: ${AGENT_ID}`);
  console.log(`Identity Registry: ${IDENTITY_REGISTRY}`);
  console.log(`Chain ID: ${CHAIN_ID} (Celo Mainnet)`);
  console.log(`Public Key: ${PUBLIC_KEY_HEX}\n`);
  
  // Transaction hash where Agent ID 12 was registered
  const txHash = "0x27b5c28fb3d1fa663b7e3fc651a7ddce05a6b96b1e4ad6c5e8a4dd5d57d4f4fb";
  
  console.log(`📤 Confirming ERC-8004 registration with SelfClaw...\n`);
  
  const auth = createAuthPayload();
  
  const response = await fetch(`${SELFCLAW_API}/confirm-erc8004`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      ...auth,
      txHash 
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Error: ${error}`);
    throw new Error(`Failed to confirm ERC-8004: ${response.status}`);
  }
  
  const data = await response.json();
  
  console.log("✅ ERC-8004 linkage confirmed!\n");
  console.log(`Token ID: ${data.tokenId}`);
  console.log(`8004 Scan: ${data.scan8004Url}`);
  console.log(`Verified: ${data.verified}`);
  
  return data;
}

async function main() {
  try {
    const result = await confirmErc8004();
    
    console.log("\n🎉 Success! Agent ID 12 is now linked with SelfClaw");
    console.log("\nNext steps:");
    console.log("1. Deploy $NATILLERA token");
    console.log("2. Create liquidity pool");
    console.log("3. Publish skills");
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
