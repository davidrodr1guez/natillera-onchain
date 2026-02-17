const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);

  const factoryAddress = "0x6567645D4150AbC2c7802DaD76711be8b8669171";
  const natilleraAddress = "0xE9D8670897b7AEdFD7a7ACB783c229d63Ce76F2E";
  const cUSDAddress = "0x765DE816845861e75A25fCA122bb6898B8B1282a";

  // Get cUSD contract
  const cUSD = await hre.ethers.getContractAt(
    ["function approve(address,uint256) returns (bool)", 
     "function balanceOf(address) view returns (uint256)",
     "function allowance(address,address) view returns (uint256)"],
    cUSDAddress, signer
  );

  const natillera = await hre.ethers.getContractAt(
    ["function join() external",
     "function contributionAmount() view returns (uint256)",
     "function getMemberCount() view returns (uint256)",
     "function status() view returns (uint8)",
     "function isMember(address) view returns (bool)"],
    natilleraAddress, signer
  );

  // Check cUSD balance
  const balance = await cUSD.balanceOf(signer.address);
  console.log("cUSD balance:", hre.ethers.formatUnits(balance, 18));

  const contribution = await natillera.contributionAmount();
  console.log("Contribution required:", hre.ethers.formatUnits(contribution, 18), "cUSD");

  const isMember = await natillera.isMember(signer.address);
  console.log("Already member:", isMember);

  if (balance < contribution) {
    console.log("❌ Not enough cUSD to join. Need", hre.ethers.formatUnits(contribution, 18), "cUSD for collateral");
    return;
  }

  if (!isMember) {
    // Approve cUSD for collateral
    console.log("\n1. Approving cUSD...");
    const approveTx = await cUSD.approve(natilleraAddress, contribution);
    console.log("Approve tx:", approveTx.hash);
    await approveTx.wait();
    console.log("✅ Approved");

    // Join the natillera
    console.log("\n2. Joining natillera...");
    const joinTx = await natillera.join();
    console.log("Join tx:", joinTx.hash);
    await joinTx.wait();
    console.log("✅ Joined!");
  }

  const memberCount = await natillera.getMemberCount();
  console.log("\nTotal members:", memberCount.toString());
  
  // Create a second natillera for more txs
  const factory = await hre.ethers.getContractAt(
    ["function createNatillera(string,uint256,uint8,uint256) external returns (address)",
     "function getNatilleraCount() view returns (uint256)"],
    factoryAddress, signer
  );

  console.log("\n3. Creating second natillera...");
  const tx2 = await factory.createNatillera(
    "Ahorro Semanal Medellín 🏔️",
    hre.ethers.parseUnits("2", 18), // 2 cUSD
    0, // weekly
    3  // 3 members
  );
  console.log("Tx:", tx2.hash);
  await tx2.wait();
  console.log("✅ Second natillera created");

  console.log("\n4. Creating third natillera...");
  const tx3 = await factory.createNatillera(
    "Tanda Familiar 👨‍👩‍👧‍👦",
    hre.ethers.parseUnits("10", 18), // 10 cUSD
    1, // biweekly
    4  // 4 members
  );
  console.log("Tx:", tx3.hash);
  await tx3.wait();
  console.log("✅ Third natillera created");

  const count = await factory.getNatilleraCount();
  console.log("\n🎉 Total natilleras on-chain:", count.toString());
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
