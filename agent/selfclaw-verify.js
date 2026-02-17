/**
 * selfclaw-verify.js
 * 
 * Verifica el agente Natillera en SelfClaw usando la API programática
 * 
 * Proceso:
 * 1. Lee clave pública Ed25519 del agente
 * 2. Inicia verificación con SelfClaw API
 * 3. Genera QR code para escanear con Self app
 * 4. Auto-poll del status hasta completar
 * 5. Confirma verificación
 * 
 * Requisitos:
 * - agent-ed25519-pub.key (formato SPKI base64)
 * - agent-ed25519-priv.key (formato PKCS8 base64)
 * - Self app instalada en celular
 * - Pasaporte con chip NFC
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Config ---
const SELFCLAW_API = "https://selfclaw.ai/api/selfclaw/v1";
const AGENT_NAME = "natillera-onchain";
const POLL_INTERVAL_MS = 5000; // 5 seconds
const MAX_POLL_ATTEMPTS = 120; // 10 minutes total

// --- Load Keys ---
const publicKeyPath = resolve(__dirname, "agent-ed25519-pub.key");
const privateKeyPath = resolve(__dirname, "agent-ed25519-priv.key");

const publicKeySpki = readFileSync(publicKeyPath, "utf8").trim();
const privateKeyPkcs8 = readFileSync(privateKeyPath, "utf8").trim();

console.log("=== SelfClaw Agent Verification ===");
console.log(`Agent Name: ${AGENT_NAME}`);
console.log(`Public Key: ${publicKeySpki.substring(0, 20)}...`);
console.log();

// --- Step 1: Check Name Availability ---
async function checkNameAvailability(name) {
  console.log(`📝 Checking name availability: ${name}...`);
  
  const response = await fetch(`${SELFCLAW_API}/check-name/${name}`);
  const data = await response.json();
  
  if (data.available) {
    console.log(`✅ Name "${name}" is available!`);
  } else {
    console.log(`❌ Name "${name}" is taken.`);
    if (data.suggestions) {
      console.log(`   Suggestions: ${data.suggestions.join(", ")}`);
    }
    throw new Error(`Name "${name}" is not available`);
  }
  
  return data;
}

// --- Step 2: Start Verification ---
async function startVerification(publicKey, agentName) {
  console.log(`\\n🚀 Starting verification...`);
  
  const response = await fetch(`${SELFCLAW_API}/start-verification`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      agentPublicKey: publicKey,
      agentName: agentName,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to start verification: ${error}`);
  }
  
  const data = await response.json();
  console.log(`✅ Verification started`);
  console.log(`   Session ID: ${data.sessionId}`);
  console.log(`   Challenge: ${data.challenge.substring(0, 40)}...`);
  
  return data;
}

// --- Step 3: Sign Challenge ---
function signChallenge(challenge, privateKeyPkcs8) {
  console.log(`\\n🔐 Signing challenge...`);
  
  // Import private key
  const privateKeyObj = crypto.createPrivateKey({
    key: Buffer.from(privateKeyPkcs8, "base64"),
    format: "der",
    type: "pkcs8",
  });
  
  // Sign the challenge
  const signature = crypto.sign(null, Buffer.from(challenge, "utf8"), privateKeyObj);
  const signatureHex = signature.toString("hex");
  
  console.log(`✅ Challenge signed`);
  console.log(`   Signature: ${signatureHex.substring(0, 40)}...`);
  
  return signatureHex;
}

// --- Step 4: Submit Signature ---
async function submitSignature(sessionId, signature) {
  console.log(`\\n📤 Submitting signature...`);
  
  const response = await fetch(`${SELFCLAW_API}/sign-challenge`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: sessionId,
      signature: signature,
    }),
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to submit signature: ${error}`);
  }
  
  const data = await response.json();
  console.log(`✅ Signature submitted`);
  
  return data;
}

// --- Step 5: Display QR Code Instructions ---
function displayQRInstructions(sessionId, selfAppData) {
  console.log(`\\n📱 === SCAN QR CODE ===`);
  console.log();
  console.log(`1. Open Self app on your phone`);
  console.log(`2. Tap the QR scanner icon (top left)`);
  console.log(`3. Scan this URL:`);
  console.log();
  console.log(`   https://selfclaw.ai/verify/${sessionId}`);
  console.log();
  console.log(`   Or use this deeplink if available:`);
  if (selfAppData && selfAppData.deeplink) {
    console.log(`   ${selfAppData.deeplink}`);
  } else {
    console.log(`   (no deeplink provided)`);
  }
  console.log();
  console.log(`4. Follow Self app instructions (scan passport NFC)`);
  console.log(`5. Wait for verification to complete...`);
  console.log();
  console.log(`⏳ Auto-polling status every ${POLL_INTERVAL_MS / 1000} seconds...`);
  console.log();
}

// --- Step 6: Poll Verification Status ---
async function pollVerificationStatus(sessionId) {
  let attempts = 0;
  
  while (attempts < MAX_POLL_ATTEMPTS) {
    attempts++;
    
    const response = await fetch(`${SELFCLAW_API}/verification-status/${sessionId}`);
    
    if (!response.ok) {
      console.error(`   ⚠️ Poll attempt ${attempts} failed`);
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    
    const data = await response.json();
    const status = data.status;
    
    if (status === "verified") {
      console.log(`\\n✅ Verification COMPLETE!`);
      return data;
    } else if (status === "expired") {
      throw new Error("Verification session expired. Please try again.");
    } else if (status === "pending") {
      process.stdout.write(`   ⏳ Attempt ${attempts}/${MAX_POLL_ATTEMPTS}: Still pending...\\r`);
    } else {
      console.log(`   ℹ️ Status: ${status}`);
    }
    
    await sleep(POLL_INTERVAL_MS);
  }
  
  throw new Error(`Verification timeout after ${attempts} attempts`);
}

// --- Step 7: Confirm Verification ---
async function confirmVerification(publicKey) {
  console.log(`\\n🔍 Confirming verification...`);
  
  const response = await fetch(
    `${SELFCLAW_API}/agent?publicKey=${encodeURIComponent(publicKey)}`
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to confirm verification: ${error}`);
  }
  
  const data = await response.json();
  
  console.log(`\\n✅ Agent verified successfully!`);
  console.log(`   Verified: ${data.verified}`);
  console.log(`   Human ID: ${data.humanId}`);
  console.log(`   Registered At: ${data.registeredAt}`);
  if (data.agentName) {
    console.log(`   Agent Name: ${data.agentName}`);
  }
  
  return data;
}

// --- Utility ---
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- Main Flow ---
async function main() {
  try {
    // Step 1: Check name availability
    await checkNameAvailability(AGENT_NAME);
    
    // Step 2: Start verification
    const verification = await startVerification(publicKeySpki, AGENT_NAME);
    const { sessionId, challenge, selfApp } = verification;
    
    // Step 3: Sign challenge
    const signature = signChallenge(challenge, privateKeyPkcs8);
    
    // Step 4: Submit signature
    await submitSignature(sessionId, signature);
    
    // Step 5: Display QR instructions
    displayQRInstructions(sessionId, selfApp);
    
    // Step 6: Poll for completion (auto-polling)
    const result = await pollVerificationStatus(sessionId);
    
    // Step 7: Confirm verification
    const agent = await confirmVerification(publicKeySpki);
    
    console.log(`\\n🎉 SelfClaw verification complete!`);
    console.log(`\\nNext steps:`);
    console.log(`1. Register wallet: node selfclaw-register-wallet.js`);
    console.log(`2. Register ERC-8004 on-chain identity`);
    console.log(`3. Submit to Celo Agent Hackathon`);
    
  } catch (error) {
    console.error(`\\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();
