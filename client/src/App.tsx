import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { UserRole } from "@shared/schema";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin/admin-dashboard";
import CreateExam from "@/pages/admin/create-exam";
import QRCodesPage from "@/pages/admin/qr-codes";
import RevealMappingPage from "@/pages/admin/reveal-mapping";
import StudentDashboard from "@/pages/student/student-dashboard";
import ScanQRPage from "@/pages/student/scan-qr";
import MarkerDashboard from "@/pages/marker/marker-dashboard";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={HomePage} />
      
      {/* Admin Routes */}
      <ProtectedRoute path="/admin" component={AdminDashboard} allowedRoles={[UserRole.ADMIN]} />
      <ProtectedRoute path="/admin/exams/create" component={CreateExam} allowedRoles={[UserRole.ADMIN]} />
      <ProtectedRoute path="/admin/exams/:id/qr-codes" component={QRCodesPage} allowedRoles={[UserRole.ADMIN]} />
      <ProtectedRoute path="/admin/exams/:id/reveal" component={RevealMappingPage} allowedRoles={[UserRole.ADMIN]} />
      
      {/* Student Routes */}
      <ProtectedRoute path="/student" component={StudentDashboard} allowedRoles={[UserRole.STUDENT]} />
      <ProtectedRoute path="/student/scan/:examId" component={ScanQRPage} allowedRoles={[UserRole.STUDENT]} />
      
      {/* Marker Routes */}
      <ProtectedRoute path="/marker" component={MarkerDashboard} allowedRoles={[UserRole.MARKER]} />
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
