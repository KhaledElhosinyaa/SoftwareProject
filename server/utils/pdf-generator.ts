import PDFDocument from "pdfkit";
import { generateQRCodeImage } from "./qr-generator";

interface QRCodeData {
  codeValue: string;
}

export async function generateQRCodesPDF(
  codes: QRCodeData[],
  examTitle: string
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      const codesPerPage = 9;
      const rows = 3;
      const cols = 3;

      const qrSize = 150;
      const vGap = 50;
      const hGap = 40;

      const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
      const usableHeight = doc.page.height - doc.page.margins.top - doc.page.margins.bottom;

      const totalGridWidth = cols * qrSize + (cols - 1) * hGap;
      const totalGridHeight = rows * qrSize + (rows - 1) * vGap;

      const startX = doc.page.margins.left + (usableWidth - totalGridWidth) / 2;
      const startY = doc.page.margins.top + 70; // مساحة العنوان

      let pageNum = 1;

      for (let i = 0; i < codes.length; i++) {
        if (i > 0 && i % codesPerPage === 0) {
          doc.addPage();
          pageNum++;
        }

        const pageIndex = i % codesPerPage;
        const row = Math.floor(pageIndex / cols);
        const col = pageIndex % cols;

        const x = startX + col * (qrSize + hGap);
        const y = startY + row * (qrSize + vGap);

        // Header لكل صفحة
        if (pageIndex === 0) {
          doc.fontSize(18).font("Helvetica-Bold").text(examTitle, startX, doc.page.margins.top);
          doc
            .fontSize(10)
            .text(`Page ${pageNum}`, doc.page.width - 100, doc.page.margins.top);
        }

        const qrDataUrl = await generateQRCodeImage(codes[i].codeValue);
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");

        doc.image(imageBuffer, x, y, { width: qrSize, height: qrSize });

        doc
          .fontSize(9)
          .font("Courier")
          .text(codes[i].codeValue, x, y + qrSize + 5, {
            width: qrSize,
            align: "center",
          });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
