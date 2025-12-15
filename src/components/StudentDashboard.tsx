import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { 
  BookOpen, 
  Video, 
  Headphones, 
  FileText, 
  ClipboardList, 
  LogOut, 
  Lock, 
  CheckCircle,
  ArrowLeft
} from "lucide-react";
import { projectId, publicAnonKey } from "../utils/supabase/info";

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

export function StudentDashboard({ user, accessToken, onLogout }: StudentDashboardProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<Week | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<{ [key: number]: number }>({});
  const [showResults, setShowResults] = useState(false);

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
      // Only show published weeks to students
      setWeeks((data.weeks || []).filter((w: Week) => w.published));
    } catch (error) {
      console.error("Error loading weeks:", error);
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
    } catch (error) {
      console.error("Error saving progress:", error);
    }
  };

  const extractYouTubeId = (url: string) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[7].length === 11 ? match[7] : null;
  };

  const extractGoogleDriveId = (url: string) => {
    // Extract file ID from Google Drive URL
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  };

  const handleSubmitQuiz = () => {
    setShowResults(true);
    if (selectedWeek) {
      saveProgress(selectedWeek.id, true);
    }
  };

  const calculateScore = () => {
    if (!selectedWeek) return 0;
    let correct = 0;
    selectedWeek.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) {
        correct++;
      }
    });
    return correct;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Subject selection view
  if (!selectedSubject) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-indigo-900">Welcome, {user.name}</h1>
                <p className="text-gray-600">Select a subject to begin learning</p>
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
              <div className="col-span-full text-center py-12">
                <BookOpen className="size-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No subjects available yet</p>
              </div>
            ) : (
              subjects.map((subject) => (
                <Card
                  key={subject.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => setSelectedSubject(subject)}
                >
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <BookOpen className="size-6 text-indigo-600" />
                      </div>
                      <CardTitle>{subject.name}</CardTitle>
                    </div>
                    <CardDescription>{subject.description || "Start learning"}</CardDescription>
                  </CardHeader>
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
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4">
              <Button onClick={() => setSelectedWeek(null)} variant="ghost" size="sm">
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <h1 className="text-indigo-900">
                  Week {selectedWeek.weekNumber}: {selectedWeek.title}
                </h1>
                <p className="text-gray-600">{selectedSubject.name}</p>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs defaultValue="videos" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="videos">
                <Video className="size-4 mr-2" />
                Videos
              </TabsTrigger>
              <TabsTrigger value="audio">
                <Headphones className="size-4 mr-2" />
                Audio
              </TabsTrigger>
              <TabsTrigger value="pdfs">
                <FileText className="size-4 mr-2" />
                PDFs
              </TabsTrigger>
              <TabsTrigger value="practice">
                <ClipboardList className="size-4 mr-2" />
                Practice
              </TabsTrigger>
            </TabsList>

            <TabsContent value="videos" className="space-y-6">
              {selectedWeek.videoLinks.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Video className="size-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No videos available for this week</p>
                  </CardContent>
                </Card>
              ) : (
                selectedWeek.videoLinks.map((link, idx) => {
                  const videoId = extractYouTubeId(link);
                  return (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle>Video {idx + 1}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {videoId ? (
                          <div className="aspect-video">
                            <iframe
                              className="w-full h-full rounded-lg"
                              src={`https://www.youtube.com/embed/${videoId}`}
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        ) : (
                          <p className="text-gray-600">
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                              Open video link
                            </a>
                          </p>
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
                    <Headphones className="size-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No audio files available for this week</p>
                  </CardContent>
                </Card>
              ) : (
                selectedWeek.audioLinks.map((link, idx) => {
                  const fileId = extractGoogleDriveId(link);
                  return (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle>Audio {idx + 1}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {fileId ? (
                          <audio controls className="w-full">
                            <source src={`https://drive.google.com/uc?export=download&id=${fileId}`} />
                            Your browser does not support the audio element.
                          </audio>
                        ) : (
                          <p className="text-gray-600">
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                              Open audio link
                            </a>
                          </p>
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
                    <FileText className="size-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No PDFs available for this week</p>
                  </CardContent>
                </Card>
              ) : (
                selectedWeek.pdfLinks.map((link, idx) => {
                  const fileId = extractGoogleDriveId(link);
                  return (
                    <Card key={idx}>
                      <CardHeader>
                        <CardTitle>PDF {idx + 1}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {fileId ? (
                          <div className="aspect-[3/4] w-full">
                            <iframe
                              className="w-full h-full rounded-lg border"
                              src={`https://drive.google.com/file/d/${fileId}/preview`}
                              allow="autoplay"
                            />
                          </div>
                        ) : (
                          <p className="text-gray-600">
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">
                              Open PDF link
                            </a>
                          </p>
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
                    <ClipboardList className="size-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">No practice questions available for this week</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Practice Questions</CardTitle>
                    <CardDescription>Test your understanding of this week's material</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {selectedWeek.questions.map((q, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-lg">
                        <p className="mb-3">
                          {idx + 1}. {q.question}
                        </p>
                        <div className="space-y-2">
                          {q.options.map((option, optIdx) => (
                            <label
                              key={optIdx}
                              className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
                                showResults
                                  ? optIdx === q.correctAnswer
                                    ? "bg-green-100 border border-green-300"
                                    : answers[idx] === optIdx
                                    ? "bg-red-100 border border-red-300"
                                    : "bg-white"
                                  : answers[idx] === optIdx
                                  ? "bg-indigo-100"
                                  : "bg-white hover:bg-gray-100"
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
                              />
                              <span>{option}</span>
                              {showResults && optIdx === q.correctAnswer && (
                                <CheckCircle className="size-4 text-green-600 ml-auto" />
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    {!showResults ? (
                      <Button onClick={handleSubmitQuiz} className="w-full">
                        Submit Answers
                      </Button>
                    ) : (
                      <div className="text-center p-4 bg-indigo-50 rounded-lg">
                        <p>
                          Your Score: {calculateScore()} / {selectedWeek.questions.length}
                        </p>
                        <Button
                          onClick={() => {
                            setAnswers({});
                            setShowResults(false);
                          }}
                          variant="outline"
                          className="mt-4"
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
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Button onClick={() => setSelectedSubject(null)} variant="ghost" size="sm">
                <ArrowLeft className="size-4" />
              </Button>
              <div>
                <h1 className="text-indigo-900">{selectedSubject.name}</h1>
                <p className="text-gray-600">Weekly Content</p>
              </div>
            </div>
            <Button onClick={onLogout} variant="outline">
              <LogOut className="size-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-4">
          {weeks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="size-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">No content has been published yet</p>
              </CardContent>
            </Card>
          ) : (
            weeks.map((week) => (
              <Card
                key={week.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => {
                  setSelectedWeek(week);
                  saveProgress(week.id, false);
                }}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        Week {week.weekNumber}: {week.title}
                        <Badge variant="secondary">Published</Badge>
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {week.videoLinks.length} videos • {week.audioLinks.length} audio files •{" "}
                        {week.pdfLinks.length} PDFs • {week.questions.length} practice questions
                      </CardDescription>
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
