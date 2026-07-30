import PDFDocument from 'pdfkit';

interface DeedData {
  grantorName: string;
  granteeName: string;
  propertyAddress: string;
  legalDescription: string;
  consideration: string;
  state: string;
  county?: string;
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
    // Position at top of page (standard 72pt margin)
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
    doc.moveDown(0.5);
    doc.fontSize(11).font('Times-Roman');

    doc.text(
      `Grantee: ${data.granteeName}`,
      { align: 'left' }
    );
    doc.moveDown(0.25);
    // Fix 3: Party identification label after grantee name
    doc.fontSize(9).font('Times-Italic').text('(Full legal name as it appears on current title)');
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
    doc.moveDown(2);

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
    const notaryBlockHeight = 160;
    const pageBottom = (doc.page.height as number) - (doc.page.margins.bottom as number);
    if (doc.y + notaryBlockHeight > pageBottom) {
      doc.addPage();
    }

    // Fix 1: Use jurisdictionTerm in both deed body AND notary block
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
