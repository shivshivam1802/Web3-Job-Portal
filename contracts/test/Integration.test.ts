import { expect } from "chai";
import { ethers } from "hardhat";
import { 
  JobFactory, 
  JobContract, 
  Escrow, 
  Milestone, 
  Dispute, 
  Review, 
  Treasury, 
  Payment, 
  MockERC20 
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Web3 Freelance Marketplace - Full Integration Lifecycle", function () {
  let factory: JobFactory;
  let jobImp: JobContract;
  let escrow: Escrow;
  let milestone: Milestone;
  let dispute: Dispute;
  let review: Review;
  let treasury: Treasury;
  let payment: Payment;
  let mockToken: MockERC20;

  let owner: SignerWithAddress;
  let client: SignerWithAddress;
  let freelancer: SignerWithAddress;
  let feeRecipient: SignerWithAddress;
  let mediator1: SignerWithAddress;
  let mediator2: SignerWithAddress;
  let mediator3: SignerWithAddress;

  const JOB_ID = ethers.keccak256(ethers.toUtf8Bytes("job-integration-1"));
  const PLATFORM_FEE_BPS = 200; // 2%
  const BUDGET = ethers.parseEther("10"); // 10 ETH

  before(async function () {
    [owner, client, freelancer, feeRecipient, mediator1, mediator2, mediator3] = await ethers.getSigners();

    // 1. Deploy Treasury
    const TreasuryFactory = await ethers.getContractFactory("Treasury");
    treasury = await TreasuryFactory.deploy(owner.address, feeRecipient.address, PLATFORM_FEE_BPS) as Treasury;

    // 2. Deploy Payment
    const PaymentFactory = await ethers.getContractFactory("Payment");
    payment = await PaymentFactory.deploy(owner.address) as Payment;

    // 3. Deploy Escrow
    const EscrowFactory = await ethers.getContractFactory("Escrow");
    escrow = await EscrowFactory.deploy(owner.address, await payment.getAddress(), await treasury.getAddress()) as Escrow;

    // 4. Deploy Milestone
    const MilestoneFactory = await ethers.getContractFactory("Milestone");
    milestone = await MilestoneFactory.deploy(owner.address) as Milestone;

    // 5. Deploy Dispute
    const DisputeFactory = await ethers.getContractFactory("Dispute");
    dispute = await DisputeFactory.deploy(owner.address) as Dispute;

    // 6. Deploy Review
    const ReviewFactory = await ethers.getContractFactory("Review");
    review = await ReviewFactory.deploy(owner.address) as Review;

    // 7. Deploy JobContract master implementation
    const JobContractFactory = await ethers.getContractFactory("JobContract");
    jobImp = await JobContractFactory.deploy() as JobContract;

    // 8. Deploy JobFactory
    const JobFactoryFactory = await ethers.getContractFactory("JobFactory");
    factory = await JobFactoryFactory.deploy(
      owner.address,
      await jobImp.getAddress(),
      await escrow.getAddress(),
      await milestone.getAddress(),
      await dispute.getAddress(),
      await review.getAddress()
    ) as JobFactory;

    // Whitelist mediators in Dispute
    await dispute.connect(owner).updateMediatorStatus(mediator1.address, true);
    await dispute.connect(owner).updateMediatorStatus(mediator2.address, true);
    await dispute.connect(owner).updateMediatorStatus(mediator3.address, true);
  });

  it("Should run the complete happy path and dispute path integration", async function () {
    // Step 1: Create a Job clone via the Factory
    const tx = await factory.connect(client).createJob(
      JOB_ID,
      freelancer.address,
      ethers.ZeroAddress, // native currency (ETH)
      BUDGET
    );
    const receipt = await tx.wait();
    
    // Parse JobCreated event to get clone address
    const event = receipt?.logs
      .map((log) => {
        try {
          return factory.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .find((e) => e && e.name === "JobCreated");

    const jobAddress = event?.args.jobAddress;
    expect(jobAddress).to.not.be.undefined;

    const job = await ethers.getContractAt("JobContract", jobAddress) as JobContract;

    // Authorize this JobContract clone in Escrow, Milestone, Dispute, and Review
    await escrow.connect(owner).setAuthorizedCaller(jobAddress, true);
    await milestone.connect(owner).setAuthorizedCaller(jobAddress, true);
    await dispute.connect(owner).setAuthorizedCaller(jobAddress, true);
    await review.connect(owner).setAuthorizedCaller(jobAddress, true);

    // Step 2: Client adds 2 Milestones
    const mBudget0 = ethers.parseEther("4");
    const mBudget1 = ethers.parseEther("6");
    const deadline = Math.floor(Date.now() / 1000) + 86400;

    await job.connect(client).addMilestone("Milestone 0: Design", mBudget0, deadline);
    await job.connect(client).addMilestone("Milestone 1: Development", mBudget1, deadline);

    expect(await milestone.milestoneCounts(JOB_ID)).to.equal(2);

    // Step 3: Client funds Milestone 0
    await job.connect(client).setupEscrowAndFund(0, { value: mBudget0 });
    let mDetails = await milestone.getMilestone(JOB_ID, 0);
    expect(mDetails.state).to.equal(1); // Funded

    // Step 4: Freelancer submits work for Milestone 0
    await job.connect(freelancer).submitWork(0, "QmSubmission0");
    mDetails = await milestone.getMilestone(JOB_ID, 0);
    expect(mDetails.state).to.equal(2); // Submitted

    // Step 5: Client requests changes
    await job.connect(client).requestChanges(0, "Improve UX color themes");
    mDetails = await milestone.getMilestone(JOB_ID, 0);
    expect(mDetails.state).to.equal(4); // Rejected / Changes Requested

    // Step 6: Freelancer resubmits work
    await job.connect(freelancer).submitWork(0, "QmSubmission0_Revised");
    mDetails = await milestone.getMilestone(JOB_ID, 0);
    expect(mDetails.state).to.equal(2); // Submitted

    // Step 7: Client approves work and releases payment for Milestone 0
    const initialFreelancerBal = await ethers.provider.getBalance(freelancer.address);
    const initialTreasuryBal = await ethers.provider.getBalance(await treasury.getAddress());

    await job.connect(client).approveAndRelease(0);

    const expectedFee = (mBudget0 * BigInt(PLATFORM_FEE_BPS)) / 10000n;
    const expectedFreelancerShare = mBudget0 - expectedFee;

    const finalFreelancerBal = await ethers.provider.getBalance(freelancer.address);
    const finalTreasuryBal = await ethers.provider.getBalance(await treasury.getAddress());

    expect(finalFreelancerBal).to.equal(initialFreelancerBal + expectedFreelancerShare);
    expect(finalTreasuryBal).to.equal(initialTreasuryBal + expectedFee);

    mDetails = await milestone.getMilestone(JOB_ID, 0);
    expect(mDetails.state).to.equal(3); // Approved

    // Step 8: Client funds Milestone 1
    await job.connect(client).setupEscrowAndFund(1, { value: mBudget1 });

    // Step 9: Escalating to a Dispute on Milestone 1 (e.g. freelancer becomes unresponsive or client refuses work)
    await job.connect(client).initiateDispute();
    expect(await job.status()).to.equal(3); // InDispute

    // Step 10: Mediators vote on dispute split of remaining funds (6 ETH)
    // Mediator 1 votes: Freelancer: 4 ETH, Client: 2 ETH
    await dispute.connect(mediator1).submitMediatorVote(JOB_ID, ethers.parseEther("4"), ethers.parseEther("2"));
    // Mediator 2 votes: Freelancer: 5 ETH, Client: 1 ETH
    await dispute.connect(mediator2).submitMediatorVote(JOB_ID, ethers.parseEther("5"), ethers.parseEther("1"));
    // Mediator 3 votes: Freelancer: 3 ETH, Client: 3 ETH (Trigger auto-resolution)
    // Running Average Freelancer Proposed Release: (4 + 5 + 3) / 3 = 4 ETH
    // Running Average Client Proposed Refund: (2 + 1 + 3) / 3 = 2 ETH
    await dispute.connect(mediator3).submitMediatorVote(JOB_ID, ethers.parseEther("3"), ethers.parseEther("3"));

    const dInfo = await dispute.disputes(JOB_ID);
    expect(dInfo.state).to.equal(2); // Resolved
    expect(dInfo.freelancerProposedRelease).to.equal(ethers.parseEther("4"));
    expect(dInfo.clientProposedRefund).to.equal(ethers.parseEther("2"));

    // Step 11: Settle the dispute in JobContract
    const freelancerBalBeforeSettle = await ethers.provider.getBalance(freelancer.address);
    const clientBalBeforeSettle = await ethers.provider.getBalance(client.address);
    
    await job.connect(owner).settleDispute();
    expect(await job.status()).to.equal(1); // Completed / Settled

    const finalFreelancerBalDispute = await ethers.provider.getBalance(freelancer.address);
    const finalClientBalDispute = await ethers.provider.getBalance(client.address);

    const disputeFee = (ethers.parseEther("4") * BigInt(PLATFORM_FEE_BPS)) / 10000n;
    const expectedFreelancerDisputeShare = ethers.parseEther("4") - disputeFee;

    expect(finalFreelancerBalDispute).to.equal(freelancerBalBeforeSettle + expectedFreelancerDisputeShare);
    expect(finalClientBalDispute).to.equal(clientBalBeforeSettle + ethers.parseEther("2"));

    // Step 12: Submitting reviews
    await job.connect(client).submitReview(5, 5, 5, 5, "Good overall despite final dispute");
    await job.connect(freelancer).submitReview(4, 4, 4, 4, "Decent client");

    const [freelancerAvg, freelancerCount] = await review.getAverageRating(freelancer.address);
    expect(freelancerAvg).to.equal(500); // 5.0 * 100
    expect(freelancerCount).to.equal(1);

    const [clientAvg, clientCount] = await review.getAverageRating(client.address);
    expect(clientAvg).to.equal(400); // 4.0 * 100
    expect(clientCount).to.equal(1);
  });
});
