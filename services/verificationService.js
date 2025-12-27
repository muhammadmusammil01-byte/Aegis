const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const ContentLink = require('../models/ContentLink');
const fs = require('fs').promises;
const path = require('path');

class VerificationService {
  /**
   * Generate a unique verification token
   */
  generateToken() {
    const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `AEGIS-${randomPart}`;
  }

  /**
   * Detect platform from URL
   */
  detectPlatform(url) {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('instagram.com')) return 'Instagram';
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) return 'YouTube';
    if (urlLower.includes('tiktok.com')) return 'TikTok';
    if (urlLower.includes('twitter.com') || urlLower.includes('x.com')) return 'Twitter';
    if (urlLower.includes('facebook.com')) return 'Facebook';
    return null;
  }

  /**
   * Scrape URL and check if token exists in bio or caption
   */
  async verifyTokenInUrl(url, token) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const pageText = $('body').text();
      
      // Check if token exists in the page content
      return pageText.includes(token);
    } catch (error) {
      console.error('Verification error:', error.message);
      return false;
    }
  }

  /**
   * Create a snapshot of the content and save to vault
   */
  async createSnapshot(contentId, sourceUrl, platform) {
    try {
      const vaultDir = process.env.VAULT_PATH || './vault';
      await fs.mkdir(vaultDir, { recursive: true });

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${contentId}_${timestamp}.json`;
      const vaultPath = path.join(vaultDir, filename);

      // Fetch content metadata
      const response = await axios.get(sourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      
      // Extract metadata based on platform
      const metadata = {
        sourceUrl,
        platform,
        title: $('title').text() || '',
        description: $('meta[name="description"]').attr('content') || '',
        thumbnailUrl: $('meta[property="og:image"]').attr('content') || '',
        snapshottedAt: new Date(),
        rawHtml: response.data.substring(0, 50000) // Store first 50KB of HTML
      };

      // Save snapshot to vault
      await fs.writeFile(vaultPath, JSON.stringify(metadata, null, 2));

      return {
        vaultPath,
        metadata: {
          title: metadata.title,
          description: metadata.description,
          thumbnailUrl: metadata.thumbnailUrl
        }
      };
    } catch (error) {
      console.error('Snapshot creation error:', error.message);
      throw error;
    }
  }

  /**
   * Initiate verification process
   */
  async initiateVerification(userId, sourceUrl) {
    const platform = this.detectPlatform(sourceUrl);
    if (!platform) {
      throw new Error('Unsupported platform');
    }

    const token = this.generateToken();
    
    const contentLink = new ContentLink({
      sourceUrl,
      platform,
      originalCreatorId: userId,
      verificationToken: token,
      tokenGeneratedAt: new Date(),
      status: 'Pending'
    });

    await contentLink.save();
    
    return {
      contentId: contentLink._id,
      token,
      platform,
      message: `Please add the token "${token}" to your ${platform} bio or profile description`
    };
  }

  /**
   * Complete verification by checking token
   */
  async completeVerification(contentId) {
    const contentLink = await ContentLink.findById(contentId);
    
    if (!contentLink) {
      throw new Error('Content link not found');
    }

    if (contentLink.status !== 'Pending') {
      throw new Error('Content link is not in pending status');
    }

    // Verify token exists in URL
    const isVerified = await this.verifyTokenInUrl(
      contentLink.sourceUrl,
      contentLink.verificationToken
    );

    if (!isVerified) {
      throw new Error('Token not found in the URL. Please ensure the token is in your bio/caption.');
    }

    // Create snapshot
    const { vaultPath, metadata } = await this.createSnapshot(
      contentLink._id,
      contentLink.sourceUrl,
      contentLink.platform
    );

    // Update content link
    contentLink.status = 'Active';
    contentLink.verifiedAt = new Date();
    contentLink.vaultPath = vaultPath;
    contentLink.snapshottedAt = new Date();
    contentLink.metadata = metadata;
    
    // Generate AI price suggestion (simple heuristic)
    contentLink.aiPriceSuggested = this.calculateSuggestedPrice(metadata);
    contentLink.currentPrice = contentLink.aiPriceSuggested;

    await contentLink.save();

    return {
      success: true,
      contentLink,
      message: 'Content verified and added to marketplace!'
    };
  }

  /**
   * Calculate suggested price based on metadata
   */
  calculateSuggestedPrice(metadata) {
    // Simple heuristic - can be enhanced with AI
    let basePrice = 50;
    
    if (metadata.views) {
      basePrice += Math.log10(metadata.views) * 10;
    }
    
    if (metadata.likes) {
      basePrice += Math.log10(metadata.likes) * 5;
    }

    return Math.round(basePrice);
  }
}

module.exports = new VerificationService();
