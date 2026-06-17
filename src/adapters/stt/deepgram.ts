export interface TranscriptState {
  finalText: string;
  interimText: string;
  finished: boolean;
}

export const initialTranscript: TranscriptState = {
  finalText: '',
  interimText: '',
  finished: false,
};

export function applyDeepgramMessage(state: TranscriptState, raw: unknown): TranscriptState {
  const msg = raw as {
    type?: string;
    is_final?: boolean;
    speech_final?: boolean;
    channel?: { alternatives?: Array<{ transcript?: string }> };
  };

  if (msg.type !== 'Results') return state;

  const transcript = msg.channel?.alternatives?.[0]?.transcript;
  if (!transcript) return state;

  if (!msg.is_final) {
    return { ...state, interimText: transcript };
  }

  const finalText = state.finalText ? `${state.finalText} ${transcript}` : transcript;
  return { finalText, interimText: '', finished: Boolean(msg.speech_final) };
}
