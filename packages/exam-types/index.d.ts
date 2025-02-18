export interface ExamContent {
  schemaVersion?: string;
  title: string;
  instruction: string;
  casForbidden?: boolean;
  sections: ExamSection[];
}

export interface Attachment {
  filename: string;
  type: string;
}

export interface ExamSection {
  questions: Array<ExamQuestion | ExamAudioTest>;
  desciption?: string;
  title?: string;
  casForbidden?: boolean;
}

export type ExamQuestion =
  | ExamTextQuestion
  | ExamSubtextQuestion
  | ExamLabel
  | ExamLabelWithRestrictedMedia
  | ExamChoiceGroupQuestion
  | ExamMultiChoiceGapQuestion;

export interface ExamRestrictedMedia {
  file: string;
  text: string;
  wide?: boolean;
}

export type QuestionType = "choice" | "text" | "richText";

export interface Answer {
  type: QuestionType;
  value: string;
  questionId: number;
  answerPaperId: number;
}

export interface ExamQuestionCommon {
  text: string;
  displayNumber: string;
  id?: number;
  level: number;
}

export interface ExamTextQuestion extends ExamQuestionCommon {
  type: "text";
  maxScore: number;
  screenshotExpected?: boolean;
  restrictedMedia?: ExamRestrictedMedia[];
  correctAnswers?: string[];
  answer?: Answer;
}

export interface ExamSubtextQuestion extends ExamQuestionCommon {
  type: "subtext";
  maxScore: number;
  screenshotExpected?: boolean;
  restrictedMedia?: ExamRestrictedMedia[];
  correctAnswers?: string[];
  breakAfter?: boolean;
  answer?: Answer;
}

export interface ExamAudioTest {
  type: "audiotest";
  file: string;
}

export interface ExamLabel {
  type: "label";
  text: string;
  displayNumber: string;
  level: number;
  breakAfter?: boolean;
}

export interface ExamLabelWithRestrictedMedia extends ExamLabel {
  id: number;
  restrictedMedia?: ExamRestrictedMedia[];
}

export interface ExamOption {
  id: number;
  text: string;
  altText?: string;
  correct: boolean; // might not exist
  score?: number; // might not exist
  selected?: boolean;
}

export interface ExamChoiceGroupQuestion extends ExamQuestionCommon {
  type: "choicegroup";
  choices: ExamChoice[];
  restrictedMedia?: ExamRestrictedMedia[];
  maxScore?: number;
}

export interface ExamChoice {
  id: number;
  text: string;
  displayNumber: string;
  type: "choice";
  breakAfter?: boolean;
  optionsRandomized?: boolean;
  options: ExamOption[];
  restrictedMedia?: ExamRestrictedMedia[];
}

export interface ExamMultichoiceGapTextContent {
  type: "text";
  text: string;
}

export interface ExamMultichoiceGapGap {
  id: number;
  type: "gap";
  optionsRandomized?: boolean;
  options: ExamOption[];
}

export interface ExamMultiChoiceGapQuestion extends ExamQuestionCommon {
  type: "multichoicegap";
  maxScore: number;
  content: Array<ExamMultichoiceGapTextContent | ExamMultichoiceGapGap>;
}

export type QuestionId = number;

export interface AnswerToSubmit {
  type: "choice" | "richText" | "text";
  value: string;
}

export interface GradingStructure {
  schemaVersion?: string;
  questions: Array<GradingStructureQuestion>;
}

export type GradingStructureQuestion =
  | GradingStructureTextQuestion
  | GradingStructureChoiceGroupQuestion
  | GradingStructureMultiChoiceGapQuestion;

export type GradingStructureQuestionCommon = {
  displayNumber: string;
  id: number;
};

export interface GradingStructureTextQuestion
  extends GradingStructureQuestionCommon {
  type: "text";
  maxScore: number;
}

export interface GradingStructureChoiceGroupQuestion
  extends GradingStructureQuestionCommon {
  type: "choicegroup";
  choices: GradingStructureChoice[];
}

export interface GradingStructureOption {
  id: number;
  text: string;
  correct: boolean;
  score: number;
}

export interface GradingStructureChoice {
  id: number;
  text: string;
  displayNumber: string;
  type: "choice";
  options: GradingStructureOption[];
}

export interface GradingStructureMultichoiceGapTextContent {
  type: "text";
  text: string;
}

export interface GradingStructureMultichoiceGapGap {
  id: number;
  type: "gap";
  options: GradingStructureOption[];
}

export interface GradingStructureMultiChoiceGapQuestion
  extends GradingStructureQuestionCommon {
  type: "multichoicegap";
  maxScore: number;
  content: Array<
    | GradingStructureMultichoiceGapTextContent
    | GradingStructureMultichoiceGapGap
  >;
}
