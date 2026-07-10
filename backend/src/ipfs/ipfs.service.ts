import { Injectable } from '@nestjs/common';

@Injectable()
export class IpfsService {
  private pinataApiKey = process.env.PINATA_API_KEY;
  private pinataSecretApiKey = process.env.PINATA_API_SECRET;
  private pinataJwt = process.env.PINATA_JWT;

  async pinFileToIpfs(fileBuffer: Buffer, fileName: string): Promise<{ ipfsHash: string; pinSize: number }> {
    if (!this.pinataJwt && (!this.pinataApiKey || !this.pinataSecretApiKey)) {
      console.warn('Pinata API credentials missing, returning mock hash for testing');
      return {
        ipfsHash: `QmMockHashFile${Math.random().toString(36).substring(2, 15)}`,
        pinSize: fileBuffer.length,
      };
    }

    const url = 'https://api.pinata.cloud/pinning/pinFileToIPFS';
    const formData = new FormData();
    
    const blob = new Blob([new Uint8Array(fileBuffer)]);
    formData.append('file', blob, fileName);

    const headers: Record<string, string> = {};
    if (this.pinataJwt) {
      headers['Authorization'] = `Bearer ${this.pinataJwt}`;
    } else {
      headers['pinata_api_key'] = this.pinataApiKey!;
      headers['pinata_secret_api_key'] = this.pinataSecretApiKey!;
    }

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Pinata upload failed: ${response.statusText} - ${errText}`);
    }

    const result = await response.json();
    return {
      ipfsHash: result.IpfsHash,
      pinSize: result.PinSize,
    };
  }

  async pinJsonToIpfs(jsonBody: any): Promise<{ ipfsHash: string; pinSize: number }> {
    if (!this.pinataJwt && (!this.pinataApiKey || !this.pinataSecretApiKey)) {
      console.warn('Pinata API credentials missing, returning mock hash for testing');
      return {
        ipfsHash: `QmMockHashJson${Math.random().toString(36).substring(2, 15)}`,
        pinSize: JSON.stringify(jsonBody).length,
      };
    }

    const url = 'https://api.pinata.cloud/pinning/pinJSONToIPFS';
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.pinataJwt) {
      headers['Authorization'] = `Bearer ${this.pinataJwt}`;
    } else {
      headers['pinata_api_key'] = this.pinataApiKey!;
      headers['pinata_secret_api_key'] = this.pinataSecretApiKey!;
    }

    const response = await fetch(url, {
      method: 'POST',
      body: JSON.stringify(jsonBody),
      headers,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Pinata JSON pinning failed: ${response.statusText} - ${errText}`);
    }

    const result = await response.json();
    return {
      ipfsHash: result.IpfsHash,
      pinSize: result.PinSize,
    };
  }
}
