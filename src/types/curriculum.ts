import type { SchoolLevel } from "./learning";
import type { StageProgress } from "./progress";
import type { MisconceptionTag, MisconceptionTagCounts } from "@/learning/misconceptionTags";

export type AcademicSemester = 1 | 2;
export type CurriculumSubject = "math" | "korean" | "english";
export type LearningGoalStatus = "ready" | "in-progress" | "mastered" | "needs-practice";

export type PracticeQuestion = {
  id: string;
  prompt: string;
  choices: string[];
  answer: string;
  hint: string;
  explanation?: string;
  misconceptionTag?: MisconceptionTag;
  review?: {
    status: "pending-teacher-review" | "teacher-approved" | "changes-requested";
    curriculumReference: string;
    reviewedBy?: string;
    reviewedAt?: string;
  };
};

export type WeeklyLearningGoal = {
  id: string;
  schoolLevel: SchoolLevel;
  grade: number;
  semester: AcademicSemester;
  week: number;
  subject: CurriculumSubject;
  stageId: StageProgress["stageId"];
  unitTitle: string;
  title: string;
  objective: string;
  skillTag: string;
  phase: "discover" | "practice" | "apply" | "boss";
  questions: PracticeQuestion[];
};

export type LearningGoalProgress = {
  goalId: string;
  status: LearningGoalStatus;
  attempts: number;
  firstTryCorrect: number;
  questionCount: number;
  retryCount: number;
  hintCount: number;
  updatedAt: string;
};

export type TrainingAttemptRecord = {
  id: string;
  goalId: string;
  mode: "practice" | "diagnostic";
  completedAt: string;
  questionCount: number;
  firstTryCorrect: number;
  retryCount: number;
  hintCount: number;
  passed: boolean;
  durationSeconds?: number;
  misconceptionTagCounts?: MisconceptionTagCounts;
};
