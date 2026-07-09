import * as fs from "fs";
import * as path from "path";

async function main() {
  const artifactsDir = path.join(__dirname, "../artifacts/contracts");
  const outputDir = path.join(__dirname, "../deployments/abis");

  if (!fs.existsSync(artifactsDir)) {
    console.error("Artifacts folder not found! Make sure you compiled the contracts first.");
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const contracts = [
    "Treasury",
    "Payment",
    "Escrow",
    "Milestone",
    "Dispute",
    "Review",
    "Referral",
    "Governance",
    "JobContract",
    "JobFactory"
  ];

  console.log("Exporting contract ABIs...");

  for (const name of contracts) {
    const searchPath = findArtifactFile(artifactsDir, `${name}.json`);
    if (searchPath) {
      const artifact = JSON.parse(fs.readFileSync(searchPath, "utf8"));
      const abiPath = path.join(outputDir, `${name}.json`);
      fs.writeFileSync(abiPath, JSON.stringify(artifact.abi, null, 2), "utf8");
      console.log(`Exported ${name} ABI to ${abiPath}`);
    } else {
      console.warn(`Artifact for ${name} not found!`);
    }
  }

  console.log("ABI exports complete!");
}

function findArtifactFile(dir: string, fileName: string): string | null {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      const res = findArtifactFile(fullPath, fileName);
      if (res) return res;
    } else if (file === fileName) {
      return fullPath;
    }
  }
  return null;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
