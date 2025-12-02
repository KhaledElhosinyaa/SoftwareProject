import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Plus, FileText, QrCode, Eye, Calendar, Clock } from "lucide-react";
import { ExamWithStats } from "@shared/schema";
import { format } from "date-fns";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();

  const { data: exams, isLoading } = useQuery<ExamWithStats[]>({
    queryKey: ["/api/exams"],
  });

  const { data: stats } = useQuery<{
    totalExams: number;
    activeExams: number;
    totalQRCodes: number;
    pendingReveals: number;
  }>({
    queryKey: ["/api/admin/stats"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage examination sessions and QR codes</p>
          </div>
          <Button onClick={() => setLocation("/admin/exams/create")} data-testid="button-create-exam">
            <Plus className="h-4 w-4 mr-2" />
            Create Exam
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-exams">
                {stats?.totalExams ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">All examination sessions</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-active-exams">
                {stats?.activeExams ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Currently ongoing</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">QR Codes Generated</CardTitle>
              <QrCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-qr-codes">
                {stats?.totalQRCodes ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Total codes created</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Reveals</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-pending-reveals">
                {stats?.pendingReveals ?? 0}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting grade publication</p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Examination Sessions</CardTitle>
            <CardDescription>Manage and monitor all exam sessions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : exams && exams.length > 0 ? (
              <div className="space-y-4">
                {exams.map((exam) => (
                  <Card key={exam.id} className="hover-elevate" data-testid={`exam-card-${exam.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold text-card-foreground">
                              {exam.courseName}
                            </h3>
                            <Badge variant={exam.claimedCodes === exam.totalCodes ? "secondary" : "default"}>
                              {exam.claimedCodes}/{exam.totalCodes} Claimed
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(exam.date), "PPP")}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {exam.duration} minutes
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/admin/exams/${exam.id}/qr-codes`)}
                            data-testid={`button-view-qr-${exam.id}`}
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            QR Codes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/admin/exams/${exam.id}/reveal`)}
                            data-testid={`button-reveal-${exam.id}`}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Reveal
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No exams yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first examination session to get started
                </p>
                <Button onClick={() => setLocation("/admin/exams/create")} data-testid="button-create-first-exam">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Exam
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
