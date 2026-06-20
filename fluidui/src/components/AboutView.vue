<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();
</script>

<template>
  <div class="about-container animate-fade-in">
    <!-- Navbar Header -->
    <header class="navbar glass-panel">
      <div class="logo" @click="router.push('/home')" style="cursor:pointer">
        <span class="logo-icon"><i class="fas fa-utensils"></i></span>
        <span class="logo-text">Flim<span class="dot">.ai</span></span>
      </div>
      <nav class="nav-links">
        <button class="btn btn-secondary btn-sm" @click="router.push('/home')">
          <i class="fas fa-arrow-left"></i> Back to Kitchen
        </button>
      </nav>
    </header>

    <div class="about-content">
      <!-- Main Project Info Hero -->
      <section class="about-hero glass-panel">
        <div class="hero-details">
          <span class="badge">
            <i class="fas fa-circle-info"></i> Project Profile
          </span>
          <h1>About Flim<span class="dot">.ai</span></h1>
          <p class="tagline"><b>F</b>riction <b>L</b>ess <b>I</b>nventory <b>M</b>anager</p>
          <div class="codename-badge">
            <span class="lbl">Code Name:</span>
            <span class="val">Frictionless Fridge</span>
          </div>
          <p class="story-text">
            The name intentionally evokes a sense of unease (“unsettling”), but that’s part of our identity. 
            Flim.ai is an abstract inventory management system that tracks food items with minimal friction. 
            The <b>“Frictionless Fridge”</b> metaphor captures the core idea: just as a physical fridge stores leftovers, 
            our server stores food data, and our app requires only one-click actions for uploading, fetching, and availability checks.
          </p>
        </div>
        <div class="hero-visual">
          <div class="floating-fridge">
            <i class="fas fa-box-tissue fridge-icon"></i>
            <span class="shield-badge"><i class="fas fa-shield-halved"></i> AI Verified</span>
          </div>
        </div>
      </section>

      <!-- Why We Built This & Statistics -->
      <section class="why-grid">
        <div class="why-card glass-panel">
          <div class="icon-header">
            <i class="fas fa-triangle-exclamation warning-color"></i>
            <h3>The Problem</h3>
          </div>
          <p>
            In real life, <b>70 million tonnes</b> of food is wasted every year in India alone, while <b>9 million people</b> go hungry. 
            Homeowners often find it tedious to fill out long forms specifying item names, expiry times, and details, leading to significantly lower participation in food sharing.
          </p>
        </div>
        <div class="why-card glass-panel">
          <div class="icon-header">
            <i class="fas fa-heart-pulse success-color"></i>
            <h3>Our Solution</h3>
          </div>
          <p>
            Flim.ai removes that friction entirely. By utilizing <b>Gemini Vision AI</b> as an intelligent moderator, the app validates food safety, 
            automatically estimates shelf-life, and automates almost the entire entry process. Just snap a picture, and it's listed.
          </p>
        </div>
      </section>

      <!-- Team Members -->
      <section class="team-section">
        <h2 class="section-title"><i class="fas fa-users"></i> The Founders</h2>
        <div class="team-grid">
          <!-- Pawan -->
          <div class="member-card glass-panel">
            <div class="avatar-wrapper">
              <span class="member-avatar">PY</span>
              <span class="role-badge">Lead Architect</span>
            </div>
            <h3>Pawan Yadav</h3>
            <p class="member-desc">Lead Architect, Product Designer & Developer</p>
            <ul class="contributions">
              <li><i class="fas fa-check"></i> Engineered full-stack architecture & schemas</li>
              <li><i class="fas fa-check"></i> Designed high-fidelity responsive UI</li>
              <li><i class="fas fa-check"></i> Orchestrated Gemini Vision AI integration</li>
            </ul>
          </div>
          <!-- Aryansh -->
          <div class="member-card glass-panel">
            <div class="avatar-wrapper">
              <span class="member-avatar placeholder-avatar">AS</span>
              <span class="role-badge contributor">QA & Feedback</span>
            </div>
            <h3>Aryansh Sharma</h3>
            <p class="member-desc">Notable Contribution</p>
            <div class="jest-quote">
              <span class="quote-mark">“</span>He did nothing.<span class="quote-mark">”</span>
            </div>
            <p class="jest-explanation">
              Kept in good jest, but Aryansh provided valuable feedback, user-experience testing, and design brainstorming sessions that shaped our product flow.
            </p>
          </div>
        </div>
      </section>

      <!-- Tech Stack and AI Integration -->
      <section class="tech-section">
        <h2 class="section-title"><i class="fas fa-laptop-code"></i> Technology Blueprint</h2>
        <div class="tech-grid">
          <div class="tech-card glass-panel">
            <h3>Backend Stack</h3>
            <div class="tech-list">
              <div class="tech-item">
                <span class="tech-icon"><i class="fab fa-node-js"></i></span>
                <div class="tech-info">
                  <strong>Node.js & Express.js</strong>
                  <span>Fast, minimal, and asynchronous server core APIs</span>
                </div>
              </div>
              <div class="tech-item">
                <span class="tech-icon"><i class="fas fa-database"></i></span>
                <div class="tech-info">
                  <strong>SQLite3</strong>
                  <span>Lightweight relational storage for swift local prototyping</span>
                </div>
              </div>
              <div class="tech-item">
                <span class="tech-icon"><i class="fas fa-key"></i></span>
                <div class="tech-info">
                  <strong>JWT & Argon2id</strong>
                  <span>State-of-the-art secure authentication and session management</span>
                </div>
              </div>
            </div>
          </div>

          <div class="tech-card glass-panel">
            <h3>Frontend Stack</h3>
            <div class="tech-list">
              <div class="tech-item">
                <span class="tech-icon"><i class="fab fa-vuejs"></i></span>
                <div class="tech-info">
                  <strong>Vue.js (Composition API)</strong>
                  <span>Reactive UI rendering with modular composition</span>
                </div>
              </div>
              <div class="tech-item">
                <span class="tech-icon"><i class="fas fa-bolt"></i></span>
                <div class="tech-info">
                  <strong>Vite</strong>
                  <span>Next-generation front-end tooling and building</span>
                </div>
              </div>
              <div class="tech-item">
                <span class="tech-icon"><i class="fas fa-wand-magic-sparkles"></i></span>
                <div class="tech-info">
                  <strong>Gemini 3.5 Flash</strong>
                  <span>Accelerated 40% of codebase generation & auto-moderation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Lessons Learned -->
      <section class="lessons-section glass-panel">
        <h3><i class="fas fa-graduation-cap"></i> Lessons Learned</h3>
        <div class="lessons-grid">
          <div class="lesson-item">
            <h4><i class="fas fa-hourglass-half"></i> Rapid Prototyping</h4>
            <p>Designing interfaces in Figma before coding saved us hours of layout adjustments later on.</p>
          </div>
          <div class="lesson-item">
            <h4><i class="fas fa-sitemap"></i> Flow Visualization</h4>
            <p>Using Obsidian and Draw.io for mapping APIs and relations prevented state synchronicity issues.</p>
          </div>
          <div class="lesson-item">
            <h4><i class="fas fa-robot"></i> AI-Human Synergy</h4>
            <p>Large language models accelerate repetitive templates, but human verification is critical for complex state-sharing and authentication checks.</p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.about-container {
  padding: 24px;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-height: 100vh;
}

/* Navbar */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 24px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
}

.logo-icon {
  font-size: 1.3rem;
  color: var(--primary);
}

.logo-text {
  font-size: 1.35rem;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.dot {
  color: var(--accent);
}

.about-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Hero Section */
.about-hero {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  padding: 40px;
  gap: 40px;
  align-items: center;
}

@media (max-width: 768px) {
  .about-hero {
    grid-template-columns: 1fr;
    padding: 24px;
  }
}

.hero-details {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.badge {
  align-self: flex-start;
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #c084fc;
  padding: 4px 12px;
  border-radius: 9999px;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.about-hero h1 {
  font-size: 2.8rem;
  font-weight: 850;
  line-height: 1.1;
  letter-spacing: -1px;
}

.tagline {
  font-size: 1.2rem;
  color: var(--text-muted);
  letter-spacing: 1px;
  text-transform: uppercase;
}

.codename-badge {
  display: inline-flex;
  gap: 8px;
  align-self: flex-start;
  background: rgba(6, 182, 212, 0.1);
  border: 1px solid rgba(6, 182, 212, 0.2);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.85rem;
}

.codename-badge .lbl {
  color: var(--text-muted);
}

.codename-badge .val {
  color: var(--accent);
  font-weight: 700;
}

.story-text {
  font-size: 1rem;
  color: var(--text-muted);
  line-height: 1.6;
}

.hero-visual {
  display: flex;
  justify-content: center;
  align-items: center;
}

.floating-fridge {
  position: relative;
  width: 160px;
  height: 160px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  animation: float 6s ease-in-out infinite;
}

.fridge-icon {
  font-size: 5rem;
  background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.shield-badge {
  position: absolute;
  bottom: -10px;
  background: var(--success);
  color: #fff;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: bold;
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.4);
}

/* Why We Built section */
.why-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .why-grid {
    grid-template-columns: 1fr;
  }
}

.why-card {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.icon-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-header i {
  font-size: 1.5rem;
}

.warning-color {
  color: var(--warning);
}

.success-color {
  color: var(--success);
}

.why-card h3 {
  font-size: 1.2rem;
  font-weight: 700;
}

.why-card p {
  color: var(--text-muted);
  font-size: 0.95rem;
  line-height: 1.6;
}

/* Founders / Team Section */
.team-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  font-size: 1.6rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 12px;
}

.team-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .team-grid {
    grid-template-columns: 1fr;
  }
}

.member-card {
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}

.avatar-wrapper {
  position: relative;
  margin-bottom: 8px;
}

.member-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary) 0%, #4f46e5 100%);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.8rem;
  font-weight: bold;
  border: 2px solid rgba(255,255,255,0.1);
  box-shadow: 0 10px 20px rgba(0,0,0,0.2);
}

.placeholder-avatar {
  background: linear-gradient(135deg, #475569 0%, #334155 100%);
}

.role-badge {
  position: absolute;
  bottom: -6px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--accent);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 6px;
  white-space: nowrap;
  box-shadow: 0 4px 8px rgba(6, 182, 212, 0.3);
}

.role-badge.contributor {
  background: #64748b;
  box-shadow: none;
}

.member-card h3 {
  font-size: 1.3rem;
  font-weight: 700;
}

.member-desc {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.contributions {
  list-style: none;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  margin-top: 8px;
  width: 100%;
  padding-left: 20px;
}

.contributions li {
  font-size: 0.85rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

.contributions li i {
  color: var(--success);
  font-size: 0.75rem;
}

.jest-quote {
  font-style: italic;
  font-weight: 600;
  color: var(--warning);
  font-size: 1.05rem;
  margin: 6px 0;
  background: rgba(245, 158, 11, 0.1);
  padding: 6px 16px;
  border-radius: 6px;
  border-left: 3px solid var(--warning);
}

.quote-mark {
  font-size: 1.2rem;
  font-family: Georgia, serif;
}

.jest-explanation {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}

/* Tech Section */
.tech-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.tech-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

@media (max-width: 768px) {
  .tech-grid {
    grid-template-columns: 1fr;
  }
}

.tech-card {
  padding: 24px;
}

.tech-card h3 {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
}

.tech-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tech-item {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.tech-icon {
  width: 40px;
  height: 40px;
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-shrink: 0;
}

.tech-icon i {
  font-size: 1.25rem;
  color: var(--accent);
}

.tech-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tech-info strong {
  font-size: 0.95rem;
  color: var(--text-main);
}

.tech-info span {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Lessons */
.lessons-section {
  padding: 30px;
}

.lessons-section h3 {
  font-size: 1.25rem;
  font-weight: 700;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}

.lessons-section h3 i {
  color: var(--primary);
}

.lessons-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

@media (max-width: 768px) {
  .lessons-grid {
    grid-template-columns: 1fr;
  }
}

.lesson-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.lesson-item h4 {
  font-size: 1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--accent);
}

.lesson-item p {
  font-size: 0.85rem;
  color: var(--text-muted);
  line-height: 1.5;
}
</style>
