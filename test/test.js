const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("End to End", function () {
  let tokenA, tokenB, governanceA, governanceB, swapper;
  let deployer, holderA, holderB;
  let proposalId;
  const amountA = 100;
  const amountB = 30;
  
  //Governance proposal params
  let calldatas;
  let targets;
  let values;
  let description;

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
  

  before(async function () {
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
    await tokenB.connect(holderB).delegate(holderB.address);

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
        amountA
    ])

    const proposeCalldata = swapper.interface.encodeFunctionData("propose", [
        tokenA.address,
        amountA,
        governanceB.address,
        tokenB.address,
        amountB,
        0
    ])

    calldatas = [approveCalldata, proposeCalldata];
    targets = [tokenA.address, swapper.address];
    values = [0, 0];
    description = "Token swap #1";

    const tx = await governanceA.connect(holderA).propose(
        targets,
        values,
        calldatas,
        description
    );
    const receipt = await tx.wait();
    proposalId = receipt.events[0].args.proposalId;

    expect((await governanceA.proposalVotes(proposalId)).forVotes.toString()).to.equal('0');

  })

  it('Should cast a vote on the proposal', async () => {

      console.log("Proposal state: ", await governanceA.state(proposalId));
      await governanceA.connect(holderA).castVote(proposalId, 1)

      expect((await governanceA.proposalVotes(proposalId)).forVotes.toString()).to.equal('100');
  })

  it('Should execute proposal after voting period', async () => {
    console.log("Proposal state: ", await governanceA.state(proposalId));
    const descriptionHash = ethers.utils.id(description);
  
    for (_ of Array(4)) {
        await hre.ethers.provider.send('evm_mine')
    }

    await governanceA.execute(
        targets,
        values,
        calldatas,
        descriptionHash);

    expect(await governanceA.state(proposalId)).to.eql(ProposalState.Executed);

  })

  it('Should have created a deal and deposited tokens into Swapper', async () => {
      
    expect(await tokenA.balanceOf(swapper.address)).to.equal(amountA);
    let filter = swapper.filters.DealCreated()
    let events = await swapper.queryFilter(filter);
    expect(events.length).to.equal(1);
  })

  it("Should create new proposal on GovernanceB", async () => { 
    
    const approveCalldata = tokenB.interface.encodeFunctionData("approve", [
        swapper.address,
        amountB
    ])

    const acceptCalldata = swapper.interface.encodeFunctionData("approve", [
        0
    ])

    calldatas = [approveCalldata, acceptCalldata];
    targets = [tokenB.address, swapper.address];
    values = [0, 0];
    description = "Token swap #1";

    const tx = await governanceB.connect(holderB).propose(
        targets,
        values,
        calldatas,
        description
    );
    const receipt = await tx.wait();
    proposalId = receipt.events[0].args.proposalId;

    expect((await governanceA.proposalVotes(proposalId)).forVotes.toString()).to.equal('0');

  })

    it('Should cast a vote on the proposal', async () => {
        await governanceB.connect(holderB).castVote(proposalId, 1)

        expect((await governanceB.proposalVotes(proposalId)).forVotes.toString()).to.equal('100');
    })

    it('Should execute proposal after voting period', async () => {
        const descriptionHash = ethers.utils.id(description);
    
        for (_ of Array(4)) {
            await hre.ethers.provider.send('evm_mine')
        }

        await governanceB.execute(
            targets,
            values,
            calldatas,
            descriptionHash);

        expect(await governanceB.state(proposalId)).to.eql(ProposalState.Executed);

    })

    it('Should have deposited tokens into Swapper', async () => {
        expect(await tokenB.balanceOf(swapper.address)).to.equal(amountB);
      })

    it('Should be able to claim after vesting period', async () => {
        await swapper.claim(0);

        expect(await tokenB.balanceOf(governanceA.address)).to.equal(amountB);
        expect(await tokenA.balanceOf(governanceB.address)).to.equal(amountA);
    })



});
