/**
 * register-wallet.js
 * 
 * Register agent wallet with SelfClaw
 */

import { readFileSync } from "fs";
import { createPrivateKey, sign } from "crypto";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Config
const SELFCLAW_API = "https://selfclaw.ai/api/selfclaw/v1";
const WALLET_ADDRESS = "0x1b5330952ef615a99490c3Fb0B15663b227ecb81";

// Load keys
const publicKeySpkiPath = resolve(__dirname, "agent-ed25519-pub.key");
const privateKeyPath = resolve(__dirname, "agent-ed25519-priv.key");

const publicKeySpki = readFileSync(publicKeySpkiPath, "utf8").trim();
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

async function registerWallet() {
  console.log("=== Registering Agent Wallet with SelfClaw ===\n");
  console.log(`Wallet Address: ${WALLET_ADDRESS}\n`);
  
  const auth = createAuthPayload();
  
  const response = await fetch(`${SELFCLAW_API}/register-wallet`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      ...auth,
      walletAddress: WALLET_ADDRESS
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    console.error(`❌ Error: ${error}`);
    throw new Error(`Failed to register wallet: ${response.status}`);
  }
  
  const data = await response.json();
  
  console.log("✅ Wallet registered successfully!\n");
  console.log(JSON.stringify(data, null, 2));
  
  return data;
}

async function main() {
  try {
    await registerWallet();
    
    console.log("\n🎉 Success!");
    console.log("\nNext steps:");
    console.log("1. Confirm ERC-8004 registration (Agent ID 12)");
    console.log("2. Set agent wallet onchain via setAgentWallet()");
    console.log("3. Deploy $NATILLERA token");
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
