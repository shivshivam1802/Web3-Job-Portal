import { Injectable } from '@nestjs/common';

@Injectable()
export class AiService {
  private apiKey = process.env.GEMINI_API_KEY;

  private async callGemini(prompt: string, systemInstruction?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not defined');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        ...(systemInstruction
          ? {
              systemInstruction: {
                parts: [{ text: systemInstruction }],
              },
            }
          : {}),
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API call failed: ${response.statusText} - ${errText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  async parseResume(resumeText: string): Promise<any> {
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY missing, returning mock parsed resume profiles');
      return {
        title: 'Full Stack Engineer',
        bio: 'Experienced developer specializing in React, Next.js, and Node.js backend systems.',
        skills: ['React', 'Node.js', 'TypeScript', 'Next.js', 'PostgreSQL'],
        experience: [
          { company: 'Tech Corp', role: 'Frontend Lead', duration: '2 years' },
          { company: 'Web Solutions', role: 'Software Developer', duration: '3 years' },
        ],
      };
    }

    const systemInstruction = 'You are a professional HR assistant. Parse the resume text and return structured JSON only.';
    const prompt = `Parse the following resume text into JSON format with the keys: "title" (string), "bio" (string), "skills" (array of strings), and "experience" (array of objects with "company", "role", and "duration" keys).\n\nResume text:\n${resumeText}`;

    const result = await this.callGemini(prompt, systemInstruction);
    return JSON.parse(result);
  }

  async matchProposal(jobDescription: string, proposalCoverLetter: string): Promise<any> {
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY missing, returning mock proposal compatibility score');
      return {
        compatibilityScore: 85,
        strengths: ['Relevant stack mentioned', 'Strong communication tone'],
        weaknesses: ['Does not detail specific Web3 security protocols'],
      };
    }

    const systemInstruction = 'You are an HR technical evaluator. Analyze proposals against job descriptions. Return JSON only.';
    const prompt = `Analyze this proposal against the job description. Return JSON with keys: "compatibilityScore" (number 0 to 100), "strengths" (array of strings), and "weaknesses" (array of strings).\n\nJob Description:\n${jobDescription}\n\nProposal Cover Letter:\n${proposalCoverLetter}`;

    const result = await this.callGemini(prompt, systemInstruction);
    return JSON.parse(result);
  }

  async analyzeRisk(textToScan: string): Promise<any> {
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY missing, returning mock risk assessment');
      return {
        riskScore: 10,
        flags: [],
        verdict: 'SAFE',
      };
    }

    const systemInstruction = 'You are an automated fraud detection scanner. Analyze text for risks like phishing, spam, off-platform payments requests, or malware links. Return JSON only.';
    const prompt = `Assess risk for the following text. Return JSON with keys: "riskScore" (number 0 to 100), "flags" (array of strings explaining concerns), and "verdict" (string: "SAFE", "FLAGGED", or "DANGEROUS").\n\nText:\n${textToScan}`;

    const result = await this.callGemini(prompt, systemInstruction);
    return JSON.parse(result);
  }

  async recommendJobs(freelancerSkills: string[], jobListings: any[]): Promise<any> {
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY missing, returning mock job recommendations');
      return jobListings.map((job) => ({
        jobId: job.id,
        score: Math.floor(Math.random() * 40) + 60,
      })).sort((a, b) => b.score - a.score);
    }

    const systemInstruction = 'You are a recruitment matchmaker. Match freelancer skills with a list of jobs. Return JSON only.';
    const prompt = `Given these freelancer skills: ${JSON.stringify(freelancerSkills)} and these job listings: ${JSON.stringify(jobListings)}, rank each job by matching relevance. Return JSON as an array of objects, where each object has: "jobId" (string) and "score" (number from 0 to 100).`;

    const result = await this.callGemini(prompt, systemInstruction);
    return JSON.parse(result);
  }

  async optimizeProposal(jobDescription: string, freelancerProfile: any): Promise<any> {
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY missing, returning mock proposal recommendations');
      return {
        recommendedBidAmount: 2500,
        optimizedCoverLetterDraft: 'Dear Client,\n\nI am writing to express my strong interest in your project. Based on my experience with React and TypeScript, I can successfully deliver this project on time.',
      };
    }

    const systemInstruction = 'You are a professional proposal consultant. Return JSON only.';
    const prompt = `Analyze this job description and freelancer profile. Return JSON with keys: "recommendedBidAmount" (number) and "optimizedCoverLetterDraft" (string).\n\nJob Description:\n${jobDescription}\n\nFreelancer Profile:\n${JSON.stringify(freelancerProfile)}`;

    const result = await this.callGemini(prompt, systemInstruction);
    return JSON.parse(result);
  }

  async summarizeContract(contractTerms: string): Promise<any> {
    if (!this.apiKey) {
      console.warn('GEMINI_API_KEY missing, returning mock contract summary');
      return {
        summary: 'This contract commits the freelancer to complete milestones within the specified budget. Payment is locked in escrow and released upon client approval.',
        risks: ['Strict approval rules', 'No dispute deadline specified'],
      };
    }

    const systemInstruction = 'You are a legal assistant specializing in freelance agreements. Return JSON only.';
    const prompt = `Summarize these contract terms in plain English. Return JSON with keys: "summary" (string) and "risks" (array of strings).\n\nContract Terms:\n${contractTerms}`;

    const result = await this.callGemini(prompt, systemInstruction);
    return JSON.parse(result);
  }
}
