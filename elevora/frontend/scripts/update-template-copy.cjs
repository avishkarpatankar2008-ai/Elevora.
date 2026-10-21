const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../design-studio-website-template-main/index.html');
let html = fs.readFileSync(filePath, 'utf8');

// Replace branding and copy while strictly preserving HTML, CSS, JS, structure, and attributes.
html = html.replace('<title>Onda — brand, product and AI studio</title>', '<title>ELEVORA — AI Interview Practice Platform</title>');
html = html.replace(
  '<meta name="description" content="Onda is an independent brand, product and AI studio in Lisbon and Brooklyn. We make the things people come back to.">',
  '<meta name="description" content="ELEVORA is the AI Interview Practice Platform. Adaptive questions, voice or text answers, resume grounding, and evidence-linked feedback.">'
);
html = html.replace('<meta property="og:title" content="Onda — brand, product and AI studio">', '<meta property="og:title" content="ELEVORA — AI Interview Practice Platform">');
html = html.replace(
  '<meta property="og:description" content="Onda is an independent brand, product and AI studio in Lisbon and Brooklyn. We make the things people come back to.">',
  '<meta property="og:description" content="ELEVORA is the AI Interview Practice Platform. Adaptive questions, voice or text answers, resume grounding, and evidence-linked feedback.">'
);

// Navigation brand
html = html.replace('Onda<span class="m-dot" aria-hidden="true"></span></a>', 'ELEVORA<span class="m-dot" aria-hidden="true"></span></a>');

// Nav links
html = html.replace('<li><a class="m-link-2" href="#work">Work</a></li>', '<li><a class="m-link-2" href="#work">Scenarios</a></li>');
html = html.replace('<li><a class="m-link-2" href="#capabilities">Services</a></li>', '<li><a class="m-link-2" href="#capabilities">Features</a></li>');
html = html.replace('<li><a class="m-link-2" href="#method">Approach</a></li>', '<li><a class="m-link-2" href="#method">Workflow</a></li>');
html = html.replace('<li><a class="m-link-2" href="#studio">Studio</a></li>', '<li><a class="m-link-2" href="#studio">Principles</a></li>');
html = html.replace('<li><a class="m-link-2" href="#journal">Journal</a></li>', '<li><a class="m-link-2" href="#journal">Resources</a></li>');

// CTA button
html = html.replace('<span>Start a project</span>', '<span>Start practising</span>');
html = html.replace('href="#contact"', 'href="/signup"');

// Mobile menu links
html = html.replace('href="#work">Work<span', 'href="#work">Scenarios<span');
html = html.replace('href="#capabilities">Services<span', 'href="#capabilities">Features<span');
html = html.replace('href="#method">Approach<span', 'href="#method">Workflow<span');
html = html.replace('href="#studio">Studio<span', 'href="#studio">Principles<span');
html = html.replace('href="#journal">Journal<span', 'href="#journal">Resources<span');
html = html.replace('href="#contact">Contact<span', 'href="/signup">Start practising<span');
html = html.replace('hello@onda.example · Lisbon and Brooklyn', 'ELEVORA · AI Interview Practice Platform');

// Hero section
html = html.replace(
  'We\'re Onda, an independent brand, product and AI studio. We make things people come back to, and we\'d love to hear what you\'re making.',
  'Practise for the interview you actually have. ELEVORA listens to your answers, adapts difficulty in real time, and provides evidence-linked feedback.'
);
html = html.replace('See the work', 'Start practising');
html = html.replace('<span class="hero__glyphs">Hello</span>', '<span class="hero__glyphs">Ready</span>');

// Statement section
html = html.replace('We make the things', 'Practise for the interview');
html = html.replace('people come back&nbsp;to', 'you actually&nbsp;have');
html = html.replace(
  'Launching is easy. Being chosen again on an ordinary Tuesday is the hard part, whether you run a bank, a bakery or a museum. It takes strategy, craft, engineering and a lot of listening, and it is the only kind of work we do.',
  'A real interview catches you off-guard — so practice should too. ELEVORA builds an adaptive session from your target role, experience, and what you actually said. Every score points to transcript evidence.'
);
html = html.replace('See the work', 'Explore scenarios');
html = html.replace('What we do', 'Platform features');
html = html.replace('How we work', 'Adaptive workflow');
html = html.replace('Inside the studio', 'Responsible AI');
html = html.replace('Ideas and news', 'Practice guides');
html = html.replace('Start a project', 'Create an account');

// Work section
html = html.replace('Selected work', 'Practice scenarios');
html = html.replace('Five launches from the last two years. Every one of them is still growing.', 'Choose your target role or exam. Each session adapts dynamically to your performance.');

// Work card 1 (Northwind Bikes)
html = html.replace('Brand, launch', 'Role practice');
html = html.replace('Northwind Bikes', 'Software engineer');
html = html.replace('An e-bike brand launched in eleven cities in a single spring.', 'Practise technical questions, explain architectural trade-offs, and respond to adaptive follow-ups.');

// Work card 2 (Halden Bank)
html = html.replace('Product, app', 'Behavioral');
html = html.replace('Halden Bank', 'Behavioral interview');
html = html.replace('A 120-year-old bank, rebuilt as the app its customers open first.', 'Structure structured STAR responses and articulate your professional impact clearly.');

// Work card 3 (Copper & Oat)
html = html.replace('Commerce', 'Foundational');
html = html.replace('Copper &amp; Oat', 'Campus placement');
html = html.replace('A neighbourhood bakery that now sells more by phone than by window.', 'Warm up with foundational computer science, aptitude, and entry-level communication questions.');

// Work card 4 (Atlas Museum)
html = html.replace('Service, content', 'Targeted');
html = html.replace('Atlas Museum', 'Exam preparation');
html = html.replace('A quiet collection turned into a weekly night out.', 'Simulate rigorous interview boards for UPSC, MPSC, SSC, and banking examinations.');

// Work card 5 (Sola Sound)
html = html.replace('Campaign', 'Architecture');
html = html.replace('Sola Sound', 'System design');
html = html.replace('A headphone launch that sold out its first run in nine days.', 'Discuss scalability, fault tolerance, caching layers, and distributed system trade-offs.');

// Again section (Partners / History benefits)
html = html.replace('Never a one-off', 'Progress that builds');
html = html.replace('Most of our partners have been with us for more than five years. Every lap around, the work gets sharper.', 'Your interview history, score trends, and evidence-linked reports stay saved so each practice session builds on the last.');

html = html.replace('Year 9', 'History');
html = html.replace('Vela Air', 'Interview history');
html = html.replace('From the booking flow to the boarding gate.', 'Return to past sessions and review your historical reports.');

html = html.replace('Year 4', 'Analytics');
html = html.replace('Kiln Coffee', 'Score trends');
html = html.replace('One roastery grew into a subscription habit.', 'Visualize your dimensional growth across knowledge and communication.');

html = html.replace('Year 6', 'Modes');
html = html.replace('Larch Outdoor', 'Voice or text');
html = html.replace('A storefront rebuilt around the off-season.', 'Answer by voice with Whisper transcription or type directly.');

html = html.replace('Year 7', 'Rubric');
html = html.replace('Tessera Games', 'Evidence feedback');
html = html.replace('A launch campaign for every season since day one.', 'Every score cites exact transcript evidence with zero arbitrary fluff.');

html = html.replace('Year 8', 'Profiles');
html = html.replace('Civic Lab', 'Custom profiles');
html = html.replace('Public services people can finish on a phone.', 'Save reusable templates for your specific company and subjects.');

html = html.replace('Year 5', 'Privacy');
html = html.replace('Marrow Health', 'Camera optional');
html = html.replace('One patient app across three hospital systems.', 'Optional on-device posture estimates with explicit consent; camera-free is fully functional.');

// Capabilities section
html = html.replace('Five practices and one team in the room, from the first workshop to the last release.', 'A complete interview preparation engine built on deterministic scoring rubrics and sequential AI routing.');

html = html.replace('Brand and identity', 'Adaptive question generation');
html = html.replace('Positioning, naming and identity systems with enough range to stay interesting in year five.', 'Questions adjust to your previous answer\'s depth, challenging assumptions and prompting for concrete evidence.');
html = html.replace('<ul class="service__tags"><li class="m-badge">Strategy</li><li class="m-badge">Naming</li><li class="m-badge">Identity systems</li><li class="m-badge">Guidelines</li></ul>', '<ul class="service__tags"><li class="m-badge">Role-grounded</li><li class="m-badge">Adaptive difficulty</li><li class="m-badge">Resume-linked</li><li class="m-badge">Job description</li></ul>');

html = html.replace('Products and apps', 'Multi-dimensional evaluation');
html = html.replace('Apps and platforms designed, engineered and measured by the same people who first sketched them.', 'Scored across knowledge, communication, relevance, problem solving, and interview handling with mandatory citations.');
html = html.replace('<ul class="service__tags"><li class="m-badge">Product strategy</li><li class="m-badge">UX and UI</li><li class="m-badge">Engineering</li><li class="m-badge">Design systems</li></ul>', '<ul class="service__tags"><li class="m-badge">Evidence-based</li><li class="m-badge">Deterministic weights</li><li class="m-badge">Confidence scoring</li><li class="m-badge">Rubric integrity</li></ul>');

html = html.replace('Campaigns and content', 'Actionable feedback reports');
html = html.replace('Ideas sized for culture and planned like a product roadmap, so the second month is better than the first.', 'Receive concrete strengths, improvement areas, and targeted practice recommendations after every session.');
html = html.replace('<ul class="service__tags"><li class="m-badge">Campaigns</li><li class="m-badge">Social</li><li class="m-badge">Film and photo</li><li class="m-badge">Media planning</li></ul>', '<ul class="service__tags"><li class="m-badge">Strengths</li><li class="m-badge">Improvement areas</li><li class="m-badge">Model answers</li><li class="m-badge">Practice plans</li></ul>');

html = html.replace('Service design', 'On-device posture analysis');
html = html.replace('Every moment between a person and your company, mapped, prototyped and made a little easier.', 'Optional client-side MediaPipe pose estimation tracking head alignment, framing, and movement without uploading raw video.');
html = html.replace('<ul class="service__tags"><li class="m-badge">Research</li><li class="m-badge">Journey mapping</li><li class="m-badge">Blueprints</li><li class="m-badge">Prototyping</li></ul>', '<ul class="service__tags"><li class="m-badge">Explicit consent</li><li class="m-badge">Zero raw video upload</li><li class="m-badge">Descriptive only</li><li class="m-badge">Camera-free option</li></ul>');

html = html.replace('Applied AI', 'Voice & audio analytics');
html = html.replace('Tools your teams use on Monday morning, not a demo for the board.', 'Speech transcription via Groq Whisper with pause duration, pacing (WPM), and filler word rate measurement.');
html = html.replace('<ul class="service__tags"><li class="m-badge">Opportunity mapping</li><li class="m-badge">Prototypes</li><li class="m-badge">Assistants</li><li class="m-badge">Team training</li></ul>', '<ul class="service__tags"><li class="m-badge">Whisper transcription</li><li class="m-badge">Speech pace (WPM)</li><li class="m-badge">Pause analysis</li><li class="m-badge">Filler rate</li></ul>');

// Method section
html = html.replace('Every project runs the same loop of four steps. The fourth is the one most studios skip, and it is where the best work happens.', 'Every practice session follows a disciplined four-step loop that turns preparation into instinct.');
html = html.replace('Two weeks with your customers, your data and your front line before we draw anything at all.', 'Choose a target role or profile, difficulty, language, and upload an optional resume or job description.');
html = html.replace('Small mixed teams ship real, testable things early: in days, not quarters, and in front of real people.', 'Answer adaptive questions out loud or by text. The AI interviewer challenges claims and probes depth.');
html = html.replace('We agree on what better looks like before we start, then report it honestly, good news or not.', 'Review evidence behind each dimension score. No scores are invented or based on hidden vibes.');
html = html.replace('We take what we learned and go round once more. It is not the end of the project. It is the job.', 'Identify weaknesses, adjust your configuration, and run another session until it becomes automatic.');

html = html.replace('<h3>Listen</h3>', '<h3>Configure</h3>');
html = html.replace('<h3>Make</h3>', '<h3>Interview</h3>');
html = html.replace('<h3>Measure</h3>', '<h3>Review</h3>');
html = html.replace('<h3>Again</h3>', '<h3>Repeat</h3>');

// Studio section
html = html.replace('Ninety people between Lisbon and Brooklyn: strategists, designers, engineers and writers who would rather show you than tell you. We work in small mixed teams, sit with the people we build for, and keep Friday afternoons for our own experiments.', 'ELEVORA is built on transparency: your interview data is yours, AI scores require verifiable evidence from your answers, and webcam analysis is strictly on-device. We never infer emotion, personality, or candidate suitability.');
html = html.replace('Open roles', 'Quick access');
html = html.replace('Senior product designer', 'Dashboard');
html = html.replace('Creative technologist', 'New interview');
html = html.replace('Strategy director', 'Profiles');
html = html.replace('Lisbon', 'History');
html = html.replace('Brooklyn', 'Session');
html = html.replace('Remote, Europe', 'Saved templates');
html = html.replace('href="mailto:careers@onda.example"', 'href="/dashboard"');
html = html.replace('careers@onda.example', 'Go to dashboard');

// Journal section (Resources)
html = html.replace('Open Studio Night returns to Lisbon on 14 November', 'The STAR method under adaptive questioning');
html = html.replace('Talks, half-built prototypes and a long table in the old print hall. Bring a friend who makes things.', 'How to maintain structured answers when an AI interviewer interrupts to probe for concrete metrics.');
html = html.replace('The second visit: why we design for the return, not the launch', 'Grounding technical claims in your project history');
html = html.replace('Most products are judged on day one and lost on day thirty. Notes on designing for the ordinary Tuesday.', 'Why aligning your resume bullet points with specific technical challenges creates a stronger practice interview.');
html = html.replace('Type, tested: a variable identity that holds up at twelve pixels', 'Managing speech rate and pause length in voice interviews');
html = html.replace('How one variable family carried a bank from a forty-metre billboard to its banking app.', 'Balancing words-per-minute with deliberate pauses to convey thoughtful problem-solving.');
html = html.replace('What three hundred nurses told us about the night shift', 'Why webcam posture analysis belongs on the client');
html = html.replace('Six weeks of field research for a health partner, and the three things we changed because of it.', 'The engineering behind browser-side landmark extraction and why raw video should never leave your machine.');

// FAQ section
html = html.replace('What size of company do you work with?', 'What types of interviews can I practise?');
html = html.replace('Mostly companies between fifty and five thousand people, plus a few public bodies. Size matters less than whether the people who decide are in the room.', 'Software engineering, campus placements, behavioral rounds, UPSC, MPSC, SSC, banking, and custom interview profiles you define yourself.');

html = html.replace('How does a project usually start?', 'How are interview answers scored?');
html = html.replace('With a two-week listening sprint: interviews, data and a day on your front line. You get a short written point of view and a plan before any big commitment.', 'Answers are evaluated across five core dimensions: Knowledge, Communication, Relevance, Problem Solving, and Interview Handling. Every score requires citing specific evidence from your transcript.');

html = html.replace('Do you work alongside in-house teams?', 'Is the webcam required for practice?');
html = html.replace('Almost always. We pair with your designers, engineers and marketers, and we hand over every system we build so you are never stuck with us. Most partners keep us around anyway.', 'No. The camera is completely optional and disabled by default. If enabled, it requires explicit consent, runs entirely on your device via MediaPipe, and never uploads video.');

html = html.replace('How do you price the work?', 'How does the free-tier AI routing work?');
html = html.replace('Fixed fees for defined phases, then a monthly team for ongoing work. We are open about our rates on the first call.', 'ELEVORA uses a six-model free-only routing chain (Groq primary, Gemini flash models, and OpenRouter free tiers) with automatic failover, rate-limit cooldowns, and deterministic fallbacks.');

html = html.replace('Where are you based?', 'Can I upload my resume and a job description?');
html = html.replace('Lisbon and Brooklyn, with people working remotely across Europe and the US east coast. We travel for workshops and launches.', 'Yes. Uploading a resume (PDF/DOCX) and job description extracts key skills, technologies, and claims to ground the questions in your actual background.');

// Contact section
html = html.replace('Let\'s talk', 'Let\'s practise');
html = html.replace('Tell us what you are making. A real person reads every message and replies within two working days.', 'Ready to prepare for your next interview? Create an account to track your sessions, score trends, and personalized feedback.');
html.replace('hello@onda.example', 'Start practising');
html.replace('href="mailto:hello@onda.example"', 'href="/signup"');

html = html.replace('Lisbon', 'New candidate?');
html = html.replace('Rua do Exemplo 1<br>1200-000 Lisbon', 'Create your free account<br>Start practising in under a minute');
html = html.replace('tel:+351210000000', '/signup');
html = html.replace('+351 210 000 000', 'Create account →');

html = html.replace('Brooklyn', 'Existing user?');
html = html.replace('100 Example Street<br>Brooklyn, NY 11200', 'Sign in to your dashboard<br>Resume previous sessions');
html.replace('tel:+17180000000', '/login');
html.replace('+1 718 000 0000', 'Sign in →');

// Footer section
html = html.replace('Onda in your inbox, once a month', 'Stay prepared for your next role');
html = html.replace('No spam, one email a month, unsubscribe in one click.', 'Adaptive interview practice. Voice or text. Camera optional.');
html = html.replace('© 2026 Onda Studio', '© 2026 ELEVORA');
html = html.replace('Made in Lisbon and Brooklyn', 'Practice the interview, not a script.');

// Footer links
html = html.replace('href="mailto:hello@onda.example"', 'href="/login"');
html = html.replace('href="mailto:careers@onda.example"', 'href="/signup"');
html = html.replace('href="tel:+351210000000"', 'href="/interviews/new"');
html = html.replace('https://www.instagram.com/', '/signup');
html = html.replace('https://www.linkedin.com/', '/dashboard');
html = html.replace('https://vimeo.com/', '/settings');

fs.writeFileSync(filePath, html, 'utf8');
console.log('Successfully updated design-studio-website-template-main/index.html with ELEVORA content.');
