import { expect } from "chai";
import { ethers } from "hardhat";
import { Escrow, Payment, Treasury, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Escrow & Payment", function () {
  let escrow: Escrow;
  let payment: Payment;
  let treasury: Treasury;
  let mockToken: MockERC20;
  
  let owner: SignerWithAddress;
  let client: SignerWithAddress;
  let freelancer: SignerWithAddress;
  let feeRecipient: SignerWithAddress;
  let otherAccount: SignerWithAddress;

  const ESCROW_ID_1 = ethers.keccak256(ethers.toUtf8Bytes("escrow1"));
  const ESCROW_ID_2 = ethers.keccak256(ethers.toUtf8Bytes("escrow2"));
  
  const PLATFORM_FEE_BPS = 200; // 2%
  const JOB_BUDGET = ethers.parseEther("10"); // 10 ETH or 10 Tokens

  beforeEach(async function () {
    [owner, client, freelancer, feeRecipient, otherAccount] = await ethers.getSigners();

    // Deploy Treasury
    const TreasuryFactory = await ethers.getContractFactory("Treasury");
    treasury = await TreasuryFactory.deploy(owner.address, feeRecipient.address, PLATFORM_FEE_BPS) as Treasury;

    // Deploy Payment
    const PaymentFactory = await ethers.getContractFactory("Payment");
    payment = await PaymentFactory.deploy(owner.address) as Payment;

    // Deploy Escrow
    const EscrowFactory = await ethers.getContractFactory("Escrow");
    escrow = await EscrowFactory.deploy(owner.address, await payment.getAddress(), await treasury.getAddress()) as Escrow;

    // Deploy Mock ERC20
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20Factory.deploy("Mock Token", "MTK", ethers.parseEther("1000")) as MockERC20;

    // Authorize escrow caller (let owner act as the authorized caller for tests, like the JobContract would)
    await escrow.connect(owner).setAuthorizedCaller(owner.address, true);
  });

  describe("Payment Setup", function () {
    it("Should whitelist native currency (address(0)) by default", async function () {
      expect(await payment.isTokenWhitelisted(ethers.ZeroAddress)).to.be.true;
    });

    it("Should allow owner to whitelist ERC20 token", async function () {
      await expect(payment.connect(owner).whitelistToken(await mockToken.getAddress(), ethers.ZeroAddress))
        .to.emit(payment, "TokenWhitelisted")
        .withArgs(await mockToken.getAddress(), ethers.ZeroAddress);

      expect(await payment.isTokenWhitelisted(await mockToken.getAddress())).to.be.true;
    });

    it("Should allow owner to remove whitelisted token", async function () {
      await payment.connect(owner).whitelistToken(await mockToken.getAddress(), ethers.ZeroAddress);
      await expect(payment.connect(owner).removeToken(await mockToken.getAddress()))
        .to.emit(payment, "TokenRemoved")
        .withArgs(await mockToken.getAddress());

      expect(await payment.isTokenWhitelisted(await mockToken.getAddress())).to.be.false;
    });
  });

  describe("Escrow Creation", function () {
    it("Should allow authorized caller to create an escrow", async function () {
      await expect(escrow.connect(owner).createEscrow(ESCROW_ID_1, client.address, freelancer.address, ethers.ZeroAddress, JOB_BUDGET))
        .to.emit(escrow, "EscrowCreated")
        .withArgs(ESCROW_ID_1, client.address, freelancer.address, ethers.ZeroAddress, JOB_BUDGET);

      const escDetails = await escrow.escrows(ESCROW_ID_1);
      expect(escDetails.client).to.equal(client.address);
      expect(escDetails.freelancer).to.equal(freelancer.address);
      expect(escDetails.token).to.equal(ethers.ZeroAddress);
      expect(escDetails.totalAmount).to.equal(JOB_BUDGET);
      expect(escDetails.state).to.equal(0); // Created
    });

    it("Should revert if non-authorized caller tries to create an escrow", async function () {
      await expect(
        escrow.connect(client).createEscrow(ESCROW_ID_1, client.address, freelancer.address, ethers.ZeroAddress, JOB_BUDGET)
      ).to.be.revertedWith("Escrow: Unauthorized caller");
    });

    it("Should revert if token is not whitelisted", async function () {
      await expect(
        escrow.connect(owner).createEscrow(ESCROW_ID_1, client.address, freelancer.address, await mockToken.getAddress(), JOB_BUDGET)
      ).to.be.revertedWith("Escrow: Token not whitelisted");
    });
  });

  describe("Escrow Funding & Lifecycles (Native Currency)", function () {
    beforeEach(async function () {
      await escrow.connect(owner).createEscrow(ESCROW_ID_1, client.address, freelancer.address, ethers.ZeroAddress, JOB_BUDGET);
    });

    it("Should allow client to fund native currency escrow", async function () {
      await expect(escrow.connect(client).fundEscrow(ESCROW_ID_1, { value: JOB_BUDGET }))
        .to.emit(escrow, "EscrowFunded")
        .withArgs(ESCROW_ID_1, JOB_BUDGET);

      const escDetails = await escrow.escrows(ESCROW_ID_1);
      expect(escDetails.state).to.equal(1); // Funded
    });

    it("Should revert if funding with incorrect value", async function () {
      await expect(
        escrow.connect(client).fundEscrow(ESCROW_ID_1, { value: ethers.parseEther("5") })
      ).to.be.revertedWith("Escrow: Incorrect value sent");
    });

    describe("Funded Actions", function () {
      beforeEach(async function () {
        await escrow.connect(client).fundEscrow(ESCROW_ID_1, { value: JOB_BUDGET });
      });

      it("Should allow authorized caller to release funds (with fee deduction)", async function () {
        const releaseAmt = ethers.parseEther("5");
        const expectedFee = (releaseAmt * BigInt(PLATFORM_FEE_BPS)) / 10000n;
        const expectedFreelancerShare = releaseAmt - expectedFee;

        const initialFreelancerBal = await ethers.provider.getBalance(freelancer.address);
        const initialTreasuryBal = await ethers.provider.getBalance(await treasury.getAddress());

        await expect(escrow.connect(owner).releaseFunds(ESCROW_ID_1, releaseAmt))
          .to.emit(escrow, "EscrowReleased")
          .withArgs(ESCROW_ID_1, releaseAmt, expectedFee);

        const finalFreelancerBal = await ethers.provider.getBalance(freelancer.address);
        const finalTreasuryBal = await ethers.provider.getBalance(await treasury.getAddress());

        expect(finalFreelancerBal).to.equal(initialFreelancerBal + expectedFreelancerShare);
        expect(finalTreasuryBal).to.equal(initialTreasuryBal + expectedFee);

        const escDetails = await escrow.escrows(ESCROW_ID_1);
        expect(escDetails.releasedAmount).to.equal(releaseAmt);
        expect(escDetails.state).to.equal(1); // Still Funded (not fully released yet)
      });

      it("Should release full funds and transition state to Released", async function () {
        await escrow.connect(owner).releaseFunds(ESCROW_ID_1, JOB_BUDGET);
        const escDetails = await escrow.escrows(ESCROW_ID_1);
        expect(escDetails.state).to.equal(3); // Released
      });

      it("Should allow refunding remaining funds back to client", async function () {
        const initialClientBal = await ethers.provider.getBalance(client.address);
        await expect(escrow.connect(owner).refundFunds(ESCROW_ID_1))
          .to.emit(escrow, "EscrowRefunded")
          .withArgs(ESCROW_ID_1, JOB_BUDGET);

        const finalClientBal = await ethers.provider.getBalance(client.address);
        expect(finalClientBal).to.equal(initialClientBal + JOB_BUDGET);

        const escDetails = await escrow.escrows(ESCROW_ID_1);
        expect(escDetails.state).to.equal(4); // Refunded
      });

      it("Should allow entering and resolving disputes", async function () {
        await expect(escrow.connect(owner).disputeEscrow(ESCROW_ID_1))
          .to.emit(escrow, "EscrowDisputed")
          .withArgs(ESCROW_ID_1);

        const escDetails = await escrow.escrows(ESCROW_ID_1);
        expect(escDetails.state).to.equal(2); // Disputed

        // Resolve dispute 60/40
        const freelancerAmt = ethers.parseEther("6");
        const clientAmt = ethers.parseEther("4");

        const expectedFee = (freelancerAmt * BigInt(PLATFORM_FEE_BPS)) / 10000n;
        const expectedFreelancerShare = freelancerAmt - expectedFee;

        const initialFreelancerBal = await ethers.provider.getBalance(freelancer.address);
        const initialClientBal = await ethers.provider.getBalance(client.address);

        await expect(escrow.connect(owner).resolveDispute(ESCROW_ID_1, freelancerAmt, clientAmt))
          .to.emit(escrow, "EscrowDisputeResolved")
          .withArgs(ESCROW_ID_1, 3); // 3 = Released state in resolution

        const finalFreelancerBal = await ethers.provider.getBalance(freelancer.address);
        const finalClientBal = await ethers.provider.getBalance(client.address);

        expect(finalFreelancerBal).to.equal(initialFreelancerBal + expectedFreelancerShare);
        expect(finalClientBal).to.equal(initialClientBal + clientAmt);
      });
    });
  });

  describe("Escrow Funding & Lifecycles (ERC20 Tokens)", function () {
    beforeEach(async function () {
      await payment.connect(owner).whitelistToken(await mockToken.getAddress(), ethers.ZeroAddress);
      await escrow.connect(owner).createEscrow(ESCROW_ID_2, client.address, freelancer.address, await mockToken.getAddress(), JOB_BUDGET);
      // Mint and approve tokens
      await mockToken.connect(owner).mint(client.address, JOB_BUDGET);
      await mockToken.connect(client).approve(await escrow.getAddress(), JOB_BUDGET);
    });

    it("Should allow client to fund ERC20 escrow", async function () {
      await expect(escrow.connect(client).fundEscrow(ESCROW_ID_2))
        .to.emit(escrow, "EscrowFunded")
        .withArgs(ESCROW_ID_2, JOB_BUDGET);

      expect(await mockToken.balanceOf(await escrow.getAddress())).to.equal(JOB_BUDGET);
    });

    describe("Funded Actions (ERC20)", function () {
      beforeEach(async function () {
        await escrow.connect(client).fundEscrow(ESCROW_ID_2);
      });

      it("Should allow authorized caller to release ERC20 funds", async function () {
        const releaseAmt = ethers.parseEther("5");
        const expectedFee = (releaseAmt * BigInt(PLATFORM_FEE_BPS)) / 10000n;
        const expectedFreelancerShare = releaseAmt - expectedFee;

        await expect(escrow.connect(owner).releaseFunds(ESCROW_ID_2, releaseAmt))
          .to.emit(escrow, "EscrowReleased")
          .withArgs(ESCROW_ID_2, releaseAmt, expectedFee);

        expect(await mockToken.balanceOf(freelancer.address)).to.equal(expectedFreelancerShare);
        expect(await mockToken.balanceOf(await treasury.getAddress())).to.equal(expectedFee);
      });

      it("Should allow refunding remaining ERC20 funds back to client", async function () {
        await expect(escrow.connect(owner).refundFunds(ESCROW_ID_2))
          .to.emit(escrow, "EscrowRefunded")
          .withArgs(ESCROW_ID_2, JOB_BUDGET);

        expect(await mockToken.balanceOf(client.address)).to.equal(JOB_BUDGET);
      });
    });
  });
});
