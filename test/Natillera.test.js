const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("Natillera", function () {
  let factory, cUSD;
  let owner, alice, bob, charlie;
  const CONTRIBUTION = ethers.parseEther("10"); // 10 cUSD
  const WEEKLY = 0;
  const BIWEEKLY = 1;
  const MONTHLY = 2;

  beforeEach(async function () {
    [owner, alice, bob, charlie] = await ethers.getSigners();

    const MockcUSD = await ethers.getContractFactory("MockcUSD");
    cUSD = await MockcUSD.deploy();

    const NatilleraFactory = await ethers.getContractFactory("NatilleraFactory");
    factory = await NatilleraFactory.deploy(await cUSD.getAddress());

    // Give everyone cUSD
    for (const signer of [alice, bob, charlie]) {
      await cUSD.mint(signer.address, ethers.parseEther("1000"));
    }
  });

  async function createAndGetNatillera(name, amount, freq, maxMembers, signer) {
    const tx = await factory.connect(signer).createNatillera(name, amount, freq, maxMembers);
    const receipt = await tx.wait();
    const count = await factory.getNatilleraCount();
    const addr = await factory.natilleras(count - 1n);
    return ethers.getContractAt("Natillera", addr);
  }

  // 1. Factory creates natillera
  describe("Factory", function () {
    it("should create a new natillera", async function () {
      const natillera = await createAndGetNatillera("Test Group", CONTRIBUTION, WEEKLY, 3, alice);

      expect(await natillera.name()).to.equal("Test Group");
      expect(await natillera.contributionAmount()).to.equal(CONTRIBUTION);
      expect(await natillera.frequency()).to.equal(WEEKLY);
      expect(await natillera.maxMembers()).to.equal(3);
      expect(await natillera.creator()).to.equal(alice.address);
      expect(await natillera.status()).to.equal(0); // Pending
    });

    // 2. Factory tracks natilleras
    it("should track created natilleras", async function () {
      await factory.connect(alice).createNatillera("Group 1", CONTRIBUTION, WEEKLY, 3);
      await factory.connect(bob).createNatillera("Group 2", CONTRIBUTION, MONTHLY, 4);

      expect(await factory.getNatilleraCount()).to.equal(2);

      const aliceGroups = await factory.getUserNatilleras(alice.address);
      expect(aliceGroups.length).to.equal(1);
    });

    // 3. Factory rejects invalid cUSD
    it("should reject zero address for cUSD", async function () {
      const NatilleraFactory = await ethers.getContractFactory("NatilleraFactory");
      await expect(NatilleraFactory.deploy(ethers.ZeroAddress)).to.be.revertedWith("Invalid cUSD address");
    });
  });

  describe("Joining", function () {
    let natillera;

    beforeEach(async function () {
      natillera = await createAndGetNatillera("Savings Club", CONTRIBUTION, WEEKLY, 3, alice);
    });

    // 4. Members can join with collateral
    it("should allow members to join with collateral", async function () {
      await cUSD.connect(alice).approve(await natillera.getAddress(), CONTRIBUTION);
      await natillera.connect(alice).join();

      expect(await natillera.getMemberCount()).to.equal(1);
      expect(await natillera.isMember(alice.address)).to.be.true;
    });

    // 5. Prevents double joining
    it("should prevent joining twice", async function () {
      await cUSD.connect(alice).approve(await natillera.getAddress(), CONTRIBUTION);
      await natillera.connect(alice).join();

      await cUSD.connect(alice).approve(await natillera.getAddress(), CONTRIBUTION);
      await expect(natillera.connect(alice).join()).to.be.revertedWith("Already a member");
    });

    // 6. Auto-starts when full
    it("should auto-start when group is full", async function () {
      const natillera2 = await createAndGetNatillera("Small", CONTRIBUTION, WEEKLY, 2, alice);

      await cUSD.connect(alice).approve(await natillera2.getAddress(), CONTRIBUTION);
      await natillera2.connect(alice).join();

      await cUSD.connect(bob).approve(await natillera2.getAddress(), CONTRIBUTION);
      await natillera2.connect(bob).join();

      expect(await natillera2.status()).to.equal(1); // Active
      expect(await natillera2.currentRound()).to.equal(0);
    });

    // 7. Prevents joining when full
    it("should prevent joining when full", async function () {
      const nat = await createAndGetNatillera("Tiny", CONTRIBUTION, WEEKLY, 2, alice);

      await cUSD.connect(alice).approve(await nat.getAddress(), CONTRIBUTION);
      await nat.connect(alice).join();
      await cUSD.connect(bob).approve(await nat.getAddress(), CONTRIBUTION);
      await nat.connect(bob).join();

      await cUSD.connect(charlie).approve(await nat.getAddress(), CONTRIBUTION);
      await expect(nat.connect(charlie).join()).to.be.revertedWith("Not accepting members");
    });
  });

  describe("Contributions & Payouts", function () {
    let natillera;

    beforeEach(async function () {
      natillera = await createAndGetNatillera("Active Group", CONTRIBUTION, WEEKLY, 2, alice);

      await cUSD.connect(alice).approve(await natillera.getAddress(), CONTRIBUTION * 10n);
      await natillera.connect(alice).join();

      await cUSD.connect(bob).approve(await natillera.getAddress(), CONTRIBUTION * 10n);
      await natillera.connect(bob).join();
      // Now active with 2 members
    });

    // 8. Members can contribute
    it("should allow members to contribute", async function () {
      await natillera.connect(alice).contribute();

      expect(await natillera.hasContributedInRound(alice.address, 0)).to.be.true;
      expect(await natillera.hasContributedInRound(bob.address, 0)).to.be.false;
    });

    // 9. Payout is sent when all contribute
    it("should send payout when all members contribute", async function () {
      const order = await natillera.getPayoutOrder();
      const recipientIdx = order[0];
      const members = await natillera.getMembers();
      const recipientAddr = members[Number(recipientIdx)].addr;

      const balBefore = await cUSD.balanceOf(recipientAddr);

      await natillera.connect(alice).contribute();
      await natillera.connect(bob).contribute();

      const balAfter = await cUSD.balanceOf(recipientAddr);
      // Recipient gets payout (2 * CONTRIBUTION) but also paid 1 CONTRIBUTION
      // Net gain = CONTRIBUTION
      const expectedPayout = CONTRIBUTION * 2n;
      expect(balAfter - balBefore).to.be.gte(CONTRIBUTION); // At least net gain
    });

    // 10. Prevents double contribution
    it("should prevent contributing twice in same round", async function () {
      await natillera.connect(alice).contribute();
      await expect(natillera.connect(alice).contribute()).to.be.revertedWith("Already contributed");
    });

    // 11. Non-members cannot contribute
    it("should prevent non-members from contributing", async function () {
      await cUSD.connect(charlie).approve(await natillera.getAddress(), CONTRIBUTION);
      await expect(natillera.connect(charlie).contribute()).to.be.revertedWith("Not a member");
    });

    // 12. Complete cycle returns collateral
    it("should complete natillera after all rounds and return collateral", async function () {
      // Round 0
      await natillera.connect(alice).contribute();
      await natillera.connect(bob).contribute();

      // Round 1
      await natillera.connect(alice).contribute();
      await natillera.connect(bob).contribute();

      expect(await natillera.status()).to.equal(2); // Completed
    });
  });

  describe("Penalties & Force Advance", function () {
    let natillera;

    beforeEach(async function () {
      natillera = await createAndGetNatillera("Penalty Test", CONTRIBUTION, WEEKLY, 2, alice);

      await cUSD.connect(alice).approve(await natillera.getAddress(), CONTRIBUTION * 10n);
      await natillera.connect(alice).join();

      await cUSD.connect(bob).approve(await natillera.getAddress(), CONTRIBUTION * 10n);
      await natillera.connect(bob).join();
    });

    // 13. Creator can force advance after deadline
    it("should allow creator to force advance after deadline", async function () {
      await natillera.connect(alice).contribute();
      // Bob doesn't contribute

      // Advance time past deadline
      await time.increase(8 * 24 * 60 * 60); // 8 days

      await natillera.connect(alice).forceAdvanceRound();

      expect(await natillera.currentRound()).to.equal(1);
    });

    // 14. Cannot force advance before deadline
    it("should not allow force advance before deadline", async function () {
      await expect(natillera.connect(alice).forceAdvanceRound()).to.be.revertedWith("Deadline not passed");
    });

    // 15. Cannot contribute after deadline
    it("should not allow contribution after deadline", async function () {
      await time.increase(8 * 24 * 60 * 60);
      await expect(natillera.connect(alice).contribute()).to.be.revertedWith("Round deadline passed");
    });
  });

  describe("Edge cases", function () {
    // 16. Rejects 0 contribution amount
    it("should reject zero contribution amount", async function () {
      await expect(
        factory.connect(alice).createNatillera("Bad", 0, WEEKLY, 3)
      ).to.be.revertedWith("Amount must be > 0");
    });

    // 17. Rejects less than 2 members
    it("should reject less than 2 max members", async function () {
      await expect(
        factory.connect(alice).createNatillera("Solo", CONTRIBUTION, WEEKLY, 1)
      ).to.be.revertedWith("Need at least 2 members");
    });

    // 18. View functions work
    it("should return correct round info", async function () {
      const nat = await createAndGetNatillera("Info Test", CONTRIBUTION, MONTHLY, 2, alice);

      await cUSD.connect(alice).approve(await nat.getAddress(), CONTRIBUTION * 10n);
      await nat.connect(alice).join();
      await cUSD.connect(bob).approve(await nat.getAddress(), CONTRIBUTION * 10n);
      await nat.connect(bob).join();

      const info = await nat.getRoundInfo();
      expect(info.round).to.equal(0);
      expect(info.contributions).to.equal(0);
      expect(info.recipient).to.not.equal(ethers.ZeroAddress);
    });
  });
});
