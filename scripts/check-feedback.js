import { ethers } from "ethers";

const RPC_URL = "https://forno.celo.org";
const REPUTATION_REGISTRY = "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63";
const AGENT_ID = 12;

const REPUTATION_ABI = [
  "function getAllFeedbackForAgent(uint256 agentId) view returns (tuple(address clientAddress, uint64 feedbackIndex, int128 value, uint8 valueDecimals, string tag1, string tag2, bool isRevoked)[])",
];

const provider = new ethers.JsonRpcProvider(RPC_URL);
const reputation = new ethers.Contract(REPUTATION_REGISTRY, REPUTATION_ABI, provider);

const feedbacks = await reputation.getAllFeedbackForAgent(AGENT_ID);

console.log(`\n📊 Agent ID ${AGENT_ID} - Feedback Summary\n`);
console.log(`Total feedbacks: ${feedbacks.length}`);

const active = feedbacks.filter(f => !f.isRevoked);
console.log(`Active feedbacks: ${active.length}`);

const avgValue = active.reduce((sum, f) => sum + Number(f.value), 0) / active.length;
console.log(`Average value: ${avgValue.toFixed(2)}/100\n`);

console.log(`Latest 5 feedbacks:`);
feedbacks.slice(-5).forEach((f, i) => {
  console.log(`  ${feedbacks.length - 4 + i}. ${f.clientAddress.slice(0,10)}... | Value: ${f.value} | Tags: [${f.tag1}, ${f.tag2}]`);
});
