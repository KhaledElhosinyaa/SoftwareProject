import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Download, Search } from "lucide-react";
import { ExamSession, RevealMapping } from "@shared/schema";
import { useState } from "react";

export default function RevealMappingPage() {
  const [, params] = useRoute("/admin/exams/:id/reveal");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const examId = params?.id;
  const [searchQuery, setSearchQuery] = useState("");

  const { data: exam, isLoading: examLoading } = useQuery<ExamSession>({
    queryKey: ["/api/exams", examId],
    enabled: !!examId,
  });

  const { data: mappings, isLoading: mappingsLoading } = useQuery<RevealMapping[]>({
    queryKey: ["/api/exams", examId, "reveal"],
    enabled: !!examId,
  });

  const downloadCSVMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/exams/${examId}/export-csv`);
      if (!res.ok) throw new Error(await res.text());
      return await res.blob();
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exam?.courseName || "exam"}-results.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "CSV exported",
        description: "Results have been downloaded",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to export CSV",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (examLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto p-6">
          <Skeleton className="h-12 w-64 mb-6" />
          <Skeleton className="h-96 w-full" />
        </main>
      </div>
    );
  }

  const filteredMappings = mappings?.filter(
    (m) =>
      m.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.qrCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSubmissions = mappings?.filter((m) => m.score !== null).length || 0;
  const averageScore = mappings?.length
    ? mappings.reduce((sum, m) => sum + (m.score || 0), 0) / mappings.filter((m) => m.score !== null).length
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-foreground">{exam?.courseName}</h1>
            <p className="text-muted-foreground">Student to QR code mapping and results</p>
          </div>
          {mappings && mappings.length > 0 && (
            <Button
              onClick={() => downloadCSVMutation.mutate()}
              disabled={downloadCSVMutation.isPending}
              data-testid="button-export-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadCSVMutation.isPending ? "Exporting..." : "Export CSV"}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-students">
                {mappings?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Graded Submissions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary" data-testid="stat-graded">
                {totalSubmissions}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-average-score">
                {averageScore.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Results Mapping</CardTitle>
                <CardDescription>QR code to student identity mapping with scores</CardDescription>
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {mappingsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredMappings && filteredMappings.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>QR Code</TableHead>
                      <TableHead className="text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMappings.map((mapping, index) => (
                      <TableRow key={index} data-testid={`mapping-row-${index}`}>
                        <TableCell className="font-medium" data-testid={`student-name-${index}`}>
                          {mapping.studentName}
                        </TableCell>
                        <TableCell className="text-muted-foreground" data-testid={`student-email-${index}`}>
                          {mapping.studentEmail}
                        </TableCell>
                        <TableCell>
                          <code className="font-mono text-sm" data-testid={`qr-code-${index}`}>
                            {mapping.qrCode}
                          </code>
                        </TableCell>
                        <TableCell className="text-right" data-testid={`score-${index}`}>
                          {mapping.score !== null ? (
                            <span className="font-semibold">{mapping.score}%</span>
                          ) : (
                            <span className="text-muted-foreground">Not graded</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  {searchQuery ? "No results found" : "No students have claimed QR codes yet"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
