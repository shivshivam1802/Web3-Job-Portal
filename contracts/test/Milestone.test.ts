import { expect } from "chai";
import { ethers } from "hardhat";
import { Milestone } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Milestone", function () {
  let milestone: Milestone;
  
  let owner: SignerWithAddress;
  let authorizedCaller: SignerWithAddress;
  let otherAccount: SignerWithAddress;

  const JOB_ID_1 = ethers.keccak256(ethers.toUtf8Bytes("job1"));
  
  beforeEach(async function () {
    [owner, authorizedCaller, otherAccount] = await ethers.getSigners();

    // Deploy Milestone
    const MilestoneFactory = await ethers.getContractFactory("Milestone");
    milestone = await MilestoneFactory.deploy(owner.address) as Milestone;

    // Set authorized caller
    await milestone.connect(owner).setAuthorizedCaller(authorizedCaller.address, true);
  });

  describe("Deployment", function () {
    it("Should set the correct owner", async function () {
      expect(await milestone.owner()).to.equal(owner.address);
    });
  });

  describe("Caller Authorization", function () {
    it("Should allow owner to authorize caller", async function () {
      expect(await milestone.authorizedCallers(authorizedCaller.address)).to.be.true;
    });

    it("Should allow owner to revoke authorization", async function () {
      await milestone.connect(owner).setAuthorizedCaller(authorizedCaller.address, false);
      expect(await milestone.authorizedCallers(authorizedCaller.address)).to.be.false;
    });

    it("Should prevent non-owner from configuring authorization", async function () {
      await expect(
        milestone.connect(otherAccount).setAuthorizedCaller(otherAccount.address, true)
      ).to.be.revertedWithCustomError(milestone, "OwnableUnauthorizedAccount");
    });
  });

  describe("Milestone Lifecycle Flow", function () {
    const TITLE = "Design Draft";
    const BUDGET = ethers.parseEther("5");
    const DEADLINE = Math.floor(Date.now() / 1000) + 86400; // 1 day from now

    it("Should allow authorized caller to create a milestone", async function () {
      await expect(milestone.connect(authorizedCaller).createMilestone(JOB_ID_1, TITLE, BUDGET, DEADLINE))
        .to.emit(milestone, "MilestoneCreated")
        .withArgs(JOB_ID_1, 0, TITLE, BUDGET, DEADLINE);

      expect(await milestone.milestoneCounts(JOB_ID_1)).to.equal(1);
      
      const mDetails = await milestone.getMilestone(JOB_ID_1, 0);
      expect(mDetails.title).to.equal(TITLE);
      expect(mDetails.budget).to.equal(BUDGET);
      expect(mDetails.deadline).to.equal(DEADLINE);
      expect(mDetails.state).to.equal(0); // Pending
    });

    it("Should revert if creating milestone with zero budget", async function () {
      await expect(
        milestone.connect(authorizedCaller).createMilestone(JOB_ID_1, TITLE, 0, DEADLINE)
      ).to.be.revertedWith("Milestone: Budget must be greater than zero");
    });

    describe("Funded, Submitted, Approved, and Rejected Stages", function () {
      beforeEach(async function () {
        await milestone.connect(authorizedCaller).createMilestone(JOB_ID_1, TITLE, BUDGET, DEADLINE);
      });

      it("Should fund a pending milestone", async function () {
        await expect(milestone.connect(authorizedCaller).fundMilestone(JOB_ID_1, 0))
          .to.emit(milestone, "MilestoneFunded")
          .withArgs(JOB_ID_1, 0);

        const mDetails = await milestone.getMilestone(JOB_ID_1, 0);
        expect(mDetails.state).to.equal(1); // Funded
      });

      it("Should allow work submission on funded milestone", async function () {
        await milestone.connect(authorizedCaller).fundMilestone(JOB_ID_1, 0);
        
        const ipfsHash = "QmTestHash123456789";
        await expect(milestone.connect(authorizedCaller).submitWork(JOB_ID_1, 0, ipfsHash))
          .to.emit(milestone, "MilestoneSubmitted")
          .withArgs(JOB_ID_1, 0, ipfsHash);

        const mDetails = await milestone.getMilestone(JOB_ID_1, 0);
        expect(mDetails.state).to.equal(2); // Submitted
        expect(mDetails.submissionIpfsHash).to.equal(ipfsHash);
      });

      it("Should allow work rejection (requesting changes)", async function () {
        await milestone.connect(authorizedCaller).fundMilestone(JOB_ID_1, 0);
        await milestone.connect(authorizedCaller).submitWork(JOB_ID_1, 0, "QmTest");

        const feedback = "Please change color scheme to blue";
        await expect(milestone.connect(authorizedCaller).rejectMilestone(JOB_ID_1, 0, feedback))
          .to.emit(milestone, "MilestoneRejected")
          .withArgs(JOB_ID_1, 0, feedback);

        const mDetails = await milestone.getMilestone(JOB_ID_1, 0);
        expect(mDetails.state).to.equal(4); // Rejected
        expect(mDetails.feedback).to.equal(feedback);
      });

      it("Should allow approval of submitted work", async function () {
        await milestone.connect(authorizedCaller).fundMilestone(JOB_ID_1, 0);
        await milestone.connect(authorizedCaller).submitWork(JOB_ID_1, 0, "QmTest");

        await expect(milestone.connect(authorizedCaller).approveMilestone(JOB_ID_1, 0))
          .to.emit(milestone, "MilestoneApproved")
          .withArgs(JOB_ID_1, 0);

        const mDetails = await milestone.getMilestone(JOB_ID_1, 0);
        expect(mDetails.state).to.equal(3); // Approved
        expect(mDetails.releaseTime).to.be.gt(0);
      });
    });
  });
});
