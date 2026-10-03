"""Small in-process cache for synthesized question audio.

Reading a question aloud is a repeating action for the candidate (replay the
question, re-listen after a distraction), and each uncached play costs a
text-to-speech call. Candidate answers and recordings are never cached.

The cache is keyed by the exact text that was spoken plus the configured
voice/model, so a changed question can never be served stale audio. It is
bounded and per-process: with several workers each keeps its own copy, and a
cold worker simply pays for one TTS call again. That is an acceptable
trade-off against adding Redis for what is a convenience feature.
"""

from collections import OrderedDict

MAX_CACHED_CLIPS = 32


class QuestionAudioCache:
    def __init__(self, max_entries: int = MAX_CACHED_CLIPS) -> None:
        self._entries: OrderedDict[str, bytes] = OrderedDict()
        self._max_entries = max_entries

    def get(self, key: str) -> bytes | None:
        value = self._entries.get(key)
        if value is not None:
            self._entries.move_to_end(key)
        return value

    def set(self, key: str, audio: bytes) -> None:
        self._entries[key] = audio
        self._entries.move_to_end(key)
        while len(self._entries) > self._max_entries:
            self._entries.popitem(last=False)

    def clear(self) -> None:
        self._entries.clear()


question_audio_cache = QuestionAudioCache()
