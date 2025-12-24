import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { 
  LogOut, 
  Plus, 
  Edit, 
  Trash2, 
  BookOpen,
  Eye,
  EyeOff,
  ArrowLeft,
  Video,
  Headphones,
  FileText,
  ClipboardList
} from "lucide-react";
import { projectId } from "../utils/supabase/info";
import { toast } from "sonner";

interface AdminDashboardProps {
  user: any;
  accessToken: string;
  onLogout: () => void;
}

interface Subject {
  id: string;
  name: string;
  description: string;
}

interface ContentItem {
  url: string;
  title: string;
}

interface Question {
  type: "mcq" | "short_answer";
  question: string;
  options?: string[];
  correctAnswer?: number;
  sampleAnswer?: string;
}

interface Week {
  id: string;
  subjectId: string;
  weekNumber: number;
  title: string;
  description?: string;
  published: boolean;
  videoLinks: ContentItem[];
  audioLinks: ContentItem[];
  pdfLinks: ContentItem[];
  questions: Question[];
}

export function AdminDashboard({ user, accessToken, onLogout }: AdminDashboardProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [showWeekDialog, setShowWeekDialog] = useState(false);
  const [editingWeek, setEditingWeek] = useState<Week | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [subjectForm, setSubjectForm] = useState({
    name: "",
    description: "",
  });

  const [weekForm, setWeekForm] = useState({
    weekNumber: 1,
    title: "",
    description: "",
    published: false,
    videoLinks: [{ url: "", title: "" }] as ContentItem[],
    audioLinks: [{ url: "", title: "" }] as ContentItem[],
    pdfLinks: [{ url: "", title: "" }] as ContentItem[],
    questions: [] as Question[],
  });

  useEffect(() => {
    loadSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      loadWeeks(selectedSubject.id);
    }
  }, [selectedSubject]);

  const loadSubjects = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d2ff195/subjects`
      );
      const data = await response.json();
      setSubjects(data.subjects || []);
    } catch (error) {
      console.error("Error loading subjects:", error);
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const loadWeeks = async (subjectId: string) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d2ff195/weeks/${subjectId}`
      );
      const data = await response.json();
      // Sort weeks by week number
      const sortedWeeks = (data.weeks || []).sort((a: Week, b: Week) => a.weekNumber - b.weekNumber);
      setWeeks(sortedWeeks);
    } catch (error) {
      console.error("Error loading weeks:", error);
      toast.error("Failed to load weeks");
    }
  };

  const createSubject = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d2ff195/admin/subjects`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(subjectForm),
        }
      );

      if (response.ok) {
        setShowSubjectDialog(false);
        setSubjectForm({ name: "", description: "" });
        loadSubjects();
        toast.success("Subject created successfully");
      } else {
        toast.error("Failed to create subject");
      }
    } catch (error) {
      console.error("Error creating subject:", error);
      toast.error("Failed to create subject");
    } finally {
      setSaving(false);
    }
  };

  const deleteSubject = async (subjectId: string) => {
    if (!confirm("Are you sure you want to delete this subject and all its weeks?")) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d2ff195/admin/subjects/${subjectId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        loadSubjects();
        if (selectedSubject?.id === subjectId) {
          setSelectedSubject(null);
        }
        toast.success("Subject deleted");
      }
    } catch (error) {
      console.error("Error deleting subject:", error);
      toast.error("Failed to delete subject");
    }
  };

  // Helper to normalize content links
  const normalizeContentLinks = (links: (string | ContentItem)[]): ContentItem[] => {
    return links.map((item, idx) => {
      if (typeof item === "string") {
        return { url: item, title: "" };
      }
      return item;
    });
  };

  const createOrUpdateWeek = async () => {
    setSaving(true);
    try {
      const weekData = {
        ...weekForm,
        subjectId: selectedSubject!.id,
        videoLinks: weekForm.videoLinks.filter(l => l.url.trim()),
        audioLinks: weekForm.audioLinks.filter(l => l.url.trim()),
        pdfLinks: weekForm.pdfLinks.filter(l => l.url.trim()),
      };

      const url = editingWeek
        ? `https://${projectId}.supabase.co/functions/v1/make-server-4d2ff195/admin/weeks/${editingWeek.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-4d2ff195/admin/weeks`;

      const response = await fetch(url, {
        method: editingWeek ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(weekData),
      });

      if (response.ok) {
        setShowWeekDialog(false);
        setEditingWeek(null);
        resetWeekForm();
        loadWeeks(selectedSubject!.id);
        toast.success(editingWeek ? "Week updated successfully" : "Week created successfully");
      } else {
        toast.error("Failed to save week");
      }
    } catch (error) {
      console.error("Error creating/updating week:", error);
      toast.error("Failed to save week");
    } finally {
      setSaving(false);
    }
  };

  const deleteWeek = async (weekId: string) => {
    if (!confirm("Are you sure you want to delete this week?")) return;

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d2ff195/admin/weeks/${weekId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        loadWeeks(selectedSubject!.id);
        toast.success("Week deleted");
      }
    } catch (error) {
      console.error("Error deleting week:", error);
      toast.error("Failed to delete week");
    }
  };

  const togglePublish = async (week: Week) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d2ff195/admin/weeks/${week.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ ...week, published: !week.published }),
        }
      );

      if (response.ok) {
        loadWeeks(selectedSubject!.id);
        toast.success(week.published ? "Week unpublished" : "Week published");
      }
    } catch (error) {
      console.error("Error toggling publish:", error);
      toast.error("Failed to update week");
    }
  };

  const resetWeekForm = () => {
    setWeekForm({
      weekNumber: weeks.length + 1,
      title: "",
      description: "",
      published: false,
      videoLinks: [{ url: "", title: "" }],
      audioLinks: [{ url: "", title: "" }],
      pdfLinks: [{ url: "", title: "" }],
      questions: [],
    });
  };

  const addContentLink = (type: "videoLinks" | "audioLinks" | "pdfLinks") => {
    setWeekForm({
      ...weekForm,
      [type]: [...weekForm[type], { url: "", title: "" }],
    });
  };

  const updateContentLink = (
    type: "videoLinks" | "audioLinks" | "pdfLinks", 
    index: number, 
    field: "url" | "title",
    value: string
  ) => {
    const links = [...weekForm[type]];
    links[index] = { ...links[index], [field]: value };
    setWeekForm({
      ...weekForm,
      [type]: links,
    });
  };

  const removeContentLink = (type: "videoLinks" | "audioLinks" | "pdfLinks", index: number) => {
    const links = weekForm[type].filter((_, i) => i !== index);
    setWeekForm({
      ...weekForm,
      [type]: links.length > 0 ? links : [{ url: "", title: "" }],
    });
  };

  const addQuestion = (type: "mcq" | "short_answer") => {
    const newQuestion: Question = type === "mcq" 
      ? { type: "mcq", question: "", options: ["", "", "", ""], correctAnswer: 0 }
      : { type: "short_answer", question: "", sampleAnswer: "" };
    
    setWeekForm({
      ...weekForm,
      questions: [...weekForm.questions, newQuestion],
    });
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const questions = [...weekForm.questions];
    questions[index] = { ...questions[index], [field]: value };
    setWeekForm({
      ...weekForm,
      questions,
    });
  };

  const updateQuestionOption = (qIndex: number, oIndex: number, value: string) => {
    const questions = [...weekForm.questions];
    if (questions[qIndex].options) {
      questions[qIndex].options![oIndex] = value;
      setWeekForm({
        ...weekForm,
        questions,
      });
    }
  };

  const removeQuestion = (index: number) => {
    setWeekForm({
      ...weekForm,
      questions: weekForm.questions.filter((_, i) => i !== index),
    });
  };

  const editWeek = (week: Week) => {
    setEditingWeek(week);
    setWeekForm({
      weekNumber: week.weekNumber,
      title: week.title,
      description: week.description || "",
      published: week.published,
      videoLinks: normalizeContentLinks(week.videoLinks).length > 0 
        ? normalizeContentLinks(week.videoLinks) 
        : [{ url: "", title: "" }],
      audioLinks: normalizeContentLinks(week.audioLinks).length > 0 
        ? normalizeContentLinks(week.audioLinks) 
        : [{ url: "", title: "" }],
      pdfLinks: normalizeContentLinks(week.pdfLinks).length > 0 
        ? normalizeContentLinks(week.pdfLinks) 
        : [{ url: "", title: "" }],
      questions: week.questions || [],
    });
    setShowWeekDialog(true);
  };

  const getContentCount = (week: Week) => {
    const videos = (week.videoLinks || []).filter(l => typeof l === "string" ? l : l.url).length;
    const audio = (week.audioLinks || []).filter(l => typeof l === "string" ? l : l.url).length;
    const pdfs = (week.pdfLinks || []).filter(l => typeof l === "string" ? l : l.url).length;
    const questions = (week.questions || []).length;
    return { videos, audio, pdfs, questions };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Subject management view
  if (!selectedSubject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold text-indigo-900">Admin Dashboard</h1>
                <p className="text-gray-600 mt-1">Welcome, {user.name}</p>
              </div>
              <div className="flex gap-2">
                <Dialog open={showSubjectDialog} onOpenChange={setShowSubjectDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="size-4 mr-2" />
                      New Subject
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Subject</DialogTitle>
                      <DialogDescription>Add a new subject for students to access</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="subject-name">Subject Name</Label>
                        <Input
                          id="subject-name"
                          placeholder="e.g., Mathematics 101"
                          value={subjectForm.name}
                          onChange={(e) =>
                            setSubjectForm({ ...subjectForm, name: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="subject-description">Description</Label>
                        <Textarea
                          id="subject-description"
                          placeholder="Brief description of the subject"
                          value={subjectForm.description}
                          onChange={(e) =>
                            setSubjectForm({ ...subjectForm, description: e.target.value })
                          }
                        />
                      </div>
                      <Button onClick={createSubject} className="w-full" disabled={saving || !subjectForm.name}>
                        {saving ? "Creating..." : "Create Subject"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Button onClick={onLogout} variant="outline">
                  <LogOut className="size-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <BookOpen className="size-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Subjects Yet</h3>
                <p className="text-gray-600 mb-4">Create your first subject to get started</p>
                <Button onClick={() => setShowSubjectDialog(true)}>
                  <Plus className="size-4 mr-2" />
                  Create Your First Subject
                </Button>
              </div>
            ) : (
              subjects.map((subject) => (
                <Card key={subject.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <BookOpen className="size-6 text-indigo-600" />
                      </div>
                      <CardTitle className="text-lg">{subject.name}</CardTitle>
                    </div>
                    <CardDescription>{subject.description || "No description"}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Button onClick={() => setSelectedSubject(subject)} className="flex-1">
                      Manage Content
                    </Button>
                    <Button
                      onClick={() => deleteSubject(subject.id)}
                      variant="destructive"
                      size="icon"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  // Week management view
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button onClick={() => setSelectedSubject(null)} variant="ghost" size="sm">
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-indigo-900">{selectedSubject.name}</h1>
                <p className="text-sm text-gray-600">Manage weekly content</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Dialog 
                open={showWeekDialog} 
                onOpenChange={(open) => {
                  setShowWeekDialog(open);
                  if (!open) {
                    setEditingWeek(null);
                    resetWeekForm();
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="size-4 mr-2" />
                    New Week
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] p-0">
                  <DialogHeader className="p-6 pb-0">
                    <DialogTitle>
                      {editingWeek ? "Edit Week" : "Create New Week"}
                    </DialogTitle>
                    <DialogDescription>
                      Add content for this week including videos, audio, PDFs, and practice questions
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="max-h-[calc(90vh-120px)] px-6 pb-6">
                    <div className="space-y-6 pt-4">
                      {/* Basic Info */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="week-number">Week Number</Label>
                          <Input
                            id="week-number"
                            type="number"
                            min="1"
                            value={weekForm.weekNumber}
                            onChange={(e) =>
                              setWeekForm({ ...weekForm, weekNumber: parseInt(e.target.value) || 1 })
                            }
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="week-title">Week Title</Label>
                          <Input
                            id="week-title"
                            placeholder="e.g., Introduction to Algebra"
                            value={weekForm.title}
                            onChange={(e) => setWeekForm({ ...weekForm, title: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="week-description">Description (Optional)</Label>
                        <Textarea
                          id="week-description"
                          placeholder="Brief description of this week's content..."
                          value={weekForm.description}
                          onChange={(e) => setWeekForm({ ...weekForm, description: e.target.value })}
                          rows={2}
                        />
                      </div>

                      {/* Video Links */}
                      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2 text-base">
                            <Video className="size-4 text-indigo-600" />
                            Video Links (YouTube URLs)
                          </Label>
                          <Button onClick={() => addContentLink("videoLinks")} size="sm" variant="outline">
                            <Plus className="size-4 mr-1" />
                            Add Video
                          </Button>
                        </div>
                        {weekForm.videoLinks.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                              <Input
                                placeholder="Video title (optional)"
                                value={item.title}
                                onChange={(e) => updateContentLink("videoLinks", idx, "title", e.target.value)}
                                className="md:col-span-1"
                              />
                              <Input
                                placeholder="https://www.youtube.com/watch?v=..."
                                value={item.url}
                                onChange={(e) => updateContentLink("videoLinks", idx, "url", e.target.value)}
                                className="md:col-span-2"
                              />
                            </div>
                            <Button
                              onClick={() => removeContentLink("videoLinks", idx)}
                              size="icon"
                              variant="ghost"
                              className="shrink-0"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Audio Links */}
                      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2 text-base">
                            <Headphones className="size-4 text-indigo-600" />
                            Audio Links (Google Drive URLs)
                          </Label>
                          <Button onClick={() => addContentLink("audioLinks")} size="sm" variant="outline">
                            <Plus className="size-4 mr-1" />
                            Add Audio
                          </Button>
                        </div>
                        {weekForm.audioLinks.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                              <Input
                                placeholder="Audio title (optional)"
                                value={item.title}
                                onChange={(e) => updateContentLink("audioLinks", idx, "title", e.target.value)}
                                className="md:col-span-1"
                              />
                              <Input
                                placeholder="https://drive.google.com/file/d/..."
                                value={item.url}
                                onChange={(e) => updateContentLink("audioLinks", idx, "url", e.target.value)}
                                className="md:col-span-2"
                              />
                            </div>
                            <Button
                              onClick={() => removeContentLink("audioLinks", idx)}
                              size="icon"
                              variant="ghost"
                              className="shrink-0"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* PDF Links */}
                      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <Label className="flex items-center gap-2 text-base">
                            <FileText className="size-4 text-indigo-600" />
                            PDF/Resource Links (Google Drive URLs)
                          </Label>
                          <Button onClick={() => addContentLink("pdfLinks")} size="sm" variant="outline">
                            <Plus className="size-4 mr-1" />
                            Add PDF
                          </Button>
                        </div>
                        {weekForm.pdfLinks.map((item, idx) => (
                          <div key={idx} className="flex gap-2 items-start">
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                              <Input
                                placeholder="Resource title (optional)"
                                value={item.title}
                                onChange={(e) => updateContentLink("pdfLinks", idx, "title", e.target.value)}
                                className="md:col-span-1"
                              />
                              <Input
                                placeholder="https://drive.google.com/file/d/..."
                                value={item.url}
                                onChange={(e) => updateContentLink("pdfLinks", idx, "url", e.target.value)}
                                className="md:col-span-2"
                              />
                            </div>
                            <Button
                              onClick={() => removeContentLink("pdfLinks", idx)}
                              size="icon"
                              variant="ghost"
                              className="shrink-0"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Practice Questions */}
                      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <Label className="flex items-center gap-2 text-base">
                            <ClipboardList className="size-4 text-indigo-600" />
                            Practice Questions
                          </Label>
                          <div className="flex gap-2">
                            <Button onClick={() => addQuestion("mcq")} size="sm" variant="outline">
                              <Plus className="size-4 mr-1" />
                              MCQ
                            </Button>
                            <Button onClick={() => addQuestion("short_answer")} size="sm" variant="outline">
                              <Plus className="size-4 mr-1" />
                              Short Answer
                            </Button>
                          </div>
                        </div>
                        
                        {weekForm.questions.length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No questions added yet. Click the buttons above to add MCQ or Short Answer questions.
                          </p>
                        )}

                        {weekForm.questions.map((q, qIdx) => (
                          <div key={qIdx} className="p-4 bg-white border rounded-lg space-y-3">
                            <div className="flex items-center justify-between">
                              <Badge variant={q.type === "mcq" ? "default" : "secondary"}>
                                {q.type === "mcq" ? "Multiple Choice" : "Short Answer"}
                              </Badge>
                              <Button
                                onClick={() => removeQuestion(qIdx)}
                                size="sm"
                                variant="ghost"
                              >
                                <Trash2 className="size-4" />
                              </Button>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Question {qIdx + 1}</Label>
                              <Textarea
                                placeholder="Enter your question..."
                                value={q.question}
                                onChange={(e) => updateQuestion(qIdx, "question", e.target.value)}
                                rows={2}
                              />
                            </div>

                            {q.type === "mcq" && q.options && (
                              <div className="space-y-2">
                                <Label>Options (select the correct answer)</Label>
                                {q.options.map((option, oIdx) => (
                                  <div key={oIdx} className="flex items-center gap-2">
                                    <input
                                      type="radio"
                                      name={`correct-${qIdx}`}
                                      checked={q.correctAnswer === oIdx}
                                      onChange={() => updateQuestion(qIdx, "correctAnswer", oIdx)}
                                      className="accent-indigo-600"
                                    />
                                    <Input
                                      placeholder={`Option ${oIdx + 1}`}
                                      value={option}
                                      onChange={(e) => updateQuestionOption(qIdx, oIdx, e.target.value)}
                                      className="flex-1"
                                    />
                                    {q.correctAnswer === oIdx && (
                                      <Badge variant="outline" className="text-green-600 border-green-600">
                                        Correct
                                      </Badge>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {q.type === "short_answer" && (
                              <div className="space-y-2">
                                <Label>Sample Answer (shown after submission)</Label>
                                <Textarea
                                  placeholder="Enter a sample answer for reference..."
                                  value={q.sampleAnswer || ""}
                                  onChange={(e) => updateQuestion(qIdx, "sampleAnswer", e.target.value)}
                                  rows={3}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Publish Toggle */}
                      <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg border border-indigo-100">
                        <div>
                          <Label htmlFor="publish-toggle" className="text-base font-medium">
                            Publish this week
                          </Label>
                          <p className="text-sm text-gray-600">
                            When published, students will be able to see this content
                          </p>
                        </div>
                        <Switch
                          id="publish-toggle"
                          checked={weekForm.published}
                          onCheckedChange={(checked) =>
                            setWeekForm({ ...weekForm, published: checked })
                          }
                        />
                      </div>

                      <Button 
                        onClick={createOrUpdateWeek} 
                        className="w-full" 
                        disabled={saving || !weekForm.title}
                      >
                        {saving ? "Saving..." : editingWeek ? "Update Week" : "Create Week"}
                      </Button>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
              <Button onClick={onLogout} variant="outline" size="sm">
                <LogOut className="size-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-4">
          {weeks.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <BookOpen className="size-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Weeks Yet</h3>
                <p className="text-gray-600 mb-4">Create your first week of content</p>
                <Button onClick={() => setShowWeekDialog(true)}>
                  <Plus className="size-4 mr-2" />
                  Create Your First Week
                </Button>
              </CardContent>
            </Card>
          ) : (
            weeks.map((week) => {
              const counts = getContentCount(week);
              return (
                <Card key={week.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-lg shrink-0 ${
                        week.published ? "bg-green-100" : "bg-gray-100"
                      }`}>
                        <span className={`text-lg font-bold ${
                          week.published ? "text-green-700" : "text-gray-500"
                        }`}>
                          {week.weekNumber}
                        </span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-gray-900">{week.title}</h3>
                          <Badge variant={week.published ? "default" : "secondary"}>
                            {week.published ? (
                              <><Eye className="size-3 mr-1" /> Published</>
                            ) : (
                              <><EyeOff className="size-3 mr-1" /> Draft</>
                            )}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 flex-wrap">
                          {counts.videos > 0 && (
                            <span className="flex items-center gap-1">
                              <Video className="size-3" /> {counts.videos} videos
                            </span>
                          )}
                          {counts.audio > 0 && (
                            <span className="flex items-center gap-1">
                              <Headphones className="size-3" /> {counts.audio} audio
                            </span>
                          )}
                          {counts.pdfs > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="size-3" /> {counts.pdfs} PDFs
                            </span>
                          )}
                          {counts.questions > 0 && (
                            <span className="flex items-center gap-1">
                              <ClipboardList className="size-3" /> {counts.questions} questions
                            </span>
                          )}
                          {counts.videos === 0 && counts.audio === 0 && counts.pdfs === 0 && counts.questions === 0 && (
                            <span className="text-gray-400 italic">No content added</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 shrink-0">
                        <Button
                          onClick={() => togglePublish(week)}
                          variant="outline"
                          size="sm"
                        >
                          {week.published ? "Unpublish" : "Publish"}
                        </Button>
                        <Button onClick={() => editWeek(week)} variant="outline" size="icon">
                          <Edit className="size-4" />
                        </Button>
                        <Button
                          onClick={() => deleteWeek(week.id)}
                          variant="destructive"
                          size="icon"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
