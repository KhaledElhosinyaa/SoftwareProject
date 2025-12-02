import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, QrCode, Download, Plus } from "lucide-react";
import { ExamSession, AnonCode } from "@shared/schema";

export default function QRCodesPage() {
  const [, params] = useRoute("/admin/exams/:id/qr-codes");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const examId = params?.id;
  const [codeCount, setCodeCount] = useState(50);

  const { data: exam, isLoading: examLoading } = useQuery<ExamSession>({
    queryKey: ["/api/exams", examId],
    enabled: !!examId,
  });

  const { data: codes, isLoading: codesLoading } = useQuery<AnonCode[]>({
    queryKey: ["/api/exams", examId, "codes"],
    enabled: !!examId,
  });

  const generateCodesMutation = useMutation({
    mutationFn: async (count: number) => {
      const res = await apiRequest("POST", `/api/exams/${examId}/generate-codes`, { count });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams", examId, "codes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "QR codes generated",
        description: `${codeCount} QR codes have been created`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate codes",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadPDFMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", `/api/exams/${examId}/download-pdf`);
      if (!res.ok) throw new Error(await res.text());
      return await res.blob();
    },
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${exam?.courseName || "exam"}-qr-codes.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast({
        title: "PDF downloaded",
        description: "QR codes PDF has been downloaded",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to download PDF",
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

  const claimedCount = codes?.filter((c) => c.assignedTo).length || 0;
  const unclaimedCount = (codes?.length || 0) - claimedCount;

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
            <p className="text-muted-foreground">Manage QR codes for this examination</p>
          </div>
          {codes && codes.length > 0 && (
            <Button
              onClick={() => downloadPDFMutation.mutate()}
              disabled={downloadPDFMutation.isPending}
              data-testid="button-download-pdf"
            >
              <Download className="h-4 w-4 mr-2" />
              {downloadPDFMutation.isPending ? "Generating PDF..." : "Download PDF"}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Codes</CardTitle>
              <QrCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-codes">
                {codes?.length || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Claimed</CardTitle>
              <Badge variant="default">Active</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary" data-testid="stat-claimed-codes">
                {claimedCount}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unclaimed</CardTitle>
              <Badge variant="secondary">Pending</Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground" data-testid="stat-unclaimed-codes">
                {unclaimedCount}
              </div>
            </CardContent>
          </Card>
        </div>

        {!codes || codes.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>Generate QR Codes</CardTitle>
              <CardDescription>
                Create random QR codes for students to claim during the exam
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="codeCount">Number of QR Codes</Label>
                <Input
                  id="codeCount"
                  type="number"
                  min="1"
                  max="500"
                  value={codeCount}
                  onChange={(e) => setCodeCount(parseInt(e.target.value))}
                  data-testid="input-code-count"
                />
                <p className="text-sm text-muted-foreground">
                  Generate one code per expected student (plus a few extras)
                </p>
              </div>
              <Button
                onClick={() => generateCodesMutation.mutate(codeCount)}
                disabled={generateCodesMutation.isPending}
                data-testid="button-generate-codes"
              >
                <Plus className="h-4 w-4 mr-2" />
                {generateCodesMutation.isPending ? "Generating..." : `Generate ${codeCount} QR Codes`}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>QR Code List</CardTitle>
              <CardDescription>All generated codes for this examination</CardDescription>
            </CardHeader>
            <CardContent>
              {codesLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {codes.map((code) => (
                    <div
                      key={code.id}
                      className="flex items-center justify-between p-3 border rounded-md hover-elevate"
                      data-testid={`code-item-${code.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <QrCode className="h-5 w-5 text-muted-foreground" />
                        <code className="font-mono text-sm" data-testid={`code-value-${code.id}`}>
                          {code.codeValue}
                        </code>
                      </div>
                      <Badge variant={code.assignedTo ? "default" : "secondary"}>
                        {code.assignedTo ? "Claimed" : "Unclaimed"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
