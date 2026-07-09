import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  const infoPath = path.join(__dirname, "../deployments/deploy-info.json");
  if (!fs.existsSync(infoPath)) {
    console.error("Deployment info file not found! Please run deploy script first.");
    process.exit(1);
  }

  const deployInfo = JSON.parse(fs.readFileSync(infoPath, "utf8"));
  console.log(`Loaded deployment info for network: ${deployInfo.network}`);

  // 1. Verify Treasury
  console.log("Verifying Treasury...");
  try {
    await run("verify:verify", {
      address: deployInfo.treasury,
      constructorArguments: [deployInfo.deployer, deployInfo.deployer, 200],
    });
  } catch (error) {
    console.log("Treasury verification failed or already verified:", error);
  }

  // 2. Verify Payment
  console.log("Verifying Payment...");
  try {
    await run("verify:verify", {
      address: deployInfo.payment,
      constructorArguments: [deployInfo.deployer],
    });
  } catch (error) {
    console.log("Payment verification failed or already verified:", error);
  }

  // 3. Verify Escrow
  console.log("Verifying Escrow...");
  try {
    await run("verify:verify", {
      address: deployInfo.escrow,
      constructorArguments: [deployInfo.deployer, deployInfo.payment, deployInfo.treasury],
    });
  } catch (error) {
    console.log("Escrow verification failed or already verified:", error);
  }

  // 4. Verify Milestone
  console.log("Verifying Milestone...");
  try {
    await run("verify:verify", {
      address: deployInfo.milestone,
      constructorArguments: [deployInfo.deployer],
    });
  } catch (error) {
    console.log("Milestone verification failed or already verified:", error);
  }

  // 5. Verify Dispute
  console.log("Verifying Dispute...");
  try {
    await run("verify:verify", {
      address: deployInfo.dispute,
      constructorArguments: [deployInfo.deployer],
    });
  } catch (error) {
    console.log("Dispute verification failed or already verified:", error);
  }

  // 6. Verify Review
  console.log("Verifying Review...");
  try {
    await run("verify:verify", {
      address: deployInfo.review,
      constructorArguments: [deployInfo.deployer],
    });
  } catch (error) {
    console.log("Review verification failed or already verified:", error);
  }

  // 7. Verify Referral
  console.log("Verifying Referral...");
  try {
    await run("verify:verify", {
      address: deployInfo.referral,
      constructorArguments: [deployInfo.deployer],
    });
  } catch (error) {
    console.log("Referral verification failed or already verified:", error);
  }

  // 8. Verify Governance
  console.log("Verifying Governance...");
  try {
    await run("verify:verify", {
      address: deployInfo.governance,
      constructorArguments: [deployInfo.deployer, 50400],
    });
  } catch (error) {
    console.log("Governance verification failed or already verified:", error);
  }

  // 9. Verify JobContract implementation (no constructor arguments)
  console.log("Verifying JobContract Implementation...");
  try {
    await run("verify:verify", {
      address: deployInfo.jobContractImplementation,
      constructorArguments: [],
    });
  } catch (error) {
    console.log("JobContract verification failed or already verified:", error);
  }

  // 10. Verify JobFactory
  console.log("Verifying JobFactory...");
  try {
    await run("verify:verify", {
      address: deployInfo.jobFactory,
      constructorArguments: [
        deployInfo.deployer,
        deployInfo.jobContractImplementation,
        deployInfo.escrow,
        deployInfo.milestone,
        deployInfo.dispute,
        deployInfo.review,
      ],
    });
  } catch (error) {
    console.log("JobFactory verification failed or already verified:", error);
  }

  console.log("Verification checks complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
