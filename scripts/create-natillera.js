const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);
  
  const balance = await hre.ethers.provider.getBalance(signer.address);
  console.log("CELO balance:", hre.ethers.formatEther(balance));

  const factoryAddress = "0x6567645D4150AbC2c7802DaD76711be8b8669171";
  const factory = await hre.ethers.getContractAt(
    [
      "function createNatillera(string calldata name, uint256 contributionAmount, uint8 frequency, uint256 maxMembers) external returns (address)",
      "function getNatilleraCount() external view returns (uint256)",
      "function getAllNatilleras() external view returns (address[])",
      "event GroupCreated(address indexed natillera, address indexed creator, string name, uint256 contributionAmount, uint8 frequency, uint256 maxMembers)",
    ],
    factoryAddress,
    signer
  );

  // Create a natillera: "Natillera Colombia 🇨🇴", 5 cUSD contribution, monthly (2), 5 members
  const contributionAmount = hre.ethers.parseUnits("5", 18); // 5 cUSD
  console.log("\nCreating natillera...");
  const tx = await factory.createNatillera(
    "Natillera Colombia 🇨🇴",
    contributionAmount,
    2, // monthly
    5  // max 5 members
  );
  console.log("Tx hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("Block:", receipt.blockNumber);
  console.log("Gas used:", receipt.gasUsed.toString());

  // Get the created natillera address from event
  const event = receipt.logs.find(log => {
    try {
      return factory.interface.parseLog({ topics: log.topics, data: log.data })?.name === "GroupCreated";
    } catch { return false; }
  });
  
  if (event) {
    const parsed = factory.interface.parseLog({ topics: event.topics, data: event.data });
    console.log("\n✅ Natillera created at:", parsed.args[0]);
    console.log("Creator:", parsed.args[1]);
    console.log("Name:", parsed.args[2]);
    console.log("Contribution:", hre.ethers.formatUnits(parsed.args[3], 18), "cUSD");
  }

  const count = await factory.getNatilleraCount();
  console.log("\nTotal natilleras:", count.toString());
  
  const all = await factory.getAllNatilleras();
  console.log("Addresses:", all);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
