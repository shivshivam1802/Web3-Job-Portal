import { PrismaClient, Role, KycStatus, JobStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Delete existing data to start clean
  await prisma.message.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.dispute.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.contract.deleteMany({});
  await prisma.proposal.deleteMany({});
  await prisma.job.deleteMany({});
  await prisma.freelancerProfile.deleteMany({});
  await prisma.clientProfile.deleteMany({});
  await prisma.user.deleteMany({});

  // 1. Seed Users
  const clientUser = await prisma.user.create({
    data: {
      email: 'client@example.com',
      username: 'blockchain_corp',
      passwordHash: 'dummy_hash_for_now',
      role: Role.CLIENT,
      kycStatus: KycStatus.APPROVED,
      clientProfile: {
        create: {
          companyName: 'Blockchain Solutions Inc.',
          companyWebsite: 'https://blockchainsolutions.io',
          location: 'New York, USA',
          bio: 'Leading decentralized applications builder.',
          isVerified: true,
          totalSpent: 0,
        },
      },
    },
  });

  const freelancerUser = await prisma.user.create({
    data: {
      email: 'freelancer@example.com',
      username: 'solidity_ninja',
      passwordHash: 'dummy_hash_for_now',
      role: Role.FREELANCER,
      kycStatus: KycStatus.APPROVED,
      walletAddress: '0x90F8bf6A479f320ced073E57c64b9d6d119e0187',
      freelancerProfile: {
        create: {
          title: 'Senior Solidity Developer',
          bio: '5+ years building secure DeFi protocols and automated yield generators.',
          skills: ['Solidity', 'TypeScript', 'Hardhat', 'Ethers.js', 'React'],
          hourlyRate: 75.0,
          githubUrl: 'https://github.com/solidityninja',
          portfolio: [
            { title: 'DeFi Lending Loop', description: 'Leveraged yield protocol', url: 'https://lending.ninja' }
          ],
          experience: [
            { role: 'Solidity Dev', company: 'QuantCorp', years: '2022-2024' }
          ],
          certificates: [
            { name: 'ConsenSys Academy Developer', date: '2021' }
          ],
        },
      },
    },
  });

  console.log('Seeded Client and Freelancer accounts.');

  // 2. Seed Jobs
  const job = await prisma.job.create({
    data: {
      clientId: clientUser.id,
      title: 'Solidity Smart Contract Auditor',
      description: 'We need an expert to audit an ERC-4626 token vault system.',
      category: 'Smart Contract Development',
      tags: ['Solidity', 'Audit', 'ERC-4626'],
      budget: 5000.0,
      status: JobStatus.OPEN,
    },
  });

  console.log('Seeded job:', job.title);

  // 3. Seed Proposals
  await prisma.proposal.create({
    data: {
      jobId: job.id,
      freelancerId: freelancerUser.id,
      bidAmount: 4800.0,
      deliveryDays: 14,
      coverLetter: 'I have audited 12+ yield aggregators. I can start immediately.',
      attachments: [],
    },
  });

  console.log('Seeded Proposal on job.');
  console.log('Seeding complete!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
