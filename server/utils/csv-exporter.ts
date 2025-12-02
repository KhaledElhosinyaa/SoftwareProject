import { createArrayCsvWriter } from "csv-writer";
import { RevealMapping } from "@shared/schema";

export async function generateCSV(mappings: RevealMapping[]): Promise<Buffer> {
  const csvWriter = createArrayCsvWriter({
    header: ["Student Name", "Student Email", "QR Code", "Score"],
    path: "/tmp/export.csv",
  });

  const records = mappings.map((m) => [
    m.studentName,
    m.studentEmail,
    m.qrCode,
    m.score !== null ? m.score.toString() : "Not graded",
  ]);

  await csvWriter.writeRecords(records);

  const fs = await import("fs");
  const buffer = fs.readFileSync("/tmp/export.csv");
  fs.unlinkSync("/tmp/export.csv");

  return buffer;
}
