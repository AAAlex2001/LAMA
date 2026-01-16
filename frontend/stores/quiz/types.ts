export interface PollOption {
  text: string;
}

export interface PollData {
  question: string;
  options: string[];
  is_anonymous: boolean;
  allows_multiple_answers: boolean;
  correct_option_id?: number;
  explanation?: string;
  is_quiz: boolean;
}

export interface QuizFormData {
  question: string;
  answers: string[];
  multipleChoice: boolean;
  quizMode: boolean;
  correctAnswerIndex?: number;
  explanation?: string;
}

export function convertQuizFormToPollData(formData: QuizFormData): PollData {
  return {
    question: formData.question,
    options: formData.answers,
    is_anonymous: true,
    allows_multiple_answers: formData.multipleChoice,
    correct_option_id: formData.quizMode ? formData.correctAnswerIndex : undefined,
    explanation: formData.quizMode ? formData.explanation : undefined,
    is_quiz: formData.quizMode,
  };
}

export function convertPollDataToQuizForm(pollData: PollData): QuizFormData {
  return {
    question: pollData.question,
    answers: pollData.options,
    multipleChoice: pollData.allows_multiple_answers,
    quizMode: pollData.is_quiz,
    correctAnswerIndex: pollData.correct_option_id,
    explanation: pollData.explanation,
  };
}
