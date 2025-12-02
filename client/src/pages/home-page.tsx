import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { UserRole } from "@shared/schema";
import { Loader2 } from "lucide-react";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && user) {
      switch (user.role) {
        case UserRole.ADMIN:
          setLocation("/admin");
          break;
        case UserRole.STUDENT:
          setLocation("/student");
          break;
        case UserRole.MARKER:
          setLocation("/marker");
          break;
        default:
          setLocation("/auth");
      }
    }
  }, [user, isLoading, setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" data-testid="loading-redirect" />
    </div>
  );
}
