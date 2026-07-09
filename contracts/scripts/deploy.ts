import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance));

  // 1. Deploy Treasury
  console.log("Deploying Treasury...");
  const Treasury = await ethers.getContractFactory("Treasury");
  const platformFeeBps = 200; // 2% platform fee
  const treasury = await Treasury.deploy(deployer.address, deployer.address, platformFeeBps);
  await treasury.waitForDeployment();
  const treasuryAddress = await treasury.getAddress();
  console.log("Treasury deployed to:", treasuryAddress);

  // 2. Deploy Payment
  console.log("Deploying Payment...");
  const Payment = await ethers.getContractFactory("Payment");
  const payment = await Payment.deploy(deployer.address);
  await payment.waitForDeployment();
  const paymentAddress = await payment.getAddress();
  console.log("Payment deployed to:", paymentAddress);

  // 3. Deploy Escrow
  console.log("Deploying Escrow...");
  const Escrow = await ethers.getContractFactory("Escrow");
  const escrow = await Escrow.deploy(deployer.address, paymentAddress, treasuryAddress);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("Escrow deployed to:", escrowAddress);

  // 4. Deploy Milestone
  console.log("Deploying Milestone...");
  const Milestone = await ethers.getContractFactory("Milestone");
  const milestone = await Milestone.deploy(deployer.address);
  await milestone.waitForDeployment();
  const milestoneAddress = await milestone.getAddress();
  console.log("Milestone deployed to:", milestoneAddress);

  // 5. Deploy Dispute
  console.log("Deploying Dispute...");
  const Dispute = await ethers.getContractFactory("Dispute");
  const dispute = await Dispute.deploy(deployer.address);
  await dispute.waitForDeployment();
  const disputeAddress = await dispute.getAddress();
  console.log("Dispute deployed to:", disputeAddress);

  // 6. Deploy Review
  console.log("Deploying Review...");
  const Review = await ethers.getContractFactory("Review");
  const review = await Review.deploy(deployer.address);
  await review.waitForDeployment();
  const reviewAddress = await review.getAddress();
  console.log("Review deployed to:", reviewAddress);

  // 7. Deploy Referral
  console.log("Deploying Referral...");
  const Referral = await ethers.getContractFactory("Referral");
  const referral = await Referral.deploy(deployer.address);
  await referral.waitForDeployment();
  const referralAddress = await referral.getAddress();
  console.log("Referral deployed to:", referralAddress);

  // 8. Deploy Governance
  console.log("Deploying Governance...");
  const Governance = await ethers.getContractFactory("Governance");
  const votingPeriod = 50400; // ~1 week in blocks
  const governance = await Governance.deploy(deployer.address, votingPeriod);
  await governance.waitForDeployment();
  const governanceAddress = await governance.getAddress();
  console.log("Governance deployed to:", governanceAddress);

  // 9. Deploy JobContract Implementation
  console.log("Deploying JobContract Implementation...");
  const JobContract = await ethers.getContractFactory("JobContract");
  const jobContract = await JobContract.deploy();
  await jobContract.waitForDeployment();
  const jobImplementationAddress = await jobContract.getAddress();
  console.log("JobContract Implementation deployed to:", jobImplementationAddress);

  // 10. Deploy JobFactory
  console.log("Deploying JobFactory...");
  const JobFactory = await ethers.getContractFactory("JobFactory");
  const factory = await JobFactory.deploy(
    deployer.address,
    jobImplementationAddress,
    escrowAddress,
    milestoneAddress,
    disputeAddress,
    reviewAddress
  );
  await factory.waitForDeployment();
  const factoryAddress = await factory.getAddress();
  console.log("JobFactory deployed to:", factoryAddress);

  // Configure Authorizations
  console.log("Setting caller authorizations...");
  await escrow.setAuthorizedCaller(factoryAddress, true);
  await milestone.setAuthorizedCaller(factoryAddress, true);
  await dispute.setAuthorizedCaller(factoryAddress, true);
  await review.setAuthorizedCaller(factoryAddress, true);
  await referral.setAuthorizedCaller(factoryAddress, true);

  console.log("Platform setups complete. Writing address configurations...");

  // Save addresses to JSON file
  const addresses = {
    network: (await ethers.provider.getNetwork()).name,
    chainId: (await ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    treasury: treasuryAddress,
    payment: paymentAddress,
    escrow: escrowAddress,
    milestone: milestoneAddress,
    dispute: disputeAddress,
    review: reviewAddress,
    referral: referralAddress,
    governance: governanceAddress,
    jobContractImplementation: jobImplementationAddress,
    jobFactory: factoryAddress
  };

  const outputDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, "deploy-info.json");
  fs.writeFileSync(outputPath, JSON.stringify(addresses, null, 2), "utf8");
  console.log("Deployment details written to:", outputPath);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
