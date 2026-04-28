export interface CodeContentParts {
  question: string;
  answer: string;
  language: string;
}

const CODE_FENCE_RE = /```([\w#+-]+)?[ \t]*\n([\s\S]*?)```/;
const QUESTION_RE = /(^|\n)##\s*Question\s*\n([\s\S]*?)(?=\n##\s*(Answer|Solution)\s*\n|$)/i;
const ANSWER_RE = /(^|\n)##\s*(Answer|Solution)\s*\n([\s\S]*)$/i;

const normalizeLanguage = (language?: string) => {
  const trimmed = (language || '').trim();
  return trimmed && trimmed.toLowerCase() !== 'text' ? trimmed : '';
};

export const extractFencedCode = (content: string): { code: string; language: string } | null => {
  const match = content.match(CODE_FENCE_RE);
  if (!match) return null;
  return {
    language: (match[1] || '').trim(),
    code: (match[2] || '').trim(),
  };
};

export const ensureCodeFence = (content: string, language?: string): string => {
  const trimmed = content.trim();
  if (!trimmed) return '';
  if (trimmed.includes('```')) return trimmed;

  const lang = normalizeLanguage(language);
  return `\`\`\`${lang}\n${trimmed}\n\`\`\``;
};

export const buildCodeContent = (question: string, answer: string, language?: string): string => {
  const questionText = question.trim();
  const answerText = answer.trim();

  if (!questionText && !answerText) return '';

  if (!answerText) return `## Question\n${questionText}`;

  const fenced = extractFencedCode(answerText);
  const code = fenced ? fenced.code : answerText;
  const preferredLanguage = normalizeLanguage(language);
  const fallbackLanguage = normalizeLanguage(fenced?.language);
  const lang = preferredLanguage || fallbackLanguage;
  const answerBlock = ensureCodeFence(code, lang);

  if (!questionText) return answerBlock;

  return `## Question\n${questionText}\n\n## Answer\n${answerBlock}`;
};

export const parseCodeContent = (content: string): CodeContentParts | null => {
  const questionMatch = content.match(QUESTION_RE);
  const answerMatch = content.match(ANSWER_RE);

  if (!questionMatch && !answerMatch) return null;

  const question = (questionMatch?.[2] || '').trim();
  const answerBlock = (answerMatch?.[3] || '').trim();

  const fenced = extractFencedCode(answerBlock);

  return {
    question,
    answer: fenced ? fenced.code : answerBlock,
    language: fenced ? fenced.language : '',
  };
};
