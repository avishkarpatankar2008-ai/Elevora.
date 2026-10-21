const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, '../../design-studio-website-template-main frontend/design-studio-website-template-main/index.html');
const rawHtml = fs.readFileSync(srcPath, 'utf8');

// Extract body content (before script tags)
const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/);
if (!bodyMatch) {
  console.error('Could not find body tag');
  process.exit(1);
}

let bodyHtml = bodyMatch[1];
// Strip script tags
bodyHtml = bodyHtml.replace(/<script[\s\S]*?<\/script>/g, '').trim();

// Map and replace all image tags and placeholders
// 1. Hero & Footer aperture image
bodyHtml = bodyHtml.replace(
  /<img srcset="https:\/\/images\.unsplash\.com\/photo-1754738381783-f9a2847bfef2[^"]*"[^>]*>/g,
  '<img class="hero__img" src="/images/interview/hero-aperture.svg" width="1200" height="1200" alt="ELEVORA AI Interview Practice Engine" fetchpriority="high" />'
);

// 2. Work cases
const workReplacements = [
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1620802090791-fd9420668913[^"]*"[^>]*>/,
    newImg: '<img class="case__img" src="/images/interview/work-swe.svg" width="1600" height="1000" alt="Software Engineering Interview Practice" loading="lazy" />',
    tag: 'Role practice',
    title: 'Software Engineering',
    desc: 'System architecture, coding patterns, data structures, and algorithmic trade-offs.'
  },
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1713371690087-baafaf440240[^"]*"[^>]*>/,
    newImg: '<img class="case__img" src="/images/interview/work-behavioral.svg" width="1600" height="1000" alt="Behavioral Interview Practice" loading="lazy" />',
    tag: 'Behavioral',
    title: 'Behavioral & Leadership',
    desc: 'STAR-method storytelling, conflict resolution, team collaboration, and impact.'
  },
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1587241321921-91a834d6d191[^"]*"[^>]*>/,
    newImg: '<img class="case__img" src="/images/interview/work-campus.svg" width="1600" height="1000" alt="Campus Placement Practice" loading="lazy" />',
    tag: 'Foundational',
    title: 'Campus Placement',
    desc: 'Core computer science, quantitative problem solving, and early-career fundamentals.'
  },
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1544213456-bc37cb97df74[^"]*"[^>]*>/,
    newImg: '<img class="case__img" src="/images/interview/work-exam.svg" width="1600" height="1000" alt="Exams & Public Service Interview Practice" loading="lazy" />',
    tag: 'Targeted',
    title: 'Exams & Public Service',
    desc: 'Structured interviews for UPSC, MPSC, SSC, banking, and civil services.'
  },
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1614149162883-504ce4d13909[^"]*"[^>]*>/,
    newImg: '<img class="case__img" src="/images/interview/work-system-design.svg" width="1600" height="1000" alt="System Design Interview Practice" loading="lazy" />',
    tag: 'Architecture',
    title: 'System Design',
    desc: 'Scalability, trade-offs, caching, fault tolerance, and distributed data systems.'
  }
];

// Replace work section texts
bodyHtml = bodyHtml.replace('Selected work', 'Practice scenarios');
bodyHtml = bodyHtml.replace('Five launches from the last two years. Every one of them is still growing.', 'Five tailored practice tracks for technical, behavioral, and public service interviews.');

// Replace old cases with new cases
const oldCases = [
  { name: 'Northwind Bikes', line: 'An e-bike brand launched in eleven cities in a single spring.', tag: 'Brand, launch' },
  { name: 'Halden Bank', line: 'A 120-year-old bank, rebuilt as the app its customers open first.', tag: 'Product, app' },
  { name: 'Copper &amp; Oat', line: 'A neighbourhood bakery that now sells more by phone than by window.', tag: 'Commerce' },
  { name: 'Atlas Museum', line: 'A quiet collection turned into a weekly night out.', tag: 'Service, content' },
  { name: 'Sola Sound', line: 'A headphone launch that sold out its first run in nine days.', tag: 'Campaign' }
];

for (let i = 0; i < workReplacements.length; i++) {
  const rep = workReplacements[i];
  const old = oldCases[i];
  bodyHtml = bodyHtml.replace(rep.oldImg, rep.newImg);
  bodyHtml = bodyHtml.replace(`<span class="m-badge case__tag">${old.tag}</span>`, `<span class="m-badge case__tag">${rep.tag}</span>`);
  bodyHtml = bodyHtml.replace(`<h3 class="m-text-4 case__name">${old.name}</h3>`, `<h3 class="m-text-4 case__name">${rep.title}</h3>`);
  bodyHtml = bodyHtml.replace(`<p class="m-text-5 case__line">${old.line}</p>`, `<p class="m-text-5 case__line">${rep.desc}</p>`);
}

// 3. Again partners (rotating wheel)
bodyHtml = bodyHtml.replace('Never a one-off', 'Progress that builds');
bodyHtml = bodyHtml.replace('Most of our partners have been with us for more than five years. Every lap around, the work gets sharper.', 'Every practice session sharpens your performance. Your interview history, score trends, and evidence-backed reports compound over time.');

const partnerReplacements = [
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1594386245199-289c2fe0bd0a[^"]*"[^>]*>/,
    newImg: '<img class="partner__img" src="/images/interview/again-history.svg" width="900" height="1125" alt="Interview History" loading="lazy" />',
    year: 'History',
    name: 'Interview history',
    line: 'Return to completed sessions and track improvement over time.'
  },
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1532713107108-dfb5d8d2fc42[^"]*"[^>]*>/,
    newImg: '<img class="partner__img" src="/images/interview/again-progress.svg" width="900" height="1125" alt="Score Trends" loading="lazy" />',
    year: 'Reports',
    name: 'Score trends',
    line: 'Dimensional analytics measuring knowledge, communication, and relevance.'
  },
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1658296777645-0f389d06867c[^"]*"[^>]*>/,
    newImg: '<img class="partner__img" src="/images/interview/again-answers.svg" width="900" height="1125" alt="Multi-modal Practice" loading="lazy" />',
    year: 'Voice &amp; text',
    name: 'Multi-modal practice',
    line: 'Answer by voice with transcription analytics or type directly.'
  },
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1558324190-c940eb141401[^"]*"[^>]*>/,
    newImg: '<img class="partner__img" src="/images/interview/again-feedback.svg" width="900" height="1125" alt="Evidence-linked Scores" loading="lazy" />',
    year: 'Rubric',
    name: 'Evidence-linked scores',
    line: 'Every score cites exact transcript excerpts, never arbitrary vibes.'
  },
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1641675301559-468f9f4ca037[^"]*"[^>]*>/,
    newImg: '<img class="partner__img" src="/images/interview/again-profiles.svg" width="900" height="1125" alt="Custom Profiles" loading="lazy" />',
    year: 'Profiles',
    name: 'Custom profiles',
    line: 'Save role requirements, subjects, and interviewer styles for future practice.'
  },
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1761234852163-23f2ededd04e[^"]*"[^>]*>/,
    newImg: '<img class="partner__img" src="/images/interview/again-camera.svg" width="900" height="1125" alt="Camera Optional" loading="lazy" />',
    year: 'Privacy',
    name: 'Camera optional',
    line: 'On-device posture estimation with explicit consent; camera-free mode is always available.'
  }
];

const oldPartners = [
  { year: 'Year 9', name: 'Vela Air', line: 'From the booking flow to the boarding gate.' },
  { year: 'Year 4', name: 'Kiln Coffee', line: 'One roastery grew into a subscription habit.' },
  { year: 'Year 6', name: 'Larch Outdoor', line: 'A storefront rebuilt around the off-season.' },
  { year: 'Year 7', name: 'Tessera Games', line: 'A launch campaign for every season since day one.' },
  { year: 'Year 8', name: 'Civic Lab', line: 'Public services people can finish on a phone.' },
  { year: 'Year 5', name: 'Marrow Health', line: 'One patient app across three hospital systems.' }
];

for (let i = 0; i < partnerReplacements.length; i++) {
  const rep = partnerReplacements[i];
  const old = oldPartners[i];
  bodyHtml = bodyHtml.replace(rep.oldImg, rep.newImg);
  bodyHtml = bodyHtml.replace(`<span class="m-badge partner__year">${old.year}</span>`, `<span class="m-badge partner__year">${rep.year}</span>`);
  bodyHtml = bodyHtml.replace(`<h3 class="m-text-4 partner__name">${old.name}</h3>`, `<h3 class="m-text-4 partner__name">${rep.name}</h3>`);
  bodyHtml = bodyHtml.replace(`<p class="m-text partner__line">${old.line}</p>`, `<p class="m-text partner__line">${rep.line}</p>`);
}

// 4. Capabilities (services)
bodyHtml = bodyHtml.replace('Five practices and one team in the room, from the first workshop to the last release.', 'A complete interview preparation engine built on deterministic rubrics and sequential AI routing.');

const capabilityReplacements = [
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1617825295690-28ae56c56135[^"]*"[^>]*>/,
    newImg: '<img src="/images/interview/service-questions.svg" width="1200" height="900" alt="Adaptive Question Generation" loading="lazy" />',
    oldTitle: 'Brand and identity',
    newTitle: 'Adaptive question generation',
    oldLine: 'Positioning, naming and identity systems with enough range to stay interesting in year five.',
    newLine: 'Questions adjust to your previous answer\'s depth, challenging assumptions and asking for concrete evidence.',
    oldTags: '<ul class="service__tags"><li class="m-badge">Strategy</li><li class="m-badge">Naming</li><li class="m-badge">Identity systems</li><li class="m-badge">Guidelines</li></ul>',
    newTags: '<ul class="service__tags"><li class="m-badge">Role-grounded</li><li class="m-badge">Adaptive difficulty</li><li class="m-badge">Resume-linked</li><li class="m-badge">Job description</li></ul>'
  },
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1601972599720-36938d4ecd31[^"]*"[^>]*>/,
    newImg: '<img src="/images/interview/service-evaluation.svg" width="1200" height="900" alt="Multi-dimensional Evaluation" loading="lazy" />',
    oldTitle: 'Products and apps',
    newTitle: 'Multi-dimensional evaluation',
    oldLine: 'Apps and platforms designed, engineered and measured by the same people who first sketched them.',
    newLine: 'Scored across knowledge, communication, relevance, problem solving, and interview handling with mandatory citations.',
    oldTags: '<ul class="service__tags"><li class="m-badge">Product strategy</li><li class="m-badge">UX and UI</li><li class="m-badge">Engineering</li><li class="m-badge">Design systems</li></ul>',
    newTags: '<ul class="service__tags"><li class="m-badge">Evidence-based</li><li class="m-badge">Deterministic weights</li><li class="m-badge">Confidence scoring</li><li class="m-badge">Rubric integrity</li></ul>'
  },
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1720175646447-e37d994007fc[^"]*"[^>]*>/,
    newImg: '<img src="/images/interview/service-feedback.svg" width="1200" height="900" alt="Actionable Feedback Reports" loading="lazy" />',
    oldTitle: 'Campaigns and content',
    newTitle: 'Actionable feedback reports',
    oldLine: 'Ideas sized for culture and planned like a product roadmap, so the second month is better than the first.',
    newLine: 'Receive concrete strengths, improvement areas, and targeted practice recommendations for your next session.',
    oldTags: '<ul class="service__tags"><li class="m-badge">Campaigns</li><li class="m-badge">Social</li><li class="m-badge">Film and photo</li><li class="m-badge">Media planning</li></ul>',
    newTags: '<ul class="service__tags"><li class="m-badge">Strengths</li><li class="m-badge">Improvement areas</li><li class="m-badge">Model answers</li><li class="m-badge">Practice plans</li></ul>'
  },
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1512758017271-d7b84c2113f1[^"]*"[^>]*>/,
    newImg: '<img src="/images/interview/service-posture.svg" width="1200" height="900" alt="On-device Posture Analysis" loading="lazy" />',
    oldTitle: 'Service design',
    newTitle: 'On-device posture analysis',
    oldLine: 'Every moment between a person and your company, mapped, prototyped and made a little easier.',
    newLine: 'Optional client-side MediaPipe pose estimation tracking head alignment, framing, and movement without uploading raw video.',
    oldTags: '<ul class="service__tags"><li class="m-badge">Research</li><li class="m-badge">Journey mapping</li><li class="m-badge">Blueprints</li><li class="m-badge">Prototyping</li></ul>',
    newTags: '<ul class="service__tags"><li class="m-badge">Explicit consent</li><li class="m-badge">Zero raw video upload</li><li class="m-badge">Descriptive only</li><li class="m-badge">Camera-free option</li></ul>'
  },
  {
    oldImg: /<img srcset="https:\/\/images\.unsplash\.com\/photo-1769675353367-e581059c7c43[^"]*"[^>]*>/,
    newImg: '<img src="/images/interview/service-voice.svg" width="1200" height="900" alt="Voice &amp; Audio Analytics" loading="lazy" />',
    oldTitle: 'Applied AI',
    newTitle: 'Voice &amp; audio analytics',
    oldLine: 'Tools your teams use on Monday morning, not a demo for the board.',
    newLine: 'Speech transcription via Groq Whisper with pause duration, pacing (WPM), and filler word rate measurement.',
    oldTags: '<ul class="service__tags"><li class="m-badge">Opportunity mapping</li><li class="m-badge">Prototypes</li><li class="m-badge">Assistants</li><li class="m-badge">Team training</li></ul>',
    newTags: '<ul class="service__tags"><li class="m-badge">Whisper transcription</li><li class="m-badge">Speech pace (WPM)</li><li class="m-badge">Pause analysis</li><li class="m-badge">Filler rate</li></ul>'
  }
];

for (const rep of capabilityReplacements) {
  bodyHtml = bodyHtml.replace(rep.oldImg, rep.newImg);
  bodyHtml = bodyHtml.replace(`<h3 class="m-text-4">${rep.oldTitle}</h3>`, `<h3 class="m-text-4">${rep.newTitle}</h3>`);
  bodyHtml = bodyHtml.replace(`<p class="m-text-5 service__line">${rep.oldLine}</p>`, `<p class="m-text-5 service__line">${rep.newLine}</p>`);
  bodyHtml = bodyHtml.replace(rep.oldTags, rep.newTags);
}

// 5. Method (How we work)
bodyHtml = bodyHtml.replace('Every project runs the same loop of four steps. The fourth is the one most studios skip, and it is where the best work happens.', 'Every practice session follows a disciplined four-step loop that turns preparation into instinct.');
bodyHtml = bodyHtml.replace('Two weeks with your customers, your data and your front line before we draw anything at all.', 'Choose a target role or profile, difficulty, language, and upload an optional resume or job description.');
bodyHtml = bodyHtml.replace('Small mixed teams ship real, testable things early: in days, not quarters, and in front of real people.', 'Answer adaptive questions out loud or by text. The AI interviewer challenges claims and probes depth.');
bodyHtml = bodyHtml.replace('We agree on what better looks like before we start, then report it honestly, good news or not.', 'Review evidence behind each dimension score. No scores are invented or based on hidden vibes.');
bodyHtml = bodyHtml.replace('We take what we learned and go round once more. It is not the end of the project. It is the job.', 'Identify weaknesses, adjust your configuration, and run another session until it becomes automatic.');

bodyHtml = bodyHtml.replace('<h3 class="m-text-4">Listen</h3>', '<h3 class="m-text-4">Configure</h3>');
bodyHtml = bodyHtml.replace('<h3 class="m-text-4">Make</h3>', '<h3 class="m-text-4">Interview</h3>');
bodyHtml = bodyHtml.replace('<h3 class="m-text-4">Measure</h3>', '<h3 class="m-text-4">Review</h3>');
bodyHtml = bodyHtml.replace('<h3 class="m-text-4">Again</h3>', '<h3 class="m-text-4">Repeat</h3>');

// 6. Studio (Responsible AI)
bodyHtml = bodyHtml.replace('Inside the studio', 'Responsible AI');
bodyHtml = bodyHtml.replace('Ninety people between Lisbon and Brooklyn: strategists, designers, engineers and writers who would rather show you than tell you. We work in small mixed teams, sit with the people we build for, and keep Friday afternoons for our own experiments.', 'ELEVORA is built on transparency: your interview data is yours, AI scores require verifiable evidence from your answers, and webcam analysis is strictly on-device. We never infer emotion, personality, or candidate suitability.');

bodyHtml = bodyHtml.replace(
  /<img srcset="https:\/\/images\.unsplash\.com\/photo-1787647559705-d2ad3322020e[^"]*"[^>]*>/,
  '<img src="/images/interview/studio-team.svg" width="1400" height="933" alt="Responsible AI Principles" loading="lazy" />'
);
bodyHtml = bodyHtml.replace(
  /<img srcset="https:\/\/images\.unsplash\.com\/photo-1643373977342-73cfc7cc0c5e[^"]*"[^>]*>/,
  '<img src="/images/interview/studio-research.svg" width="900" height="1200" alt="Evidence Verification" loading="lazy" />'
);
bodyHtml = bodyHtml.replace(
  /<img srcset="https:\/\/images\.unsplash\.com\/photo-1745434159123-4908d0b9df94[^"]*"[^>]*>/,
  '<img src="/images/interview/studio-design.svg" width="900" height="1200" alt="Human-in-the-Loop Design" loading="lazy" />'
);
bodyHtml = bodyHtml.replace(
  /<img srcset="https:\/\/images\.unsplash\.com\/photo-1787647560262-ebfcf6c5f979[^"]*"[^>]*>/,
  '<img src="/images/interview/studio-collab.svg" width="1400" height="933" alt="Privacy-First Architecture" loading="lazy" />'
);
bodyHtml = bodyHtml.replace(
  /<img srcset="https:\/\/images\.unsplash\.com\/photo-1623652653308-d49d335c92eb[^"]*"[^>]*>/,
  '<img src="/images/interview/studio-workshop.svg" width="1400" height="933" alt="Zero Raw Video Retention" loading="lazy" />'
);

bodyHtml = bodyHtml.replace('Open roles', 'Quick access');
bodyHtml = bodyHtml.replace('Senior product designer', 'Dashboard');
bodyHtml = bodyHtml.replace('Lisbon', 'History &amp; reports');
bodyHtml = bodyHtml.replace('Creative technologist', 'New interview');
bodyHtml = bodyHtml.replace('Brooklyn', 'Start practice');
bodyHtml = bodyHtml.replace('Strategy director', 'Profiles');
bodyHtml = bodyHtml.replace('Remote, Europe', 'Saved templates');
bodyHtml = bodyHtml.replace(
  /<a data-8b-placeholder="email" class="m-link" href="mailto:careers@onda\.example"><span class="m-link__label">careers@onda\.example<\/span><svg class="m-link__arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 3\.5 13\.5 8 9 12\.5"\/><\/svg><\/a>/,
  '<a class="m-link" href="/dashboard"><span class="m-link__label">Explore dashboard</span><svg class="m-link__arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 3.5 13.5 8 9 12.5"/></svg></a>'
);

// 7. Journal (Practice Resources)
bodyHtml = bodyHtml.replace(
  /<img srcset="https:\/\/images\.unsplash\.com\/photo-1769755409781-9e8924c57362[^"]*"[^>]*>/,
  '<img class="journal__shot" src="/images/interview/journal-guide-1.svg" width="1000" height="1250" alt="STAR Method Guide" loading="lazy" />'
);
bodyHtml = bodyHtml.replace(
  /<img srcset="https:\/\/images\.unsplash\.com\/photo-1783094269325-4ba186e8e01b[^"]*"[^>]*>/,
  '<img class="journal__shot" src="/images/interview/journal-guide-2.svg" width="1000" height="1250" alt="Resume Alignment Guide" loading="lazy" />'
);
bodyHtml = bodyHtml.replace(
  /<img srcset="https:\/\/images\.unsplash\.com\/photo-1581080247486-57989c1f14ab[^"]*"[^>]*>/,
  '<img class="journal__shot" src="/images/interview/journal-guide-3.svg" width="1000" height="1250" alt="Voice Delivery & Pacing" loading="lazy" />'
);
bodyHtml = bodyHtml.replace(
  /<img srcset="https:\/\/images\.unsplash\.com\/photo-1542626991-cbc4e32524cc[^"]*"[^>]*>/,
  '<img class="journal__shot" src="/images/interview/journal-guide-4.svg" width="1000" height="1250" alt="On-Device Posture Analysis" loading="lazy" />'
);

const storiesReplacements = [
  {
    oldMeta: '<span>Event</span> · <time datetime="2026-10-01">1 October 2026</time> · 2 min read',
    newMeta: '<span>Guide</span> · 3 min read',
    oldTitle: 'Open Studio Night returns to Lisbon on 14 November',
    newTitle: 'The STAR method under adaptive questioning',
    oldText: 'Talks, half-built prototypes and a long table in the old print hall. Bring a friend who makes things.',
    newText: 'How to maintain structured answers when an AI interviewer interrupts to probe for concrete metrics.'
  },
  {
    oldMeta: '<span>Essay</span> · <time datetime="2026-09-18">18 September 2026</time> · 6 min read',
    newMeta: '<span>Strategy</span> · 4 min read',
    oldTitle: 'The second visit: why we design for the return, not the launch',
    newTitle: 'Grounding technical claims in your project history',
    oldText: 'Most products are judged on day one and lost on day thirty. Notes on designing for the ordinary Tuesday.',
    newText: 'Why aligning your resume bullet points with specific technical challenges creates a stronger practice interview.'
  },
  {
    oldMeta: '<span>Notes</span> · <time datetime="2026-08-30">30 August 2026</time> · 8 min read',
    newMeta: '<span>Delivery</span> · 3 min read',
    oldTitle: 'Type, tested: a variable identity that holds up at twelve pixels',
    newTitle: 'Managing speech rate and pause length in voice interviews',
    oldText: 'How one variable family carried a bank from a forty-metre billboard to its banking app.',
    newText: 'Balancing words-per-minute with deliberate pauses to convey thoughtful problem-solving.'
  },
  {
    oldMeta: '<span>Research</span> · <time datetime="2026-08-04">4 August 2026</time> · 5 min read',
    newMeta: '<span>Privacy</span> · 5 min read',
    oldTitle: 'What three hundred nurses told us about the night shift',
    newTitle: 'Why webcam posture analysis belongs on the client',
    oldText: 'Six weeks of field research for a health partner, and the three things we changed because of it.',
    newText: 'The engineering behind browser-side landmark extraction and why raw video should never leave your machine.'
  }
];

for (const s of storiesReplacements) {
  bodyHtml = bodyHtml.replace(s.oldMeta, s.newMeta);
  bodyHtml = bodyHtml.replace(`<h3 class="m-text-7">${s.oldTitle}</h3>`, `<h3 class="m-text-7">${s.newTitle}</h3>`);
  bodyHtml = bodyHtml.replace(`<p class="m-text story__text">${s.oldText}</p>`, `<p class="m-text story__text">${s.newText}</p>`);
}

// 8. FAQ
const faqReplacements = [
  {
    oldQ: 'What size of company do you work with?',
    newQ: 'What types of interviews can I practise?',
    oldA: 'Mostly companies between fifty and five thousand people, plus a few public bodies. Size matters less than whether the people who decide are in the room.',
    newA: 'Software engineering, campus placements, behavioral rounds, UPSC, MPSC, SSC, banking, and custom interview profiles you define yourself.'
  },
  {
    oldQ: 'How does a project usually start?',
    newQ: 'How are interview answers scored?',
    oldA: 'With a two-week listening sprint: interviews, data and a day on your front line. You get a short written point of view and a plan before any big commitment.',
    newA: 'Answers are evaluated across five core dimensions: Knowledge, Communication, Relevance, Problem Solving, and Interview Handling. Every score requires citing specific evidence from your transcript.'
  },
  {
    oldQ: 'Do you work alongside in-house teams?',
    newQ: 'Is the webcam required for practice?',
    oldA: 'Almost always. We pair with your designers, engineers and marketers, and we hand over every system we build so you are never stuck with us. Most partners keep us around anyway.',
    newA: 'No. The camera is completely optional and disabled by default. If enabled, it requires explicit consent, runs entirely on your device via MediaPipe, and never uploads video.'
  },
  {
    oldQ: 'How do you price the work?',
    newQ: 'How does the free-tier AI routing work?',
    oldA: 'Fixed fees for defined phases, then a monthly team for ongoing work. We are open about our rates on the first call.',
    newA: 'ELEVORA uses a six-model free-only routing chain (Groq primary, Gemini flash models, and OpenRouter free tiers) with automatic failover, rate-limit cooldowns, and deterministic fallbacks.'
  },
  {
    oldQ: 'Where are you based?',
    newQ: 'Can I upload my resume and a job description?',
    oldA: 'Lisbon and Brooklyn, with people working remotely across Europe and the US east coast. We travel for workshops and launches.',
    newA: 'Yes. Uploading a resume (PDF/DOCX) and job description extracts key skills, technologies, and claims to ground the questions in your actual background.'
  }
];

for (const f of faqReplacements) {
  bodyHtml = bodyHtml.replace(f.oldQ, f.newQ);
  bodyHtml = bodyHtml.replace(f.oldA, f.newA);
}

// 9. Contact section
bodyHtml = bodyHtml.replace('Let\'s talk', 'Let\'s practise');
bodyHtml = bodyHtml.replace('style="--len:10"', 'style="--len:12"');
bodyHtml = bodyHtml.replace(
  'Tell us what you are making. A real person reads every message and replies within two working days.',
  'Ready to prepare for your next interview? Create an account to track your sessions, score trends, and personalized feedback.'
);

bodyHtml = bodyHtml.replace(
  /<a data-8b-placeholder="email" class="contact__mail" href="mailto:hello@onda\.example"><span>hello@onda\.example<\/span><\/a>/,
  '<a class="contact__mail" href="/signup"><span>Start practising now</span></a>'
);

const placesOld = `<dl class="contact__places">
        <div><dt class="m-text-7">Lisbon</dt><dd class="m-text">Rua do Exemplo 1<br>1200-000 Lisbon</dd><dd class="m-text"><a data-8b-placeholder="phone" href="tel:+351210000000">+351 210 000 000</a></dd></div>
        <div><dt class="m-text-7">Brooklyn</dt><dd class="m-text">100 Example Street<br>Brooklyn, NY 11200</dd><dd class="m-text"><a data-8b-placeholder="phone" href="tel:+17180000000">+1 718 000 0000</a></dd></div>
      </dl>`;

const placesNew = `<dl class="contact__places">
        <div><dt class="m-text-7">New Candidate?</dt><dd class="m-text">Create your free account<br>Start practising in under a minute</dd><dd class="m-text"><a href="/signup">Create account &rarr;</a></dd></div>
        <div><dt class="m-text-7">Existing User?</dt><dd class="m-text">Sign in to your dashboard<br>Resume previous sessions</dd><dd class="m-text"><a href="/login">Sign in &rarr;</a></dd></div>
      </dl>`;
bodyHtml = bodyHtml.replace(placesOld, placesNew);

// Replace contact form with actionable authentication and practice card
const contactFormRegex = /<form data-8b-placeholder="form" class="contact__form m-surface" novalidate>[\s\S]*?<\/form>/;
const contactCardNew = `<div class="contact__form m-surface">
      <h3 class="m-text-4">Your practice starts here</h3>
      <p class="m-text">Configure your target role, experience level, and difficulty. Answer by voice or text and receive evidence-linked scores immediately after your session.</p>
      <div class="contact__actions" style="margin-top: 24px;">
        <a class="m-btn" href="/signup"><span class="m-btn__label">Start practising free</span></a>
        <a class="m-btn-2" href="/login"><span class="m-btn__label">Sign in</span></a>
      </div>
    </div>`;
bodyHtml = bodyHtml.replace(contactFormRegex, contactCardNew);

// 10. Footer section
bodyHtml = bodyHtml.replace('style="--len:3"><span class="footer__word">Bye</span>', 'style="--len:5"><span class="footer__word">Ready</span>');
bodyHtml = bodyHtml.replace('Onda in your inbox, once a month', 'Stay prepared for your next role');
bodyHtml = bodyHtml.replace(
  /<form data-8b-placeholder="form" class="footer__news" novalidate>[\s\S]*?<\/form>/,
  `<div class="footer__news">
      <p class="m-text-7">Practise with ELEVORA<span class="m-dot" aria-hidden="true"></span></p>
      <p class="m-text-6 footer__note">Adaptive interview practice. Voice or text. Camera optional.</p>
      <div style="margin-top: 16px;">
        <a class="m-btn" href="/signup"><span class="m-btn__label">Create your free account</span></a>
      </div>
    </div>`
);

bodyHtml = bodyHtml.replace('© 2026 Onda Studio · Design: <a href="https://8b.com/" style="color:inherit" data-8b-credit>8B</a>', '© 2026 ELEVORA · Design template by <a href="https://8b.com/" style="color:inherit">8B (MIT)</a>');
bodyHtml = bodyHtml.replace('Made in Lisbon and Brooklyn', 'Practice the interview, not a script.');

// Footer navigation links
bodyHtml = bodyHtml.replace(
  /<div class="footer__col">\s*<p class="m-text-6 footer__label">Talk<\/p>[\s\S]*?<\/div>/,
  `<div class="footer__col">
      <p class="m-text-6 footer__label">Platform</p>
      <a class="m-link-2" href="/dashboard">Dashboard</a>
      <a class="m-link-2" href="/interviews/new">New interview</a>
      <a class="m-link-2" href="/interview-profiles">Profiles</a>
      <a class="m-link-2" href="/settings">Settings</a>
    </div>`
);

bodyHtml = bodyHtml.replace(
  /<div class="footer__col">\s*<p class="m-text-6 footer__label">Follow<\/p>[\s\S]*?<\/div>/,
  `<div class="footer__col">
      <p class="m-text-6 footer__label">Account</p>
      <a class="m-link-2" href="/login">Sign in</a>
      <a class="m-link-2" href="/signup">Create account</a>
      <a class="m-link-2" href="#hero">Back to top</a>
    </div>`
);

// Navigation links and brand
bodyHtml = bodyHtml.replace('Onda<span class="m-dot" aria-hidden="true"></span>', 'ELEVORA<span class="m-dot" aria-hidden="true"></span>');
bodyHtml = bodyHtml.replace('Start a project', 'Start practising');
bodyHtml = bodyHtml.replace('href="#contact"', 'href="/signup"');

// Nav links mapping
bodyHtml = bodyHtml.replace('<li><a class="m-link-2" href="#work">Work</a></li>', '<li><a class="m-link-2" href="#work">Practice modes</a></li>');
bodyHtml = bodyHtml.replace('<li><a class="m-link-2" href="#capabilities">Services</a></li>', '<li><a class="m-link-2" href="#capabilities">Features</a></li>');
bodyHtml = bodyHtml.replace('<li><a class="m-link-2" href="#method">Approach</a></li>', '<li><a class="m-link-2" href="#method">How it works</a></li>');
bodyHtml = bodyHtml.replace('<li><a class="m-link-2" href="#studio">Studio</a></li>', '<li><a class="m-link-2" href="#studio">Responsible AI</a></li>');
bodyHtml = bodyHtml.replace('<li><a class="m-link-2" href="#journal">Journal</a></li>', '<li><a class="m-link-2" href="#journal">Resources</a></li>');

// Mobile menu links mapping
bodyHtml = bodyHtml.replace('<li><a href="#work">Work<span', '<li><a href="#work">Practice modes<span');
bodyHtml = bodyHtml.replace('<li><a href="#capabilities">Services<span', '<li><a href="#capabilities">Features<span');
bodyHtml = bodyHtml.replace('<li><a href="#method">Approach<span', '<li><a href="#method">How it works<span');
bodyHtml = bodyHtml.replace('<li><a href="#studio">Studio<span', '<li><a href="#studio">Responsible AI<span');
bodyHtml = bodyHtml.replace('<li><a href="#journal">Journal<span', '<li><a href="#journal">Resources<span');
bodyHtml = bodyHtml.replace('<li><a href="#contact">Contact<span', '<li><a href="#contact">Get started<span');
bodyHtml = bodyHtml.replace('hello@onda.example · Lisbon and Brooklyn', 'ELEVORA · Adaptive AI Interview Practice Platform');

// Hero intro copy
bodyHtml = bodyHtml.replace(
  'We\'re Onda, an independent brand, product and AI studio. We make things people come back to, and we\'d love to hear what you\'re making.',
  'Practise for the interview you actually have. ELEVORA listens to your answers, adapts difficulty in real time, and provides evidence-linked feedback across technical, behavioral, and professional domains.'
);
bodyHtml = bodyHtml.replace('See the work', 'Start practising');
bodyHtml = bodyHtml.replace('href="#work"><span class="m-link__label">Start practising', 'href="/signup"><span class="m-link__label">Start practising');

// Hero word: "Hello" -> "Ready"
bodyHtml = bodyHtml.replace('<span class="hero__glyphs">Hello</span>', '<span class="hero__glyphs">Ready</span>');

// Statement copy
bodyHtml = bodyHtml.replace('We make the things', 'Practise for the interview');
bodyHtml = bodyHtml.replace('people come back&nbsp;to', 'you actually&nbsp;have');
bodyHtml = bodyHtml.replace(
  'Launching is easy. Being chosen again on an ordinary Tuesday is the hard part, whether you run a bank, a bakery or a museum. It takes strategy, craft, engineering and a lot of listening, and it is the only kind of work we do.',
  'A real interview catches you off-guard — so practice should too. ELEVORA builds an adaptive session from your resume, your target role, and what you actually said thirty seconds ago. No two runs are the same.'
);

// Statement index links
bodyHtml = bodyHtml.replace('href="#work"><span class="m-link__label">See the work', 'href="#work"><span class="m-link__label">Practice scenarios');
bodyHtml = bodyHtml.replace('href="#capabilities"><span class="m-link__label">What we do', 'href="#capabilities"><span class="m-link__label">Capabilities &amp; scoring');
bodyHtml = bodyHtml.replace('href="#method"><span class="m-link__label">How we work', 'href="#method"><span class="m-link__label">Adaptive workflow');
bodyHtml = bodyHtml.replace('href="#studio"><span class="m-link__label">Inside the studio', 'href="#studio"><span class="m-link__label">Privacy &amp; ethics');
bodyHtml = bodyHtml.replace('href="#journal"><span class="m-link__label">Ideas and news', 'href="#journal"><span class="m-link__label">Practice guides');
bodyHtml = bodyHtml.replace('href="#contact"><span class="m-link__label">Start a project', 'href="/signup"><span class="m-link__label">Start practising');

// Conversion to JSX
// 1. Comments
bodyHtml = bodyHtml.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');

// 2. Class -> className
bodyHtml = bodyHtml.replace(/\bclass="/g, 'className="');

// 3. For -> htmlFor
bodyHtml = bodyHtml.replace(/\bfor="/g, 'htmlFor="');

// 4. Style strings to JSX style objects
bodyHtml = bodyHtml.replace(/style="([^"]*)"/g, (match, styleStr) => {
  const parts = styleStr.split(';').map(s => s.trim()).filter(Boolean);
  const styleObj = {};
  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) continue;
    let prop = part.slice(0, colonIdx).trim();
    let val = part.slice(colonIdx + 1).trim();

    // Convert property names
    if (prop.startsWith('--')) {
      // CSS custom property
      styleObj[`'${prop}'`] = `'${val}'`;
    } else {
      // camelCase
      const camelProp = prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      styleObj[camelProp] = `'${val}'`;
    }
  }
  const objEntries = Object.entries(styleObj).map(([k, v]) => `${k}: ${v}`).join(', ');
  return `style={{ ${objEntries} } as React.CSSProperties}`;
});

// 5. SVG and HTML attribute camelCasing
const attrMap = {
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'pathlength': 'pathLength',
  'clip-path': 'clipPath',
  'viewbox': 'viewBox',
  'fetchpriority': 'fetchPriority',
  'novalidate': 'noValidate',
  'autocomplete': 'autoComplete',
  'tabindex': 'tabIndex'
};

for (const [k, v] of Object.entries(attrMap)) {
  const re = new RegExp(`\\b${k}="`, 'g');
  bodyHtml = bodyHtml.replace(re, `${v}="`);
}

// 6. Self-close void tags: input, img, br, circle, path
bodyHtml = bodyHtml.replace(/<input([^>]*[^\/])>/g, '<input$1 />');
bodyHtml = bodyHtml.replace(/<img([^>]*[^\/])>/g, '<img$1 />');
bodyHtml = bodyHtml.replace(/<br([^>]*[^\/])>/g, '<br$1 />');
bodyHtml = bodyHtml.replace(/<circle([^>]*[^\/])>/g, '<circle$1 />');
bodyHtml = bodyHtml.replace(/<path([^>]*[^\/])>/g, '<path$1 />');

console.log('Successfully prepared JSX body markup, length:', bodyHtml.length);

fs.writeFileSync('app/onda/OndaMarkup.tsx', `// Auto-generated native Onda JSX markup for ELEVORA
import React from 'react';

export function OndaMarkup() {
  return (
    <>
      ${bodyHtml}
    </>
  );
}
`);

console.log('Saved app/onda/OndaMarkup.tsx');
