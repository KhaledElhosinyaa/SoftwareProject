import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { QrCode, Calendar, Clock, CheckCircle2 } from "lucide-react";
import { ExamSession, AnonCode } from "@shared/schema";
import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";

interface ExamWithClaim extends ExamSession {
  claimedCode?: AnonCode;
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: exams, isLoading } = useQuery<ExamWithClaim[]>({
    queryKey: ["/api/student/exams"],
  });

  const { data: marks } = useQuery<any[]>({
    queryKey: ["/api/student/marks"],
  });

  console.log(marks)

  

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Student Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {user?.name}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Examinations</CardTitle>
            <CardDescription>Scan QR codes to claim your anonymous identity for exams</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : exams && exams.length > 0 ? (
              <div className="space-y-4">
                {exams.map((exam) => (
                  <Card key={exam.id} className="hover-elevate" data-testid={`exam-card-${exam.id}`}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-semibold text-card-foreground">
                              {exam.courseName}
                            </h3>
                            {exam.claimedCode ? (
                              <Badge variant="default" data-testid={`badge-claimed-${exam.id}`}>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                QR Claimed
                              </Badge>
                            ) : (
                              <Badge variant="secondary" data-testid={`badge-unclaimed-${exam.id}`}>
                                Pending
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(exam.date), "PPP")}
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              {exam.duration} minutes
                            </div>
                          </div>
                          {exam.claimedCode && (
                            <div className="p-3 bg-primary/10 rounded-md border border-primary/20">
                              <p className="text-sm text-muted-foreground mb-1">Your QR Code:</p>
                              <code className="font-mono text-lg font-semibold" data-testid={`claimed-code-${exam.id}`}>
                                {exam.claimedCode.codeValue}
                              </code>
                            </div>
                          )}
                        </div>
                        {!exam.claimedCode && (
                          <Button
                            onClick={() => setLocation(`/student/scan/${exam.id}`)}
                            data-testid={`button-scan-${exam.id}`}
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            Scan QR Code
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <QrCode className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No active exams</h3>
                <p className="text-muted-foreground">
                  There are no upcoming examinations at this time
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">How it works</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>Anonymous grading process:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>When you arrive at the exam, you'll receive a random QR code sheet</li>
              <li>Use this portal to scan the QR code and claim it as yours</li>
              <li>Write only the QR code on your exam paper (not your name)</li>
              <li>Markers will grade using only the QR code, ensuring anonymity</li>
              <li>Results will be published after all grading is complete</li>
            </ol>
          </CardContent>
        </Card> */}


        <Card>
  <CardHeader>
    <CardTitle>Exam Results</CardTitle>
    <CardDescription>Performance overview across completed examinations</CardDescription>
  </CardHeader>
  <CardContent>
    {!marks || marks.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground">
        No results available
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-3">Course</th>
              <th className="text-left py-2 px-3">Date</th>
              <th className="text-left py-2 px-3">Duration</th>
              <th className="text-left py-2 px-3">Score</th>
            </tr>
          </thead>
          <tbody>
            {marks.map((mark) => (
              <tr key={mark.id} className="border-b hover:bg-muted/30">
                <td className="py-2 px-3">{mark.exam.courseName}</td>
                <td className="py-2 px-3">
                  {/* {format(mark.exam.date.toIsoString(), "PPP")} */}
                      {format(new Date(mark.exam.date), "PPP")}
                </td>
                <td className="py-2 px-3">{mark.exam.duration} min</td>
                <td className="py-2 px-3 font-semibold">{mark.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </CardContent>
</Card>

      </main>
    </div>
  );
}
