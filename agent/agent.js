/**
 * agent.js
 * Natillera On-Chain AI Agent — ERC-8004 Trustless Agent on Celo
 *
 * Monitors natillera contracts for events and takes automated actions:
 * - Listens for GroupCreated, MemberJoined, ContributionMade, PayoutSent
 * - Checks deadlines and forces round advancement when overdue
 * - Creates natilleras on demand
 * - Logs all actions for reputation building
 */

import { ethers } from "ethers";
import { readFileSync, appendFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// --- Config ---
const RPC_URL = "https://forno.celo.org";
const CHAIN_ID = 42220;

const FACTORY_ADDRESS = "0x6567645D4150AbC2c7802DaD76711be8b8669171";
const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

const CHECK_INTERVAL_MS = 60_000; // Check every 60 seconds

// --- ABIs ---
const FACTORY_ABI = [
  "function createNatillera(string name, uint256 contributionAmount, uint8 frequency, uint256 maxMembers) external returns (address)",
  "function getNatilleraCount() view returns (uint256)",
  "function getAllNatilleras() view returns (address[])",
  "function getUserNatilleras(address user) view returns (address[])",
  "event GroupCreated(address indexed natillera, address indexed creator, string name, uint256 contributionAmount, uint8 frequency, uint256 maxMembers)",
];

const NATILLERA_ABI = [
  "function name() view returns (string)",
  "function contributionAmount() view returns (uint256)",
  "function frequency() view returns (uint8)",
  "function maxMembers() view returns (uint256)",
  "function creator() view returns (address)",
  "function status() view returns (uint8)",
  "function currentRound() view returns (uint256)",
  "function totalRounds() view returns (uint256)",
  "function roundDeadline() view returns (uint256)",
  "function isMember(address) view returns (bool)",
  "function getMemberCount() view returns (uint256)",
  "function getMembers() view returns (tuple(address addr, bool hasReceivedPayout, uint256 collateralDeposited, uint256 payoutRound)[])",
  "function getRoundInfo() view returns (uint256 round, uint256 startTime, uint256 deadline, uint256 contributions, address recipient)",
  "function hasContributedInRound(address member, uint256 round) view returns (bool)",
  "function forceAdvanceRound() external",
  "function join() external",
  "function contribute() external",
  "event MemberJoined(address indexed member, uint256 memberCount)",
  "event NatilleraStarted(uint256 startTime)",
  "event ContributionMade(address indexed member, uint256 round, uint256 amount)",
  "event PayoutSent(address indexed recipient, uint256 round, uint256 amount)",
  "event PenaltyApplied(address indexed member, uint256 round, uint256 collateralLost)",
  "event NatilleraCompleted()",
];

const CUSD_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
];

// --- Logging ---
function log(action, details) {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${action}: ${JSON.stringify(details)}`;
  console.log(entry);

  const logFile = resolve(__dirname, "agent-actions.log");
  appendFileSync(logFile, entry + "\n");
}

// --- Load wallet ---
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

// --- Agent Class ---
class NatilleraAgent {
  constructor() {
    this.provider = new ethers.JsonRpcProvider(RPC_URL);
    this.wallet = loadWallet(this.provider);
    this.factory = new ethers.Contract(
      FACTORY_ADDRESS,
      FACTORY_ABI,
      this.wallet
    );
    this.cUSD = new ethers.Contract(CUSD_ADDRESS, CUSD_ABI, this.wallet);
    this.trackedNatilleras = new Map(); // address -> contract instance
    this.trackedNames = new Map(); // address -> name
    this.lastPolledBlock = 0;
    this.running = false;
  }

  async start() {
    console.log("=== Natillera Agent Starting ===");
    console.log(`Wallet: ${this.wallet.address}`);

    const balance = await this.cUSD.balanceOf(this.wallet.address);
    console.log(`cUSD Balance: ${ethers.formatUnits(balance, 18)} cUSD`);

    const celoBalance = await this.provider.getBalance(this.wallet.address);
    console.log(`CELO Balance: ${ethers.formatEther(celoBalance)} CELO\n`);

    // Load existing natilleras
    await this.loadExistingNatilleras();

    // Set starting block for polling
    this.lastPolledBlock = await this.provider.getBlockNumber();
    console.log(`Polling from block ${this.lastPolledBlock}...`);

    // Start monitoring loop (uses polling instead of filters — Celo RPC compatible)
    this.running = true;
    this.monitorLoop();

    log("AGENT_STARTED", {
      wallet: this.wallet.address,
      trackedGroups: this.trackedNatilleras.size,
    });
  }

  async loadExistingNatilleras() {
    console.log("Loading existing natilleras...");
    const allNatilleras = await this.factory.getAllNatilleras();
    console.log(`Found ${allNatilleras.length} natillera(s)\n`);

    for (const addr of allNatilleras) {
      await this.trackNatillera(addr);
    }
  }

  async trackNatillera(address) {
    if (this.trackedNatilleras.has(address)) return;

    const contract = new ethers.Contract(address, NATILLERA_ABI, this.wallet);

    try {
      const name = await contract.name();
      const status = await contract.status();
      const memberCount = await contract.getMemberCount();
      const maxMembers = await contract.maxMembers();
      const contribution = await contract.contributionAmount();

      this.trackedNatilleras.set(address, contract);
      this.trackedNames.set(address, name);

      const statusLabels = ["Pending", "Active", "Completed", "Cancelled"];
      console.log(
        `  Tracking: ${name} (${address.slice(0, 10)}...) — ${statusLabels[status]}, ${memberCount}/${maxMembers} members, ${ethers.formatUnits(contribution, 18)} cUSD`
      );

      log("TRACK_NATILLERA", { address, name, status: Number(status) });
    } catch (err) {
      console.log(`  Warning: Could not load ${address}: ${err.message}`);
    }
  }

  async pollEvents() {
    const currentBlock = await this.provider.getBlockNumber();
    if (currentBlock <= this.lastPolledBlock) return;

    const fromBlock = this.lastPolledBlock + 1;
    const toBlock = currentBlock;

    // Poll factory for new groups
    try {
      const factoryLogs = await this.factory.queryFilter(
        "GroupCreated",
        fromBlock,
        toBlock
      );
      for (const ev of factoryLogs) {
        const { natillera, creator, name, contributionAmount, frequency, maxMembers } = ev.args;
        log("EVENT_GROUP_CREATED", {
          natillera,
          creator,
          name,
          amount: ethers.formatUnits(contributionAmount, 18),
          frequency: Number(frequency),
          maxMembers: Number(maxMembers),
        });
        console.log(`\nNew group created: "${name}" at ${natillera}`);
        await this.trackNatillera(natillera);
      }
    } catch {
      // Ignore query errors on public RPC
    }

    // Poll each tracked natillera for events
    for (const [address, contract] of this.trackedNatilleras) {
      const groupName = this.trackedNames.get(address) || address.slice(0, 10);

      try {
        const memberLogs = await contract.queryFilter("MemberJoined", fromBlock, toBlock);
        for (const ev of memberLogs) {
          log("EVENT_MEMBER_JOINED", { group: groupName, address, member: ev.args.member, memberCount: Number(ev.args.memberCount) });
          console.log(`[${groupName}] Member joined: ${ev.args.member} (${ev.args.memberCount} total)`);
        }

        const contribLogs = await contract.queryFilter("ContributionMade", fromBlock, toBlock);
        for (const ev of contribLogs) {
          log("EVENT_CONTRIBUTION", { group: groupName, address, member: ev.args.member, round: Number(ev.args.round), amount: ethers.formatUnits(ev.args.amount, 18) });
          console.log(`[${groupName}] Contribution: ${ev.args.member} round ${ev.args.round} — ${ethers.formatUnits(ev.args.amount, 18)} cUSD`);
        }

        const payoutLogs = await contract.queryFilter("PayoutSent", fromBlock, toBlock);
        for (const ev of payoutLogs) {
          log("EVENT_PAYOUT", { group: groupName, address, recipient: ev.args.recipient, round: Number(ev.args.round), amount: ethers.formatUnits(ev.args.amount, 18) });
          console.log(`[${groupName}] Payout: ${ev.args.recipient} round ${ev.args.round} — ${ethers.formatUnits(ev.args.amount, 18)} cUSD`);
        }

        const completedLogs = await contract.queryFilter("NatilleraCompleted", fromBlock, toBlock);
        for (const ev of completedLogs) {
          log("EVENT_COMPLETED", { group: groupName, address });
          console.log(`[${groupName}] Natillera completed!`);
        }
      } catch {
        // Skip RPC errors for individual contracts
      }
    }

    this.lastPolledBlock = toBlock;
  }

  async monitorLoop() {
    while (this.running) {
      try {
        await this.pollEvents();
        await this.checkDeadlines();
      } catch (err) {
        log("MONITOR_ERROR", { error: err.message });
      }
      await new Promise((r) => setTimeout(r, CHECK_INTERVAL_MS));
    }
  }

  async checkDeadlines() {
    const now = Math.floor(Date.now() / 1000);

    for (const [address, contract] of this.trackedNatilleras) {
      try {
        const status = await contract.status();
        // Only check Active natilleras (status === 1)
        if (Number(status) !== 1) continue;

        const [round, startTime, deadline, contributions, recipient] =
          await contract.getRoundInfo();
        const name = await contract.name();
        const memberCount = await contract.getMemberCount();

        // Check if deadline has passed
        if (Number(deadline) > 0 && now > Number(deadline)) {
          const overdueSecs = now - Number(deadline);
          const overdueHours = (overdueSecs / 3600).toFixed(1);

          log("DEADLINE_PASSED", {
            group: name,
            address,
            round: Number(round),
            deadline: Number(deadline),
            overdueHours,
            contributions: Number(contributions),
            memberCount: Number(memberCount),
          });

          console.log(
            `\n[${name}] Round ${round} OVERDUE by ${overdueHours}h — ${contributions}/${memberCount} contributed`
          );

          // Check if we're the creator (only creator can force advance)
          const creator = await contract.creator();
          if (
            creator.toLowerCase() === this.wallet.address.toLowerCase()
          ) {
            console.log(`[${name}] We are creator — forcing round advance...`);
            try {
              const tx = await contract.forceAdvanceRound();
              console.log(`[${name}] Force advance TX: ${tx.hash}`);
              const receipt = await tx.wait();
              log("FORCE_ADVANCE", {
                group: name,
                address,
                round: Number(round),
                txHash: tx.hash,
                block: receipt.blockNumber,
              });
              console.log(`[${name}] Round advanced!`);
            } catch (err) {
              log("FORCE_ADVANCE_FAILED", {
                group: name,
                address,
                error: err.message,
              });
              console.log(
                `[${name}] Could not force advance: ${err.message}`
              );
            }
          } else {
            console.log(
              `[${name}] Creator is ${creator.slice(0, 10)}... — cannot force advance (not creator)`
            );
          }
        }

        // Log pending contributions reminder
        if (Number(deadline) > 0 && Number(deadline) - now < 3600 && now < Number(deadline)) {
          const minutesLeft = ((Number(deadline) - now) / 60).toFixed(0);
          log("DEADLINE_WARNING", {
            group: name,
            address,
            round: Number(round),
            minutesLeft,
            contributions: Number(contributions),
            memberCount: Number(memberCount),
          });
          console.log(
            `[${name}] WARNING: Round ${round} deadline in ${minutesLeft} minutes — ${contributions}/${memberCount} contributed`
          );
        }
      } catch (err) {
        // Skip contracts that error (might be completed/cancelled)
      }
    }
  }

  async createNatillera(name, contributionAmount, frequency, maxMembers) {
    const amount = ethers.parseUnits(contributionAmount.toString(), 18);

    log("CREATE_NATILLERA", { name, contributionAmount, frequency, maxMembers });
    console.log(`\nCreating natillera: "${name}"...`);

    const tx = await this.factory.createNatillera(
      name,
      amount,
      frequency,
      maxMembers
    );
    console.log(`TX: ${tx.hash}`);

    const receipt = await tx.wait();

    // Parse GroupCreated event
    const event = receipt.logs
      .map((log) => {
        try {
          return this.factory.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e?.name === "GroupCreated");

    if (event) {
      const addr = event.args.natillera;
      log("NATILLERA_CREATED", {
        name,
        address: addr,
        txHash: tx.hash,
        block: receipt.blockNumber,
      });
      console.log(`Natillera created at: ${addr}`);
      await this.trackNatillera(addr);
      return addr;
    }

    return null;
  }

  stop() {
    this.running = false;
    log("AGENT_STOPPED", { wallet: this.wallet.address });
    console.log("\nAgent stopped.");
  }
}

// --- Main ---
async function main() {
  const agent = new NatilleraAgent();

  // Handle graceful shutdown
  process.on("SIGINT", () => {
    agent.stop();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    agent.stop();
    process.exit(0);
  });

  await agent.start();

  // If --create flag is passed, create a sample natillera
  if (process.argv.includes("--create")) {
    const name = process.argv[process.argv.indexOf("--create") + 1] || "Agent Natillera";
    const amount = process.argv.includes("--amount")
      ? process.argv[process.argv.indexOf("--amount") + 1]
      : "1";
    const freq = process.argv.includes("--freq")
      ? parseInt(process.argv[process.argv.indexOf("--freq") + 1])
      : 0; // Weekly
    const members = process.argv.includes("--members")
      ? parseInt(process.argv[process.argv.indexOf("--members") + 1])
      : 3;

    await agent.createNatillera(name, amount, freq, members);
  }

  // If --once flag, run one check cycle and exit
  if (process.argv.includes("--once")) {
    await agent.checkDeadlines();
    agent.stop();
    return;
  }

  console.log("\nAgent running. Press Ctrl+C to stop.\n");
}

main().catch((err) => {
  console.error("Agent error:", err.message || err);
  process.exit(1);
});
