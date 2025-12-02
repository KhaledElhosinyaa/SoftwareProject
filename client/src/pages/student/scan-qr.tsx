import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, QrCode, Camera, CheckCircle2, Keyboard } from "lucide-react";
import { ExamSession } from "@shared/schema";
import { Html5Qrcode } from "html5-qrcode";

export default function ScanQRPage() {
  const [, params] = useRoute("/student/scan/:examId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const examId = params?.examId;
  const [manualCode, setManualCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [useManualEntry, setUseManualEntry] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);

  const { data: exam } = useQuery<ExamSession>({
    queryKey: ["/api/exams", examId],
    enabled: !!examId,
  });

  const claimCodeMutation = useMutation({
    mutationFn: async (codeValue: string) => {
      const res = await apiRequest("PATCH", `/api/exams/${examId}/claim-code`, { codeValue });
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error || "Failed to claim code");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/student/exams"] });
      toast({
        title: "QR Code claimed successfully!",
        description: "Your anonymous identity has been assigned",
      });
      setLocation("/student");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to claim code",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startScanner = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;
      setIsScanning(true);
      setCameraPermissionDenied(false);

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          stopScanner();
          claimCodeMutation.mutate(decodedText);
        },
        () => {
          // Error callback - ignore scanning errors
        }
      );
    } catch (err) {
      console.error("Camera error:", err);
      setCameraPermissionDenied(true);
      setUseManualEntry(true);
      toast({
        title: "Camera access denied",
        description: "Please use manual entry or allow camera access",
        variant: "destructive",
      });
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
        setIsScanning(false);
      } catch (err) {
        console.error("Error stopping scanner:", err);
      }
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      claimCodeMutation.mutate(manualCode.trim());
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              stopScanner();
              setLocation("/student");
            }}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Scan QR Code</h1>
            <p className="text-muted-foreground">{exam?.courseName}</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <Button
            variant={!useManualEntry ? "default" : "outline"}
            onClick={() => {
              setUseManualEntry(false);
              stopScanner();
            }}
            disabled={cameraPermissionDenied}
            data-testid="button-camera-mode"
          >
            <Camera className="h-4 w-4 mr-2" />
            Camera
          </Button>
          <Button
            variant={useManualEntry ? "default" : "outline"}
            onClick={() => {
              stopScanner();
              setUseManualEntry(true);
            }}
            data-testid="button-manual-mode"
          >
            <Keyboard className="h-4 w-4 mr-2" />
            Manual Entry
          </Button>
        </div>

        {!useManualEntry ? (
          <Card>
            <CardHeader>
              <CardTitle>Camera Scanner</CardTitle>
              <CardDescription>
                Position the QR code within the frame to scan automatically
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                id="qr-reader"
                className="w-full rounded-lg overflow-hidden bg-muted"
                style={{ minHeight: "300px" }}
                data-testid="qr-scanner"
              ></div>

              {!isScanning ? (
                <Button
                  onClick={startScanner}
                  className="w-full"
                  disabled={claimCodeMutation.isPending}
                  data-testid="button-start-scanner"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={stopScanner}
                  className="w-full"
                  data-testid="button-stop-scanner"
                >
                  Stop Camera
                </Button>
              )}

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Instructions:</strong> Hold the QR code sheet steady in front of your
                  camera. The code will be automatically detected and claimed.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Manual Entry</CardTitle>
              <CardDescription>
                Type the QR code value from your exam sheet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="qrCode">QR Code Value</Label>
                  <Input
                    id="qrCode"
                    placeholder="Enter the code from your QR sheet"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    required
                    className="font-mono"
                    data-testid="input-manual-code"
                  />
                  <p className="text-sm text-muted-foreground">
                    The code is printed below the QR code image on your exam sheet
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={claimCodeMutation.isPending || !manualCode.trim()}
                  data-testid="button-submit-manual"
                >
                  {claimCodeMutation.isPending ? (
                    "Claiming..."
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Claim QR Code
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Important
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Each QR code can only be claimed once</li>
              <li>Make sure to write this QR code on your exam paper</li>
              <li>Do not write your name or student ID on the exam</li>
              <li>Keep your QR code confidential to maintain anonymity</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
