const hre = require("hardhat");

async function main() {
  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);

  const factoryAddress = "0x6567645D4150AbC2c7802DaD76711be8b8669171";
  const factory = await hre.ethers.getContractAt(
    ["function createNatillera(string,uint256,uint8,uint256) external returns (address)",
     "function getNatilleraCount() view returns (uint256)",
     "event GroupCreated(address indexed,address indexed,string,uint256,uint8,uint256)"],
    factoryAddress, signer
  );

  const natilleras = [
    ["Ahorro Semanal Medellín 🏔️", "2", 0, 3],
    ["Tanda Familiar Bogotá 👨‍👩‍👧‍👦", "10", 1, 4],
    ["Natillera Navideña 🎄", "5", 2, 6],
  ];

  for (const [name, amount, freq, members] of natilleras) {
    console.log(`\nCreating: ${name}...`);
    const tx = await factory.createNatillera(
      name,
      hre.ethers.parseUnits(amount, 18),
      freq,
      members
    );
    console.log("Tx:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Created! Gas:", receipt.gasUsed.toString());
  }

  const count = await factory.getNatilleraCount();
  console.log("\n🎉 Total natilleras on-chain:", count.toString());
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
