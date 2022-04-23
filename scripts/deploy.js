async function main() {
  
  /*
  ===============================================================
  =============== Deploy Token Contracts ========================
  ===============================================================
  */

  const TokenA = await hre.ethers.getContractFactory("TokenA");
  const tokenA = await TokenA.deploy();
  await tokenA.deployed();
  console.log("TokenA deployed to:", tokenA.address);

  const TokenB = await hre.ethers.getContractFactory("TokenB");
  const tokenB = await TokenB.deploy();
  await tokenB.deployed();
  console.log("TokenA deployed to:", tokenB.address);

  /*
  ===============================================================
  =============== Deploy Governance Contracts ===================
  ===============================================================
  */
  const GovernanceA = await hre.ethers.getContractFactory("GovernanceA");
  const governanceA = await GovernanceA.deploy(tokenA.address);
  await governanceA.deployed();
  console.log("GovernanceA deployed to:", governanceA.address);

  // Deploy Governance B
  const GovernanceB = await hre.ethers.getContractFactory("GovernanceB");
  const governanceB = await GovernanceB.deploy(tokenB.address);
  await governanceB.deployed();
  console.log("GovernanceB deployed to:", governanceA.address);

  
  /*
  ===============================================================
  =============== Deploy Swapper Contract =======================
  ===============================================================
  */

  const Swapper = await hre.ethers.getContractFactory("Swapper");
  const swapper = await Swapper.deploy();
  await swapper.deployed();
  console.log("Swapper deployed to: ", swapper.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
