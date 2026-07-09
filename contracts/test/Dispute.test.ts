import { expect } from "chai";
import { ethers } from "hardhat";
import { Dispute } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Dispute", function () {
  let dispute: Dispute;
  
  let owner: SignerWithAddress;
  let client: SignerWithAddress;
  let freelancer: SignerWithAddress;
  let mediator1: SignerWithAddress;
  let mediator2: SignerWithAddress;
  let mediator3: SignerWithAddress;
  let otherAccount: SignerWithAddress;

  const JOB_ID_1 = ethers.keccak256(ethers.toUtf8Bytes("job1"));
  const BUDGET = ethers.parseEther("10"); // 10 ETH

  beforeEach(async function () {
    [owner, client, freelancer, mediator1, mediator2, mediator3, otherAccount] = await ethers.getSigners();

    // Deploy Dispute
    const DisputeFactory = await ethers.getContractFactory("Dispute");
    dispute = await DisputeFactory.deploy(owner.address) as Dispute;

    // Set authorized caller (owner behaves like the authorized JobContract caller for testing)
    await dispute.connect(owner).setAuthorizedCaller(owner.address, true);

    // Whitelist mediators
    await dispute.connect(owner).updateMediatorStatus(mediator1.address, true);
    await dispute.connect(owner).updateMediatorStatus(mediator2.address, true);
    await dispute.connect(owner).updateMediatorStatus(mediator3.address, true);
  });

  describe("Deployment & Configuration", function () {
    it("Should set correct owner", async function () {
      expect(await dispute.owner()).to.equal(owner.address);
    });

    it("Should whitelist mediators correctly", async function () {
      expect(await dispute.isMediator(mediator1.address)).to.be.true;
      expect(await dispute.isMediator(otherAccount.address)).to.be.false;
    });
  });

  describe("Raise Dispute", function () {
    it("Should allow authorized caller to raise a dispute", async function () {
      await expect(dispute.connect(owner).raiseDispute(JOB_ID_1, client.address, freelancer.address, BUDGET))
        .to.emit(dispute, "DisputeRaised")
        .withArgs(JOB_ID_1, client.address, freelancer.address, BUDGET);

      const dInfo = await dispute.disputes(JOB_ID_1);
      expect(dInfo.client).to.equal(client.address);
      expect(dInfo.freelancer).to.equal(freelancer.address);
      expect(dInfo.remainingBudget).to.equal(BUDGET);
      expect(dInfo.state).to.equal(0); // Initiated
    });

    it("Should revert if non-authorized caller raises dispute", async function () {
      await expect(
        dispute.connect(client).raiseDispute(JOB_ID_1, client.address, freelancer.address, BUDGET)
      ).to.be.revertedWith("Dispute: Unauthorized caller");
    });
  });

  describe("Evidence Submission", function () {
    beforeEach(async function () {
      await dispute.connect(owner).raiseDispute(JOB_ID_1, client.address, freelancer.address, BUDGET);
    });

    it("Should allow client and freelancer to submit evidence", async function () {
      const ipfsClient = "QmClientEvidenceHash";
      const ipfsFreelancer = "QmFreelancerEvidenceHash";

      await expect(dispute.connect(owner).submitEvidence(JOB_ID_1, client.address, ipfsClient))
        .to.emit(dispute, "EvidenceSubmitted")
        .withArgs(JOB_ID_1, client.address, ipfsClient);

      await expect(dispute.connect(owner).submitEvidence(JOB_ID_1, freelancer.address, ipfsFreelancer))
        .to.emit(dispute, "EvidenceSubmitted")
        .withArgs(JOB_ID_1, freelancer.address, ipfsFreelancer);

      expect(await dispute.getEvidenceCount(JOB_ID_1)).to.equal(2);
    });

    it("Should revert evidence submission from unassociated accounts", async function () {
      await expect(
        dispute.connect(owner).submitEvidence(JOB_ID_1, otherAccount.address, "QmTest")
      ).to.be.revertedWith("Dispute: Unassociated submitter");
    });
  });

  describe("Dispute Resolutions", function () {
    beforeEach(async function () {
      await dispute.connect(owner).raiseDispute(JOB_ID_1, client.address, freelancer.address, BUDGET);
    });

    describe("Direct Resolution", function () {
      it("Should allow owner to resolve dispute directly with correct budget split", async function () {
        const freelancerShare = ethers.parseEther("6");
        const clientShare = ethers.parseEther("4");

        await expect(dispute.connect(owner).resolveDisputeDirectly(JOB_ID_1, freelancerShare, clientShare))
          .to.emit(dispute, "DisputeResolved")
          .withArgs(JOB_ID_1, freelancerShare, clientShare, owner.address);

        const dInfo = await dispute.disputes(JOB_ID_1);
        expect(dInfo.state).to.equal(2); // Resolved
        expect(dInfo.freelancerProposedRelease).to.equal(freelancerShare);
        expect(dInfo.clientProposedRefund).to.equal(clientShare);
      });

      it("Should allow mediator to resolve dispute directly", async function () {
        const freelancerShare = ethers.parseEther("7");
        const clientShare = ethers.parseEther("3");

        await expect(dispute.connect(mediator1).resolveDisputeDirectly(JOB_ID_1, freelancerShare, clientShare))
          .to.emit(dispute, "DisputeResolved")
          .withArgs(JOB_ID_1, freelancerShare, clientShare, mediator1.address);
      });

      it("Should revert if budget split doesn't match remaining budget", async function () {
        await expect(
          dispute.connect(owner).resolveDisputeDirectly(JOB_ID_1, ethers.parseEther("5"), ethers.parseEther("3"))
        ).to.be.revertedWith("Dispute: Sum of shares must match remaining budget");
      });
    });

    describe("Mediator Voting Consensus Resolution", function () {
      it("Should aggregate multiple mediator votes and auto-resolve after 3 votes", async function () {
        const fShare1 = ethers.parseEther("6");
        const cShare1 = ethers.parseEther("4");

        const fShare2 = ethers.parseEther("8");
        const cShare2 = ethers.parseEther("2");

        const fShare3 = ethers.parseEther("7");
        const cShare3 = ethers.parseEther("3");

        // First vote (Initiated -> Voting)
        await expect(dispute.connect(mediator1).submitMediatorVote(JOB_ID_1, fShare1, cShare1))
          .to.emit(dispute, "VoteSubmitted")
          .withArgs(JOB_ID_1, mediator1.address, fShare1, cShare1);

        let dInfo = await dispute.disputes(JOB_ID_1);
        expect(dInfo.state).to.equal(1); // Voting
        expect(dInfo.freelancerProposedRelease).to.equal(fShare1);

        // Second vote
        await expect(dispute.connect(mediator2).submitMediatorVote(JOB_ID_1, fShare2, cShare2))
          .to.emit(dispute, "VoteSubmitted");

        dInfo = await dispute.disputes(JOB_ID_1);
        expect(dInfo.freelancerProposedRelease).to.equal(ethers.parseEther("7"));

        // Third vote (Trigger Auto-Resolution)
        await expect(dispute.connect(mediator3).submitMediatorVote(JOB_ID_1, fShare3, cShare3))
          .to.emit(dispute, "DisputeResolved")
          .withArgs(JOB_ID_1, ethers.parseEther("7"), ethers.parseEther("3"), await dispute.getAddress());

        dInfo = await dispute.disputes(JOB_ID_1);
        expect(dInfo.state).to.equal(2); // Resolved
        expect(dInfo.freelancerProposedRelease).to.equal(ethers.parseEther("7"));
        expect(dInfo.clientProposedRefund).to.equal(ethers.parseEther("3"));
      });

      it("Should prevent double voting by the same mediator", async function () {
        await dispute.connect(mediator1).submitMediatorVote(JOB_ID_1, ethers.parseEther("5"), ethers.parseEther("5"));
        await expect(
          dispute.connect(mediator1).submitMediatorVote(JOB_ID_1, ethers.parseEther("5"), ethers.parseEther("5"))
        ).to.be.revertedWith("Dispute: Already voted");
      });
    });
  });
});
