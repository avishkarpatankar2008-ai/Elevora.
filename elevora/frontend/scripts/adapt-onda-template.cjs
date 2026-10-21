const fs = require("node:fs");
const path = require("node:path");

const source = path.resolve(__dirname, "../public/onda/original.html");
const destination = path.resolve(__dirname, "../public/onda/index.html");
let html = fs.readFileSync(source, "utf8");

function replaceOnce(from, to) {
  if (!html.includes(from)) throw new Error(`Template anchor not found: ${from.slice(0, 100)}`);
  html = html.replace(from, to);
}
function replaceAll(from, to) {
  if (!html.includes(from)) throw new Error(`Template anchor not found: ${from.slice(0, 100)}`);
  html = html.split(from).join(to);
}

// Product metadata; the original design system and every CSS rule stay intact.
replaceOnce("<title>Onda — brand, product and AI studio</title>", "<title>ELEVORA — Adaptive AI Interview Practice</title>");
replaceOnce("Onda is an independent brand, product and AI studio in Lisbon and Brooklyn. We make the things people come back to.", "ELEVORA helps you practise interviews with adaptive questions, voice or text answers, and evidence-linked feedback.");
replaceOnce("<meta property=\"og:title\" content=\"Onda — brand, product and AI studio\">", "<meta property=\"og:title\" content=\"ELEVORA — Adaptive AI Interview Practice\">");
replaceOnce("<meta property=\"og:description\" content=\"Onda is an independent brand, product and AI studio in Lisbon and Brooklyn. We make the things people come back to.\">", "<meta property=\"og:description\" content=\"Adaptive interview practice with voice or text answers, resume-grounded questions, and evidence-linked feedback.\">");
replaceOnce("<meta property=\"og:image\" content=\"https://your-domain.example/preview.png\" data-8b-placeholder=\"og-image\">", "");
replaceOnce("<meta name=\"twitter:card\" content=\"summary_large_image\">", "<meta name=\"twitter:card\" content=\"summary\">");
replaceOnce("aria-label=\"Onda, back to the top\">Onda", "aria-label=\"ELEVORA, back to the top\">ELEVORA");
replaceOnce("<span class=\"m-dot\" aria-hidden=\"true\"></span></a>\n  <nav class=\"nav__links\"", "<span class=\"m-dot\" aria-hidden=\"true\"></span></a>\n  <nav class=\"nav__links\"");

// Navigation keeps the original fixed pill layout and menu implementation.
replaceOnce("<li><a class=\"m-link-2\" href=\"#work\">Work</a></li>", "<li><a class=\"m-link-2\" href=\"#work\">Practice modes</a></li>");
replaceOnce("<li><a class=\"m-link-2\" href=\"#capabilities\">Services</a></li>", "<li><a class=\"m-link-2\" href=\"#capabilities\">Features</a></li>");
replaceOnce("<li><a class=\"m-link-2\" href=\"#method\">Approach</a></li>", "<li><a class=\"m-link-2\" href=\"#method\">How it works</a></li>");
replaceOnce("<li><a class=\"m-link-2\" href=\"#studio\">Studio</a></li>", "<li><a class=\"m-link-2\" href=\"#studio\">Principles</a></li>");
replaceOnce("<li><a class=\"m-link-2\" href=\"#journal\">Journal</a></li>", "<li><a class=\"m-link-2\" href=\"#journal\">Resources</a></li>");
replaceOnce("<a class=\"m-btn nav__cta\" href=\"#contact\"><span class=\"m-btn__label\">Start a project</span></a>", "<a class=\"m-btn nav__cta\" href=\"/signup\"><span class=\"m-btn__label\">Start practising</span></a>");
replaceOnce("<li><a href=\"#work\">Work<span", "<li><a href=\"#work\">Practice modes<span");
replaceOnce("<li><a href=\"#capabilities\">Services<span", "<li><a href=\"#capabilities\">Features<span");
replaceOnce("<li><a href=\"#method\">Approach<span", "<li><a href=\"#method\">How it works<span");
replaceOnce("<li><a href=\"#studio\">Studio<span", "<li><a href=\"#studio\">Principles<span");
replaceOnce("<li><a href=\"#journal\">Journal<span", "<li><a href=\"#journal\">Resources<span");
replaceOnce("<li><a href=\"#contact\">Contact<span", "<li><a href=\"#contact\">Get started<span");
replaceOnce("<p class=\"m-text menu__foot\">hello@onda.example · Lisbon and Brooklyn</p>", "<p class=\"m-text menu__foot\"><a href=\"/login\">Sign in</a> · <a href=\"/signup\">Create your account</a></p>");

// Hero and statement keep the original word sizing, dot, image aperture and handoff.
replaceOnce("We're Onda, an independent brand, product and AI studio. We make things people come back to, and we'd love to hear what you're making.", "Practise for the interview you actually have. ELEVORA adapts to your answers, your target role and your experience — so you can build confidence beyond a script.");
replaceOnce("<a class=\"m-link hero__link\" href=\"#work\"><span class=\"m-link__label\">See the work</span>", "<a class=\"m-link hero__link\" href=\"/signup\"><span class=\"m-link__label\">Start practising</span>");
replaceOnce("<span class=\"hero__glyphs\">Hello</span>", "<span class=\"hero__glyphs\">Ready</span>");
replaceOnce("We make the things", "Practise for the interview");
replaceOnce("people come back&nbsp;to", "you actually&nbsp;have");
replaceOnce("Launching is easy. Being chosen again on an ordinary Tuesday is the hard part, whether you run a bank, a bakery or a museum. It takes strategy, craft, engineering and a lot of listening, and it is the only kind of work we do.", "Real interviews are unpredictable. ELEVORA builds an adaptive session from your target role, your experience and what you actually said. Every score points to evidence; missing measurements stay unavailable.");
replaceOnce("See the work</span>", "Explore practice modes</span>");
replaceOnce("What we do</span>", "Explore features</span>");
replaceOnce("How we work</span>", "How it works</span>");
replaceOnce("Inside the studio</span>", "Our principles</span>");
replaceOnce("Ideas and news</span>", "Practice resources</span>");
replaceOnce("Start a project</span>", "Create an account</span>");

// Work cards retain exact original image crops and horizontal track; demo client claims are removed.
replaceOnce("Selected work", "Practice modes");
replaceOnce("Five launches from the last two years. Every one of them is still growing.", "Choose a practice scenario. Each interview is configured for your target and saved to your account.");
const workCards = [
  ["Brand, launch", "Software engineer", "An e-bike brand launched in eleven cities in a single spring.", "Practise technical questions, explain trade-offs, and work through role-specific follow-ups."],
  ["Product, app", "Behavioural interview", "A 120-year-old bank, rebuilt as the app its customers open first.", "Structure examples from your experience and respond to adaptive follow-up questions."],
  ["Commerce", "Campus placement", "A neighbourhood bakery that now sells more by phone than by window.", "Warm up with entry-level questions for campus and early-career interviews."],
  ["Service, content", "Exam preparation", "A quiet collection turned into a weekly night out.", "Configure practice for exams and public-service interviews, including UPSC, MPSC, SSC and banking."],
  ["Campaign", "System design", "A headphone launch that sold out its first run in nine days.", "Talk through architecture, constraints and decisions in a focused system-design session."],
];
for (const [oldTag, newTag, oldTitle, newTitle, oldBody, newBody] of workCards.map(([tag, title, body, replacement]) => [tag, "", title, title, body, replacement])) {
  replaceOnce(`<span class=\"m-badge case__tag\">${oldTag}</span>`, `<span class=\"m-badge case__tag\">${oldTag}</span>`);
}
replaceOnce("Northwind Bikes", "Software engineer");
replaceOnce("An e-bike brand launched in eleven cities in a single spring.", "Practise technical questions, explain trade-offs, and work through role-specific follow-ups.");
replaceOnce("Halden Bank", "Behavioural interview");
replaceOnce("A 120-year-old bank, rebuilt as the app its customers open first.", "Structure examples from your experience and respond to adaptive follow-up questions.");
replaceOnce("Copper &amp; Oat", "Campus placement");
replaceOnce("A neighbourhood bakery that now sells more by phone than by window.", "Warm up with entry-level questions for campus and early-career interviews.");
replaceOnce("Atlas Museum", "Exam preparation");
replaceOnce("A quiet collection turned into a weekly night out.", "Configure practice for exams and public-service interviews, including UPSC, MPSC, SSC and banking.");
replaceOnce("Sola Sound", "System design");
replaceOnce("A headphone launch that sold out its first run in nine days.", "Talk through architecture, constraints and decisions in a focused system-design session.");
replaceAll("<span class=\"m-badge case__tag\">Brand, launch</span>", "<span class=\"m-badge case__tag\">Role practice</span>");
replaceAll("<span class=\"m-badge case__tag\">Product, app</span>", "<span class=\"m-badge case__tag\">Behavioral</span>");
replaceAll("<span class=\"m-badge case__tag\">Commerce</span>", "<span class=\"m-badge case__tag\">Entry level</span>");
replaceAll("<span class=\"m-badge case__tag\">Service, content</span>", "<span class=\"m-badge case__tag\">Exam practice</span>");
replaceAll("<span class=\"m-badge case__tag\">Campaign</span>", "<span class=\"m-badge case__tag\">Technical</span>");

// Again wheel is a progress/history benefit section, not fake customers or testimonials.
replaceOnce("Never a one-off", "Progress that builds");
replaceOnce("Most of our partners have been with us for more than five years. Every lap around, the work gets sharper.", "Your interview history and reports stay in your account, so each practice session can build on the last.");
const historyPairs = [
  ["Vela Air", "Interview history", "From the booking flow to the boarding gate.", "Return to previous sessions and revisit your evidence-linked reports."],
  ["Kiln Coffee", "Progress over time", "One roastery grew into a subscription habit.", "Review completed sessions and see your measured scores across reports."],
  ["Larch Outdoor", "Answer practice", "A storefront rebuilt around the off-season.", "Practise by voice or text; each mode uses the same evaluation rubric."],
  ["Tessera Games", "Evidence-linked feedback", "A launch campaign for every season since day one.", "See strengths and improvement areas grounded in what you said."],
  ["Civic Lab", "Interview profiles", "Public services people can finish on a phone.", "Save reusable profiles for the roles, exams and question types you want to practise."],
  ["Marrow Health", "Camera optional", "One patient app across three hospital systems.", "Keep the camera off, or opt in to on-device posture estimates. Camera-free interviews remain fully functional."],
];
for (const [name, newName, oldBody, newBody] of historyPairs) {
  replaceOnce(name, newName);
  replaceOnce(oldBody, newBody);
}
replaceAll("Year 9", "History");
replaceAll("Year 4", "Reports");
replaceAll("Year 6", "Voice / text");
replaceAll("Year 7", "Feedback");
replaceAll("Year 8", "Profiles");
replaceAll("Year 5", "Optional");

// Original service-card geometry and iris reveals now describe real ELEVORA capabilities.
replaceOnce("Five practices and one team in the room, from the first workshop to the last release.", "An adaptive practice workflow grounded in your goals, your answers and the evidence in each session.");
const capabilityPairs = [
  ["Brand and identity", "Question generation", "Positioning, naming and identity systems with enough range to stay interesting in year five.", "Questions are generated for your selected role or profile, then adapt to your answers and follow-up context."],
  ["Products and apps", "Answer evaluation", "Apps and platforms designed, engineered and measured by the same people who first sketched them.", "Your answers are evaluated against a consistent rubric, with strengths, weaknesses and follow-up reasoning."],
  ["Campaigns and content", "Actionable feedback", "Ideas sized for culture and planned like a product roadmap, so the second month is better than the first.", "Review evidence-linked dimension scores, strengths, improvement areas and recommended practice."],
  ["Service design", "Posture analysis", "Every moment between a person and your company, mapped, prototyped and made a little easier.", "Optional posture estimates run on-device after explicit consent. Raw video is not uploaded, and posture never affects interview competence scores."],
  ["Applied AI", "Voice or text", "Tools your teams use on Monday morning, not a demo for the board.", "Use text or voice answers, review transcripts, and keep practice moving even if AI services are unavailable."],
];
for (const [oldTitle, newTitle, oldBody, newBody] of capabilityPairs) {
  replaceOnce(oldTitle, newTitle);
  replaceOnce(oldBody, newBody);
}
for (const [oldTag, newTag] of [["Strategy", "Role-specific"], ["Naming", "Adaptive"], ["Identity systems", "Profile grounded"], ["Guidelines", "Resume grounded"], ["Product strategy", "Knowledge"], ["UX and UI", "Communication"], ["Engineering", "Relevance"], ["Design systems", "Problem solving"], ["Campaigns", "Evidence"], ["Social", "Strengths"], ["Film and photo", "Improvements"], ["Media planning", "Practice plan"], ["Research", "On-device"], ["Journey mapping", "Consent-based"], ["Blueprints", "Camera-free option"], ["Prototyping", "Never scored"], ["Opportunity mapping", "Voice or text"], ["Prototypes", "Transcript"], ["Assistants", "Fail-safe"], ["Team training", "Free-tier routing"]]) {
  replaceOnce(`<li class=\"m-badge\">${oldTag}</li>`, `<li class=\"m-badge\">${newTag}</li>`);
}

// Four-step cycle and collage section remain structurally identical.
replaceOnce("Every project runs the same loop of four steps. The fourth is the one most studios skip, and it is where the best work happens.", "Every practice session follows a clear loop: configure the target, answer adaptive questions, then review the evidence and decide what to practise next.");
replaceOnce("Two weeks with your customers, your data and your front line before we draw anything at all.", "Choose a role or saved profile, set the difficulty and language, and optionally add a resume or job description.");
replaceOnce("Small mixed teams ship real, testable things early: in days, not quarters, and in front of real people.", "Answer each generated question by typing or speaking. The interviewer adapts within your selected profile.");
replaceOnce("We agree on what better looks like before we start, then report it honestly, good news or not.", "Complete the session and generate a report when you choose. Scores include transcript evidence; unavailable data is never invented.");
replaceOnce("We take what we learned and go round once more. It is not the end of the project. It is the job.", "Use your feedback to choose what to practise again. Your interview history keeps completed sessions available for review.");
replaceOnce("Ninety people between Lisbon and Brooklyn: strategists, designers, engineers and writers who would rather show you than tell you. We work in small mixed teams, sit with the people we build for, and keep Friday afternoons for our own experiments.", "ELEVORA is built around responsible practice: your interview answers are yours, AI scores must cite transcript evidence, and camera analysis stays optional and on-device. The platform never infers honesty, emotion, intelligence or suitability.");
replaceOnce("Open roles", "Explore the app");
replaceOnce("Senior product designer", "Dashboard"); replaceOnce("Lisbon</span>", "History</span>");
replaceOnce("Creative technologist", "Start a session"); replaceOnce("Brooklyn</span>", "New interview</span>");
replaceOnce("Strategy director", "Preferences"); replaceOnce("Remote, Europe", "Settings");
replaceOnce("<a data-8b-placeholder=\"email\" class=\"m-link\" href=\"mailto:careers@onda.example\"><span class=\"m-link__label\">careers@onda.example</span>", "<a class=\"m-link\" href=\"/dashboard\"><span class=\"m-link__label\">Go to dashboard</span>");

// Replace fictional dated articles with undated, genuine practice guidance.
const resources = [
  ["Event", "1 October 2026", "2 min read", "Open Studio Night returns to Lisbon on 14 November", "Talks, half-built prototypes and a long table in the old print hall. Bring a friend who makes things.", "Practice guide", "Answer with specific examples", "Use a clear situation, action and outcome to make your experience concrete and easier to evaluate."],
  ["Essay", "18 September 2026", "6 min read", "The second visit: why we design for the return, not the launch", "Most products are judged on day one and lost on day thirty. Notes on designing for the ordinary Tuesday.", "Practice guide", "Ground answers in your experience", "Upload your resume during setup when you want role questions to refer to your projects and skills."],
  ["Notes", "30 August 2026", "8 min read", "Type, tested: a variable identity that holds up at twelve pixels", "How one variable family carried a bank from a forty-metre billboard to its banking app.", "Practice guide", "Choose a response mode", "Type your answer or record it by voice. The same interview engine accepts both paths."],
  ["Research", "4 August 2026", "5 min read", "What three hundred nurses told us about the night shift", "Six weeks of field research for a health partner, and the three things we changed because of it.", "Privacy note", "Camera analysis is optional", "Posture estimates run on-device only after consent. Camera-free practice remains fully functional."],
];
for (const [oldCategory, oldDate, oldTime, oldTitle, oldBody, category, title, body] of resources) {
  replaceOnce(`<span>${oldCategory}</span> · <time datetime=`, `<span>${category}</span> · <span>`);
  // Remove the original date value and read-time suffix while keeping the story layout.
  replaceOnce(`>${oldDate}</time> · ${oldTime}`, `</span>`);
  replaceOnce(oldTitle, title);
  replaceOnce(oldBody, body);
}

// FAQ is still native details/summary, with actual product answers.
const faqs = [
  ["What size of company do you work with?", "What interview types can I practise?", "Mostly companies between fifty and five thousand people, plus a few public bodies. Size matters less than whether the people who decide are in the room.", "Choose a role, company-specific, campus placement or exam profile. You can also create reusable interview profiles with your own subjects and question types."],
  ["How does a project usually start?", "How does a practice session start?", "With a two-week listening sprint: interviews, data and a day on your front line. You get a short written point of view and a plan before any big commitment.", "Choose or create a profile, set the target, difficulty, language and duration, and optionally upload a resume or job description before starting."],
  ["Do you work alongside in-house teams?", "Are the scores based on my answers?", "Almost always. We pair with your designers, engineers and marketers, and we hand over every system we build so you are never stuck with us. Most partners keep us around anyway.", "Yes. AI-evaluated dimensions require evidence from your transcript. The report labels missing or unavailable measurements rather than estimating them."],
  ["How do you price the work?", "Is posture analysis required?", "Fixed fees for defined phases, then a monthly team for ongoing work. We are open about our rates on the first call.", "No. Interviews work with the camera off. If you choose posture analysis, you must give explicit consent first; estimates are descriptive and never used to score interview competence."],
  ["Where are you based?", "What happens if AI is unavailable?", "Lisbon and Brooklyn, with people working remotely across Europe and the US east coast. We travel for workshops and launches.", "The application follows a fixed, free-tier model allowlist with sequential failover. If configured providers are unavailable, deterministic fallback content is explicitly marked for manual review; it is not presented as a live AI evaluation."],
];
for (const [oldQuestion, question, oldAnswer, answer] of faqs) {
  replaceOnce(oldQuestion, question);
  replaceOnce(oldAnswer, answer);
}

// Contact area keeps the original violet layout but offers real application actions;
// no fake contact submission, newsletter or fabricated email is left behind.
replaceOnce("<span class=\"contact__voice\">Let's talk</span>", "<span class=\"contact__voice\">Let's practise</span>");
replaceOnce("Tell us what you are making. A real person reads every message and replies within two working days.", "Your next practice session starts with a real account. Create one to save your interview history and reports, or sign in to continue.");
replaceOnce("<a data-8b-placeholder=\"email\" class=\"contact__mail\" href=\"mailto:hello@onda.example\"><span>hello@onda.example</span></a>", "<a class=\"contact__mail\" href=\"/signup\"><span>Start practising</span></a>");
replaceOnce("      <dl class=\"contact__places\">\n        <div><dt class=\"m-text-7\">Lisbon</dt><dd class=\"m-text\">Rua do Exemplo 1<br>1200-000 Lisbon</dd><dd class=\"m-text\"><a data-8b-placeholder=\"phone\" href=\"tel:+351210000000\">+351 210 000 000</a></dd></div>\n        <div><dt class=\"m-text-7\">Brooklyn</dt><dd class=\"m-text\">100 Example Street<br>Brooklyn, NY 11200</dd><dd class=\"m-text\"><a data-8b-placeholder=\"phone\" href=\"tel:+17180000000\">+1 718 000 0000</a></dd></div>\n      </dl>", "      <dl class=\"contact__places\">\n        <div><dt class=\"m-text-7\">Already have an account?</dt><dd class=\"m-text\"><a href=\"/login\">Sign in to ELEVORA</a></dd></div>\n        <div><dt class=\"m-text-7\">New to ELEVORA?</dt><dd class=\"m-text\"><a href=\"/signup\">Create a free account</a></dd></div>\n      </dl>");
replaceOnce("    <form data-8b-placeholder=\"form\" class=\"contact__form m-surface\" novalidate>", "    <div class=\"contact__form m-surface\">");
replaceOnce("      <div class=\"contact__pair\">\n        <label class=\"m-text-6\">Your name<input class=\"m-field\" name=\"name\" type=\"text\" autocomplete=\"name\" required></label>\n        <label class=\"m-text-6\">Email<input class=\"m-field\" name=\"email\" type=\"email\" autocomplete=\"email\" required></label>\n      </div>\n      <div class=\"contact__pair\">\n        <label class=\"m-text-6\">Company<input class=\"m-field\" name=\"company\" type=\"text\" autocomplete=\"organization\"></label>\n        <label class=\"m-text-6\">What can we help with?<select class=\"m-field\" name=\"topic\"><option>A new brand</option><option>A product or app</option><option>A campaign</option><option>Something else</option></select></label>\n      </div>\n      <label class=\"m-text-6\">A few words about the project<textarea class=\"m-field\" name=\"message\" rows=\"3\" required></textarea></label>\n      <div class=\"contact__actions\">\n        <button class=\"m-btn\" type=\"submit\"><span class=\"m-btn__label\">Send message</span></button>\n        <p class=\"m-text contact__status\" role=\"status\" aria-live=\"polite\" data-success=\"Thank you. We will reply within two working days.\" data-error=\"Please add your name, a valid email and a few words about the project.\"></p>\n      </div>\n    </form>", "      <p class=\"m-text-7\">Choose where to go next<span class=\"m-dot\" aria-hidden=\"true\"></span></p>\n      <p class=\"m-text\">Your interviews and reports are private to your account. Sign in to continue or create an account to start practising.</p>\n      <div class=\"contact__actions\">\n        <a class=\"m-btn\" href=\"/signup\"><span class=\"m-btn__label\">Create account</span></a>\n        <a class=\"m-btn-2\" href=\"/login\"><span class=\"m-btn__label\">Sign in</span></a>\n      </div>\n    </div>");
replaceOnce("<form data-8b-placeholder=\"form\" class=\"footer__news\" novalidate>", "<div class=\"footer__news\">");
replaceOnce("<label class=\"m-text-7\" for=\"news-email\">Onda in your inbox, once a month<span class=\"m-dot\" aria-hidden=\"true\"></span></label>\n      <div class=\"footer__field\">\n        <input class=\"m-field\" id=\"news-email\" name=\"email\" type=\"email\" autocomplete=\"email\" placeholder=\"Your email\" required>\n        <button class=\"m-icon\" type=\"submit\" aria-label=\"Subscribe\"><svg viewBox=\"0 0 16 16\" aria-hidden=\"true\"><path d=\"M2 8h11M9 3.5 13.5 8 9 12.5\"/></svg></button>\n      </div>\n      <p class=\"m-text-6 footer__note\" role=\"status\" aria-live=\"polite\" data-idle=\"No spam, one email a month, unsubscribe in one click.\" data-success=\"You are in. See you next month.\" data-error=\"Please enter a valid email address.\">No spam, one email a month, unsubscribe in one click.</p>\n    </form>", "<p class=\"m-text-7\">Practise with ELEVORA<span class=\"m-dot\" aria-hidden=\"true\"></span></p>\n      <p class=\"m-text-6 footer__note\">Adaptive interview practice. Voice or text. Camera optional.</p>\n      <a class=\"m-btn\" href=\"/signup\"><span class=\"m-btn__label\">Create your account</span></a>\n    </div>");
replaceOnce("© 2026 Onda Studio", "© 2026 ELEVORA");
replaceOnce("Made in Lisbon and Brooklyn", "Practice the interview, not a script.");

// Replace remaining demo page destinations with implemented application screens.
replaceOnce("href=\"mailto:hello@onda.example\"", "href=\"/login\"");
replaceOnce("href=\"mailto:careers@onda.example\"", "href=\"/signup\"");
replaceOnce("href=\"tel:+351210000000\"", "href=\"/interviews/new\"");
replaceOnce("href=\"https://www.instagram.com/\"", "href=\"/signup\"");
replaceOnce("href=\"https://www.linkedin.com/\"", "href=\"/dashboard\"");
replaceOnce("href=\"https://vimeo.com/\"", "href=\"/settings\"");
replaceOnce("Design: <a href=\"https://8b.com/\" style=\"color:inherit\" data-8b-credit>8B</a>", "Template design: <a href=\"https://8b.com/\" style=\"color:inherit\">8B</a>");

// Remove handlers for the original forms since the corresponding forms are gone.
html = html.replace(/<script data-8b-part="section-script:contact">[\s\S]*?<\/script>/, "");
html = html.replace(/<script data-8b-part="section-script:footer">[\s\S]*?<\/script>/, "");

// The source document runs inside the Next landing route's same-origin iframe.
// Section anchors must stay inside the document for Lenis/ScrollTrigger; ELEVORA
// product links navigate the top-level application rather than nesting an app
// screen in the frame.
const navigationBridge = `
<script data-elevora-part="top-level-navigation">
(() => {
  document.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const href = link.getAttribute('href');
    if (!href || !href.startsWith('/') || href.startsWith('//') || link.target) return;
    event.preventDefault();
    window.top.location.assign(href);
  });
})();
</script>`;
html = html.replace('</body>', `${navigationBridge}\n</body>`);

// Keep the full attribution header and original GSAP, ScrollTrigger and Lenis versions.
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.writeFileSync(destination, html);
console.log(`Adapted original Onda template to ${destination} (${html.length} characters)`);
