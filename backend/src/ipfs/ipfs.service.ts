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
    
    // Asynchronously trigger mirroring to backup gateway
    this.mirrorToBackup(fileBuffer, fileName, result.IpfsHash);

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

    // Mirror JSON content
    const jsonBuffer = Buffer.from(JSON.stringify(jsonBody));
    this.mirrorToBackup(jsonBuffer, 'metadata.json', result.IpfsHash);

    return {
      ipfsHash: result.IpfsHash,
      pinSize: result.PinSize,
    };
  }

  private async mirrorToBackup(fileBuffer: Buffer, fileName: string, cid: string) {
    const backupUrl = process.env.IPFS_BACKUP_GATEWAY_URL;
    if (!backupUrl) {
      console.log(`[IPFS Redundancy] No backup gateway configured. Skipping mirror for CID: ${cid}`);
      return;
    }

    try {
      console.log(`[IPFS Redundancy] Mirroring CID ${cid} to backup gateway: ${backupUrl}`);
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(fileBuffer)]);
      formData.append('file', blob, fileName);

      const response = await fetch(`${backupUrl}/api/v0/add`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        console.log(`[IPFS Redundancy] Successfully mirrored CID ${cid} to backup gateway.`);
      } else {
        console.warn(`[IPFS Redundancy] Backup mirroring returned status: ${response.statusText}`);
      }
    } catch (err) {
      console.error(`[IPFS Redundancy] Failed to mirror CID ${cid} to backup gateway:`, err);
    }
  }
}
