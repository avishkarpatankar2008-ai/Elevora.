// Auto-generated native Onda JSX markup for ELEVORA
import React from 'react';

export function OndaMarkup() {
  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
{/*  navigation: fixed top bar: wordmark, section links, Start practising button; phone menu overlay  */}
<header id="navigation" className="nav" data-8b-section="navigation">
  <a className="nav__brand" href="#hero" aria-label="Onda, back to the top">ELEVORA<span className="m-dot" aria-hidden="true"></span></a>
  <nav className="nav__links" aria-label="Main">
    <ul>
      <li><a className="m-link-2" href="#work">Practice modes</a></li>
      <li><a className="m-link-2" href="#capabilities">Features</a></li>
      <li><a className="m-link-2" href="#method">How it works</a></li>
      <li><a className="m-link-2" href="#studio">Responsible AI</a></li>
      <li><a className="m-link-2" href="#journal">Resources</a></li>
    </ul>
  </nav>
  <a className="m-btn nav__cta" href="/signup"><span className="m-btn__label">Start a project</span></a>
  <button className="m-btn-2 nav__menu" type="button" aria-expanded="false" aria-controls="menu"><span className="m-btn__label">Menu</span></button>
  <div className="menu" id="menu" role="dialog" aria-modal="true" aria-label="Menu" data-lenis-prevent hidden>
    <div className="menu__top"><button className="m-icon menu__close" type="button" aria-label="Close the menu"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3l10 10M13 3 3 13"/></svg></button></div>
    <ul className="menu__list">
      <li><a href="#work">Practice modes<span className="m-dot" aria-hidden="true"></span></a></li>
      <li><a href="#capabilities">Features<span className="m-dot" aria-hidden="true"></span></a></li>
      <li><a href="#method">How it works<span className="m-dot" aria-hidden="true"></span></a></li>
      <li><a href="#studio">Responsible AI<span className="m-dot" aria-hidden="true"></span></a></li>
      <li><a href="#journal">Resources<span className="m-dot" aria-hidden="true"></span></a></li>
      <li><a href="#contact">Get started<span className="m-dot" aria-hidden="true"></span></a></li>
    </ul>
    <p className="m-text menu__foot">hello@onda.example · History &amp; reports and Start practice</p>
  </div>
</header>
<main id="main">
{/*  hero: first screen: a one-word greeting whose full stop is a giant round photo (demo: "Hello") (animation: scene:hero)  */}
<section id="hero" data-8b-section="hero" aria-labelledby="hero-title">
  <div className="hero__intro">
    <p className="m-text-5 hero__lead">Practise for the interview you actually have. ELEVORA listens to your answers, adapts difficulty in real time, and provides evidence-linked feedback across technical, behavioral, and professional domains.</p>
    <a className="m-link hero__link" href="/signup"><span className="m-link__label">Start practising</span><svg className="m-link__arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 3.5 13.5 8 9 12.5"/></svg></a>
  </div>
  <h1 className="m-text-2 hero__title" id="hero-title" style={{ '--len': '5' } as React.CSSProperties}><span className="hero__word"><span className="hero__mask"><span className="hero__glyphs">Ready</span></span></span><span className="hero__period" aria-hidden="true"><span className="hero__stage"><span className="hero__orbit"><span className="hero__moon"></span></span><span className="hero__aperture"><img className="hero__img" src="/images/interview/hero-aperture.svg" width="1200" height="1200" alt="ELEVORA AI Interview Practice Engine" fetchPriority="high" /><span className="hero__tint"></span></span></span></span></h1>
</section>

{/*  statement: two-line statement of what the studio does, a lead paragraph and an index of links into the page (animation: scene:statement)  */}
<section id="statement" data-8b-section="statement" aria-labelledby="statement-title">
  <h2 className="m-text-3 statement__title" id="statement-title"><span className="statement__line">Practise for the interview</span><span className="statement__line">you actually&nbsp;have<span className="m-dot statement__dot" aria-hidden="true"></span></span></h2>
  <div className="statement__body">
    <p className="m-text-5 statement__lead" data-8b-motion="ink">A real interview catches you off-guard — so practice should too. ELEVORA builds an adaptive session from your resume, your target role, and what you actually said thirty seconds ago. No two runs are the same.</p>
    <nav className="statement__index" aria-label="On this page">
      <ul>
        <li><a className="m-link" href="#work"><span className="m-link__label">Practice scenarios</span><svg className="m-link__arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 3.5 13.5 8 9 12.5"/></svg></a></li>
        <li><a className="m-link" href="#capabilities"><span className="m-link__label">Capabilities &amp; scoring</span><svg className="m-link__arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 3.5 13.5 8 9 12.5"/></svg></a></li>
        <li><a className="m-link" href="#method"><span className="m-link__label">Adaptive workflow</span><svg className="m-link__arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 3.5 13.5 8 9 12.5"/></svg></a></li>
        <li><a className="m-link" href="#studio"><span className="m-link__label">Responsible AI</span><svg className="m-link__arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 3.5 13.5 8 9 12.5"/></svg></a></li>
        <li><a className="m-link" href="#journal"><span className="m-link__label">Practice guides</span><svg className="m-link__arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 3.5 13.5 8 9 12.5"/></svg></a></li>
        <li><a className="m-link" href="/signup"><span className="m-link__label">Start practising</span><svg className="m-link__arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 3.5 13.5 8 9 12.5"/></svg></a></li>
      </ul>
    </nav>
  </div>
</section>

{/*  work: case studies: five large cards on a horizontal track (demo: five client launches) (animation: scene:work)  */}
<section id="work" data-8b-section="work" aria-labelledby="work-title">
  <div className="work__plate" aria-hidden="true"></div>
  <div className="work__stage">
    <div className="work__head">
      <h2 className="m-text-3" id="work-title">Practice scenarios<span className="m-dot" aria-hidden="true"></span></h2>
      <p className="m-text-5 work__lead">Five tailored practice tracks for technical, behavioral, and public service interviews.</p>
    </div>
    <div className="work__window">
      <ul className="work__track">
        <li className="case">
          <div className="case__media"><img className="case__img" src="/images/interview/work-swe.svg" width="1600" height="1000" alt="Software Engineering Interview Practice" loading="lazy" /></div>
          <span className="m-badge case__tag">Role practice</span>
          <div className="case__text"><h3 className="m-text-4 case__name">Software Engineering</h3><p className="m-text-5 case__line">System architecture, coding patterns, data structures, and algorithmic trade-offs.</p></div>
        </li>
        <li className="case">
          <div className="case__media"><img className="case__img" src="/images/interview/work-behavioral.svg" width="1600" height="1000" alt="Behavioral Interview Practice" loading="lazy" /></div>
          <span className="m-badge case__tag">Behavioral</span>
          <div className="case__text"><h3 className="m-text-4 case__name">Behavioral & Leadership</h3><p className="m-text-5 case__line">STAR-method storytelling, conflict resolution, team collaboration, and impact.</p></div>
        </li>
        <li className="case">
          <div className="case__media"><img className="case__img" src="/images/interview/work-campus.svg" width="1600" height="1000" alt="Campus Placement Practice" loading="lazy" /></div>
          <span className="m-badge case__tag">Foundational</span>
          <div className="case__text"><h3 className="m-text-4 case__name">Campus Placement</h3><p className="m-text-5 case__line">Core computer science, quantitative problem solving, and early-career fundamentals.</p></div>
        </li>
        <li className="case">
          <div className="case__media"><img className="case__img" src="/images/interview/work-exam.svg" width="1600" height="1000" alt="Exams & Public Service Interview Practice" loading="lazy" /></div>
          <span className="m-badge case__tag">Targeted</span>
          <div className="case__text"><h3 className="m-text-4 case__name">Exams & Public Service</h3><p className="m-text-5 case__line">Structured interviews for UPSC, MPSC, SSC, banking, and civil services.</p></div>
        </li>
        <li className="case">
          <div className="case__media"><img className="case__img" src="/images/interview/work-system-design.svg" width="1600" height="1000" alt="System Design Interview Practice" loading="lazy" /></div>
          <span className="m-badge case__tag">Architecture</span>
          <div className="case__text"><h3 className="m-text-4 case__name">System Design</h3><p className="m-text-5 case__line">Scalability, trade-offs, caching, fault tolerance, and distributed data systems.</p></div>
        </li>
      </ul>
    </div>
  </div>
</section>

{/*  again: long-term clients: six cards on a wheel that turns with scroll (demo: years of partnership) (animation: scene:again)  */}
<section id="again" data-8b-section="again" aria-labelledby="again-title">
  <div className="again__stage">
    <div className="again__head">
      <h2 className="m-text-3" id="again-title">Progress that builds<span className="m-dot" aria-hidden="true"></span></h2>
      <p className="m-text-5 again__lead">Every practice session sharpens your performance. Your interview history, score trends, and evidence-backed reports compound over time.</p>
    </div>
    <div className="again__swing">
      <ul className="again__wheel">
        <li className="partner">
          <div className="partner__card"><img className="partner__img" src="/images/interview/again-history.svg" width="900" height="1125" alt="Interview History" loading="lazy" />
          <div className="partner__text"><span className="m-badge partner__year">History</span><h3 className="m-text-4 partner__name">Interview history</h3><p className="m-text partner__line">Return to completed sessions and track improvement over time.</p></div></div>
        </li>
        <li className="partner">
          <div className="partner__card"><img className="partner__img" src="/images/interview/again-progress.svg" width="900" height="1125" alt="Score Trends" loading="lazy" />
          <div className="partner__text"><span className="m-badge partner__year">Reports</span><h3 className="m-text-4 partner__name">Score trends</h3><p className="m-text partner__line">Dimensional analytics measuring knowledge, communication, and relevance.</p></div></div>
        </li>
        <li className="partner">
          <div className="partner__card"><img className="partner__img" src="/images/interview/again-answers.svg" width="900" height="1125" alt="Multi-modal Practice" loading="lazy" />
          <div className="partner__text"><span className="m-badge partner__year">Voice &amp; text</span><h3 className="m-text-4 partner__name">Multi-modal practice</h3><p className="m-text partner__line">Answer by voice with transcription analytics or type directly.</p></div></div>
        </li>
        <li className="partner">
          <div className="partner__card"><img className="partner__img" src="/images/interview/again-feedback.svg" width="900" height="1125" alt="Evidence-linked Scores" loading="lazy" />
          <div className="partner__text"><span className="m-badge partner__year">Rubric</span><h3 className="m-text-4 partner__name">Evidence-linked scores</h3><p className="m-text partner__line">Every score cites exact transcript excerpts, never arbitrary vibes.</p></div></div>
        </li>
        <li className="partner">
          <div className="partner__card"><img className="partner__img" src="/images/interview/again-profiles.svg" width="900" height="1125" alt="Custom Profiles" loading="lazy" />
          <div className="partner__text"><span className="m-badge partner__year">Profiles</span><h3 className="m-text-4 partner__name">Custom profiles</h3><p className="m-text partner__line">Save role requirements, subjects, and interviewer styles for future practice.</p></div></div>
        </li>
        <li className="partner">
          <div className="partner__card"><img className="partner__img" src="/images/interview/again-camera.svg" width="900" height="1125" alt="Camera Optional" loading="lazy" />
          <div className="partner__text"><span className="m-badge partner__year">Privacy</span><h3 className="m-text-4 partner__name">Camera optional</h3><p className="m-text partner__line">On-device posture estimation with explicit consent; camera-free mode is always available.</p></div></div>
        </li>
      </ul>
    </div>
  </div>
</section>

{/*  capabilities: services: five cards that stack as you scroll, each with deliverable badges and a photo (animation: scene:capabilities)  */}
<section id="capabilities" data-8b-section="capabilities" aria-labelledby="capabilities-title">
  <div className="capabilities__head">
    <h2 className="m-text-3" id="capabilities-title" data-8b-motion="rise">What we do<span className="m-dot" aria-hidden="true"></span></h2>
    <p className="m-text-5 capabilities__lead">A complete interview preparation engine built on deterministic rubrics and sequential AI routing.</p>
  </div>
  <ol className="capabilities__deck">
    <li className="service m-surface">
      <div className="service__text">
        <h3 className="m-text-4">Adaptive question generation</h3>
        <p className="m-text-5 service__line">Questions adjust to your previous answer&apos;s depth, challenging assumptions and asking for concrete evidence.</p>
        <ul className="service__tags"><li className="m-badge">Role-grounded</li><li className="m-badge">Adaptive difficulty</li><li className="m-badge">Resume-linked</li><li className="m-badge">Job description</li></ul>
      </div>
      <div className="service__media" data-8b-motion="iris"><img src="/images/interview/service-questions.svg" width="1200" height="900" alt="Adaptive Question Generation" loading="lazy" /></div>
      <span className="service__shade" aria-hidden="true"></span>
    </li>
    <li className="service m-surface">
      <div className="service__text">
        <h3 className="m-text-4">Multi-dimensional evaluation</h3>
        <p className="m-text-5 service__line">Scored across knowledge, communication, relevance, problem solving, and interview handling with mandatory citations.</p>
        <ul className="service__tags"><li className="m-badge">Evidence-based</li><li className="m-badge">Deterministic weights</li><li className="m-badge">Confidence scoring</li><li className="m-badge">Rubric integrity</li></ul>
      </div>
      <div className="service__media" data-8b-motion="iris"><img src="/images/interview/service-evaluation.svg" width="1200" height="900" alt="Multi-dimensional Evaluation" loading="lazy" /></div>
      <span className="service__shade" aria-hidden="true"></span>
    </li>
    <li className="service m-surface">
      <div className="service__text">
        <h3 className="m-text-4">Actionable feedback reports</h3>
        <p className="m-text-5 service__line">Receive concrete strengths, improvement areas, and targeted practice recommendations for your next session.</p>
        <ul className="service__tags"><li className="m-badge">Strengths</li><li className="m-badge">Improvement areas</li><li className="m-badge">Model answers</li><li className="m-badge">Practice plans</li></ul>
      </div>
      <div className="service__media" data-8b-motion="iris"><img src="/images/interview/service-feedback.svg" width="1200" height="900" alt="Actionable Feedback Reports" loading="lazy" /></div>
      <span className="service__shade" aria-hidden="true"></span>
    </li>
    <li className="service m-surface">
      <div className="service__text">
        <h3 className="m-text-4">On-device posture analysis</h3>
        <p className="m-text-5 service__line">Optional client-side MediaPipe pose estimation tracking head alignment, framing, and movement without uploading raw video.</p>
        <ul className="service__tags"><li className="m-badge">Explicit consent</li><li className="m-badge">Zero raw video upload</li><li className="m-badge">Descriptive only</li><li className="m-badge">Camera-free option</li></ul>
      </div>
      <div className="service__media" data-8b-motion="iris"><img src="/images/interview/service-posture.svg" width="1200" height="900" alt="On-device Posture Analysis" loading="lazy" /></div>
      <span className="service__shade" aria-hidden="true"></span>
    </li>
    <li className="service m-surface">
      <div className="service__text">
        <h3 className="m-text-4">Voice &amp; audio analytics</h3>
        <p className="m-text-5 service__line">Speech transcription via Groq Whisper with pause duration, pacing (WPM), and filler word rate measurement.</p>
        <ul className="service__tags"><li className="m-badge">Whisper transcription</li><li className="m-badge">Speech pace (WPM)</li><li className="m-badge">Pause analysis</li><li className="m-badge">Filler rate</li></ul>
      </div>
      <div className="service__media" data-8b-motion="iris"><img src="/images/interview/service-voice.svg" width="1200" height="900" alt="Voice &amp; Audio Analytics" loading="lazy" /></div>
      <span className="service__shade" aria-hidden="true"></span>
    </li>
  </ol>
</section>

{/*  method: process: four steps beside a ring the scroll draws round (demo: Listen, Make, Measure, Again) (animation: scene:method)  */}
<section id="method" data-8b-section="method" aria-labelledby="method-title">
  <div className="method__head">
    <h2 className="m-text-3" id="method-title" data-8b-motion="rise">How we work<span className="m-dot" aria-hidden="true"></span></h2>
    <p className="m-text-5 method__lead" data-8b-motion="ink">Every practice session follows a disciplined four-step loop that turns preparation into instinct.</p>
  </div>
  <div className="method__body">
    <div className="method__ring" aria-hidden="true">
      <svg className="method__svg" viewBox="0 0 400 400"><circle className="method__track" cx="200" cy="200" r="170"/><circle className="method__arc" cx="200" cy="200" r="170" pathLength="1" strokeDasharray="1 1" strokeDashoffset="0"/></svg>
      <span className="method__station" style={{ '--x': '0', '--y': '-1' } as React.CSSProperties}></span>
      <span className="method__station" style={{ '--x': '1', '--y': '0' } as React.CSSProperties}></span>
      <span className="method__station" style={{ '--x': '0', '--y': '1' } as React.CSSProperties}></span>
      <span className="method__station" style={{ '--x': '-1', '--y': '0' } as React.CSSProperties}></span>
      <span className="method__arm"><span className="method__runner"></span></span>
    </div>
    <ol className="method__steps">
      <li className="step"><h3 className="m-text-4">Configure</h3><p className="m-text-5 step__text">Choose a target role or profile, difficulty, language, and upload an optional resume or job description.</p></li>
      <li className="step"><h3 className="m-text-4">Interview</h3><p className="m-text-5 step__text">Answer adaptive questions out loud or by text. The AI interviewer challenges claims and probes depth.</p></li>
      <li className="step"><h3 className="m-text-4">Review</h3><p className="m-text-5 step__text">Review evidence behind each dimension score. No scores are invented or based on hidden vibes.</p></li>
      <li className="step"><h3 className="m-text-4">Repeat</h3><p className="m-text-5 step__text">Identify weaknesses, adjust your configuration, and run another session until it becomes automatic.</p></li>
    </ol>
  </div>
</section>

{/*  studio: team and careers: photo collage that deals out from a pile, with open roles (animation: scene:studio)  */}
<section id="studio" data-8b-section="studio" aria-labelledby="studio-title">
  <div className="studio__head">
    <h2 className="m-text-3" id="studio-title">Inside the studio<span className="m-dot" aria-hidden="true"></span></h2>
    <p className="m-text-5 studio__lead" data-8b-motion="ink">ELEVORA is built on transparency: your interview data is yours, AI scores require verifiable evidence from your answers, and webcam analysis is strictly on-device. We never infer emotion, personality, or candidate suitability.</p>
  </div>
  <div className="studio__collage">
    <figure className="shot shot--wide"><img src="/images/interview/studio-team.svg" width="1400" height="933" alt="Responsible AI Principles" loading="lazy" /></figure>
    <figure className="shot shot--tall"><img src="/images/interview/studio-research.svg" width="900" height="1200" alt="Evidence Verification" loading="lazy" /></figure>
    <figure className="shot shot--tall"><img src="/images/interview/studio-design.svg" width="900" height="1200" alt="Human-in-the-Loop Design" loading="lazy" /></figure>
    <figure className="shot shot--wide"><img src="/images/interview/studio-collab.svg" width="1400" height="933" alt="Privacy-First Architecture" loading="lazy" /></figure>
    <figure className="shot shot--wide"><img src="/images/interview/studio-workshop.svg" width="1400" height="933" alt="Zero Raw Video Retention" loading="lazy" /></figure>
    <div className="studio__roles">
      <h3 className="m-text-7" data-8b-motion="rise">Quick access<span className="m-dot" aria-hidden="true"></span></h3>
      <ul>
        <li className="role"><span className="m-text-7">Dashboard</span><span className="m-text-6 role__place">Lisbon</span></li>
        <li className="role"><span className="m-text-7">New interview</span><span className="m-text-6 role__place">Brooklyn</span></li>
        <li className="role"><span className="m-text-7">Profiles</span><span className="m-text-6 role__place">Saved templates</span></li>
      </ul>
      <a className="m-link" href="/dashboard"><span className="m-link__label">Explore dashboard</span><svg className="m-link__arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M2 8h11M9 3.5 13.5 8 9 12.5"/></svg></a>
    </div>
  </div>
</section>

{/*  journal: news and articles: four stories beside a sticky photo frame (animation: scene:journal)  */}
<section id="journal" data-8b-section="journal" aria-labelledby="journal-title">
  <div className="journal__head">
    <h2 className="m-text-3" id="journal-title" data-8b-motion="rise">Ideas and news<span className="m-dot" aria-hidden="true"></span></h2>
  </div>
  <div className="journal__body">
    <div className="journal__frame">
      <img className="journal__shot" src="/images/interview/journal-guide-1.svg" width="1000" height="1250" alt="STAR Method Guide" loading="lazy" />
      <img className="journal__shot" src="/images/interview/journal-guide-2.svg" width="1000" height="1250" alt="Resume Alignment Guide" loading="lazy" />
      <img className="journal__shot" src="/images/interview/journal-guide-3.svg" width="1000" height="1250" alt="Voice Delivery & Pacing" loading="lazy" />
      <img className="journal__shot" src="/images/interview/journal-guide-4.svg" width="1000" height="1250" alt="On-Device Posture Analysis" loading="lazy" />
    </div>
    <ol className="journal__list">
      <li className="story"><p className="m-text-6 story__meta"><span>Guide</span> · 3 min read</p><h3 className="m-text-7">The STAR method under adaptive questioning</h3><p className="m-text story__text">How to maintain structured answers when an AI interviewer interrupts to probe for concrete metrics.</p></li>
      <li className="story"><p className="m-text-6 story__meta"><span>Strategy</span> · 4 min read</p><h3 className="m-text-7">Grounding technical claims in your project history</h3><p className="m-text story__text">Why aligning your resume bullet points with specific technical challenges creates a stronger practice interview.</p></li>
      <li className="story"><p className="m-text-6 story__meta"><span>Delivery</span> · 3 min read</p><h3 className="m-text-7">Managing speech rate and pause length in voice interviews</h3><p className="m-text story__text">Balancing words-per-minute with deliberate pauses to convey thoughtful problem-solving.</p></li>
      <li className="story"><p className="m-text-6 story__meta"><span>Privacy</span> · 5 min read</p><h3 className="m-text-7">Why webcam posture analysis belongs on the client</h3><p className="m-text story__text">The engineering behind browser-side landmark extraction and why raw video should never leave your machine.</p></li>
    </ol>
  </div>
</section>

{/*  faq: questions and answers (native <details>)  */}
<section id="faq" data-8b-section="faq" aria-labelledby="faq-title">
  <h2 className="m-text-3 faq__title" id="faq-title" data-8b-motion="rise">Fair questions<span className="m-dot" aria-hidden="true"></span></h2>
  <div className="faq__list">
    <details className="faq__item"><summary className="m-text-7">What types of interviews can I practise?<span className="faq__mark" aria-hidden="true"></span></summary><p className="m-text faq__answer">Software engineering, campus placements, behavioral rounds, UPSC, MPSC, SSC, banking, and custom interview profiles you define yourself.</p></details>
    <details className="faq__item"><summary className="m-text-7">How are interview answers scored?<span className="faq__mark" aria-hidden="true"></span></summary><p className="m-text faq__answer">Answers are evaluated across five core dimensions: Knowledge, Communication, Relevance, Problem Solving, and Interview Handling. Every score requires citing specific evidence from your transcript.</p></details>
    <details className="faq__item"><summary className="m-text-7">Is the webcam required for practice?<span className="faq__mark" aria-hidden="true"></span></summary><p className="m-text faq__answer">No. The camera is completely optional and disabled by default. If enabled, it requires explicit consent, runs entirely on your device via MediaPipe, and never uploads video.</p></details>
    <details className="faq__item"><summary className="m-text-7">How does the free-tier AI routing work?<span className="faq__mark" aria-hidden="true"></span></summary><p className="m-text faq__answer">ELEVORA uses a six-model free-only routing chain (Groq primary, Gemini flash models, and OpenRouter free tiers) with automatic failover, rate-limit cooldowns, and deterministic fallbacks.</p></details>
    <details className="faq__item"><summary className="m-text-7">Can I upload my resume and a job description?<span className="faq__mark" aria-hidden="true"></span></summary><p className="m-text faq__answer">Yes. Uploading a resume (PDF/DOCX) and job description extracts key skills, technologies, and claims to ground the questions in your actual background.</p></details>
  </div>
</section>

{/*  contact: violet contact field: big "Let's practise", email, two offices with phones, and a form (placeholders) (animation: scene:contact)  */}
<section id="contact" data-8b-section="contact" aria-labelledby="contact-title">
  <h2 className="m-text-3 contact__title" id="contact-title" style={{ '--len': '12' } as React.CSSProperties}><span className="contact__voice">Let&apos;s practise</span><span className="m-dot" aria-hidden="true"></span></h2>
  <div className="contact__grid">
    <div className="contact__info">
      <p className="m-text-5 contact__lead">Ready to prepare for your next interview? Create an account to track your sessions, score trends, and personalized feedback.</p>
      <a className="contact__mail" href="/signup"><span>Start practising now</span></a>
      <dl className="contact__places">
        <div><dt className="m-text-7">New Candidate?</dt><dd className="m-text">Create your free account<br />Start practising in under a minute</dd><dd className="m-text"><a href="/signup">Create account &rarr;</a></dd></div>
        <div><dt className="m-text-7">Existing User?</dt><dd className="m-text">Sign in to your dashboard<br />Resume previous sessions</dd><dd className="m-text"><a href="/login">Sign in &rarr;</a></dd></div>
      </dl>
    </div>
    <div className="contact__form m-surface">
      <h3 className="m-text-4">Your practice starts here</h3>
      <p className="m-text">Configure your target role, experience level, and difficulty. Answer by voice or text and receive evidence-linked scores immediately after your session.</p>
      <div className="contact__actions" style={{ marginTop: '24px' } as React.CSSProperties}>
        <a className="m-btn" href="/signup"><span className="m-btn__label">Start practising free</span></a>
        <a className="m-btn-2" href="/login"><span className="m-btn__label">Sign in</span></a>
      </div>
    </div>
  </div>
</section>
</main>

{/*  footer: closing greeting "Bye" with the round photo full stop, link columns, newsletter, copyright and the Design: 8B credit (animation: scene:footer)  */}
<footer id="footer" data-8b-section="footer">
  <p className="m-text-2 footer__bye" style={{ '--len': '5' } as React.CSSProperties}><span className="footer__word">Ready</span><span className="footer__period" aria-hidden="true"><span className="footer__aperture"><img className="hero__img" src="/images/interview/hero-aperture.svg" width="1200" height="1200" alt="ELEVORA AI Interview Practice Engine" fetchPriority="high" /><span className="footer__tint"></span></span></span></p>
  <div className="footer__grid">
    <nav className="footer__col" aria-label="Footer">
      <p className="m-text-6 footer__label">Explore</p>
      <a className="m-link-2" href="#work">Work</a>
      <a className="m-link-2" href="#capabilities">Services</a>
      <a className="m-link-2" href="#method">Approach</a>
      <a className="m-link-2" href="#studio">Studio</a>
      <a className="m-link-2" href="#journal">Journal</a>
    </nav>
    <div className="footer__col">
      <p className="m-text-6 footer__label">Platform</p>
      <a className="m-link-2" href="/dashboard">Dashboard</a>
      <a className="m-link-2" href="/interviews/new">New interview</a>
      <a className="m-link-2" href="/interview-profiles">Profiles</a>
      <a className="m-link-2" href="/settings">Settings</a>
    </div>
    <div className="footer__col">
      <p className="m-text-6 footer__label">Account</p>
      <a className="m-link-2" href="/login">Sign in</a>
      <a className="m-link-2" href="/signup">Create account</a>
      <a className="m-link-2" href="#hero">Back to top</a>
    </div>
    <div className="footer__news">
      <p className="m-text-7">Practise with ELEVORA<span className="m-dot" aria-hidden="true"></span></p>
      <p className="m-text-6 footer__note">Adaptive interview practice. Voice or text. Camera optional.</p>
      <div style={{ marginTop: '16px' } as React.CSSProperties}>
        <a className="m-btn" href="/signup"><span className="m-btn__label">Create your free account</span></a>
      </div>
    </div>
  </div>
  <div className="footer__legal m-text-6"><p>© 2026 ELEVORA · Design template by <a href="https://8b.com/" style={{ color: 'inherit' } as React.CSSProperties}>8B (MIT)</a></p><p>Practice the interview, not a script.</p></div>
</footer>
    </>
  );
}
