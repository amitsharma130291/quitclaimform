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

export function generateQuitclaimDeed(data: DeedData): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    // Use 1" top margin for all pages; page 1 recording header is positioned
    // manually at the 3" mark via doc.y so subsequent pages keep the standard 1" top.
    const doc = new PDFDocument({
      size: 'LETTER',
      margins: { top: 72, bottom: 72, left: 72, right: 72 },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Position page 1 cursor at 2" (144pt) from top for the recording header.
    // 72pt standard margin + 72pt recording space = 144pt from top of page.
    doc.y = 144;

    // Recording header block (upper right of the 3" space)
    doc.fontSize(10).font('Times-Roman');
    doc.text('After recording return to:', { continued: false });
    doc.text(data.grantorName);
    doc.text(data.propertyAddress);
    doc.moveDown(2);

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
    doc.moveDown();

    doc.text(
      `WITNESSETH, that the Grantor, for and in consideration of the sum of ${data.consideration || 'Ten Dollars ($10.00) and other good and valuable consideration'}, ` +
      `the receipt whereof is hereby acknowledged, hereby remises, releases and quitclaims unto the Grantee all right, title, interest, claim and demand ` +
      `which the Grantor has in and to the following described lot or parcel of land, situate, lying and being in the State of ${data.state}:`,
      { align: 'justify' }
    );
    doc.moveDown();

    // Legal description in Courier
    doc.font('Courier').fontSize(10);
    doc.text(data.legalDescription, { align: 'left' });
    doc.moveDown(2);

    // Signature block
    doc.font('Times-Roman').fontSize(11);
    doc.text('IN WITNESS WHEREOF, Grantor has executed this deed on the date first written above.');
    doc.moveDown(3);

    // Signature lines
    doc.text('Witness #1 Signature: _________________________________');
    doc.moveDown();
    doc.text('Witness #2 Signature: _________________________________');
    doc.moveDown(2);
    doc.text('Grantor Signature: ____________________________________');
    doc.moveDown();
    doc.text(`Printed Name: ${data.grantorName}`);
    doc.moveDown(2);

    // Notary block — keep the entire block together.
    // Estimate: state/county lines (~2 lines) + acknowledgement paragraph (~4 lines) +
    // signature lines (~3 lines) ≈ ~200pt minimum. If less space remains on the
    // current page, push to a new page so the block is never split.
    const notaryBlockHeight = 200;
    const pageBottom = (doc.page.height as number) - (doc.page.margins.bottom as number);
    if (doc.y + notaryBlockHeight > pageBottom) {
      doc.addPage();
    }

    // Notary block
    doc.text('STATE OF _______________');
    doc.text('COUNTY OF ______________');
    doc.moveDown();
    doc.text(
      'The foregoing instrument was acknowledged before me this _____ day of _____________, 20___, ' +
      `by ${data.grantorName}, who is personally known to me or who has produced __________________ as identification.`
    );
    doc.moveDown(2);
    doc.text('Notary Public Signature: _____________________________');
    doc.text('Notary Public, State of _______________');
    doc.text('My Commission Expires: ___________________');

    doc.end();
  });
}
