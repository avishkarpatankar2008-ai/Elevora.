"""Offline demo AI client — keeps the full interview flow usable with no provider keys.

ELEVORA's real AI features (question generation, answer analysis, resume/JD
extraction, final evaluation, voice) call OpenRouter/OpenAI. On a development
server where no ``OPENROUTER_API_KEY`` is configured, that leaves the product's
core flow dead at "Start interview" — which makes the whole app undemoable and
untestable end-to-end. This module implements the same :class:`AIClient`
protocol offline, so the flow signup → configure → start → answer → adapt →
complete → scored report works without any external provider.

It is a demo, not a replacement, and it never pretends otherwise:

* Questions come from small hand-written topic banks plus topic-parameterized
  templates, rotated deterministically to avoid repeats. No language model.
* Answer analysis is transparent text heuristics: length, specificity
  (numbers/examples), question-overlap, filler density.
* Extraction is keyword/section based and reports ONLY what literally appears
  in the document — the real prompt's anti-hallucination rule applies even
  harder here, because a regex cannot infer anything.
* The final evaluation aggregates the per-turn heuristic scores and quotes the
  candidate's actual words as evidence.
* Voice (transcription/TTS) is NOT faked. Without an ``OPENAI_API_KEY`` these
  raise the same honest "not configured" error class the real client uses,
  with copy that points the candidate at typing instead. If a key IS present,
  voice calls are delegated to the real client (see ``voice_delegate``).

Guardrails (enforced elsewhere, summarized here): demo mode only activates
when ``settings.demo_ai_enabled`` and no OpenRouter key is set — see
``app/core/ai_deps.py``. ``AI_DEMO_MODE=on`` is refused at startup in
production, ``auto`` resolves to off there, and ``/health`` reports
``aiMode: "demo"`` so both operators and the UI can see which brain is
answering. The frontend renders a persistent demo-mode notice whenever the
API reports it.
"""

import re

from app.core.logging import get_logger
from app.schemas.ai import AnswerAnalysis, QuestionGeneration
from app.schemas.ai_evaluation import EvaluationDraft
from app.schemas.candidate import CandidateProfile
from app.schemas.job import JobProfile
from app.services import similarity
from app.services.ai_client import AIClient, AIServiceError

logger = get_logger(__name__)

# ============================================================================
# PROMPT PARSING
# ============================================================================
#
# The engine talks to any AIClient through the prompt strings built in
# prompts.py. The demo client reads back what it needs from those exact
# templates (topic, difficulty, previously-asked questions, the candidate's
# answer between its <untrusted_*> tags). If a template ever changes and a
# parse fails, every parser here degrades to a safe default rather than
# raising — a demo that crashes on a prompt tweak would be worse than no demo.

_TOPIC_RE = re.compile(r"on the topic '(?P<topic>[^']+)' at difficulty (?P<difficulty>\d)")
_ASKED_RE = re.compile(
    r"Questions already asked \(do not repeat or closely rephrase these\): (?P<list>.+)"
)
_PREVIOUS_QUESTION_RE = re.compile(r'The candidate was just asked: "(?P<question>.*)"')
_PROBE_RE = re.compile(r"probes specifically for: (?P<probe>.+)")
_REGENERATED_RE = re.compile(r"The question you just proposed is too similar")
_ANALYSIS_QUESTION_RE = re.compile(r'Question asked \(difficulty \d/5\): "(?P<question>.*)"')

# Turn blocks inside the evaluation transcript (see prompts._format_turn_for_evaluation).
_EVAL_TURN_RE = re.compile(
    r"(?P<kind>Question|Follow-up) (?P<sequence>\d+) \(topic: (?P<topic>[^,]+), "
    r"difficulty (?P<difficulty>\d)/5\): \"(?P<question>.*?)\"\n"
    r"Answer: \"(?P<answer>.*?)\""
    r"(?:\n\(scored (?P<quality>\d)/5 in the moment\))?"
    r"(?P<contradiction>\n\(flagged as contradicting an earlier statement\))?",
    re.DOTALL,
)


def _tagged(text: str, tag: str) -> str:
    """Content between ``<tag>`` and ``</tag>`` — the same tags prompts.py wraps
    untrusted input in. Empty string when absent."""
    match = re.search(rf"<{tag}>\n?(.*?)\n?</{tag}>", text, re.DOTALL)
    return match.group(1).strip() if match else ""


def _parse_asked(user: str) -> list[str]:
    match = _ASKED_RE.search(user)
    if not match:
        return []
    raw = match.group("list").strip()
    items = [part.strip().strip('"').strip() for part in raw.split('"; "')]
    return [item for item in items if item]


def _clamp(value: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, value))


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def _first_sentence(text: str, limit: int = 140) -> str:
    """First substantive sentence of an answer, trimmed — used as the claim a
    follow-up probes and as quoted evidence in the evaluation."""
    cleaned = re.sub(r"\s+", " ", text or "").strip()
    if not cleaned:
        return ""
    parts = re.split(r"(?<=[.!?])\s+", cleaned)
    sentence = next((p for p in parts if len(p.split()) >= 3), cleaned)
    if len(sentence) > limit:
        sentence = sentence[: limit - 1].rstrip() + "…"
    return sentence


# ============================================================================
# QUESTION BANKS
# ============================================================================
#
# Deliberately small and hand-picked, in the spirit of services/profiles.py's
# CATEGORY_DEFAULTS: enough breadth that every seeded InterviewProfile's
# subjects land on on-topic questions, plus generic templates so an unknown
# custom subject still gets coherent (if broader) questions. Each bank is
# ordered roughly easy → hard; the selector rotates through it with the
# interview's progress so questions don't repeat within a session.

_QUESTION_BANKS: dict[str, list[str]] = {
    "dsa": [
        "What's the difference between an array and a linked list, and when does each one win?",
        "How would you use a hash map to speed up a counting or lookup problem?",
        "Walk me through how you'd approach a problem you suspect needs two pointers.",
        "When is recursion the wrong tool, and how would you convert a recursive solution to an iterative one?",
        "Where do stacks and queues show up in real systems rather than textbook exercises?",
        "How do you reason about the time complexity of a solution before you write it?",
        "How would you detect a cycle in a linked list, and why does that technique work?",
        "Give an example of a problem where a greedy approach fails, and name the technique that fixes it.",
    ],
    "systemdesign": [
        "What are the first questions you ask before designing any new system?",
        "How do you decide between a SQL and a NoSQL store for a new service?",
        "Where does caching belong in a typical web architecture, and what does each layer cost you?",
        "How would you design a rate limiter, and where in the stack would it live?",
        "How do you scale a system that has outgrown a single database?",
        "When does an asynchronous queue beat a synchronous request path, and what do you lose by adding one?",
        "How would you handle a hot partition or one shard taking most of the traffic?",
        "Walk me through how you'd design a URL shortener that serves millions of requests a day.",
    ],
    "databases": [
        "What is a primary key, and what makes a good one?",
        "What is normalization, and when would you deliberately denormalize?",
        "How does an index speed up reads, and what does it slow down?",
        "What does ACID actually guarantee you in practice?",
        "How would you find and diagnose a slow query?",
        "How do joins work, and what happens when one gets expensive?",
        "How would you model data that needs both strong consistency and heavy read traffic?",
        "How do database deadlocks happen, and how do you reduce the odds of one?",
    ],
    "api": [
        "What makes a REST API pleasant for another team to consume?",
        "How do you choose between PUT and PATCH?",
        "What belongs in an API error response — and what must never be in one?",
        "How do you version an API without breaking existing clients?",
        "How would you paginate a list endpoint whose data set can grow unbounded?",
        "How do you secure a public API endpoint, and what does each layer protect against?",
        "When would you reach for GraphQL or RPC instead of plain REST?",
        "How do you keep an API's behavior and its documentation from drifting apart?",
    ],
    "backend": [
        "What happens inside your service between a request arriving and a response leaving?",
        "How do you decide what belongs in a background job instead of the request path?",
        "What is a connection pool, and what happens when it is exhausted?",
        "How would you design authentication for web and mobile clients sharing one API?",
        "How do you keep data consistent when two requests modify the same record at once?",
        "Where do secrets belong in a backend application, and why not in the code?",
        "How would you add caching to an existing endpoint safely, invalidation included?",
        "What does idempotency mean for a payments endpoint, and how would you implement it?",
    ],
    "systems": [
        "What's the difference between a process and a thread?",
        "How does an operating system decide what runs next?",
        "What is virtual memory, and what actually happens on a page fault?",
        "What is a race condition, and how does a lock prevent one — at what cost?",
        "How does a deadlock form, and what's one practical way to avoid it?",
        "What happens in the network stack when you type a URL and press enter?",
        "How do TCP and UDP differ, and when is each the right choice?",
        "What does DNS do, and why is it a classic first suspect in an outage?",
    ],
    "frontend": [
        "How does a browser turn HTML, CSS, and JavaScript into pixels?",
        "What's the difference between state and props in a component-based UI?",
        "How do you keep a large form both accessible and easy to validate?",
        "What causes slow rendering in a web app, and how do you find it?",
        "How do you decide what state belongs in a component versus a global store?",
        "How do browsers cache static assets, and how do you ship updates safely?",
        "What makes a web app usable on a slow phone connection?",
        "How should a UI handle a failed API call gracefully?",
    ],
    "testingdebug": [
        "What makes a test worth keeping?",
        "How do you decide between unit, integration, and end-to-end tests for a feature?",
        "Describe your debugging process when something fails only in production.",
        "What is a flaky test, and how do you handle one?",
        "How do you test code that talks to an external API?",
        "A bug report says 'it doesn't work' and nothing else — what do you do first?",
        "How do you make sure a bug you just fixed stays fixed?",
        "What does good test data look like?",
    ],
    "devops": [
        "What should a CI pipeline check before code is allowed to ship?",
        "Why containerize an application, and what does a container actually isolate?",
        "How do you roll out a change so it can be rolled back fast?",
        "What logs and metrics would you want on day one of a new service?",
        "How do you manage configuration and secrets across environments?",
        "What is infrastructure-as-code, and what class of mistakes does it prevent?",
        "How do you design alerts that don't cry wolf?",
        "What belongs in a blameless postmortem after an incident?",
    ],
    "oop": [
        "Explain the pillars of object-oriented design in your own words.",
        "When does inheritance cause more problems than composition?",
        "What is encapsulation, and give a real case where it protected you.",
        "How would you explain polymorphism to a new teammate?",
        "What makes a class too big, and how do you decide to split it?",
        "Name a design pattern you've actually used — what did it buy you?",
        "What is dependency inversion, and why does it help testing?",
        "How do interfaces and abstract classes differ in how you'd use them?",
    ],
    "data": [
        "What's the difference between correlation and causation? Give an example.",
        "How do you handle missing values in a dataset, and how do you choose the strategy?",
        "What does a p-value tell you — and what does it not tell you?",
        "How do you choose the right chart for the story in the data?",
        "Walk me through cleaning a messy real-world dataset.",
        "What is Simpson's paradox, and why should an analyst fear it?",
        "How would you measure whether a new feature actually changed user behavior?",
        "What makes a dashboard useful rather than decorative?",
    ],
    "behavioral": [
        "Tell me about a time you disagreed with a teammate — what happened, and how did it end?",
        "Describe a project you're proud of and your specific contribution to it.",
        "Tell me about a time you missed a deadline or underdelivered. What did you learn?",
        "How do you prioritize when everything is urgent at once?",
        "How do you onboard yourself onto an unfamiliar codebase or domain?",
        "Tell me about a time you received hard feedback. What did you change?",
        "Where do you want your skills to be in two years, and what's the plan to get there?",
        "Describe a time you explained something technical to a non-technical audience.",
    ],
    "governance": [
        "What does accountability mean in public administration, and how is it enforced?",
        "Describe a situation where a rule and an ethical duty conflict. What should an officer do?",
        "How do monetary policy decisions reach ordinary households?",
        "What role do local governments play that a central government cannot?",
        "How would you assess whether a welfare scheme is working?",
        "What does transparency cost, and what does it buy, in decision-making?",
        "Take a recent economic or policy development — what are its second-order effects?",
        "How should an official handle a directive they believe is legal but unethical?",
    ],
    "aptitude": [
        "How do you approach an unfamiliar quantitative problem under time pressure?",
        "What's your process for eliminating wrong options in a reasoning question?",
        "How do ratios and percentages help you sanity-check an answer quickly?",
        "Walk me through estimating a large quantity you've never measured.",
        "When is it worth skipping a hard question and coming back to it?",
        "How do you practice so that both speed and accuracy improve?",
        "Describe a reasoning pattern or puzzle you enjoy, and your general strategy for it.",
        "How do you catch your own careless mistakes before submitting?",
    ],
    "mechanical": [
        "What does the second law of thermodynamics mean for real engines?",
        "How would you choose between two materials for a load-bearing part?",
        "What is a boundary layer, and why does it matter in fluid flow?",
        "How do you factor a safety margin into a mechanical design?",
        "What makes a manufacturing process choice good rather than just cheap?",
        "How would you diagnose excessive vibration in rotating machinery?",
        "What is fatigue failure, and how do you design against it?",
        "How do tolerances affect both the cost and the function of an assembly?",
    ],
}

# Topic keyword → bank. First match wins, so order specific domains before
# broad ones. Subjects that match nothing fall through to the generic
# templates, which stay coherent for any topic.
_DOMAIN_KEYWORDS: list[tuple[str, tuple[str, ...]]] = [
    ("dsa", ("data structure", "dsa", "algorithm", "complexity", "problem solving", "problem-solving")),
    # "architect" alone is deliberately absent: frontend profiles use subjects
    # like "Component Architecture", which must not land on system-design
    # questions. Only explicit architecture phrasings match here.
    ("systemdesign", ("system design", "scalab", "software architect", "solution architect", "system architect", "load balanc", "sharding", "message queue", "cap theorem", "microservice", "distributed", "cach", "reliab", "high availability")),
    ("databases", ("database", "dbms", "sql", "indexing", "normali", "transaction", "query", "mongo", "postgres")),
    ("api", ("api", "rest", "graphql", "http", "endpoint")),
    ("oop", ("oop", "object oriented", "object-oriented", "design pattern")),
    ("systems", ("operating system", "network", "concurren", "thread", "process", "memory management", "tcp", "dns", "deadlock", "race condition", "parallel")),
    ("frontend", ("frontend", "front end", "javascript", "typescript", "react", "css", "html", "browser", "accessib", "state management", "component", "user interface", "web performance", "responsive", "ui ")),
    ("testingdebug", ("testing", "debugging", "test", "quality assurance")),
    ("devops", ("devops", "ci/cd", "docker", "kubernetes", "deployment", "monitoring", "cloud", "aws", "azure", "infrastructure", "observab")),
    ("data", ("statistic", "data visualization", "data cleaning", "business reasoning", "analytics", "machine learning", "probability", "regression", "hypothesis", "dashboard", "excel")),
    ("behavioral", ("teamwork", "conflict", "career", "strength", "weakness", "work ethic", "leadership", "behavioral", "behavioural", "role fit", "company awareness", "culture", "motivation", "communication skill")),
    ("governance", ("ethic", "governance", "polity", "current affairs", "economy", "economic", "general awareness", "banking awareness", "history", "geography", "civics", "constitution", "public administration")),
    ("aptitude", ("quantitative", "reasoning", "aptitude", "numerical", "logical")),
    ("mechanical", ("thermodynamic", "fluid", "manufacturing", "materials science", "machine design", "mechanical", "heat transfer", "cad")),
    ("backend", ("backend", "back end", "authentication", "authorization", "idempot", "server")),
]

# Topic-parameterized fallback templates, per difficulty band:
# 1 = introductory (difficulty 1-2), 2 = applied (3), 3 = expert (4-5).
_GENERIC_TEMPLATES: dict[int, list[str]] = {
    1: [
        "What is {topic}, and why does it matter in day-to-day work?",
        "Can you explain the core idea behind {topic} in plain language?",
        "What problem does {topic} solve, and what happens if you ignore it?",
        "Where have you encountered {topic} so far, even in learning projects?",
    ],
    2: [
        "How would you apply {topic} in a real project? Walk me through your approach.",
        "What are the most common mistakes people make with {topic}, and how do you avoid them?",
        "How do you decide between the obvious options within {topic}?",
        "How do you know when your work with {topic} is good enough to ship?",
    ],
    3: [
        "What trade-offs does {topic} force at scale, and how would you navigate them?",
        "Critique the most popular approach to {topic} — when does it break down, and what would you do instead?",
        "How would you diagnose a hard, unfamiliar failure related to {topic} under time pressure?",
        "How would you introduce {topic} into a large existing system — what changes first, and what do you defer?",
    ],
}

_FOLLOW_UP_TEMPLATES: list[str] = [
    'You mentioned "{claim}". What specifically drove that, and how would you measure whether it worked?',
    "Let's dig into one part of that: {probe}. What can you tell me?",
    'Take "{claim}" from your answer — walk me through the concrete details behind it.',
    "Suppose the constraints doubled — twice the scale, half the time. How would your answer change?",
    "What's the weakest part of the approach you just described, and how would you mitigate it?",
]


def _domain_for_topic(topic: str) -> str | None:
    lowered = f" {topic.lower()} "
    for domain, keywords in _DOMAIN_KEYWORDS:
        if any(keyword in lowered for keyword in keywords):
            return domain
    return None


def _difficulty_band(difficulty: int) -> int:
    if difficulty <= 2:
        return 1
    if difficulty == 3:
        return 2
    return 3


def _question_pool(topic: str, difficulty: int) -> list[str]:
    """Candidate questions for one (topic, difficulty): the matched bank first
    (on-topic beats generic), then this band's topic-parameterized templates."""
    pool: list[str] = []
    domain = _domain_for_topic(topic)
    if domain:
        pool.extend(_QUESTION_BANKS[domain])
    pool.extend(
        template.format(topic=topic.strip() or "this subject")
        for template in _GENERIC_TEMPLATES[_difficulty_band(difficulty)]
    )
    return pool


def _pick_unique(candidates: list[str], previously_asked: list[str], offset: int) -> str:
    """Rotate through `candidates` starting at `offset`, returning the first
    that isn't too similar to something already asked (the same Jaccard check
    the engine applies). If everything collides, return the offset candidate —
    the engine's own one-retry-then-proceed rule takes it from there."""
    total = len(candidates)
    for step in range(total):
        candidate = candidates[(offset + step) % total]
        if similarity.find_too_similar(candidate, previously_asked) is None:
            return candidate
    return candidates[offset % total]


# ============================================================================
# ANSWER-ANALYSIS HEURISTICS
# ============================================================================

_FILLER_WORDS = {
    "um", "uh", "er", "like", "basically", "actually", "literally",
    "obviously", "honestly", "simply", "just",
}
_EXAMPLE_MARKERS = re.compile(
    r"\b(for example|for instance|e\.g\.|specifically|in my (last|current)|at my|once,? i)\b",
    re.IGNORECASE,
)
_METRIC_RE = re.compile(r"\b\d+(?:\.\d+)?\s*(?:%|percent|x\b|ms\b|seconds?|minutes?|users?|requests?|qps|k\b|m\b|million|thousand|team|people|years?)?", re.IGNORECASE)
_DECISION_RE = re.compile(r"\b(we|i)\s+(chose|decided|picked|went with|opted|migrated|refactored|redesigned)\b", re.IGNORECASE)
_STRUCTURE_RE = re.compile(r"\b(first|second|third|then|finally|because|so that|therefore|trade-?offs?|approach|options?|alternatively)\b", re.IGNORECASE)
_REASONING_RE = re.compile(r"\b(because|trade-?offs?|approach|options?|alternatively|depends|assumption|compared|versus|vs\.?)\b", re.IGNORECASE)


def score_answer_text(question: str, answer: str) -> dict:
    """The shared heuristic both analyze_answer and the evaluation aggregation
    use: observable properties of the answer text, no model involved.

    Returns a dict with quality (1-5), relevance, specificity markers, and the
    strength/weakness phrases they justify. Every judgment is derived from
    something literally present in the text — the demo version of the real
    prompt's "base every strength or weakness only on what the candidate
    actually said" rule.
    """
    words = re.findall(r"[a-z0-9']+", (answer or "").lower())
    word_count = len(words)
    filler_count = sum(1 for w in words if w in _FILLER_WORDS)
    filler_ratio = filler_count / word_count if word_count else 0.0

    q_tokens = _tokens(question) - {"the", "a", "an", "is", "are", "you", "your", "would", "how", "what", "and", "of", "to", "in", "do", "does"}
    a_tokens = _tokens(answer)
    overlap = len(q_tokens & a_tokens) / len(q_tokens) if q_tokens else 0.0

    has_metrics = bool(_METRIC_RE.search(answer or ""))
    has_example = bool(_EXAMPLE_MARKERS.search(answer or ""))
    has_structure = bool(_STRUCTURE_RE.search(answer or ""))
    has_decision = bool(_DECISION_RE.search(answer or ""))

    quality = 3
    if word_count < 10:
        quality -= 2
    elif word_count < 25:
        quality -= 1
    elif word_count > 120:
        quality += 1
    if has_metrics:
        quality += 1
    if has_example:
        quality += 1
    if has_structure and word_count > 40:
        quality += 1
    if overlap == 0.0 and word_count < 40:
        quality -= 1
    if filler_ratio > 0.08:
        quality -= 1
    quality = _clamp(quality, 1, 5)

    strengths: list[str] = []
    if has_metrics:
        strengths.append("cites concrete numbers or outcomes")
    if has_example:
        strengths.append("grounds the point in a specific example")
    if has_structure and word_count > 60:
        strengths.append("explains with clear structure and reasoning")
    if overlap >= 0.25:
        strengths.append("directly addresses what was asked")
    if not strengths and word_count >= 25:
        strengths.append("answered in reasonable detail")

    weaknesses: list[str] = []
    if word_count < 25:
        weaknesses.append("very brief — lacks detail and specifics")
    if not has_metrics and not has_example:
        weaknesses.append("no concrete example or measurable outcome")
    if overlap < 0.1 and word_count < 80:
        weaknesses.append("drifts from what the question asked")
    if filler_ratio > 0.08:
        weaknesses.append("hedging and filler words dilute the point")

    is_relevant = overlap > 0.0 or word_count >= 60

    follow_up_needed = quality >= 3 and (has_metrics or has_decision)
    missing_evidence: str | None = None
    follow_up_reason: str | None = None
    if has_metrics:
        missing_evidence = "a concrete number is claimed with no measurement method or context given"
        follow_up_reason = "the answer claims a specific outcome worth probing"
    elif has_decision:
        missing_evidence = "a decision is stated without the alternatives that were considered"
        follow_up_reason = "the answer states a decision whose reasoning is unexplored"

    return {
        "quality": quality,
        "strengths": strengths[:2],
        "weaknesses": weaknesses[:2],
        "isRelevant": is_relevant,
        "followUpNeeded": follow_up_needed,
        "followUpReason": follow_up_reason if follow_up_needed else None,
        "missingEvidence": missing_evidence if follow_up_needed else None,
        "hasMetrics": has_metrics,
        "hasExample": has_example,
        "hasReasoning": bool(_REASONING_RE.search(answer or "")),
        "wordCount": word_count,
        "overlap": overlap,
    }


# ============================================================================
# DOCUMENT-EXTRACTION HEURISTICS
# ============================================================================

# Curated technology vocabulary for keyword extraction. Matching is
# word-boundary, case-insensitive; the canonical spelling here is what shows
# up in the extracted profile. Deliberately not exhaustive — extraction only
# ever reports what is literally present in the document.
_TECH_TERMS: dict[str, str] = {
    "python": "Python", "java": "Java", "javascript": "JavaScript", "typescript": "TypeScript",
    "c++": "C++", "c#": "C#", "go": "Go", "golang": "Go", "rust": "Rust", "ruby": "Ruby",
    "php": "PHP", "swift": "Swift", "kotlin": "Kotlin", "scala": "Scala", "r": "R",
    "matlab": "MATLAB", "sql": "SQL", "html": "HTML", "css": "CSS", "sass": "Sass",
    "bash": "Bash", "shell": "Shell", "perl": "Perl", "dart": "Dart", "elixir": "Elixir",
    "react": "React", "reactjs": "React", "next.js": "Next.js", "nextjs": "Next.js",
    "angular": "Angular", "vue": "Vue", "vue.js": "Vue.js", "svelte": "Svelte",
    "node.js": "Node.js", "nodejs": "Node.js", "express": "Express", "django": "Django",
    "flask": "Flask", "fastapi": "FastAPI", "spring": "Spring", "spring boot": "Spring Boot",
    "rails": "Rails", "laravel": "Laravel", "asp.net": "ASP.NET", ".net": ".NET",
    "jquery": "jQuery", "tailwind": "Tailwind CSS", "bootstrap": "Bootstrap",
    "redux": "Redux", "graphql": "GraphQL", "rest": "REST", "grpc": "gRPC",
    "websockets": "WebSockets", "pandas": "Pandas", "numpy": "NumPy", "scikit-learn": "scikit-learn",
    "sklearn": "scikit-learn", "tensorflow": "TensorFlow", "pytorch": "PyTorch", "keras": "Keras",
    "opencv": "OpenCV", "matplotlib": "Matplotlib", "seaborn": "Seaborn", "tableau": "Tableau",
    "power bi": "Power BI", "excel": "Excel", "spark": "Spark", "pyspark": "PySpark",
    "hadoop": "Hadoop", "kafka": "Kafka", "airflow": "Airflow", "dbt": "dbt",
    "mongodb": "MongoDB", "mongo": "MongoDB", "postgresql": "PostgreSQL", "postgres": "PostgreSQL",
    "mysql": "MySQL", "sqlite": "SQLite", "redis": "Redis", "elasticsearch": "Elasticsearch",
    "cassandra": "Cassandra", "dynamodb": "DynamoDB", "oracle": "Oracle DB", "sql server": "SQL Server",
    "firebase": "Firebase", "supabase": "Supabase", "neo4j": "Neo4j",
    "aws": "AWS", "azure": "Azure", "gcp": "GCP", "google cloud": "Google Cloud",
    "docker": "Docker", "kubernetes": "Kubernetes", "terraform": "Terraform",
    "ansible": "Ansible", "jenkins": "Jenkins", "github actions": "GitHub Actions",
    "gitlab": "GitLab CI", "ci/cd": "CI/CD", "nginx": "Nginx", "linux": "Linux",
    "ubuntu": "Ubuntu", "git": "Git", "github": "GitHub", "bitbucket": "Bitbucket",
    "selenium": "Selenium", "cypress": "Cypress", "jest": "Jest", "pytest": "pytest",
    "junit": "JUnit", "vitest": "Vitest", "playwright": "Playwright",
    "figma": "Figma", "sketch": "Sketch", "photoshop": "Photoshop",
    "agile": "Agile", "scrum": "Scrum", "kanban": "Kanban", "jira": "Jira",
    "microservices": "Microservices", "serverless": "Serverless", "lambda": "AWS Lambda",
    "rabbitmq": "RabbitMQ", "celery": "Celery", "oauth": "OAuth", "jwt": "JWT",
    "prometheus": "Prometheus", "grafana": "Grafana", "datadog": "Datadog", "sentry": "Sentry",
    "solidity": "Solidity", "blockchain": "Blockchain",
}

_EDUCATION_RE = re.compile(
    r"(b\.?\s?e\.?|b\.?\s?tech|bachelor|master|m\.?\s?sc|m\.?\s?tech|mca|mba|ph\.?\s?d|diploma|"
    r"university|college|institute|degree|cgpa|gpa|graduate|graduated|high school|class xii|12th)",
    re.IGNORECASE,
)
_EXPERIENCE_RE = re.compile(
    r"(engineer|developer|intern|analyst|manager|consultant|associate|architect|scientist|"
    r"designer|administrator|sde|freelance|research assistant|teaching assistant|"
    r"\d+\+?\s*(years?|yrs?)|january|february|march|april|may|june|july|august|september|"
    r"october|november|december|(19|20)\d{2}\s*[-–—]\s*((19|20)\d{2}|present|current))",
    re.IGNORECASE,
)
_PROJECT_LINE_RE = re.compile(
    r"^(built|developed|created|designed|implemented|launched|made|constructed|authored)\b",
    re.IGNORECASE,
)
_ACHIEVEMENT_RE = re.compile(
    r"\b(achieved|awarded|won|published|patented|reduced|improved|increased|cut|saved|scaled|"
    r"led|managed|delivered|grew|boosted|optimized|migrated|launched|automated|secured|"
    r"first place|top \d|rank|scholarship|certified)\b",
    re.IGNORECASE,
)
_TITLE_WORDS_RE = re.compile(
    r"(engineer|developer|designer|analyst|manager|scientist|architect|consultant|associate|"
    r"intern|lead|administrator|specialist|officer|accountant)",
    re.IGNORECASE,
)
_SENIORITY_KEYWORDS: list[tuple[str, str]] = [
    ("intern", "intern"), ("fresher", "entry-level"), ("junior", "junior"),
    ("entry level", "entry-level"), ("entry-level", "entry-level"), ("graduate", "entry-level"),
    ("mid level", "mid-level"), ("mid-level", "mid-level"), ("senior", "senior"),
    ("staff", "staff"), ("principal", "principal"), ("lead", "lead"), ("head of", "lead"),
    ("manager", "manager"), ("3+ years", "mid-level"), ("5+ years", "senior"),
    ("0-2 years", "junior"), ("2-4 years", "mid-level"), ("4+ years", "senior"),
]
_INDUSTRY_KEYWORDS: list[tuple[str, str]] = [
    ("fintech", "Fintech"), ("financial services", "Financial services"), ("banking", "Banking"),
    ("healthcare", "Healthcare"), ("health tech", "Healthcare"), ("e-commerce", "E-commerce"),
    ("ecommerce", "E-commerce"), ("edtech", "EdTech"), ("education", "Education"),
    ("saas", "SaaS"), ("logistics", "Logistics"), ("supply chain", "Logistics"),
    ("automotive", "Automotive"), ("energy", "Energy"), ("media", "Media"),
    ("gaming", "Gaming"), ("insurance", "Insurance"), ("real estate", "Real estate"),
    ("retail", "Retail"), ("travel", "Travel"), ("agriculture", "Agriculture"),
    ("artificial intelligence", "Artificial intelligence"), ("cybersecurity", "Cybersecurity"),
]


def _match_tech_terms(text: str) -> list[str]:
    found: list[str] = []
    lowered = text.lower()
    for needle, canonical in _TECH_TERMS.items():
        pattern = rf"(?<![a-z0-9]){re.escape(needle)}(?![a-z0-9])"
        if re.search(pattern, lowered) and canonical not in found:
            found.append(canonical)
    return found


def _clean_line(line: str) -> str:
    """Strip bullet/numbering decoration without eating content: '- item',
    '* item', '1. item', '2) item' — but NOT '5+ years…' (a leading digit
    there is content, not a list marker)."""
    cleaned = re.sub(r"^[\s\-\*\u2022]+", "", line)
    cleaned = re.sub(r"^\d{1,2}\s*[\.\)]\s+", "", cleaned)
    return cleaned.strip()


def _split_sentences(text: str) -> list[str]:
    parts = re.split(r"(?<=[.!?])\s+|\n+", text or "")
    return [re.sub(r"\s+", " ", p).strip(" \u2022-*") for p in parts if p and p.strip()]


# A short line ending in ':' is a section heading in virtually every resume
# and job description. Used to END a section when the document has no blank
# lines (common in PDF-extracted text).
_HEADINGISH_RE = re.compile(r"^.{0,60}:$")


def _section_lines(lines: list[str], heading: re.Pattern[str]) -> list[str]:
    """Lines following a section heading, until the section ends.

    A section ends at a blank line (once something was collected) or at the
    next heading-like line — whichever the document actually uses. `lines`
    must keep blank lines for the first mechanism to work.
    """
    collected: list[str] = []
    in_section = False
    for raw in lines:
        line = raw.strip()
        if not line:
            if in_section and collected:
                in_section = False
            continue
        if heading.search(line) and len(line) < 80:
            in_section = True
            remainder = heading.sub("", line, count=1).strip(" :-\t")
            if remainder:
                collected.append(_clean_line(remainder))
            continue
        if in_section and _HEADINGISH_RE.match(line):
            in_section = False
            continue
        if in_section:
            collected.append(_clean_line(line))
    return [c for c in collected if c]


# ============================================================================
# THE DEMO CLIENT
# ============================================================================


class DemoAIClient:
    """Offline implementation of the AIClient protocol. See module docstring
    for exactly what is and isn't simulated — and why voice never is."""

    def __init__(self, voice_delegate: "AIClient | None" = None) -> None:
        self._voice = voice_delegate

    # ------------------------------------------------------------ questions

    async def generate_question(self, *, system: str, user: str) -> QuestionGeneration:
        topic_match = _TOPIC_RE.search(user)
        topic = topic_match.group("topic") if topic_match else "General"
        difficulty = _clamp(int(topic_match.group("difficulty")), 1, 5) if topic_match else 3
        previously_asked = _parse_asked(user)
        regenerated = bool(_REGENERATED_RE.search(user))

        if "Ask one targeted follow-up question" in user:
            return self._follow_up_question(
                topic=topic,
                difficulty=difficulty,
                user=user,
                previously_asked=previously_asked,
                regenerated=regenerated,
            )

        pool = _question_pool(topic, difficulty)
        offset = len(previously_asked) + difficulty + (5 if regenerated else 0)
        question = _pick_unique(pool, previously_asked, offset)
        return QuestionGeneration(
            question=question,
            topic=topic,
            difficulty=difficulty,
            isFollowUp=False,
            targetClaim=None,
        )

    def _follow_up_question(
        self,
        *,
        topic: str,
        difficulty: int,
        user: str,
        previously_asked: list[str],
        regenerated: bool,
    ) -> QuestionGeneration:
        answer = _tagged(user, "untrusted_candidate_answer")
        probe_match = _PROBE_RE.search(user)
        probe = probe_match.group("probe").strip().rstrip(".") if probe_match else (
            "more concrete detail or evidence behind their claim"
        )
        # Strip trailing punctuation so quoting the claim inside a sentence
        # doesn't produce '". What…' artifacts.
        claim = _first_sentence(answer, limit=110).rstrip(".!?…").strip()

        candidates: list[str] = []
        for template in _FOLLOW_UP_TEMPLATES:
            try:
                candidates.append(template.format(claim=claim or "that point", probe=probe))
            except (KeyError, IndexError):  # pragma: no cover - defensive
                continue
        offset = len(previously_asked) + difficulty + (3 if regenerated else 0)
        question = _pick_unique(candidates, previously_asked, offset)
        return QuestionGeneration(
            question=question,
            topic=topic,
            difficulty=difficulty,
            isFollowUp=True,
            targetClaim=claim or probe,
        )

    # ------------------------------------------------------------- analysis

    async def analyze_answer(self, *, system: str, user: str) -> AnswerAnalysis:
        question_match = _ANALYSIS_QUESTION_RE.search(user)
        question = question_match.group("question") if question_match else ""
        answer = _tagged(user, "untrusted_candidate_answer")
        result = score_answer_text(question, answer)
        return AnswerAnalysis(
            quality=result["quality"],
            strengths=result["strengths"],
            weaknesses=result["weaknesses"],
            isRelevant=result["isRelevant"],
            hasContradiction=False,  # single-turn text heuristics cannot see contradictions honestly
            followUpNeeded=result["followUpNeeded"],
            followUpReason=result["followUpReason"],
            missingEvidence=result["missingEvidence"],
        )

    # ----------------------------------------------------------- extraction

    async def extract_candidate_profile(self, *, system: str, user: str) -> CandidateProfile:
        text = _tagged(user, "untrusted_resume_text")
        lines = [line for line in (text or "").splitlines()]

        technologies = _match_tech_terms(text)
        # Skills = technologies plus short skill-phrase bullets from a skills
        # section (e.g. "public speaking", "project management").
        skills = list(technologies)
        for line in _section_lines(lines, re.compile(r"^(skills?|technical skills?|core competenc\w*)\s*:?", re.IGNORECASE)):
            for part in re.split(r"[,|/•]|\s{2,}", line):
                part = part.strip(" .")
                if part and len(part) <= 40 and part not in skills:
                    skills.append(part)
        skills = skills[:15]

        education: list[str] = []
        for line in lines:
            cleaned = _clean_line(line)
            if cleaned and len(cleaned) <= 160 and _EDUCATION_RE.search(cleaned):
                if cleaned not in education:
                    education.append(cleaned)
        education = education[:4]

        experience: list[str] = []
        for line in lines:
            cleaned = _clean_line(line)
            if not cleaned or len(cleaned) > 160:
                continue
            if _EXPERIENCE_RE.search(cleaned) and (_TITLE_WORDS_RE.search(cleaned) or re.search(r"(19|20)\d{2}", cleaned)):
                if cleaned not in experience and cleaned not in education:
                    experience.append(cleaned)
        experience = experience[:5]

        projects = _section_lines(
            lines, re.compile(r"^(projects?|key projects?|personal projects?)\s*:?", re.IGNORECASE)
        )[:4]
        if not projects:
            for line in lines:
                cleaned = _clean_line(line)
                if cleaned and 15 < len(cleaned) <= 160 and _PROJECT_LINE_RE.match(cleaned):
                    projects.append(cleaned)
                if len(projects) >= 4:
                    break

        sentences = _split_sentences(text)
        achievements: list[str] = []
        claims: list[str] = []
        for sentence in sentences:
            if len(sentence) < 15 or len(sentence) > 200:
                continue
            has_achievement = bool(_ACHIEVEMENT_RE.search(sentence))
            has_number = bool(re.search(r"\d", sentence))
            if has_achievement and has_number and sentence not in claims:
                claims.append(sentence)
            elif has_achievement and sentence not in achievements:
                achievements.append(sentence)
        achievements = achievements[:6]
        claims = claims[:6]

        return CandidateProfile(
            skills=skills,
            education=education,
            experience=experience,
            projects=projects,
            technologies=technologies[:15],
            achievements=achievements,
            claims=claims,
        )

    async def extract_job_profile(self, *, system: str, user: str) -> JobProfile:
        text = _tagged(user, "untrusted_job_description")
        # Blank lines are kept: _section_lines uses them to find section ends.
        lines = list((text or "").splitlines())

        role: str | None = None
        role_match = re.search(
            r"(?:hiring|looking for|seeking|role|position|opening|title)\s*[:\-]?\s*(?:an?\s+)?"
            r"((?:senior|junior|staff|principal|lead|mid[- ]level)?\s*[\w/&+.-]*\s*"
            r"(?:engineer|developer|designer|analyst|manager|scientist|architect|consultant|"
            r"associate|intern|administrator|specialist))",
            text,
            re.IGNORECASE,
        )
        if role_match:
            role = re.sub(r"\s+", " ", role_match.group(1)).strip()[:120]
        else:
            non_empty = [ln for ln in lines if ln.strip()]
            for line in non_empty[:5]:
                cleaned = _clean_line(line)
                if cleaned and len(cleaned) <= 80 and _TITLE_WORDS_RE.search(cleaned):
                    role = cleaned
                    break

        company: str | None = None
        company_match = re.search(
            r"(?:at|company\s*[:\-]|about\s*[:\-]|join)\s+([A-Z][\w&'.-]*(?:\s+[A-Z][\w&'.-]*){0,3})",
            text,
        )
        if company_match:
            candidate = company_match.group(1).strip()
            noise = {"At", "Join", "We", "The", "A", "An", "Our", "Company", "Role", "Position"}
            first_word = candidate.split(" ")[0]
            if first_word not in noise and len(candidate) <= 60:
                company = candidate

        lowered = text.lower()
        seniority: str | None = None
        for keyword, level in _SENIORITY_KEYWORDS:
            if keyword in lowered:
                seniority = level
                break

        industry: str | None = None
        for keyword, name in _INDUSTRY_KEYWORDS:
            if keyword in lowered:
                industry = name
                break

        required_section = _section_lines(
            lines,
            re.compile(
                r"^(requirements?|required|must have|must-have|qualifications?|required skills?|"
                r"skills?|what you.?ll bring|who you are)\s*:?",
                re.IGNORECASE,
            ),
        )
        preferred_section = _section_lines(
            lines,
            re.compile(r"^(preferred|nice to have|good to have|bonus|plus|preferred skills?)\s*:?", re.IGNORECASE),
        )
        responsibilities = _section_lines(
            lines,
            re.compile(r"^(responsibilit\w+|you will|you.?ll|what you.?ll do|the role|day to day)\s*:?", re.IGNORECASE),
        )[:6]
        if not responsibilities:
            for line in lines:
                cleaned = _clean_line(line)
                if cleaned and re.match(
                    r"^(build|design|develop|own|lead|collaborate|maintain|improve|work|create|ship|drive|manage)\b",
                    cleaned,
                    re.IGNORECASE,
                ) and len(cleaned) <= 160:
                    responsibilities.append(cleaned)
                if len(responsibilities) >= 6:
                    break

        required_text = "\n".join(required_section) if required_section else text
        preferred_text = "\n".join(preferred_section)
        required_skills = _match_tech_terms(required_text)[:15]
        preferred_skills = [s for s in _match_tech_terms(preferred_text)[:10] if s not in required_skills]

        return JobProfile(
            role=role,
            company=company,
            industry=industry,
            requiredSkills=required_skills,
            preferredSkills=preferred_skills,
            responsibilities=responsibilities,
            seniority=seniority,
        )

    # ----------------------------------------------------------- evaluation

    async def generate_evaluation(self, *, system: str, user: str) -> EvaluationDraft:
        transcript = _tagged(user, "untrusted_transcript")
        turns: list[dict] = []
        for match in _EVAL_TURN_RE.finditer(transcript):
            turns.append(
                {
                    "kind": match.group("kind"),
                    "topic": match.group("topic").strip(),
                    "question": match.group("question").strip(),
                    "answer": match.group("answer").strip(),
                    "quality": int(match.group("quality")) if match.group("quality") else None,
                    "contradiction": bool(match.group("contradiction")),
                }
            )

        if not turns:
            # The prompt didn't parse (template drift). Say so honestly rather
            # than inventing scores — this string is visible in the report.
            logger.warning("Demo evaluation could not parse any turns from the transcript prompt.")
            return EvaluationDraft(
                knowledgeScore=0,
                knowledgeEvidence="Demo evaluation could not read the transcript; no scores were invented.",
                communicationScore=0,
                communicationEvidence="Demo evaluation could not read the transcript.",
                relevanceScore=0,
                relevanceEvidence="Demo evaluation could not read the transcript.",
                problemSolvingScore=0,
                problemSolvingEvidence="Demo evaluation could not read the transcript.",
                interviewHandlingScore=0,
                interviewHandlingEvidence="Demo evaluation could not read the transcript.",
                strengths=[],
                weaknesses=[],
                recommendedPractice=["Re-run the report; if this persists it is a bug in the demo evaluator."],
                improvedAnswer=None,
            )

        scored: list[dict] = []
        for turn in turns:
            result = score_answer_text(turn["question"], turn["answer"])
            quality = turn["quality"] if turn["quality"] is not None else result["quality"]
            scored.append({**turn, "quality": quality, "analysis": result})

        qualities = [t["quality"] for t in scored]
        avg_quality = sum(qualities) / len(qualities)
        word_counts = [t["analysis"]["wordCount"] for t in scored]
        avg_words = sum(word_counts) / len(word_counts)
        relevant_fraction = sum(1 for t in scored if t["analysis"]["isRelevant"]) / len(scored)
        reasoning_fraction = sum(1 for t in scored if t["analysis"]["hasReasoning"]) / len(scored)
        contradiction_count = sum(1 for t in scored if t["contradiction"])
        follow_ups = [t for t in scored if t["kind"] == "Follow-up"]

        best = max(scored, key=lambda t: t["quality"])
        worst = min(scored, key=lambda t: t["quality"])

        knowledge_score = _clamp(round(avg_quality), 0, 5)
        knowledge_evidence = (
            f"Across {len(scored)} answered questions the in-the-moment scores averaged "
            f"{avg_quality:.1f}/5; strongest on {best['topic']}: \"{_first_sentence(best['answer'], 100)}\""
        )

        if avg_words < 25:
            communication_score = 2
        elif avg_words < 60:
            communication_score = 3
        elif avg_words < 140:
            communication_score = 4
        else:
            communication_score = 4
        filler_heavy = sum(1 for t in scored if t["analysis"]["wordCount"] and "filler" in " ".join(t["analysis"]["weaknesses"]))
        if filler_heavy * 2 > len(scored):
            communication_score = max(1, communication_score - 1)
        communication_evidence = (
            f"Answers averaged {avg_words:.0f} words"
            + (f"; {filler_heavy} of {len(scored)} were diluted by hedging/filler" if filler_heavy else "")
            + f". Example: \"{_first_sentence(best['answer'], 90)}\""
        )

        relevance_score = _clamp(round((relevant_fraction * 5 + avg_quality) / 2), 0, 5)
        relevance_evidence = (
            f"{round(relevant_fraction * 100)}% of answers addressed their question directly "
            f"(keyword overlap heuristic)"
            + ("" if relevant_fraction >= 1 else f"; weakest on {worst['topic']}")
        )

        problem_solving_score = _clamp(round((reasoning_fraction * 5 + avg_quality) / 2), 0, 5)
        problem_evidence = (
            f"{round(reasoning_fraction * 100)}% of answers showed explicit reasoning "
            f"(trade-offs, alternatives, justification)"
            + (
                f"; e.g. \"{_first_sentence(best['answer'], 90)}\""
                if reasoning_fraction > 0
                else "; no answer compared alternatives or stated trade-offs"
            )
        )

        handling_score = 3
        handling_notes: list[str] = []
        if follow_ups:
            strong_follow_ups = sum(1 for t in follow_ups if t["quality"] >= 4)
            weak_follow_ups = sum(1 for t in follow_ups if t["quality"] <= 2)
            handling_score += 1 if strong_follow_ups and not weak_follow_ups else 0
            handling_score -= 1 if weak_follow_ups else 0
            handling_notes.append(
                f"{len(follow_ups)} follow-up(s) answered: {strong_follow_ups} strong, {weak_follow_ups} weak"
            )
        else:
            handling_notes.append("no follow-ups were triggered, so probing resilience is untested")
        if contradiction_count:
            handling_score -= 1
            handling_notes.append(f"{contradiction_count} contradiction(s) flagged")
        handling_score = _clamp(handling_score, 0, 5)
        handling_evidence = "In-interview handling: " + "; ".join(handling_notes) + "."

        strengths: list[str] = []
        if best["quality"] >= 4:
            strengths.append(
                f"Strong answer on {best['topic']} (scored {best['quality']}/5): \"{_first_sentence(best['answer'], 90)}\""
            )
        metric_turns = [t for t in scored if t["analysis"]["hasMetrics"]]
        if metric_turns:
            strengths.append(f"Gave specific, measurable detail in {len(metric_turns)} of {len(scored)} answers")
        if relevant_fraction >= 0.8 and len(scored) > 1:
            strengths.append("Stayed on topic across nearly every question")
        if avg_words >= 80:
            strengths.append("Answers were substantive rather than one-liners")

        weaknesses: list[str] = []
        if worst["quality"] <= 2:
            weaknesses.append(
                f"Weakest answer on {worst['topic']} (scored {worst['quality']}/5): \"{_first_sentence(worst['answer'], 90)}\""
            )
        if not metric_turns:
            weaknesses.append("No answer included a concrete number or measurable outcome")
        if reasoning_fraction < 0.5:
            weaknesses.append("Most answers stated conclusions without weighing alternatives or trade-offs")
        if avg_words < 40:
            weaknesses.append("Answers were too brief to demonstrate depth")

        recommended: list[str] = []
        dimension_values = {
            "knowledge": knowledge_score,
            "communication": communication_score,
            "relevance": relevance_score,
            "problem solving": problem_solving_score,
            "interview handling": handling_score,
        }
        weakest_dimension = min(dimension_values, key=lambda key: dimension_values[key])
        recommendations_by_dimension = {
            "knowledge": "Revisit the fundamentals of your weakest topic and explain each one out loud in two minutes.",
            "communication": "Practice the answer shape: point first, then evidence, then a concrete example.",
            "relevance": "Before answering, restate the question in one sentence to keep the answer aimed at it.",
            "problem solving": "For every decision you describe, name one alternative you rejected and why.",
            "interview handling": "Rehearse being interrupted mid-answer: pause, acknowledge, then finish the point.",
        }
        recommended.append(recommendations_by_dimension[weakest_dimension])
        if not metric_turns:
            recommended.append("Attach a number to at least one accomplishment in every interview (size, speed, impact).")
        if reasoning_fraction < 0.5:
            recommended.append("Practice explaining trade-offs out loud — 'I chose X over Y because…'.")
        recommended = recommended[:3]

        improved_answer = (
            f"A stronger answer to \"{worst['question'][:120]}\" could keep your core point — "
            f"\"{_first_sentence(worst['answer'], 90)}\" — then add a concrete example with a measurable "
            f"outcome, and close by naming one alternative you considered and why you rejected it."
        )

        return EvaluationDraft(
            knowledgeScore=knowledge_score,
            knowledgeEvidence=knowledge_evidence,
            communicationScore=communication_score,
            communicationEvidence=communication_evidence,
            relevanceScore=relevance_score,
            relevanceEvidence=relevance_evidence,
            problemSolvingScore=problem_solving_score,
            problemSolvingEvidence=problem_evidence,
            interviewHandlingScore=handling_score,
            interviewHandlingEvidence=handling_evidence,
            strengths=strengths[:4],
            weaknesses=weaknesses[:4],
            recommendedPractice=recommended,
            improvedAnswer=improved_answer if worst["quality"] <= 3 else None,
        )

    # ---------------------------------------------------------------- voice

    async def transcribe_audio(self, *, audio_bytes: bytes, filename: str) -> str:
        if self._voice is not None:
            return await self._voice.transcribe_audio(audio_bytes=audio_bytes, filename=filename)
        raise AIServiceError(
            "Demo mode: speech-to-text requires an OPENAI_API_KEY.",
            kind="not_configured",
            user_message=(
                "Voice answers need a speech-to-text provider, which isn't configured on this "
                "server. Type your answer instead — everything else about the interview works "
                "normally."
            ),
        )

    async def synthesize_speech(self, *, text: str) -> bytes:
        if self._voice is not None:
            return await self._voice.synthesize_speech(text=text)
        raise AIServiceError(
            "Demo mode: text-to-speech requires an OPENAI_API_KEY.",
            kind="not_configured",
            user_message=(
                "Spoken question audio needs a text-to-speech provider, which isn't configured "
                "on this server. The full question text is available above."
            ),
        )
