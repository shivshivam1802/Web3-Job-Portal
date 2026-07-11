const API_BASE = 'http://localhost:3001';

// Helper to get Auth headers
const getHeaders = (isJson = true) => {
  const headers: Record<string, string> = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

// Generic fetch wrapper
async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  
  const config = {
    ...options,
    headers: {
      ...getHeaders(options.body ? true : false),
      ...options.headers,
    },
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    let errorMsg = 'An error occurred';
    try {
      const errData = await response.json();
      errorMsg = errData.message || errorMsg;
    } catch {
      errorMsg = response.statusText || errorMsg;
    }
    throw new Error(errorMsg);
  }

  // Handle empty or text responses
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  return response.text() as unknown as Promise<T>;
}

export const api = {
  // --- AUTH ---
  getSiweNonce: async () => {
    return request<{ nonce: string }>('/auth/siwe/nonce');
  },
  verifySiwe: async (message: string, signature: string) => {
    return request<{ accessToken: string; user: any }>('/auth/siwe/verify', {
      method: 'POST',
      body: JSON.stringify({ message, signature }),
    });
  },
  signup: async (email: string, username: string, passwordRaw: string, role: string) => {
    return request<{ accessToken: string; user: any }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, username, password: passwordRaw, role }),
    });
  },
  signin: async (email: string, passwordRaw: string) => {
    return request<{ accessToken: string; user: any }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password: passwordRaw }),
    });
  },
  getMe: async () => {
    return request<any>('/auth/me');
  },

  // --- JOBS ---
  getJobs: async () => {
    return request<any[]>('/jobs');
  },
  searchJobs: async (params: {
    query?: string;
    category?: string;
    tag?: string;
    minBudget?: number;
    maxBudget?: number;
    chainId?: number;
    status?: string;
  }) => {
    const q = new URLSearchParams();
    if (params.query) q.append('query', params.query);
    if (params.category) q.append('category', params.category);
    if (params.tag) q.append('tag', params.tag);
    if (params.minBudget !== undefined) q.append('minBudget', params.minBudget.toString());
    if (params.maxBudget !== undefined) q.append('maxBudget', params.maxBudget.toString());
    if (params.chainId !== undefined) q.append('chainId', params.chainId.toString());
    if (params.status) q.append('status', params.status);

    const queryString = q.toString();
    return request<any[]>(`/jobs/search${queryString ? `?${queryString}` : ''}`);
  },
  getJobDetail: async (id: string) => {
    return request<any>(`/jobs/${id}`);
  },
  createJob: async (job: {
    title: string;
    description: string;
    category: string;
    tags: string[];
    budget: number;
    isMilestoneBased?: boolean;
    tokenAddress?: string;
    chainId?: number;
  }) => {
    return request<any>('/jobs', {
      method: 'POST',
      body: JSON.stringify(job),
    });
  },
  cancelJob: async (id: string) => {
    return request<any>(`/jobs/${id}`, {
      method: 'DELETE',
    });
  },

  // --- PROPOSALS ---
  submitProposal: async (proposal: {
    jobId: string;
    bidAmount: number;
    deliveryDays: number;
    coverLetter: string;
    attachments?: string[];
  }) => {
    return request<any>('/proposals', {
      method: 'POST',
      body: JSON.stringify(proposal),
    });
  },
  getJobProposals: async (jobId: string) => {
    return request<any[]>(`/proposals/job/${jobId}`);
  },
  updateProposalStatus: async (id: string, status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN') => {
    return request<any>(`/proposals/${id}/status`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  },

  // --- CONTRACTS ---
  createContract: async (contract: {
    jobId: string;
    freelancerId: string;
    totalBudget: number;
    escrowAddress: string;
    chainId: number;
    tokenAddress?: string;
    milestones?: Array<{ title: string; description: string; budget: number; index: number }>;
  }) => {
    return request<any>('/contracts', {
      method: 'POST',
      body: JSON.stringify(contract),
    });
  },
  getMyContracts: async () => {
    return request<any[]>('/contracts');
  },
  getContractDetail: async (id: string) => {
    return request<any>(`/contracts/${id}`);
  },
  submitMilestoneWork: async (id: string, index: number, ipfsHash: string) => {
    return request<any>(`/contracts/${id}/milestones/${index}/submit`, {
      method: 'POST',
      body: JSON.stringify({ ipfsHash }),
    });
  },
  approveMilestoneWork: async (id: string, index: number) => {
    return request<any>(`/contracts/${id}/milestones/${index}/approve`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
  rejectMilestoneWork: async (id: string, index: number, feedback: string) => {
    return request<any>(`/contracts/${id}/milestones/${index}/reject`, {
      method: 'POST',
      body: JSON.stringify({ feedback }),
    });
  },

  // --- PROFILES ---
  getFreelancerProfile: async () => {
    return request<any>('/freelancers/profile');
  },
  updateFreelancerProfile: async (profile: {
    title: string;
    bio: string;
    skills: string[];
    hourlyRate: number;
    githubUrl?: string;
    portfolio?: any;
    experience?: any;
  }) => {
    return request<any>('/freelancers/profile', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  },
  getClientProfile: async () => {
    return request<any>('/clients/profile');
  },
  updateClientProfile: async (profile: {
    companyName?: string;
    companyWebsite?: string;
    location?: string;
    bio?: string;
  }) => {
    return request<any>('/clients/profile', {
      method: 'POST',
      body: JSON.stringify(profile),
    });
  },

  // --- USER CORE ---
  getUserProfile: async () => {
    return request<any>('/users/profile');
  },
  updateUserProfile: async (data: {
    email?: string;
    username?: string;
    walletAddress?: string;
    role?: 'CLIENT' | 'FREELANCER';
  }) => {
    return request<any>('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  // --- ANALYTICS ---
  getAnalyticsOverview: async () => {
    return request<{ openJobs: number; activeContracts: number; freelancers: number; clients: number }>('/analytics/overview');
  },
};
