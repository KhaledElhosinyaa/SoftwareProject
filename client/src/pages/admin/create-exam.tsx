import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Calendar, Clock, BookOpen } from "lucide-react";

export default function CreateExam() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    courseName: "",
    date: "",
    duration: 180,
  });

  const createExamMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/exams", {
        ...data,
        date: new Date(data.date),
      });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    },
    onSuccess: (exam) => {
      queryClient.invalidateQueries({ queryKey: ["/api/exams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Exam created successfully",
        description: `${exam.courseName} has been created`,
      });
      setLocation(`/admin/exams/${exam.id}/qr-codes`);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create exam",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createExamMutation.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/admin")}
            data-testid="button-back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Create Examination Session</h1>
            <p className="text-muted-foreground">Set up a new exam session and generate QR codes</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Exam Details</CardTitle>
            <CardDescription>Provide basic information about the examination</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="courseName">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Course Name
                  </div>
                </Label>
                <Input
                  id="courseName"
                  placeholder="e.g., Introduction to Computer Science"
                  value={formData.courseName}
                  onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                  required
                  data-testid="input-course-name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Exam Date & Time
                  </div>
                </Label>
                <Input
                  id="date"
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                  data-testid="input-exam-date"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Duration (minutes)
                  </div>
                </Label>
                <Input
                  id="duration"
                  type="number"
                  min="30"
                  max="300"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                  required
                  data-testid="input-duration"
                />
                <p className="text-sm text-muted-foreground">
                  Typical exam durations: 90, 120, or 180 minutes
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLocation("/admin")}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createExamMutation.isPending}
                  data-testid="button-create-exam"
                >
                  {createExamMutation.isPending ? "Creating..." : "Create Exam & Generate QR Codes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-base">Next Steps</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>After creating the exam, you will be able to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Generate random QR codes for students</li>
              <li>Download printable PDF sheets with QR codes</li>
              <li>Monitor QR code claiming status</li>
              <li>Reveal student-to-grade mappings after marking</li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
