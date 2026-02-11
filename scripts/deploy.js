const hre = require("hardhat");

async function main() {
  const network = hre.network.name;
  console.log(`Deploying to ${network}...`);

  // cUSD addresses
  const cUSD_ADDRESSES = {
    celo: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    alfajores: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
    hardhat: "", // Will be set below for local testing
  };

  let cUSDAddress = cUSD_ADDRESSES[network];

  // For local testing, deploy a mock ERC20
  if (network === "hardhat" || network === "localhost") {
    console.log("Local network detected, skipping deployment (use tests instead)");
    return;
  }

  if (!cUSDAddress) {
    throw new Error(`No cUSD address configured for network: ${network}`);
  }

  console.log(`Using cUSD at: ${cUSDAddress}`);

  const NatilleraFactory = await hre.ethers.getContractFactory("NatilleraFactory");
  const factory = await NatilleraFactory.deploy(cUSDAddress);
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log(`NatilleraFactory deployed to: ${factoryAddress}`);

  // Verify on explorer
  if (network !== "hardhat" && network !== "localhost") {
    console.log("Waiting for block confirmations...");
    await factory.deploymentTransaction().wait(5);

    try {
      await hre.run("verify:verify", {
        address: factoryAddress,
        constructorArguments: [cUSDAddress],
      });
      console.log("Contract verified on Celoscan!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  }

  console.log("\n--- Deployment Summary ---");
  console.log(`Network: ${network}`);
  console.log(`NatilleraFactory: ${factoryAddress}`);
  console.log(`cUSD: ${cUSDAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
