import QRCode from "qrcode";
import { randomUUID } from "crypto";

export async function generateQRCodeValue(): Promise<string> {
  return randomUUID();
}

export async function generateQRCodeImage(value: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(value, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: "M",
    });
    return dataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code image");
  }
}
