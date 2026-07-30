import PDFDocument from 'pdfkit';

interface DeedData {
  grantorName: string;
  granteeName: string;
  propertyAddress: string;
  legalDescription: string;
  consideration: string;
  state: string;
  county?: string;
  grantorAddress?: string;  // Fix B
  granteeAddress?: string;  // Fix B
}

// Fix 1: State-specific jurisdiction terminology
function getJurisdictionTerm(state: string): string {
  if (state === 'AK') return 'Borough';
  if (state === 'LA') return 'Parish';
  return 'County';
}

export function generateQuitclaimDeed(data: DeedData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const jurisdictionTerm = getJurisdictionTerm(data.state);

    // ── Fix 2: Recording header block — VERY FIRST content ──────────────────
    doc.y = 72;
    doc.fontSize(9).font('Times-Roman');
    doc.text(`Recording Requested By: ${data.granteeName}`);
    doc.text('After Recording Return To:');
    doc.text(data.granteeName);
    doc.text(data.propertyAddress);
    doc.moveDown(1);
    doc.fontSize(9).font('Times-Italic').text(
      'Space Above This Line Reserved for Recorder\'s Use',
      { align: 'center' }
    );
    // Horizontal separator line
    doc.moveTo(72, doc.y + 4).lineTo(doc.page.width - 72, doc.y + 4).stroke();
    doc.moveDown(1.5);
    // ── End Fix 2 ───────────────────────────────────────────────────────────

    // Title
    doc.fontSize(14).font('Times-Bold').text('QUITCLAIM DEED', { align: 'center' });
    doc.moveDown();

    // Body
    doc.fontSize(11).font('Times-Roman');
    doc.text(
      `THIS QUITCLAIM DEED, executed this _____ day of _____________, 20___, by ${data.grantorName} (Grantor), ` +
      `to ${data.granteeName} (Grantee).`,
      { align: 'justify' }
    );
    doc.moveDown(0.5);

    // Fix 3: Party identification label after grantor name
    doc.fontSize(9).font('Times-Italic').text('(Full legal name as it appears on current title)');
    doc.moveDown(0.25);

    // Fix B: Grantor address line
    doc.fontSize(10).font('Times-Roman');
    const grantorAddr = (data.grantorAddress && data.grantorAddress.trim())
      ? data.grantorAddress.trim()
      : '_______________________________';
    doc.text(`Address: ${grantorAddr}`);
    doc.moveDown(0.25);

    // Fix D: Marital status hint under grantor
    doc.fontSize(9).font('Times-Italic').text(
      '(Include marital status where required, e.g., \'an unmarried person\' or \'husband and wife\')'
    );
    doc.moveDown(0.75);

    doc.fontSize(11).font('Times-Roman');
    doc.text(
      `Grantee: ${data.granteeName}`,
      { align: 'left' }
    );
    doc.moveDown(0.25);

    // Fix 3: Party identification label after grantee name
    doc.fontSize(9).font('Times-Italic').text('(Full legal name as it appears on current title)');
    doc.moveDown(0.25);

    // Fix B: Grantee address line
    doc.fontSize(10).font('Times-Roman');
    const granteeAddr = (data.granteeAddress && data.granteeAddress.trim())
      ? data.granteeAddress.trim()
      : '_______________________________';
    doc.text(`Address: ${granteeAddr}`);
    doc.moveDown(0.25);

    // Fix D: Marital status hint under grantee
    doc.fontSize(9).font('Times-Italic').text(
      '(Include marital status where required, e.g., \'an unmarried person\' or \'husband and wife\')'
    );
    doc.moveDown(0.75);

    doc.fontSize(11).font('Times-Roman');

    // Fix 6: Consideration clause wording
    doc.text(
      `WITNESSETH, that the Grantor, for and in consideration of the following: For valuable consideration, the receipt and sufficiency of which are hereby acknowledged, including ${data.consideration},` +
      ` hereby remises, releases and quitclaims unto the Grantee all right, title, interest, claim and demand ` +
      `which the Grantor has in and to the following described lot or parcel of land, situate, lying and being in the State of ${data.state}:`,
      { align: 'justify' }
    );
    doc.moveDown();

    // Fix 5: Legal description label
    doc.fontSize(10).font('Times-Bold').text(
      'Legal Description (copy exactly from your existing deed or title report):'
    );
    doc.moveDown(0.5);

    // Legal description in Courier
    doc.font('Courier').fontSize(10);
    doc.text(data.legalDescription, { align: 'left' });
    doc.moveDown(1);

    // Fix C: APN / Parcel Number field
    doc.font('Times-Roman').fontSize(11);
    doc.text('Assessor\'s Parcel Number (APN): _______________');
    doc.moveDown(0.25);
    doc.fontSize(9).font('Times-Italic').text('(if required by the county recorder)');
    doc.moveDown(1.5);

    // Signature block
    doc.font('Times-Roman').fontSize(11);
    doc.text('IN WITNESS WHEREOF, Grantor has executed this deed on the date first written above.');
    doc.moveDown(2);

    // Signature lines
    doc.text('Witness #1 Signature: _________________________________');
    doc.moveDown();
    doc.text('Witness #2 Signature: _________________________________');
    doc.moveDown();
    doc.text('Grantor Signature: ____________________________________');
    doc.moveDown();
    doc.text(`Printed Name: ${data.grantorName}`);
    doc.moveDown();

    // Notary block — keep together
    const notaryBlockHeight = 180;
    const pageBottom = (doc.page.height as number) - (doc.page.margins.bottom as number);
    if (doc.y + notaryBlockHeight > pageBottom) {
      doc.addPage();
    }

    // Fix A: Alaska statutory notary acknowledgment language (AS 09.63.010)
    if (data.state === 'AK') {
      const boroughOrDistrict = data.county ? data.county.toUpperCase() : '_______________';
      doc.font('Times-Roman').fontSize(11);
      doc.text('STATE OF ALASKA');
      doc.text(`${jurisdictionTerm.toUpperCase()} OF ${boroughOrDistrict}`);
      doc.moveDown();
      doc.text(
        'The foregoing instrument was acknowledged before me this ___ day of ___________, 20___, by _______________, as Grantor.',
        { align: 'left' }
      );
      doc.moveDown(2);
      doc.text('_________________________________');
      doc.text('Notary Public in and for the State of Alaska');
      doc.text('My Commission Expires: _______________');
    } else if (data.state === 'AZ') {
      // Arizona statutory notary acknowledgment (A.R.S. § 33-501)
      doc.font('Times-Roman').fontSize(11);
      doc.text('STATE OF ARIZONA');
      doc.text(`County of ${data.county ? data.county : '_______________'}`);
      doc.moveDown();
      doc.text(
        'The foregoing instrument was acknowledged before me this ___ day of ___________, 20___, by _______________.',
        { align: 'left' }
      );
      doc.moveDown(2);
      doc.text('_________________________________');
      doc.text('Notary Public');
      doc.text('My Commission Expires: _______________');
    } else if (data.state === 'FL') {
      // Florida — two witnesses required (Fla. Stat. § 689.01)
      doc.font('Times-Roman').fontSize(11);
      doc.text('STATE OF FLORIDA');
      doc.text(`County of ${data.county ? data.county : '_______________'}`);
      doc.moveDown();
      doc.text('The foregoing instrument was acknowledged before me this ___ day of ___________, 20___, by _______________,');
      doc.text('who is personally known to me or who has produced __________________ as identification.');
      doc.moveDown(2);
      doc.text('Witness #1 Signature: _________________________________');
      doc.text('Witness #1 Printed Name: _____________________________');
      doc.moveDown();
      doc.text('Witness #2 Signature: _________________________________');
      doc.text('Witness #2 Printed Name: _____________________________');
      doc.moveDown();
      doc.text('_________________________________');
      doc.text('Notary Public, State of Florida');
      doc.text('My Commission Expires: _______________');
    } else if (data.state === 'TX') {
      // Texas standard county acknowledgment
      doc.font('Times-Roman').fontSize(11);
      doc.text('STATE OF TEXAS');
      doc.text(`County of ${data.county ? data.county : '_______________'}`);
      doc.moveDown();
      doc.text(
        'This instrument was acknowledged before me on ___________, 20___, by _______________.',
        { align: 'left' }
      );
      doc.moveDown(2);
      doc.text('_________________________________');
      doc.text('Notary Public, State of Texas');
      doc.text('My Commission Expires: _______________');
    } else {
      // Generic notary block for all other states
      doc.font('Times-Roman').fontSize(11);
      doc.text(`STATE OF ${data.state}`);
      doc.text(`${jurisdictionTerm} OF ${data.county ? data.county.toUpperCase() : '______________'}`);
      doc.moveDown();
      doc.text(
        `The foregoing instrument was acknowledged before me this _____ day of _____________, 20___, ` +
        `by ${data.grantorName}, who is personally known to me or who has produced __________________ as identification.`
      );
      doc.moveDown(2);
      doc.text('Notary Public Signature: _____________________________');
      doc.text(`Notary Public, State of ${data.state}`);
      doc.text('My Commission Expires: ___________________');
    }

    // Fix 4: Preparer information block at very bottom
    doc.moveDown(2);
    const preparerBlockHeight = 80;
    if (doc.y + preparerBlockHeight > pageBottom) {
      doc.addPage();
    }
    doc.fontSize(8).font('Times-Italic').text(
      'This document was prepared using WhatIsAQuitclaimDeed.com. This is a self-help legal form and does not constitute legal advice. ' +
      'For complex transactions, consult a licensed real estate attorney. ' +
      'Prepared by: WhatIsAQuitclaimDeed.com',
      { align: 'center' }
    );

    doc.end();
  });
}

// Fallback PDF when deed_data cookie is missing (link opened days later, different device, etc.)
export function generateReceiptPDF(paymentId: string): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fontSize(16).font('Times-Bold').text('WhatIsAQuitclaimDeed.com', { align: 'center' });
    doc.moveDown();
    doc.fontSize(13).font('Times-Roman').text('Purchase Receipt', { align: 'center' });
    doc.moveDown(2);
    doc.fontSize(11).font('Times-Roman');
    doc.text('Payment ID: ' + paymentId);
    doc.moveDown();
    doc.text(
      'Your deed data could not be retrieved (the session may have expired or the link was opened on a different device).',
      { align: 'justify' }
    );
    doc.moveDown();
    doc.text(
      'Please contact us at support@whatisaquitclaimdeed.com with the Payment ID above and we will generate your completed deed and send it to you promptly.',
      { align: 'justify' }
    );
    doc.moveDown(2);
    doc.fontSize(9).font('Times-Italic').text(
      'Generated: ' + new Date().toUTCString(),
      { align: 'center' }
    );
    doc.end();
  });
}
