// server/index-prod.ts
import fs from "node:fs";
import path from "node:path";
import express3 from "express";

// server/app.ts
import express2 from "express";

// server/routes.ts
import { createServer } from "http";
import express from "express";
import cookieParser from "cookie-parser";

// server/db.ts
import { PrismaClient } from "@prisma/client";
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?"
  );
}
var prisma = new PrismaClient();

// server/auth.ts
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
var JWT_SECRET = process.env.SESSION_SECRET || "development-secret-key";
var JWT_EXPIRES_IN = "7d";
async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}
async function comparePasswords(password, hashedPassword) {
  return bcrypt.compare(password, hashedPassword);
}
function generateToken(userId, email, name, role) {
  return jwt.sign({ userId, email, name, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}
async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : req.cookies?.token;
    if (!token) {
      return res.status(401).send("Authentication required");
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).send("Invalid or expired token");
    }
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, name: true, role: true }
    });
    if (!user) {
      return res.status(401).send("User not found");
    }
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).send("Authentication error");
  }
}
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).send("Authentication required");
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).send("Insufficient permissions");
    }
    next();
  };
}

// server/utils/qr-generator.ts
import QRCode from "qrcode";
import { randomUUID } from "crypto";
async function generateQRCodeValue() {
  return randomUUID();
}
async function generateQRCodeImage(value) {
  try {
    const dataUrl = await QRCode.toDataURL(value, {
      width: 256,
      margin: 2,
      errorCorrectionLevel: "M"
    });
    return dataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error("Failed to generate QR code image");
  }
}

// server/utils/pdf-generator.ts
import PDFDocument from "pdfkit";
async function generateQRCodesPDF(codes, examTitle) {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);
      const codesPerPage = 12;
      const codesPerRow = 3;
      const qrSize = 150;
      const spacing = 20;
      let pageNum = 1;
      for (let i = 0; i < codes.length; i++) {
        if (i > 0 && i % codesPerPage === 0) {
          doc.addPage();
          pageNum++;
        }
        const pageIndex = i % codesPerPage;
        const row = Math.floor(pageIndex / codesPerRow);
        const col = pageIndex % codesPerRow;
        const x = 50 + col * (qrSize + spacing);
        const y = 100 + row * (qrSize + 80);
        if (pageIndex === 0) {
          doc.fontSize(16).font("Helvetica-Bold").text(examTitle, 50, 50);
          doc.fontSize(10).font("Helvetica").text(`Page ${pageNum}`, 50, 70, { align: "right" });
        }
        const qrDataUrl = await generateQRCodeImage(codes[i].codeValue);
        const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, "base64");
        doc.image(imageBuffer, x, y, { width: qrSize, height: qrSize });
        doc.fontSize(8).font("Courier").text(codes[i].codeValue, x, y + qrSize + 5, {
          width: qrSize,
          align: "center"
        });
      }
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

// server/utils/csv-exporter.ts
import { createArrayCsvWriter } from "csv-writer";
async function generateCSV(mappings) {
  const csvWriter = createArrayCsvWriter({
    header: ["Student Name", "Student Email", "QR Code", "Score"],
    path: "/tmp/export.csv"
  });
  const records = mappings.map((m) => [
    m.studentName,
    m.studentEmail,
    m.qrCode,
    m.score !== null ? m.score.toString() : "Not graded"
  ]);
  await csvWriter.writeRecords(records);
  const fs2 = await import("fs");
  const buffer = fs2.readFileSync("/tmp/export.csv");
  fs2.unlinkSync("/tmp/export.csv");
  return buffer;
}

// server/routes.ts
async function registerRoutes(app2) {
  app2.use(express.json());
  app2.use(cookieParser());
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      if (!name || !email || !password || !role) {
        return res.status(400).send("Missing required fields");
      }
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        return res.status(400).send("Email already registered");
      }
      const hashedPassword = await hashPassword(password);
      const user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          role
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      });
      const token = generateToken(user.id, user.email, user.name, user.role);
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1e3
      });
      res.json(user);
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).send(error.message || "Registration failed");
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).send("Email and password are required");
      }
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        return res.status(401).send("Invalid credentials");
      }
      const isValid = await comparePasswords(password, user.password);
      if (!isValid) {
        return res.status(401).send("Invalid credentials");
      }
      const token = generateToken(user.id, user.email, user.name, user.role);
      res.cookie("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1e3
      });
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).send(error.message || "Login failed");
    }
  });
  app2.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.sendStatus(200);
  });
  app2.get("/api/user", authMiddleware, (req, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }
    res.json(req.user);
  });
  app2.get("/api/exams", authMiddleware, async (req, res) => {
    try {
      const exams = await prisma.examSession.findMany({
        orderBy: { date: "desc" },
        include: {
          anonCodes: {
            select: {
              id: true,
              assignedTo: true
            }
          }
        }
      });
      const examsWithStats = exams.map((exam) => ({
        ...exam,
        totalCodes: exam.anonCodes.length,
        claimedCodes: exam.anonCodes.filter((c) => c.assignedTo).length,
        unclaimedCodes: exam.anonCodes.filter((c) => !c.assignedTo).length
      }));
      res.json(examsWithStats);
    } catch (error) {
      console.error("Get exams error:", error);
      res.status(500).send(error.message || "Failed to fetch exams");
    }
  });
  app2.get("/api/exams/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const exam = await prisma.examSession.findUnique({
        where: { id }
      });
      if (!exam) {
        return res.status(404).send("Exam not found");
      }
      res.json(exam);
    } catch (error) {
      console.error("Get exam error:", error);
      res.status(500).send(error.message || "Failed to fetch exam");
    }
  });
  app2.post(
    "/api/exams",
    authMiddleware,
    requireRole("ADMIN" /* ADMIN */),
    async (req, res) => {
      try {
        const { courseName, date, duration } = req.body;
        if (!courseName || !date) {
          return res.status(400).send("Missing required fields");
        }
        const exam = await prisma.examSession.create({
          data: {
            courseName,
            date: new Date(date),
            duration: duration || 180
          }
        });
        res.json(exam);
      } catch (error) {
        console.error("Create exam error:", error);
        res.status(500).send(error.message || "Failed to create exam");
      }
    }
  );
  app2.get(
    "/api/exams/:id/codes",
    authMiddleware,
    requireRole("ADMIN" /* ADMIN */),
    async (req, res) => {
      try {
        const { id } = req.params;
        const codes = await prisma.anonCode.findMany({
          where: { examId: id },
          orderBy: { createdAt: "asc" }
        });
        res.json(codes);
      } catch (error) {
        console.error("Get codes error:", error);
        res.status(500).send(error.message || "Failed to fetch codes");
      }
    }
  );
  app2.post(
    "/api/exams/:id/generate-codes",
    authMiddleware,
    requireRole("ADMIN" /* ADMIN */),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { count } = req.body;
        if (!count || count < 1 || count > 500) {
          return res.status(400).send("Invalid code count (1-500)");
        }
        const exam = await prisma.examSession.findUnique({ where: { id } });
        if (!exam) {
          return res.status(404).send("Exam not found");
        }
        const codes = [];
        for (let i = 0; i < count; i++) {
          const codeValue = await generateQRCodeValue();
          codes.push({
            codeValue,
            examId: id,
            assignedTo: null,
            assignedAt: null
          });
        }
        await prisma.anonCode.createMany({
          data: codes
        });
        res.json({ message: `${count} QR codes generated`, count });
      } catch (error) {
        console.error("Generate codes error:", error);
        res.status(500).send(error.message || "Failed to generate codes");
      }
    }
  );
  app2.get(
    "/api/exams/:id/download-pdf",
    authMiddleware,
    requireRole("ADMIN" /* ADMIN */),
    async (req, res) => {
      try {
        const { id } = req.params;
        const exam = await prisma.examSession.findUnique({ where: { id } });
        if (!exam) {
          return res.status(404).send("Exam not found");
        }
        const codes = await prisma.anonCode.findMany({
          where: { examId: id },
          select: { codeValue: true }
        });
        if (codes.length === 0) {
          return res.status(400).send("No QR codes generated for this exam");
        }
        const pdfBuffer = await generateQRCodesPDF(codes, exam.courseName);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${exam.courseName}-qr-codes.pdf"`
        );
        res.send(pdfBuffer);
      } catch (error) {
        console.error("Download PDF error:", error);
        res.status(500).send(error.message || "Failed to generate PDF");
      }
    }
  );
  app2.patch(
    "/api/exams/:id/claim-code",
    authMiddleware,
    requireRole("STUDENT" /* STUDENT */),
    async (req, res) => {
      try {
        const { id } = req.params;
        const { codeValue } = req.body;
        if (!req.user) {
          return res.status(401).send("Not authenticated");
        }
        if (!codeValue) {
          return res.status(400).send("QR code value is required");
        }
        const code = await prisma.anonCode.findFirst({
          where: {
            codeValue,
            examId: id
          }
        });
        if (!code) {
          return res.status(404).send("QR code not found for this exam");
        }
        if (code.assignedTo) {
          return res.status(400).send("QR code already claimed");
        }
        const updatedCode = await prisma.anonCode.update({
          where: { id: code.id },
          data: {
            assignedTo: req.user.id,
            assignedAt: /* @__PURE__ */ new Date()
          }
        });
        res.json(updatedCode);
      } catch (error) {
        console.error("Claim code error:", error);
        res.status(500).send(error.message || "Failed to claim code");
      }
    }
  );
  app2.get(
    "/api/student/exams",
    authMiddleware,
    requireRole("STUDENT" /* STUDENT */),
    async (req, res) => {
      try {
        if (!req.user) {
          return res.status(401).send("Not authenticated");
        }
        const exams = await prisma.examSession.findMany({
          where: {
            date: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3)
            }
          },
          orderBy: { date: "desc" },
          include: {
            anonCodes: {
              where: {
                assignedTo: req.user.id
              }
            }
          }
        });
        const examsWithClaims = exams.map((exam) => ({
          ...exam,
          claimedCode: exam.anonCodes[0] || void 0
        }));
        res.json(examsWithClaims);
      } catch (error) {
        console.error("Get student exams error:", error);
        res.status(500).send(error.message || "Failed to fetch exams");
      }
    }
  );
  app2.post(
    "/api/marks",
    authMiddleware,
    requireRole("MARKER" /* MARKER */),
    async (req, res) => {
      try {
        if (!req.user) {
          return res.status(401).send("Not authenticated");
        }
        const { examId, qrCode, score } = req.body;
        if (!examId || !qrCode || score === void 0) {
          return res.status(400).send("Missing required fields");
        }
        if (score < 0 || score > 100) {
          return res.status(400).send("Score must be between 0 and 100");
        }
        const code = await prisma.anonCode.findFirst({
          where: {
            codeValue: qrCode,
            examId
          }
        });
        if (!code) {
          return res.status(404).send("QR code not found for this exam");
        }
        if (!code.assignedTo) {
          return res.status(400).send("QR code not claimed by any student");
        }
        const existingMark = await prisma.markEntry.findUnique({
          where: { codeId: code.id }
        });
        if (existingMark) {
          const updatedMark = await prisma.markEntry.update({
            where: { id: existingMark.id },
            data: { score }
          });
          return res.json(updatedMark);
        }
        const mark = await prisma.markEntry.create({
          data: {
            examId,
            codeId: code.id,
            score,
            markerId: req.user.id
          }
        });
        res.json(mark);
      } catch (error) {
        console.error("Submit mark error:", error);
        res.status(500).send(error.message || "Failed to submit mark");
      }
    }
  );
  app2.get(
    "/api/marks/:examId",
    authMiddleware,
    requireRole("MARKER" /* MARKER */, "ADMIN" /* ADMIN */),
    async (req, res) => {
      try {
        const { examId } = req.params;
        const marks = await prisma.markEntry.findMany({
          where: {
            examId,
            ...req.user?.role === "MARKER" /* MARKER */ ? { markerId: req.user.id } : {}
          },
          include: {
            code: {
              select: {
                codeValue: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        });
        const formattedMarks = marks.map((mark) => ({
          ...mark,
          codeId: mark.code.codeValue
        }));
        res.json(formattedMarks);
      } catch (error) {
        console.error("Get marks error:", error);
        res.status(500).send(error.message || "Failed to fetch marks");
      }
    }
  );
  app2.get(
    "/api/admin/stats",
    authMiddleware,
    requireRole("ADMIN" /* ADMIN */),
    async (req, res) => {
      try {
        const [totalExams, activeExams, codes, marks] = await Promise.all([
          prisma.examSession.count(),
          prisma.examSession.count({
            where: {
              date: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3)
              }
            }
          }),
          prisma.anonCode.count(),
          prisma.markEntry.count()
        ]);
        const examsWithMarks = await prisma.examSession.findMany({
          include: {
            anonCodes: {
              where: {
                assignedTo: { not: null }
              }
            },
            markEntries: true
          }
        });
        const pendingReveals = examsWithMarks.filter(
          (exam) => exam.anonCodes.length > exam.markEntries.length
        ).length;
        res.json({
          totalExams,
          activeExams,
          totalQRCodes: codes,
          pendingReveals
        });
      } catch (error) {
        console.error("Get stats error:", error);
        res.status(500).send(error.message || "Failed to fetch stats");
      }
    }
  );
  app2.get(
    "/api/exams/:id/reveal",
    authMiddleware,
    requireRole("ADMIN" /* ADMIN */),
    async (req, res) => {
      try {
        const { id } = req.params;
        const codes = await prisma.anonCode.findMany({
          where: {
            examId: id,
            assignedTo: { not: null }
          },
          include: {
            student: {
              select: {
                name: true,
                email: true
              }
            },
            markEntry: {
              select: {
                score: true
              }
            }
          }
        });
        const mappings = codes.map((code) => ({
          studentName: code.student?.name || "Unknown",
          studentEmail: code.student?.email || "Unknown",
          qrCode: code.codeValue,
          score: code.markEntry?.score ?? null
        }));
        res.json(mappings);
      } catch (error) {
        console.error("Get reveal mapping error:", error);
        res.status(500).send(error.message || "Failed to fetch mappings");
      }
    }
  );
  app2.get(
    "/api/exams/:id/export-csv",
    authMiddleware,
    requireRole("ADMIN" /* ADMIN */),
    async (req, res) => {
      try {
        const { id } = req.params;
        const exam = await prisma.examSession.findUnique({ where: { id } });
        if (!exam) {
          return res.status(404).send("Exam not found");
        }
        const codes = await prisma.anonCode.findMany({
          where: {
            examId: id,
            assignedTo: { not: null }
          },
          include: {
            student: {
              select: {
                name: true,
                email: true
              }
            },
            markEntry: {
              select: {
                score: true
              }
            }
          }
        });
        const mappings = codes.map((code) => ({
          studentName: code.student?.name || "Unknown",
          studentEmail: code.student?.email || "Unknown",
          qrCode: code.codeValue,
          score: code.markEntry?.score ?? null
        }));
        const csvBuffer = await generateCSV(mappings);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="${exam.courseName}-results.csv"`
        );
        res.send(csvBuffer);
      } catch (error) {
        console.error("Export CSV error:", error);
        res.status(500).send(error.message || "Failed to export CSV");
      }
    }
  );
  const httpServer = createServer(app2);
  return httpServer;
}

// server/app.ts
function log(message, source = "express") {
  const formattedTime = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}
var app = express2();
app.use(express2.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express2.urlencoded({ extended: false }));
app.use((req, res, next) => {
  const start = Date.now();
  const path2 = req.path;
  let capturedJsonResponse = void 0;
  const originalResJson = res.json;
  res.json = function(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path2.startsWith("/api")) {
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    }
  });
  next();
});
async function runApp(setup) {
  const server = await registerRoutes(app);
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });
  await setup(app, server);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true
  }, () => {
    log(`serving on port ${port}`);
  });
}

// server/index-prod.ts
async function serveStatic(app2, _server) {
  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`
    );
  }
  app2.use(express3.static(distPath));
  app2.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
(async () => {
  await runApp(serveStatic);
})();
export {
  serveStatic
};
