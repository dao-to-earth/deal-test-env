const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("End to End", function () {
  let tokenA, tokenB, governanceA, governanceB, swapper;
  let deployer, holderA, holderB;
  let proposalId;
  let calldatas;

  const ProposalState = {
    Pending: 0,
    Active: 1,
    Canceled: 2,
    Defeated: 3,
    Succeeded: 4,
    Queued: 5,
    Expired: 6,
    Executed: 7,
  }
  

  beforeEach(async function () {
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
    console.log("TokenA deployed to:", tokenB.address);

    const GovernanceA = await hre.ethers.getContractFactory("GovernanceA");
    governanceA = await GovernanceA.deploy(tokenA.address);
    await governanceA.deployed();
    console.log("GovernanceA deployed to:", governanceA.address);

    const GovernanceB = await hre.ethers.getContractFactory("GovernanceB");
    governanceB = await GovernanceB.deploy(tokenB.address);
    await governanceB.deployed();
    console.log("GovernanceB deployed to:", governanceA.address);

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
    await tokenB.delegate(holderB.address);

    /*
    ================= Mint tokens to Governance contracts ===============
    */

    await tokenA.mint(governanceA.address, 1000);
    await tokenB.mint(governanceB.address, 1000);

    
  })


  it("Should mint tokens to holders & governance contracts", async function () {
    
    // Holders
    expect(await tokenA.balanceOf(holderA.address)).to.equal(100);
    expect(await tokenB.balanceOf(holderB.address)).to.equal(100);

    // Governance
    expect(await tokenA.balanceOf(governanceA.address)).to.equal(1000);
    expect(await tokenB.balanceOf(governanceB.address)).to.equal(1000);

  });

  it("Should create new proposal on GovernanceA", async () => { 
    
    const approveCalldata = tokenA.interface.encodeFunctionData("approve", [
        swapper.address,
        100
    ])

    const proposeCalldata = swapper.interface.encodeFunctionData("propose", [
        tokenA.address,
        100,
        governanceB.address,
        tokenB.address,
        30,
        0
    ])

    calldatas = [approveCalldata, proposeCalldata];
    let targets = [tokenA.address, swapper.address];
    let values = [0, 0];

    const tx = await governanceA.connect(holderA).propose(
        targets,
        values,
        calldatas,
        "Swap some tokens"
    );
    const receipt = await tx.wait();
    proposalId = receipt.events[0].args.proposalId;

    expect((await governanceA.proposalVotes(proposalId)).forVotes.toString()).to.equal('0');

  })

  it('Should cast a vote on the proposal', async () => {
      console.log("Proposal id: ", proposalId);
      //expect(await governanceA.state(proposalId)).to.eql(ProposalState.Active)
    //   console.log("Proposal state: ", await governanceA.state(proposalId));
      await governanceA.connect(holderA).castVote(proposalId, 1)

      expect((await governanceA.proposalVotes(proposalId)).forVotes.toString()).to.equal('1');
  })

});
