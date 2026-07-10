import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('parseResume', () => {
    it('should parse resume text into structured fields', async () => {
      const result = await service.parseResume('Resume of Jane Doe...');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('bio');
      expect(result).toHaveProperty('skills');
      expect(result.skills).toBeInstanceOf(Array);
    });
  });

  describe('matchProposal', () => {
    it('should calculate proposal compatibility scoring details', async () => {
      const result = await service.matchProposal('Job details...', 'My proposal letter...');
      expect(result).toHaveProperty('compatibilityScore');
      expect(result).toHaveProperty('strengths');
      expect(result).toHaveProperty('weaknesses');
      expect(result.compatibilityScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('analyzeRisk', () => {
    it('should check risk scores and verdicts', async () => {
      const result = await service.analyzeRisk('Hello, click here to transfer money.');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('verdict');
    });
  });

  describe('recommendJobs', () => {
    it('should score and rank listing items', async () => {
      const jobs = [{ id: 'job-1' }, { id: 'job-2' }];
      const result = await service.recommendJobs(['React'], jobs);
      expect(result).toBeInstanceOf(Array);
      expect(result[0]).toHaveProperty('jobId');
      expect(result[0]).toHaveProperty('score');
    });
  });

  describe('optimizeProposal', () => {
    it('should suggest bid recommendations and cover letter drafts', async () => {
      const result = await service.optimizeProposal('Need developer', { title: 'Engineer' });
      expect(result).toHaveProperty('recommendedBidAmount');
      expect(result).toHaveProperty('optimizedCoverLetterDraft');
    });
  });

  describe('summarizeContract', () => {
    it('should generate Plain English summary details', async () => {
      const result = await service.summarizeContract('Lock 100 USDT, release upon verification...');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('risks');
    });
  });
});
