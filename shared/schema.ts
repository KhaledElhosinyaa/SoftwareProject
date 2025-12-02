// TypeScript types for BU Examination QR Masking System
// Generated from Prisma schema

export enum UserRole {
  ADMIN = "ADMIN",
  STUDENT = "STUDENT",
  MARKER = "MARKER"
}

export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  createdAt: Date;
}

export interface ExamSession {
  id: string;
  courseName: string;
  date: Date;
  duration: number;
  createdAt: Date;
}

export interface AnonCode {
  id: string;
  codeValue: string;
  examId: string;
  assignedTo: string | null;
  assignedAt: Date | null;
  createdAt: Date;
}

export interface MarkEntry {
  id: string;
  examId: string;
  codeId: string;
  score: number;
  markerId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Insert types (without auto-generated fields)
export interface InsertUser {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface InsertExamSession {
  courseName: string;
  date: Date;
  duration: number;
}

export interface InsertMarkEntry {
  examId: string;
  codeId: string;
  score: number;
  markerId: string;
}

// Response types for API
export interface UserResponse extends Omit<User, 'password'> {}

export interface ExamWithStats extends ExamSession {
  totalCodes: number;
  claimedCodes: number;
  unclaimedCodes: number;
}

export interface RevealMapping {
  studentName: string;
  studentEmail: string;
  qrCode: string;
  score: number | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials extends InsertUser {}
