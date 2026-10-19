"use client";

import { PlayQuestionButton } from "./PlayQuestionButton";
import type { Interview, InterviewTurn } from "@/lib/types";

/** Delivery numbers measured from this answer's audio — never estimated. */
function SpeechMetricsRow({ turn }: { turn: Pick<InterviewTurn, "speechMetrics"> }) {
  const metrics = turn.speechMetrics;
  if (!metrics) return null;
  return (
    <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line-soft pt-3 text-xs">
      <div className="flex items-baseline gap-1.5">
        <dt className="text-ink-mute">Pace</dt>
        <dd className="font-medium text-ink-soft">{Math.round(metrics.wordsPerMinute)} WPM</dd>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dt className="text-ink-mute">Fillers</dt>
        <dd className="font-medium text-ink-soft">{metrics.fillerCount}</dd>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dt className="text-ink-mute">Longest pause</dt>
        <dd className="font-medium text-ink-soft">{metrics.longestPauseSeconds.toFixed(1)}s</dd>
      </div>
      <div className="flex items-baseline gap-1.5">
        <dt className="text-ink-mute">Words</dt>
        <dd className="font-medium text-ink-soft">{metrics.wordCount}</dd>
      </div>
    </dl>
  );
}

function InterviewerBubble({
  question,
  topic,
  isFollowUp,
  index,
}: {
  question: string;
  topic: string;
  isFollowUp: boolean;
  index: number;
}) {
  return (
    <div className="flex gap-3 sm:gap-4">
      <span
        aria-hidden="true"
        className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-plum/40 bg-plum/[0.12] text-[11px] font-semibold text-blush"
      >
        AI
      </span>
      <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-line bg-white/[0.03] p-4">
        <p className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-plum">
          <span>Question {String(index).padStart(2, "0")}</span>
          {isFollowUp ? (
            <>
              <span aria-hidden="true" className="text-ink-mute">
                ·
              </span>
              <span>Follow-up</span>
            </>
          ) : topic ? (
            <>
              <span aria-hidden="true" className="text-ink-mute">
                ·
              </span>
              <span className="normal-case tracking-normal text-ink-mute">{topic}</span>
            </>
          ) : null}
        </p>
        <p className="mt-2 text-sm leading-6 text-ink sm:text-[15px]">{question}</p>
      </div>
    </div>
  );
}

function AnswerBubble({ answer, turn }: { answer: string; turn?: InterviewTurn }) {
  return (
    <div className="flex justify-end gap-3 sm:gap-4">
      <div className="min-w-0 max-w-[92%] flex-1 rounded-2xl rounded-tr-md border border-line bg-navy-950/50 p-4 sm:max-w-none">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-ink-mute">You</p>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-soft">{answer}</p>
        {turn && <SpeechMetricsRow turn={turn} />}
      </div>
    </div>
  );
}

/** One stored exchange, used by the transcript shown after a session ends. */
export function ConversationTurnView({ turn }: { turn: InterviewTurn }) {
  return (
    <div className="space-y-3">
      <InterviewerBubble
        question={turn.question}
        topic={turn.topic}
        isFollowUp={turn.isFollowUp}
        index={turn.sequence}
      />
      <AnswerBubble answer={turn.answer} turn={turn} />
    </div>
  );
}

/**
 * The full exchange: every answer already given, then the question currently
 * waiting for a response (with its status — playing, preparing or errored).
 * Read-only; the composer lives below it in the room.
 */
export function ConversationTimeline({
  interview,
  turns,
  isSpeaking,
  onSpeakingChange,
  awaitingNextQuestion,
  autoPlayQuestion = false,
}: {
  interview: Interview;
  turns: InterviewTurn[];
  isSpeaking: boolean;
  onSpeakingChange: (speaking: boolean) => void;
  /** True in the moment between submitting an answer and the next question arriving. */
  awaitingNextQuestion: boolean;
  /** User preference: speak each new question as it arrives. */
  autoPlayQuestion?: boolean;
}) {
  const pending = interview.pendingQuestion;

  if (turns.length === 0 && !pending) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-8 text-center">
        <p className="text-sm text-ink-soft" role="status">
          {awaitingNextQuestion
            ? "Preparing your first question…"
            : "This session hasn't recorded a question yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {turns.map((turn) => (
        <div key={turn.sequence} className="space-y-3">
          <InterviewerBubble
            question={turn.question}
            topic={turn.topic}
            isFollowUp={turn.isFollowUp}
            index={turn.sequence}
          />
          <AnswerBubble answer={turn.answer} turn={turn} />
        </div>
      ))}

      {pending && (
        <div className="space-y-3">
          <InterviewerBubble
            question={pending.question}
            topic={pending.topic}
            isFollowUp={pending.isFollowUp}
            index={turns.length + 1}
          />
          <div className="flex flex-wrap items-center gap-3 pl-11">
            <PlayQuestionButton
              interviewId={interview.id}
              onSpeakingChange={onSpeakingChange}
              autoPlay={autoPlayQuestion}
              autoPlayKey={`${turns.length}-${pending.question}`}
            />
            {isSpeaking && (
              <span className="flex items-center gap-2 text-xs text-plum" role="status">
                <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-plum" />
                Playing question…
              </span>
            )}
          </div>
        </div>
      )}

      {!pending && awaitingNextQuestion && (
        <div className="flex gap-3 sm:gap-4">
          <span
            aria-hidden="true"
            className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line bg-white/[0.03]"
          >
            <span className="flex h-3 items-end gap-[2px]">
              {[0, 1, 2].map((bar) => (
                <span
                  key={bar}
                  className="w-[2px] animate-bar-breathe rounded-full bg-blue/70"
                  style={{ height: `${[50, 100, 65][bar]}%`, animationDelay: `${bar * 150}ms` }}
                />
              ))}
            </span>
          </span>
          <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border border-line bg-white/[0.02] p-4">
            <p className="text-sm text-ink-soft" role="status">
              Preparing your next question…
            </p>
            <div className="mt-3 space-y-2">
              <span className="skeleton block h-3 w-full" />
              <span className="skeleton block h-3 w-4/5" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
