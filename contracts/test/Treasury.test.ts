import { expect } from "chai";
import { ethers } from "hardhat";
import { Treasury, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Treasury", function () {
  let treasury: Treasury;
  let mockToken: MockERC20;
  let owner: SignerWithAddress;
  let feeRecipient: SignerWithAddress;
  let otherAccount: SignerWithAddress;

  const INITIAL_FEE_BPS = 200; // 2%

  beforeEach(async function () {
    [owner, feeRecipient, otherAccount] = await ethers.getSigners();

    // Deploy Treasury
    const TreasuryFactory = await ethers.getContractFactory("Treasury");
    treasury = await TreasuryFactory.deploy(
      owner.address,
      feeRecipient.address,
      INITIAL_FEE_BPS
    ) as Treasury;

    // Deploy Mock ERC20
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    mockToken = await MockERC20Factory.deploy("Mock Token", "MTK", ethers.parseEther("1000")) as MockERC20;
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await treasury.owner()).to.equal(owner.address);
    });

    it("Should set the correct fee recipient", async function () {
      expect(await treasury.feeRecipient()).to.equal(feeRecipient.address);
    });

    it("Should set the correct platform fee BPS", async function () {
      expect(await treasury.platformFeeBps()).to.equal(INITIAL_FEE_BPS);
    });

    it("Should revert if initial fee recipient is zero address", async function () {
      const TreasuryFactory = await ethers.getContractFactory("Treasury");
      await expect(
        TreasuryFactory.deploy(owner.address, ethers.ZeroAddress, INITIAL_FEE_BPS)
      ).to.be.revertedWith("Treasury: Fee recipient cannot be zero address");
    });

    it("Should revert if initial platform fee BPS exceeds max limit", async function () {
      const TreasuryFactory = await ethers.getContractFactory("Treasury");
      await expect(
        TreasuryFactory.deploy(owner.address, feeRecipient.address, 1001)
      ).to.be.revertedWith("Treasury: Fee exceeds max limit");
    });
  });

  describe("Fee Management", function () {
    it("Should allow the owner to update the platform fee", async function () {
      await expect(treasury.connect(owner).setPlatformFee(300))
        .to.emit(treasury, "PlatformFeeUpdated")
        .withArgs(200, 300);
      expect(await treasury.platformFeeBps()).to.equal(300);
    });

    it("Should prevent non-owner from updating the platform fee", async function () {
      await expect(
        treasury.connect(otherAccount).setPlatformFee(300)
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });

    it("Should revert if new fee exceeds limit", async function () {
      await expect(
        treasury.connect(owner).setPlatformFee(1001)
      ).to.be.revertedWith("Treasury: Fee exceeds max limit");
    });

    it("Should calculate fee correctly", async function () {
      const amount = ethers.parseEther("100");
      const [fee, remaining] = await treasury.calculateFee(amount);
      
      const expectedFee = (amount * 200n) / 10000n;
      const expectedRemaining = amount - expectedFee;

      expect(fee).to.equal(expectedFee);
      expect(remaining).to.equal(expectedRemaining);
    });
  });

  describe("Recipient Management", function () {
    it("Should allow owner to set a new fee recipient", async function () {
      await expect(treasury.connect(owner).setFeeRecipient(otherAccount.address))
        .to.emit(treasury, "FeeRecipientUpdated")
        .withArgs(feeRecipient.address, otherAccount.address);
      expect(await treasury.feeRecipient()).to.equal(otherAccount.address);
    });

    it("Should revert if setting fee recipient to zero address", async function () {
      await expect(
        treasury.connect(owner).setFeeRecipient(ethers.ZeroAddress)
      ).to.be.revertedWith("Treasury: Fee recipient cannot be zero address");
    });

    it("Should prevent non-owner from changing recipient", async function () {
      await expect(
        treasury.connect(otherAccount).setFeeRecipient(otherAccount.address)
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
  });

  describe("Native Currency Withdrawals", function () {
    beforeEach(async function () {
      // Send some ether to the treasury
      await owner.sendTransaction({
        to: await treasury.getAddress(),
        value: ethers.parseEther("5"),
      });
    });

    it("Should allow the owner to withdraw native currency", async function () {
      const initialBalance = await ethers.provider.getBalance(otherAccount.address);
      const withdrawAmount = ethers.parseEther("2");

      await expect(treasury.connect(owner).withdrawNative(otherAccount.address, withdrawAmount))
        .to.emit(treasury, "NativeWithdrawn")
        .withArgs(otherAccount.address, withdrawAmount);

      const finalBalance = await ethers.provider.getBalance(otherAccount.address);
      expect(finalBalance).to.equal(initialBalance + withdrawAmount);
    });

    it("Should revert if withdrawing more than balance", async function () {
      await expect(
        treasury.connect(owner).withdrawNative(otherAccount.address, ethers.parseEther("6"))
      ).to.be.revertedWith("Treasury: Insufficient native balance");
    });

    it("Should prevent non-owner from withdrawing native currency", async function () {
      await expect(
        treasury.connect(otherAccount).withdrawNative(otherAccount.address, ethers.parseEther("1"))
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
  });

  describe("ERC20 Withdrawals", function () {
    beforeEach(async function () {
      // Mint and send tokens to the treasury
      await mockToken.transfer(await treasury.getAddress(), ethers.parseEther("100"));
    });

    it("Should allow the owner to withdraw ERC20 tokens", async function () {
      const withdrawAmount = ethers.parseEther("50");
      await expect(treasury.connect(owner).withdrawERC20(await mockToken.getAddress(), otherAccount.address, withdrawAmount))
        .to.emit(treasury, "ERC20Withdrawn")
        .withArgs(await mockToken.getAddress(), otherAccount.address, withdrawAmount);

      expect(await mockToken.balanceOf(otherAccount.address)).to.equal(withdrawAmount);
    });

    it("Should prevent non-owner from withdrawing ERC20 tokens", async function () {
      await expect(
        treasury.connect(otherAccount).withdrawERC20(await mockToken.getAddress(), otherAccount.address, ethers.parseEther("10"))
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
  });

  describe("Pause / Unpause Controls", function () {
    it("Should block updates and withdrawals when paused", async function () {
      await treasury.connect(owner).pause();
      expect(await treasury.paused()).to.be.true;

      await expect(treasury.connect(owner).setPlatformFee(300)).to.be.revertedWithCustomError(treasury, "EnforcedPause");
      await expect(treasury.connect(owner).setFeeRecipient(otherAccount.address)).to.be.revertedWithCustomError(treasury, "EnforcedPause");
      await expect(treasury.connect(owner).withdrawNative(otherAccount.address, ethers.parseEther("1"))).to.be.revertedWithCustomError(treasury, "EnforcedPause");
      await expect(treasury.connect(owner).withdrawERC20(await mockToken.getAddress(), otherAccount.address, 10)).to.be.revertedWithCustomError(treasury, "EnforcedPause");
    });

    it("Should allow owner to unpause and resume functionalities", async function () {
      await treasury.connect(owner).pause();
      await treasury.connect(owner).unpause();
      expect(await treasury.paused()).to.be.false;

      await expect(treasury.connect(owner).setPlatformFee(300)).to.not.be.reverted;
    });

    it("Should prevent non-owner from pausing or unpausing", async function () {
      await expect(treasury.connect(otherAccount).pause()).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
      await treasury.connect(owner).pause();
      await expect(treasury.connect(otherAccount).unpause()).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
  });
});
