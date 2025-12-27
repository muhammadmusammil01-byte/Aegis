const PDFDocument = require('pdfkit');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class CertificateService {
  /**
   * Generate a digital usage license certificate
   */
  async generateCertificate(license, buyer, content) {
    try {
      const certificatesDir = path.join(process.env.VAULT_PATH || './vault', 'certificates');
      await fs.mkdir(certificatesDir, { recursive: true });

      const certificatePath = path.join(certificatesDir, `${license.licenseId}.pdf`);

      // Create PDF certificate
      const doc = new PDFDocument({ margin: 50 });
      const writeStream = require('fs').createWriteStream(certificatePath);

      doc.pipe(writeStream);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('AEGIS USAGE LICENSE', { align: 'center' });
      doc.moveDown();
      
      doc.fontSize(12).font('Helvetica').text('Digital Rights Certificate', { align: 'center' });
      doc.moveDown(2);

      // License Details
      doc.fontSize(14).font('Helvetica-Bold').text('License Information');
      doc.fontSize(10).font('Helvetica');
      doc.moveDown(0.5);
      doc.text(`License ID: ${license.licenseId}`);
      doc.text(`Issue Date: ${license.purchasedAt.toISOString()}`);
      doc.text(`Purchase Price: $${license.purchasePrice}`);
      doc.moveDown(1.5);

      // Buyer Information
      doc.fontSize(14).font('Helvetica-Bold').text('Licensed To');
      doc.fontSize(10).font('Helvetica');
      doc.moveDown(0.5);
      doc.text(`Name: ${buyer.username}`);
      doc.text(`Email: ${buyer.email}`);
      doc.text(`User ID: ${buyer._id}`);
      doc.moveDown(1.5);

      // Content Information
      doc.fontSize(14).font('Helvetica-Bold').text('Licensed Content');
      doc.fontSize(10).font('Helvetica');
      doc.moveDown(0.5);
      doc.text(`Source URL: ${content.sourceUrl}`);
      doc.text(`Platform: ${content.platform}`);
      doc.text(`Content ID: ${content._id}`);
      if (content.metadata && content.metadata.title) {
        doc.text(`Title: ${content.metadata.title}`);
      }
      doc.moveDown(1.5);

      // Rights Granted
      doc.fontSize(14).font('Helvetica-Bold').text('Rights Granted');
      doc.fontSize(10).font('Helvetica');
      doc.moveDown(0.5);
      doc.text('• Commercial usage rights to the linked social media content');
      doc.text('• Right to distribute and display the content for commercial purposes');
      doc.text('• Access to archived master copy in case of link rot');
      doc.text('• Right to resell this license (subject to 10% royalty to original creator)');
      doc.moveDown(1.5);

      // Terms
      doc.fontSize(14).font('Helvetica-Bold').text('Terms & Conditions');
      doc.fontSize(10).font('Helvetica');
      doc.moveDown(0.5);
      doc.text('• This license is valid indefinitely unless revoked by platform');
      doc.text('• All resales are subject to 10% royalty to original creator');
      doc.text('• Watermarked copies include buyer information for anti-piracy');
      doc.text('• Original creator retains copyright; this is a usage license only');
      doc.moveDown(1.5);

      // Digital Signature
      doc.fontSize(12).font('Helvetica-Bold').text('Digital Signature', { align: 'center' });
      doc.fontSize(10).font('Helvetica');
      doc.moveDown(0.5);
      
      // Generate signature hash
      const signatureData = `${license.licenseId}:${buyer._id}:${content._id}:${license.purchasedAt}`;
      const signature = crypto.createHash('sha256').update(signatureData).digest('hex');
      
      doc.text(`Signature: ${signature}`, { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(8).text('This certificate is cryptographically signed and verifiable on the Aegis platform', { align: 'center' });

      doc.end();

      // Wait for PDF to be written
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      return certificatePath;
    } catch (error) {
      console.error('Certificate generation error:', error.message);
      throw error;
    }
  }

  /**
   * Generate JSON certificate
   */
  async generateJsonCertificate(license, buyer, content) {
    const signatureData = `${license.licenseId}:${buyer._id}:${content._id}:${license.purchasedAt}`;
    const signature = crypto.createHash('sha256').update(signatureData).digest('hex');

    const certificate = {
      licenseId: license.licenseId,
      issuedAt: license.purchasedAt,
      purchasePrice: license.purchasePrice,
      buyer: {
        userId: buyer._id,
        username: buyer.username,
        email: buyer.email
      },
      content: {
        contentId: content._id,
        sourceUrl: content.sourceUrl,
        platform: content.platform,
        metadata: content.metadata
      },
      rightsGranted: [
        'Commercial usage rights',
        'Distribution rights',
        'Display rights',
        'Resale rights (with 10% royalty)'
      ],
      terms: {
        royaltyPercentage: license.royaltyPercentage,
        isTransferable: true,
        expiryDate: null
      },
      signature,
      verificationUrl: `https://aegis.platform/verify/${license.licenseId}`
    };

    return certificate;
  }

  /**
   * Apply watermark to downloaded content
   */
  generateWatermarkText(buyer, licenseId) {
    return `Licensed to: ${buyer.email} | License: ${licenseId} | AEGIS Rights Broker`;
  }
}

module.exports = new CertificateService();
