import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Progress } from "./ui/progress";
import { Textarea } from "./ui/textarea";
import { ScrollArea } from "./ui/scroll-area";
import { 
  BookOpen, 
  Video, 
  Headphones, 
  FileText, 
  ClipboardList, 
  LogOut, 
  Lock, 
  CheckCircle,
  ArrowLeft,
  Circle,
  Play,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { projectId } from "../utils/supabase/info";
import { toast } from "sonner";

interface StudentDashboardProps {
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
  title?: string;
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
  videoLinks: (string | ContentItem)[];
  audioLinks: (string | ContentItem)[];
  pdfLinks: (string | ContentItem)[];
  questions: Question[];
}

interface ProgressData {
  weekId: string;
  completed: boolean;
  lastAccessed: string;
}

export function StudentDashboard({ user, accessToken, onLogout }: StudentDashboardProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<{ [key: number]: number | string }>({});
  const [showResults, setShowResults] = useState(false);
  const [progressData, setProgressData] = useState<ProgressData[]>([]);
  const [activeTab, setActiveTab] = useState("videos");

  useEffect(() => {
    loadSubjects();
    loadProgress();
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
      // Only show published weeks to students, sorted by week number
      const publishedWeeks = (data.weeks || [])
        .filter((w: Week) => w.published)
        .sort((a: Week, b: Week) => a.weekNumber - b.weekNumber);
      setWeeks(publishedWeeks);
    } catch (error) {
      console.error("Error loading weeks:", error);
      toast.error("Failed to load content");
    }
  };

  const loadProgress = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d2ff195/progress`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );
      const data = await response.json();
      setProgressData(data.progress || []);
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  };

  const saveProgress = async (weekId: string, completed: boolean) => {
    try {
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-4d2ff195/progress`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ weekId, completed }),
        }
      );
      // Reload progress after saving
      loadProgress();
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const isWeekCompleted = (weekId: string) => {
    return progressData.some(p => p.weekId === weekId && p.completed);
  };

  const isWeekStarted = (weekId: string) => {
    return progressData.some(p => p.weekId === weekId);
  };

  const getWeekStatus = (week: Week, index: number): "completed" | "current" | "locked" | "available" => {
    if (isWeekCompleted(week.id)) {
      return "completed";
    }
    
    // First week is always available
    if (index === 0) {
      return isWeekStarted(week.id) ? "current" : "available";
    }
    
    // Check if previous week is completed
    const previousWeek = weeks[index - 1];
    if (previousWeek && isWeekCompleted(previousWeek.id)) {
      return isWeekStarted(week.id) ? "current" : "available";
    }
    
    // For now, keep all published weeks available (can change to "locked" for sequential unlocking)
    return "available";
  };

  const getOverallProgress = () => {
    if (weeks.length === 0) return 0;
    const completedCount = weeks.filter(w => isWeekCompleted(w.id)).length;
    return Math.round((completedCount / weeks.length) * 100);
  };

  const extractYouTubeId = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : null;
  };

  const extractGoogleDriveId = (url: string) => {
    // Extract file ID from Google Drive URL
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) return match[1];
    
    // Also check for id= parameter
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    return idMatch ? idMatch[1] : null;
  };

  const getContentUrl = (item: string | ContentItem): string => {
    return typeof item === "string" ? item : item.url;
  };

  const getContentTitle = (item: string | ContentItem, defaultTitle: string): string => {
    if (typeof item === "string") return defaultTitle;
    return item.title || defaultTitle;
  };

  const handleSubmitQuiz = () => {
    setShowResults(true);
    if (selectedWeek) {
      saveProgress(selectedWeek.id, true);
      toast.success("Quiz completed! Your progress has been saved.");
    }
  };

  const calculateScore = () => {
    if (!selectedWeek) return { correct: 0, total: 0 };
    let correct = 0;
    const mcqQuestions = selectedWeek.questions.filter(q => q.type === "mcq" || !q.type);
    mcqQuestions.forEach((q, idx) => {
      const questionIndex = selectedWeek.questions.findIndex(question => question === q);
      if (answers[questionIndex] === q.correctAnswer) {
        correct++;
      }
    });
    return { correct, total: mcqQuestions.length };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="size-5 text-green-600" />;
      case "current":
        return <Play className="size-5 text-indigo-600" />;
      case "locked":
        return <Lock className="size-5 text-gray-400" />;
      default:
        return <Circle className="size-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Completed</Badge>;
      case "current":
        return <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">In Progress</Badge>;
      case "locked":
        return <Badge variant="secondary">Locked</Badge>;
      default:
        return <Badge variant="outline">Available</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your courses...</p>
        </div>
      </div>
    );
  }

  // Subject selection view
  if (!selectedSubject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold text-indigo-900">Welcome, {user.name}</h1>
                <p className="text-gray-600 mt-1">Select a subject to begin learning</p>
              </div>
              <Button onClick={onLogout} variant="outline">
                <LogOut className="size-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {subjects.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <BookOpen className="size-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Courses Available</h3>
                <p className="text-gray-600">Check back later for new content</p>
              </div>
            ) : (
              subjects.map((subject) => (
                <Card
                  key={subject.id}
                  className="cursor-pointer hover:shadow-lg transition-all hover:border-indigo-200 group"
                  onClick={() => setSelectedSubject(subject)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-3 bg-indigo-100 rounded-xl group-hover:bg-indigo-200 transition-colors">
                        <BookOpen className="size-6 text-indigo-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{subject.name}</CardTitle>
                      </div>
                    </div>
                    <CardDescription className="text-sm">
                      {subject.description || "Start your learning journey"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>View content</span>
                      <ChevronRight className="size-4 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    );
  }

  // Week content view
  if (selectedWeek) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-4">
              <Button 
                onClick={() => {
                  setSelectedWeek(null);
                  setAnswers({});
                  setShowResults(false);
                  setActiveTab("videos");
                }} 
                variant="ghost" 
                size="sm"
                className="shrink-0"
              >
                <ArrowLeft className="size-4 mr-1" />
                Back
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg font-semibold text-indigo-900 truncate">
                  Week {selectedWeek.weekNumber}: {selectedWeek.title}
                </h1>
                <p className="text-sm text-gray-600 truncate">{selectedSubject.name}</p>
              </div>
              {isWeekCompleted(selectedWeek.id) && (
                <Badge className="bg-green-100 text-green-700 shrink-0">
                  <CheckCircle className="size-3 mr-1" />
                  Completed
                </Badge>
              )}
            </div>
          </div>
        </header>

        <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {selectedWeek.description && (
            <Card className="mb-6">
              <CardContent className="py-4">
                <p className="text-gray-700">{selectedWeek.description}</p>
              </CardContent>
            </Card>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-6">
              <TabsTrigger value="videos" className="text-xs md:text-sm">
                <Video className="size-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Videos</span>
                <span className="sm:hidden">Vid</span>
                {selectedWeek.videoLinks.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">{selectedWeek.videoLinks.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="audio" className="text-xs md:text-sm">
                <Headphones className="size-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Audio</span>
                <span className="sm:hidden">Aud</span>
                {selectedWeek.audioLinks.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">{selectedWeek.audioLinks.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pdfs" className="text-xs md:text-sm">
                <FileText className="size-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Resources</span>
                <span className="sm:hidden">PDF</span>
                {selectedWeek.pdfLinks.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">{selectedWeek.pdfLinks.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="practice" className="text-xs md:text-sm">
                <ClipboardList className="size-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Practice</span>
                <span className="sm:hidden">Quiz</span>
                {selectedWeek.questions.length > 0 && (
                  <Badge variant="secondary" className="ml-1 text-xs">{selectedWeek.questions.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="videos" className="space-y-6">
              {selectedWeek.videoLinks.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Video className="size-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600">No videos available for this week</p>
                  </CardContent>
                </Card>
              ) : (
                selectedWeek.videoLinks.map((item, idx) => {
                  const url = getContentUrl(item);
                  const title = getContentTitle(item, `Video ${idx + 1}`);
                  const videoId = extractYouTubeId(url);
                  return (
                    <Card key={idx}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Video className="size-4 text-indigo-600" />
                          {title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {videoId ? (
                          <div className="aspect-video rounded-lg overflow-hidden bg-black">
                            <iframe
                              className="w-full h-full"
                              src={`https://www.youtube.com/embed/${videoId}`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <div className="bg-gray-100 rounded-lg p-6 text-center">
                            <AlertCircle className="size-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-600 mb-2">Unable to embed this video</p>
                            <Button variant="outline" asChild>
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                Open Video Link
                              </a>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="audio" className="space-y-6">
              {selectedWeek.audioLinks.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Headphones className="size-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600">No audio files available for this week</p>
                  </CardContent>
                </Card>
              ) : (
                selectedWeek.audioLinks.map((item, idx) => {
                  const url = getContentUrl(item);
                  const title = getContentTitle(item, `Audio ${idx + 1}`);
                  const fileId = extractGoogleDriveId(url);
                  return (
                    <Card key={idx}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Headphones className="size-4 text-indigo-600" />
                          {title}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {fileId ? (
                          <div className="space-y-4">
                            {/* Google Drive iframe embed for audio */}
                            <div className="bg-gray-50 rounded-lg p-4">
                              <iframe
                                src={`https://drive.google.com/file/d/${fileId}/preview`}
                                width="100%"
                                height="80"
                                allow="autoplay"
                                className="rounded"
                              />
                            </div>
                            <div className="flex justify-center">
                              <Button variant="outline" size="sm" asChild>
                                <a 
                                  href={`https://drive.google.com/file/d/${fileId}/view`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                >
                                  Open in Google Drive
                                </a>
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-100 rounded-lg p-6 text-center">
                            <AlertCircle className="size-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-600 mb-2">Unable to embed this audio</p>
                            <Button variant="outline" asChild>
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                Open Audio Link
                              </a>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="pdfs" className="space-y-6">
              {selectedWeek.pdfLinks.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="size-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600">No resources available for this week</p>
                  </CardContent>
                </Card>
              ) : (
                selectedWeek.pdfLinks.map((item, idx) => {
                  const url = getContentUrl(item);
                  const title = getContentTitle(item, `Resource ${idx + 1}`);
                  const fileId = extractGoogleDriveId(url);
                  return (
                    <Card key={idx}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
                            <FileText className="size-4 text-indigo-600" />
                            {title}
                          </CardTitle>
                          {fileId && (
                            <Button variant="outline" size="sm" asChild>
                              <a 
                                href={`https://drive.google.com/file/d/${fileId}/view`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                              >
                                Open in Drive
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {fileId ? (
                          <div className="aspect-[3/4] w-full max-h-[600px] rounded-lg overflow-hidden border">
                            <iframe
                              className="w-full h-full"
                              src={`https://drive.google.com/file/d/${fileId}/preview`}
                              allow="autoplay"
                            />
                          </div>
                        ) : (
                          <div className="bg-gray-100 rounded-lg p-6 text-center">
                            <AlertCircle className="size-8 mx-auto text-gray-400 mb-2" />
                            <p className="text-gray-600 mb-2">Unable to preview this file</p>
                            <Button variant="outline" asChild>
                              <a href={url} target="_blank" rel="noopener noreferrer">
                                Open Resource Link
                              </a>
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            <TabsContent value="practice" className="space-y-6">
              {selectedWeek.questions.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <ClipboardList className="size-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-600">No practice questions available for this week</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ClipboardList className="size-5 text-indigo-600" />
                      Practice Questions
                    </CardTitle>
                    <CardDescription>Test your understanding of this week's material</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {selectedWeek.questions.map((q, idx) => {
                      const questionType = q.type || "mcq";
                      return (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border">
                          <div className="flex items-start gap-3 mb-3">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{q.question}</p>
                              <Badge variant="outline" className="mt-1 text-xs">
                                {questionType === "mcq" ? "Multiple Choice" : "Short Answer"}
                              </Badge>
                            </div>
                          </div>
                          
                          {questionType === "mcq" && q.options ? (
                            <div className="space-y-2 ml-9">
                              {q.options.map((option, optIdx) => (
                                <label
                                  key={optIdx}
                                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                    showResults
                                      ? optIdx === q.correctAnswer
                                        ? "bg-green-100 border border-green-300"
                                        : answers[idx] === optIdx
                                        ? "bg-red-100 border border-red-300"
                                        : "bg-white border border-gray-200"
                                      : answers[idx] === optIdx
                                      ? "bg-indigo-100 border border-indigo-300"
                                      : "bg-white border border-gray-200 hover:border-gray-300"
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`question-${idx}`}
                                    value={optIdx}
                                    checked={answers[idx] === optIdx}
                                    onChange={() => {
                                      if (!showResults) {
                                        setAnswers({ ...answers, [idx]: optIdx });
                                      }
                                    }}
                                    disabled={showResults}
                                    className="accent-indigo-600"
                                  />
                                  <span className="flex-1">{option}</span>
                                  {showResults && optIdx === q.correctAnswer && (
                                    <CheckCircle className="size-5 text-green-600" />
                                  )}
                                </label>
                              ))}
                            </div>
                          ) : (
                            <div className="ml-9 space-y-3">
                              <Textarea
                                placeholder="Type your answer here..."
                                value={(answers[idx] as string) || ""}
                                onChange={(e) => {
                                  if (!showResults) {
                                    setAnswers({ ...answers, [idx]: e.target.value });
                                  }
                                }}
                                disabled={showResults}
                                rows={4}
                                className="bg-white"
                              />
                              {showResults && q.sampleAnswer && (
                                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <p className="text-sm font-medium text-green-800 mb-1">Sample Answer:</p>
                                  <p className="text-sm text-green-700">{q.sampleAnswer}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    
                    {!showResults ? (
                      <Button 
                        onClick={handleSubmitQuiz} 
                        className="w-full"
                        disabled={Object.keys(answers).length === 0}
                      >
                        Submit Answers
                      </Button>
                    ) : (
                      <div className="text-center p-6 bg-indigo-50 rounded-lg border border-indigo-100">
                        {calculateScore().total > 0 && (
                          <div className="mb-4">
                            <p className="text-2xl font-bold text-indigo-900">
                              {calculateScore().correct} / {calculateScore().total}
                            </p>
                            <p className="text-sm text-indigo-700">Multiple Choice Score</p>
                          </div>
                        )}
                        <p className="text-green-700 flex items-center justify-center gap-2 mb-4">
                          <CheckCircle className="size-5" />
                          Your progress has been saved!
                        </p>
                        <Button
                          onClick={() => {
                            setAnswers({});
                            setShowResults(false);
                          }}
                          variant="outline"
                        >
                          Try Again
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    );
  }

  // Week list view
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
                <p className="text-sm text-gray-600">Weekly Content</p>
              </div>
            </div>
            <Button onClick={onLogout} variant="outline" size="sm">
              <LogOut className="size-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Progress Overview */}
        {weeks.length > 0 && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Course Progress</span>
                <span className="text-sm font-medium text-indigo-600">{getOverallProgress()}%</span>
              </div>
              <Progress value={getOverallProgress()} className="h-2" />
              <p className="text-xs text-gray-500 mt-2">
                {weeks.filter(w => isWeekCompleted(w.id)).length} of {weeks.length} weeks completed
              </p>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {weeks.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center">
                <BookOpen className="size-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Yet</h3>
                <p className="text-gray-600">Check back later for published content</p>
              </CardContent>
            </Card>
          ) : (
            weeks.map((week, index) => {
              const status = getWeekStatus(week, index);
              const isLocked = status === "locked";
              
              return (
                <Card
                  key={week.id}
                  className={`transition-all ${
                    isLocked 
                      ? "opacity-60" 
                      : "cursor-pointer hover:shadow-lg hover:border-indigo-200"
                  }`}
                  onClick={() => {
                    if (!isLocked) {
                      setSelectedWeek(week);
                      if (!isWeekStarted(week.id)) {
                        saveProgress(week.id, false);
                      }
                    }
                  }}
                >
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 ${
                        status === "completed" ? "bg-green-100" :
                        status === "current" ? "bg-indigo-100" :
                        "bg-gray-100"
                      }`}>
                        {getStatusIcon(status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-medium text-gray-900">
                            Week {week.weekNumber}: {week.title}
                          </h3>
                          {getStatusBadge(status)}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          {week.videoLinks.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Video className="size-3" /> {week.videoLinks.length}
                            </span>
                          )}
                          {week.audioLinks.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Headphones className="size-3" /> {week.audioLinks.length}
                            </span>
                          )}
                          {week.pdfLinks.length > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="size-3" /> {week.pdfLinks.length}
                            </span>
                          )}
                          {week.questions.length > 0 && (
                            <span className="flex items-center gap-1">
                              <ClipboardList className="size-3" /> {week.questions.length}
                            </span>
                          )}
                        </div>
                      </div>
                      {!isLocked && (
                        <ChevronRight className="size-5 text-gray-400 shrink-0" />
                      )}
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
