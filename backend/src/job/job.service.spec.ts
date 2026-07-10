import { Test, TestingModule } from '@nestjs/testing';
import { JobService } from './job.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('JobService', () => {
  let service: JobService;
  let prisma: PrismaService;

  const mockPrisma = {
    job: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JobService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<JobService>(JobService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a job if user role is CLIENT', async () => {
      const jobData = {
        title: 'React Developer Needed',
        description: 'Need help building dashboard widgets',
        category: 'Development',
        tags: ['React', 'TypeScript'],
        budget: 1500,
      };

      const mockResult = {
        id: 'job-123',
        clientId: 'client-id',
        ...jobData,
      };

      mockPrisma.job.create.mockResolvedValue(mockResult);

      const result = await service.create('client-id', Role.CLIENT, jobData);
      expect(result).toBeDefined();
      expect(result.id).toBe('job-123');
      expect(mockPrisma.job.create).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user role is FREELANCER', async () => {
      const jobData = {
        title: 'Solidity Dev Needed',
        description: 'Audit smart contracts',
        category: 'Web3',
        tags: ['Solidity'],
        budget: 5000,
      };

      await expect(service.create('freelancer-id', Role.FREELANCER, jobData))
        .rejects.toThrow(ForbiddenException);
    });
  });

  describe('findOne', () => {
    it('should return job if it exists', async () => {
      const mockJob = {
        id: 'job-id',
        title: 'Title',
        proposals: [],
      };

      mockPrisma.job.findUnique.mockResolvedValue(mockJob);

      const result = await service.findOne('job-id');
      expect(result).toBeDefined();
      expect(result.id).toBe('job-id');
    });

    it('should throw NotFoundException if job not found', async () => {
      mockPrisma.job.findUnique.mockResolvedValue(null);

      await expect(service.findOne('none'))
        .rejects.toThrow(NotFoundException);
    });
  });
});
