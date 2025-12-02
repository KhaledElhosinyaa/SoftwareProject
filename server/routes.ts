import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import cookieParser from "cookie-parser";
import { prisma } from "./db";
import {
  hashPassword,
  comparePasswords,
  generateToken,
  authMiddleware,
  requireRole,
  AuthRequest,
} from "./auth";
import { UserRole } from "@shared/schema";
import { generateQRCodeValue } from "./utils/qr-generator";
import { generateQRCodesPDF } from "./utils/pdf-generator";
import { generateCSV } from "./utils/csv-exporter";

export async function registerRoutes(app: Express): Promise<Server> {
  app.use(express.json());
  app.use(cookieParser());

  // Authentication Routes
  app.post("/api/auth/register", async (req, res) => {
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
          role: role as UserRole,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      const token = generateToken(user.id, user.email, user.name, user.role);
      res.cookie("token", token, { 
        httpOnly: true, 
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });
      res.json(user);
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).send(error.message || "Registration failed");
    }
  });

  app.post("/api/auth/login", async (req, res) => {
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
        maxAge: 7 * 24 * 60 * 60 * 1000 
      });

      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).send(error.message || "Login failed");
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    res.clearCookie("token");
    res.sendStatus(200);
  });

  app.get("/api/user", authMiddleware, (req: AuthRequest, res) => {
    if (!req.user) {
      return res.status(401).send("Not authenticated");
    }
    res.json(req.user);
  });

  // Exam Routes
  app.get("/api/exams", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const exams = await prisma.examSession.findMany({
        orderBy: { date: "desc" },
        include: {
          anonCodes: {
            select: {
              id: true,
              assignedTo: true,
            },
          },
        },
      });

      const examsWithStats = exams.map((exam) => ({
        ...exam,
        totalCodes: exam.anonCodes.length,
        claimedCodes: exam.anonCodes.filter((c) => c.assignedTo).length,
        unclaimedCodes: exam.anonCodes.filter((c) => !c.assignedTo).length,
      }));

      res.json(examsWithStats);
    } catch (error: any) {
      console.error("Get exams error:", error);
      res.status(500).send(error.message || "Failed to fetch exams");
    }
  });

  app.get("/api/exams/:id", authMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const exam = await prisma.examSession.findUnique({
        where: { id },
      });

      if (!exam) {
        return res.status(404).send("Exam not found");
      }

      res.json(exam);
    } catch (error: any) {
      console.error("Get exam error:", error);
      res.status(500).send(error.message || "Failed to fetch exam");
    }
  });

  app.post(
    "/api/exams",
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res) => {
      try {
        const { courseName, date, duration } = req.body;

        if (!courseName || !date) {
          return res.status(400).send("Missing required fields");
        }

        const exam = await prisma.examSession.create({
          data: {
            courseName,
            date: new Date(date),
            duration: duration || 180,
          },
        });

        res.json(exam);
      } catch (error: any) {
        console.error("Create exam error:", error);
        res.status(500).send(error.message || "Failed to create exam");
      }
    }
  );

  // QR Code Routes
  app.get(
    "/api/exams/:id/codes",
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req, res) => {
    try {
      const { id } = req.params;
      const codes = await prisma.anonCode.findMany({
        where: { examId: id },
        orderBy: { createdAt: "asc" },
      });

      res.json(codes);
    } catch (error: any) {
      console.error("Get codes error:", error);
      res.status(500).send(error.message || "Failed to fetch codes");
    }
  });

  app.post(
    "/api/exams/:id/generate-codes",
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req: AuthRequest, res) => {
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
            assignedAt: null,
          });
        }

        await prisma.anonCode.createMany({
          data: codes,
        });

        res.json({ message: `${count} QR codes generated`, count });
      } catch (error: any) {
        console.error("Generate codes error:", error);
        res.status(500).send(error.message || "Failed to generate codes");
      }
    }
  );

  app.get(
    "/api/exams/:id/download-pdf",
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req, res) => {
    try {
      const { id } = req.params;

      const exam = await prisma.examSession.findUnique({ where: { id } });
      if (!exam) {
        return res.status(404).send("Exam not found");
      }

      const codes = await prisma.anonCode.findMany({
        where: { examId: id },
        select: { codeValue: true },
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
    } catch (error: any) {
      console.error("Download PDF error:", error);
      res.status(500).send(error.message || "Failed to generate PDF");
    }
  });

  app.patch(
    "/api/exams/:id/claim-code",
    authMiddleware,
    requireRole(UserRole.STUDENT),
    async (req: AuthRequest, res) => {
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
            examId: id,
          },
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
            assignedAt: new Date(),
          },
        });

        res.json(updatedCode);
      } catch (error: any) {
        console.error("Claim code error:", error);
        res.status(500).send(error.message || "Failed to claim code");
      }
    }
  );

  // Student Routes
  app.get(
    "/api/student/exams",
    authMiddleware,
    requireRole(UserRole.STUDENT),
    async (req: AuthRequest, res) => {
      try {
        if (!req.user) {
          return res.status(401).send("Not authenticated");
        }

        const exams = await prisma.examSession.findMany({
          where: {
            date: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
          orderBy: { date: "desc" },
          include: {
            anonCodes: {
              where: {
                assignedTo: req.user.id,
              },
            },
          },
        });

        const examsWithClaims = exams.map((exam) => ({
          ...exam,
          claimedCode: exam.anonCodes[0] || undefined,
        }));

        res.json(examsWithClaims);
      } catch (error: any) {
        console.error("Get student exams error:", error);
        res.status(500).send(error.message || "Failed to fetch exams");
      }
    }
  );

  app.get(
    '/api/student/marks'
    ,authMiddleware
    ,requireRole(UserRole.STUDENT)
    ,async (req : AuthRequest, res) =>{
      const id = req.user?.id

      const marks = await prisma.markEntry.findMany({
        where : {
          code : {
            student : {
              id : id
            }
          }
        },
        select : {
          score : true,
          exam : {
            select : {
              courseName : true,
              date : true,
              duration : true
            }
          }
        }
      })

      res.json(marks)
    }
  )
  // Marks Routes
  app.post(
    "/api/marks",
    authMiddleware,
    requireRole(UserRole.MARKER),
    async (req: AuthRequest, res) => {
      try {
        if (!req.user) {
          return res.status(401).send("Not authenticated");
        }

        const { examId, qrCode, score } = req.body;

        if (!examId || !qrCode || score === undefined) {
          return res.status(400).send("Missing required fields");
        }

        if (score < 0 || score > 100) {
          return res.status(400).send("Score must be between 0 and 100");
        }

        const code = await prisma.anonCode.findFirst({
          where: {
            codeValue: qrCode,
            examId,
          },
        });

        if (!code) {
          return res.status(404).send("QR code not found for this exam");
        }

        if (!code.assignedTo) {
          return res.status(400).send("QR code not claimed by any student");
        }

        const existingMark = await prisma.markEntry.findUnique({
          where: { codeId: code.id },
        });

        if (existingMark) {
          const updatedMark = await prisma.markEntry.update({
            where: { id: existingMark.id },
            data: { score },
          });
          return res.json(updatedMark);
        }

        const mark = await prisma.markEntry.create({
          data: {
            examId,
            codeId: code.id,
            score,
            markerId: req.user.id,
          },
        });

        res.json(mark);
      } catch (error: any) {
        console.error("Submit mark error:", error);
        res.status(500).send(error.message || "Failed to submit mark");
      }
    }
  );

  app.get(
    "/api/marks/:examId",
    authMiddleware,
    requireRole(UserRole.MARKER, UserRole.ADMIN),
    async (req: AuthRequest, res) => {
      try {
        const { examId } = req.params;

        const marks = await prisma.markEntry.findMany({
          where: { 
            examId,
            ...(req.user?.role === UserRole.MARKER ? { markerId: req.user.id } : {})
          },
          include: {
            code: {
              select: {
                codeValue: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        const formattedMarks = marks.map(mark => ({
          ...mark,
          codeId: mark.code.codeValue,
        }));

        res.json(formattedMarks);
      } catch (error: any) {
        console.error("Get marks error:", error);
        res.status(500).send(error.message || "Failed to fetch marks");
      }
    }
  );

  // Admin Stats
  app.get(
    "/api/admin/stats",
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req, res) => {
      try {
        const [totalExams, activeExams, codes, marks] = await Promise.all([
          prisma.examSession.count(),
          prisma.examSession.count({
            where: {
              date: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              },
            },
          }),
          prisma.anonCode.count(),
          prisma.markEntry.count(),
        ]);

        const examsWithMarks = await prisma.examSession.findMany({
          include: {
            anonCodes: {
              where: {
                assignedTo: { not: null },
              },
            },
            markEntries: true,
          },
        });

        const pendingReveals = examsWithMarks.filter(
          (exam) => exam.anonCodes.length > exam.markEntries.length
        ).length;

        res.json({
          totalExams,
          activeExams,
          totalQRCodes: codes,
          pendingReveals,
        });
      } catch (error: any) {
        console.error("Get stats error:", error);
        res.status(500).send(error.message || "Failed to fetch stats");
      }
    }
  );

  // Reveal Mapping
  app.get(
    "/api/exams/:id/reveal",
    authMiddleware,
    requireRole(UserRole.ADMIN),
    async (req, res) => {
    try {
      const { id } = req.params;

      const codes = await prisma.anonCode.findMany({
        where: {
          examId: id,
          assignedTo: { not: null },
        },
        include: {
          student: {
            select: {
              name: true,
              email: true,
            },
          },
          markEntry: {
            select: {
              score: true,
            },
          },
        },
      });

      const mappings = codes.map((code) => ({
        studentName: code.student?.name || "Unknown",
        studentEmail: code.student?.email || "Unknown",
        qrCode: code.codeValue,
        score: code.markEntry?.score ?? null,
      }));

      res.json(mappings);
    } catch (error: any) {
      console.error("Get reveal mapping error:", error);
      res.status(500).send(error.message || "Failed to fetch mappings");
    }
  });

  app.get(
    "/api/exams/:id/export-csv",
    authMiddleware,
    requireRole(UserRole.ADMIN),
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
          assignedTo: { not: null },
        },
        include: {
          student: {
            select: {
              name: true,
              email: true,
            },
          },
          markEntry: {
            select: {
              score: true,
            },
          },
        },
      });

      const mappings = codes.map((code) => ({
        studentName: code.student?.name || "Unknown",
        studentEmail: code.student?.email || "Unknown",
        qrCode: code.codeValue,
        score: code.markEntry?.score ?? null,
      }));

      const csvBuffer = await generateCSV(mappings);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${exam.courseName}-results.csv"`
      );
      res.send(csvBuffer);
    } catch (error: any) {
      console.error("Export CSV error:", error);
      res.status(500).send(error.message || "Failed to export CSV");
    }
  });


  const httpServer = createServer(app);
  return httpServer;
}
