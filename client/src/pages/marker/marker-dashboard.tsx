import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { QrCode, Save, FileText } from "lucide-react";
import { ExamSession, MarkEntry } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";

export default function MarkerDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedExamId, setSelectedExamId] = useState<string>("");
  const [qrCode, setQrCode] = useState("");
  const [score, setScore] = useState("");

  const { data: exams, isLoading: examsLoading } = useQuery<ExamSession[]>({
    queryKey: ["/api/exams"],
  });

  const { data: marks, isLoading: marksLoading } = useQuery<MarkEntry[]>({
    queryKey: ["/api/marks", selectedExamId],
    enabled: !!selectedExamId,
  });

  const submitMarkMutation = useMutation({
    mutationFn: async (data: { examId: string; qrCode: string; score: number }) => {
      const res = await apiRequest("POST", "/api/marks", data);
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to submit mark");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/marks", selectedExamId] });
      toast({
        title: "Mark submitted successfully",
        description: "The grade has been recorded",
      });
      setQrCode("");
      setScore("");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to submit mark",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedExamId && qrCode && score) {
      submitMarkMutation.mutate({
        examId: selectedExamId,
        qrCode: qrCode.trim(),
        score: parseFloat(score),
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Marker Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {user?.name}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Enter Mark</CardTitle>
              <CardDescription>
                Grade submissions using QR codes only (student identities are hidden)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="exam">Examination</Label>
                  <Select value={selectedExamId} onValueChange={setSelectedExamId}>
                    <SelectTrigger id="exam" data-testid="select-exam">
                      <SelectValue placeholder="Select an exam" />
                    </SelectTrigger>
                    <SelectContent>
                      {examsLoading ? (
                        <div className="p-2">Loading exams...</div>
                      ) : exams && exams.length > 0 ? (
                        exams.map((exam) => (
                          <SelectItem key={exam.id} value={exam.id} data-testid={`exam-option-${exam.id}`}>
                            {exam.courseName}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-sm text-muted-foreground">No exams available</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="qrCode">
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4" />
                      QR Code
                    </div>
                  </Label>
                  <Input
                    id="qrCode"
                    placeholder="Enter or scan QR code"
                    value={qrCode}
                    onChange={(e) => setQrCode(e.target.value)}
                    required
                    className="font-mono"
                    data-testid="input-qr-code"
                  />
                  <p className="text-sm text-muted-foreground">
                    The QR code from the student's exam paper
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="score">Score (0-100)</Label>
                  <Input
                    id="score"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="Enter score"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    required
                    data-testid="input-score"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={!selectedExamId || !qrCode || !score || submitMarkMutation.isPending}
                  data-testid="button-submit-mark"
                >
                  {submitMarkMutation.isPending ? (
                    "Submitting..."
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Submit Mark
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Anonymous Grading</CardTitle>
              <CardDescription>How it works</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                <h4 className="font-semibold text-sm mb-2">Maintaining Anonymity</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>You will only see QR codes, not student names</li>
                  <li>Each QR code is randomly assigned to a student</li>
                  <li>Student identities are revealed only after all marking is complete</li>
                  <li>This ensures fair and unbiased grading</li>
                </ul>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-semibold text-sm mb-2">Grading Process</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Select the examination from the dropdown</li>
                  <li>Enter the QR code from the exam paper</li>
                  <li>Input the score (0-100)</li>
                  <li>Submit the mark</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedExamId && (
          <Card>
            <CardHeader>
              <CardTitle>Submitted Marks</CardTitle>
              <CardDescription>
                Marks you've entered for this examination
              </CardDescription>
            </CardHeader>
            <CardContent>
              {marksLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : marks && marks.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>QR Code</TableHead>
                        <TableHead className="text-right">Score</TableHead>
                        <TableHead className="text-right">Submitted</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {marks.map((mark) => (
                        <TableRow key={mark.id} data-testid={`mark-row-${mark.id}`}>
                          <TableCell className="font-mono" data-testid={`mark-qr-${mark.id}`}>
                            {mark.codeId}
                          </TableCell>
                          <TableCell className="text-right font-semibold" data-testid={`mark-score-${mark.id}`}>
                            {mark.score}%
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">
                            {new Date(mark.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No marks submitted yet for this exam</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
