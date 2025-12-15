import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
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

interface Week {
  id: string;
  subjectId: string;
  weekNumber: number;
  title: string;
  published: boolean;
  videoLinks: string[];
  audioLinks: string[];
  pdfLinks: string[];
  questions: { question: string; options: string[]; correctAnswer: number }[];
}

export function AdminDashboard({ user, accessToken, onLogout }: AdminDashboardProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [showSubjectDialog, setShowSubjectDialog] = useState(false);
  const [showWeekDialog, setShowWeekDialog] = useState(false);
  const [editingWeek, setEditingWeek] = useState<Week | null>(null);
  const [loading, setLoading] = useState(true);

  const [subjectForm, setSubjectForm] = useState({
    name: "",
    description: "",
  });

  const [weekForm, setWeekForm] = useState({
    weekNumber: 1,
    title: "",
    published: false,
    videoLinks: [""],
    audioLinks: [""],
    pdfLinks: [""],
    questions: [] as { question: string; options: string[]; correctAnswer: number }[],
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
      setWeeks(data.weeks || []);
    } catch (error) {
      console.error("Error loading weeks:", error);
    }
  };

  const createSubject = async () => {
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
      }
    } catch (error) {
      console.error("Error creating subject:", error);
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
      }
    } catch (error) {
      console.error("Error deleting subject:", error);
    }
  };

  const createOrUpdateWeek = async () => {
    try {
      const weekData = {
        ...weekForm,
        subjectId: selectedSubject!.id,
        videoLinks: weekForm.videoLinks.filter(l => l.trim()),
        audioLinks: weekForm.audioLinks.filter(l => l.trim()),
        pdfLinks: weekForm.pdfLinks.filter(l => l.trim()),
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
      }
    } catch (error) {
      console.error("Error creating/updating week:", error);
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
      }
    } catch (error) {
      console.error("Error deleting week:", error);
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
      }
    } catch (error) {
      console.error("Error toggling publish:", error);
    }
  };

  const resetWeekForm = () => {
    setWeekForm({
      weekNumber: weeks.length + 1,
      title: "",
      published: false,
      videoLinks: [""],
      audioLinks: [""],
      pdfLinks: [""],
      questions: [],
    });
  };

  const addLink = (type: "videoLinks" | "audioLinks" | "pdfLinks") => {
    setWeekForm({
      ...weekForm,
      [type]: [...weekForm[type], ""],
    });
  };

  const updateLink = (type: "videoLinks" | "audioLinks" | "pdfLinks", index: number, value: string) => {
    const links = [...weekForm[type]];
    links[index] = value;
    setWeekForm({
      ...weekForm,
      [type]: links,
    });
  };

  const removeLink = (type: "videoLinks" | "audioLinks" | "pdfLinks", index: number) => {
    const links = weekForm[type].filter((_, i) => i !== index);
    setWeekForm({
      ...weekForm,
      [type]: links,
    });
  };

  const addQuestion = () => {
    setWeekForm({
      ...weekForm,
      questions: [
        ...weekForm.questions,
        { question: "", options: ["", "", "", ""], correctAnswer: 0 },
      ],
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
    questions[qIndex].options[oIndex] = value;
    setWeekForm({
      ...weekForm,
      questions,
    });
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
      published: week.published,
      videoLinks: week.videoLinks.length > 0 ? week.videoLinks : [""],
      audioLinks: week.audioLinks.length > 0 ? week.audioLinks : [""],
      pdfLinks: week.pdfLinks.length > 0 ? week.pdfLinks : [""],
      questions: week.questions || [],
    });
    setShowWeekDialog(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Subject management view
  if (!selectedSubject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-indigo-900">Admin Dashboard</h1>
                <p className="text-gray-600">Welcome, {user.name}</p>
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
                      <Button onClick={createSubject} className="w-full">
                        Create Subject
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
              <div className="col-span-full text-center py-12">
                <BookOpen className="size-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">No subjects created yet</p>
                <Button onClick={() => setShowSubjectDialog(true)}>
                  <Plus className="size-4 mr-2" />
                  Create Your First Subject
                </Button>
              </div>
            ) : (
              subjects.map((subject) => (
                <Card key={subject.id}>
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <BookOpen className="size-6 text-indigo-600" />
                      </div>
                      <CardTitle>{subject.name}</CardTitle>
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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button onClick={() => setSelectedSubject(null)} variant="ghost" size="sm">
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <h1 className="text-indigo-900">{selectedSubject.name}</h1>
                <p className="text-gray-600">Manage weekly content</p>
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
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingWeek ? "Edit Week" : "Create New Week"}
                    </DialogTitle>
                    <DialogDescription>
                      Add content for this week including videos, audio, PDFs, and practice questions
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="week-number">Week Number</Label>
                        <Input
                          id="week-number"
                          type="number"
                          min="1"
                          value={weekForm.weekNumber}
                          onChange={(e) =>
                            setWeekForm({ ...weekForm, weekNumber: parseInt(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="week-title">Week Title</Label>
                        <Input
                          id="week-title"
                          placeholder="e.g., Introduction to Algebra"
                          value={weekForm.title}
                          onChange={(e) => setWeekForm({ ...weekForm, title: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Video Links */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Video className="size-4" />
                          Video Links (YouTube URLs)
                        </Label>
                        <Button onClick={() => addLink("videoLinks")} size="sm" variant="outline">
                          <Plus className="size-4 mr-1" />
                          Add Video
                        </Button>
                      </div>
                      {weekForm.videoLinks.map((link, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={link}
                            onChange={(e) => updateLink("videoLinks", idx, e.target.value)}
                          />
                          <Button
                            onClick={() => removeLink("videoLinks", idx)}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Audio Links */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Headphones className="size-4" />
                          Audio Links (Google Drive URLs)
                        </Label>
                        <Button onClick={() => addLink("audioLinks")} size="sm" variant="outline">
                          <Plus className="size-4 mr-1" />
                          Add Audio
                        </Button>
                      </div>
                      {weekForm.audioLinks.map((link, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            placeholder="https://drive.google.com/file/d/..."
                            value={link}
                            onChange={(e) => updateLink("audioLinks", idx, e.target.value)}
                          />
                          <Button
                            onClick={() => removeLink("audioLinks", idx)}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* PDF Links */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <FileText className="size-4" />
                          PDF Links (Google Drive URLs)
                        </Label>
                        <Button onClick={() => addLink("pdfLinks")} size="sm" variant="outline">
                          <Plus className="size-4 mr-1" />
                          Add PDF
                        </Button>
                      </div>
                      {weekForm.pdfLinks.map((link, idx) => (
                        <div key={idx} className="flex gap-2">
                          <Input
                            placeholder="https://drive.google.com/file/d/..."
                            value={link}
                            onChange={(e) => updateLink("pdfLinks", idx, e.target.value)}
                          />
                          <Button
                            onClick={() => removeLink("pdfLinks", idx)}
                            size="icon"
                            variant="ghost"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Practice Questions */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <ClipboardList className="size-4" />
                          Practice Questions
                        </Label>
                        <Button onClick={addQuestion} size="sm" variant="outline">
                          <Plus className="size-4 mr-1" />
                          Add Question
                        </Button>
                      </div>
                      {weekForm.questions.map((q, qIdx) => (
                        <div key={qIdx} className="p-4 border rounded-lg space-y-3">
                          <div className="flex gap-2">
                            <Input
                              placeholder={`Question ${qIdx + 1}`}
                              value={q.question}
                              onChange={(e) => updateQuestion(qIdx, "question", e.target.value)}
                            />
                            <Button
                              onClick={() => removeQuestion(qIdx)}
                              size="icon"
                              variant="ghost"
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                          <div className="space-y-2 pl-4">
                            {q.options.map((option, oIdx) => (
                              <div key={oIdx} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`correct-${qIdx}`}
                                  checked={q.correctAnswer === oIdx}
                                  onChange={() => updateQuestion(qIdx, "correctAnswer", oIdx)}
                                />
                                <Input
                                  placeholder={`Option ${oIdx + 1}`}
                                  value={option}
                                  onChange={(e) =>
                                    updateQuestionOption(qIdx, oIdx, e.target.value)
                                  }
                                />
                                <span className="text-xs text-gray-500">
                                  {q.correctAnswer === oIdx && "(Correct)"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Publish Toggle */}
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <Label htmlFor="publish-toggle">Publish this week for students</Label>
                      <Switch
                        id="publish-toggle"
                        checked={weekForm.published}
                        onCheckedChange={(checked) =>
                          setWeekForm({ ...weekForm, published: checked })
                        }
                      />
                    </div>

                    <Button onClick={createOrUpdateWeek} className="w-full">
                      {editingWeek ? "Update Week" : "Create Week"}
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
        <div className="space-y-4">
          {weeks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="size-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 mb-4">No weeks created yet</p>
                <Button onClick={() => setShowWeekDialog(true)}>
                  <Plus className="size-4 mr-2" />
                  Create Your First Week
                </Button>
              </CardContent>
            </Card>
          ) : (
            weeks.map((week) => (
              <Card key={week.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 mb-2">
                        Week {week.weekNumber}: {week.title}
                        <Badge variant={week.published ? "default" : "secondary"}>
                          {week.published ? (
                            <>
                              <Eye className="size-3 mr-1" />
                              Published
                            </>
                          ) : (
                            <>
                              <EyeOff className="size-3 mr-1" />
                              Draft
                            </>
                          )}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {week.videoLinks.filter(l => l).length} videos •{" "}
                        {week.audioLinks.filter(l => l).length} audio files •{" "}
                        {week.pdfLinks.filter(l => l).length} PDFs •{" "}
                        {week.questions.length} practice questions
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => togglePublish(week)}
                        variant="outline"
                        size="sm"
                      >
                        {week.published ? "Unpublish" : "Publish"}
                      </Button>
                      <Button onClick={() => editWeek(week)} variant="outline" size="sm">
                        <Edit className="size-4" />
                      </Button>
                      <Button
                        onClick={() => deleteWeek(week.id)}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
