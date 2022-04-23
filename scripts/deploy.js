async function main() {
  
  /*
    ===========================================================
    ================= Deploy all contracts ====================
    ===========================================================
    */

    const TokenA = await hre.ethers.getContractFactory("TokenA");
    tokenA = await TokenA.deploy();
    await tokenA.deployed();
    console.log("TokenA deployed to:", tokenA.address);

    const TokenB = await hre.ethers.getContractFactory("TokenB");
    tokenB = await TokenB.deploy();
    await tokenB.deployed();
    console.log("TokenB deployed to:", tokenB.address);

    const GovernanceA = await hre.ethers.getContractFactory("GovernanceA");
    governanceA = await GovernanceA.deploy(tokenA.address);
    await governanceA.deployed();
    console.log("GovernanceA deployed to:", governanceA.address);

    const GovernanceB = await hre.ethers.getContractFactory("GovernanceB");
    governanceB = await GovernanceB.deploy(tokenB.address);
    await governanceB.deployed();
    console.log("GovernanceB deployed to:", governanceB.address);

    const Swapper = await hre.ethers.getContractFactory("Swapper");
    swapper = await Swapper.deploy();
    await swapper.deployed();
    console.log("Swapper deployed to: ", swapper.address);

    /*
    ====================================================================
    ================ Mint & delegate tokens to holders =================
    ====================================================================
    */

    [deployer, holderA, holderB] = await ethers.getSigners();

    await tokenA.mint(holderA.address, 100)
    await tokenA.connect(holderA).delegate(holderA.address);

    await tokenB.mint(holderB.address, 100)
    await tokenB.connect(holderB).delegate(holderB.address);

    /*
    ================= Mint tokens to Governance contracts ===============
    */

    await tokenA.mint(governanceA.address, 1000);
    await tokenB.mint(governanceB.address, 1000);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
