<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const isLoggedIn = ref(false);
const username = ref('');
const checkingAuth = ref(true);

onMounted(async () => {
  try {
    const res = await axios.get('http://localhost:3000/valid', {
      withCredentials: true
    });
    if (res.status === 200 && res.data.user) {
      isLoggedIn.value = true;
      username.value = res.data.user;
    }
  } catch (err) {
    isLoggedIn.value = false;
  } finally {
    checkingAuth.value = false;
  }
});

function handleCTA() {
  if (isLoggedIn.value) {
    router.push('/home');
  } else {
    router.push('/auth');
  }
}
</script>

<template>
  <div class="landing-container animate-fade-in">
    <!-- Navbar -->
    <header class="navbar glass-panel">
      <div class="logo">
        <span class="logo-icon">
          <i class="fas fa-utensils"></i>
        </span>
        <span class="logo-text">Flim<span class="dot">.ai</span></span>
      </div>
      <nav class="nav-links">
        <router-link to="/about" class="about-nav-link">
          <i class="fas fa-circle-info"></i> About Flim.ai
        </router-link>
        <span v-if="checkingAuth" class="loading-dot"></span>
        <template v-else>
          <button v-if="isLoggedIn" class="btn btn-secondary" @click="router.push('/home')">
            <i class="fas fa-kitchen-set"></i> Go to Kitchen ({{ username }})
          </button>
          <button v-else class="btn btn-primary btn-sm" @click="router.push('/auth')">
            <i class="fas fa-sign-in-alt"></i> Sign In
          </button>
        </template>
      </nav>
    </header>

    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <span class="badge">
          <i class="fas fa-magic"></i> Powered by Gemini Vision AI
        </span>
        <h1 class="hero-title">
          Frictionless Fridge,<br/>
          <span class="gradient-text">Zero Waste.</span>
        </h1>
        <p class="hero-subtitle">
          Flim.ai is a solution to reduce food waste.
          Snap a picture of your leftover food or get food from other(s). Protected by <b>JSON Web Tokens & Argon2</b>.
        </p>
        <div class="hero-actions">
          <button class="btn btn-primary btn-lg" @click="handleCTA">
            <i :class="isLoggedIn ? 'fas fa-arrow-right' : 'fas fa-rocket'"></i>
            {{ isLoggedIn ? 'Enter Kitchen Dashboard' : 'Get Started for Free' }}
            <span class="arrow"><i class="fas fa-arrow-right"></i></span>
          </button>
        </div>
      </div>

      <!-- Hero Visual / Mockup -->
      <div class="hero-visual glass-panel">
        <div class="mock-card">
          <div class="mock-header">
            <span class="mock-status pulse-green">
              <i class="fas fa-circle"></i> Live Tracker
            </span>
            <span class="mock-time">
              <i class="far fa-clock"></i> 10m ago
            </span>
          </div>
          <div class="mock-image-placeholder">
            <!-- <span class="mock-icon">
              <i class="fas fa-pizza-slice"></i>
            </span> -->
            <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSXSBCLFLaKMz4dahgDmjmVW6Y99GVb0aDCBVVKdO4Eoheygt6yMy9X8V_eRE9WrOwcHH28cY87gXE5RooYeNuSZLWYeaYTC-76hLYiVA&s=10" height="100%"/>
            <div class="mock-scan-line"></div>
          </div>
          <div class="mock-details">
            <h3>Pepperoni Pizza</h3>
            <div class="mock-meta">
              <span><i class="fas fa-user-circle"></i> By Alice</span>
              <span class="freshness badge-fresh">
                <i class="fas fa-leaf"></i> Fresh
              </span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill" style="width: 85%;"></div>
            </div>
            <div class="mock-footer">
              <span><i class="far fa-hourglass-half"></i> Expires in: 20h 24m</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Grid -->
    <section class="features">
      <h2 class="section-title">How Flim.ai Saves Your Food</h2>
      <div class="features-grid">
        <div class="feature-card glass-panel">
          <div class="feature-icon">
            <i class="fas fa-camera"></i>
          </div>
          <h3>1. Snap an Image</h3>
          <p>Upload a photo of any ingredient or leftovers. No manual text entry or barcode scanning required.</p>
        </div>
        <div class="feature-card glass-panel">
          <div class="feature-icon">
            <i class="fas fa-robot"></i>
          </div>
          <h3>2. AI Classification</h3>
          <p>Gemini Vision AI instantly identifies the food type and automatically estimates optimal shelf life.</p>
        </div>
        <div class="feature-card glass-panel">
          <div class="feature-icon">
            <i class="fas fa-hourglass-half"></i>
          </div>
          <h3>3. Track Expiration</h3>
          <p>Real-time countdown alerts you as items approach their limit. Consume them before they expire!</p>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
      <p><i class="far fa-copyright"></i> 2026 Flim.ai. Smart Food Management for a Sustainable Planet.</p>
    </footer>
  </div>
</template>

<style scoped>
.landing-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

/* Navbar */
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 32px;
  margin-bottom: 60px;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 20px;
}

.about-nav-link {
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: var(--transition-smooth);
}

.about-nav-link:hover {
  color: var(--accent);
  text-shadow: 0 0 8px rgba(6, 182, 212, 0.4);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 1.8rem;
}

.logo-icon i {
  font-size: 1.8rem;
}

.logo-text {
  font-size: 1.5rem;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.dot {
  color: var(--accent);
}

/* Hero Section */
.hero {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 60px;
  align-items: center;
  margin-bottom: 80px;
}

@media (max-width: 900px) {
  .hero {
    grid-template-columns: 1fr;
    text-align: center;
    gap: 40px;
  }
  
  .hero-visual {
    max-width: 400px;
    margin: 0 auto;
  }
}

.hero-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 24px;
}

@media (max-width: 900px) {
  .hero-content {
    align-items: center;
  }
}

.badge {
  background: rgba(139, 92, 246, 0.15);
  border: 1px solid rgba(139, 92, 246, 0.3);
  color: #c084fc;
  padding: 6px 16px;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.badge i {
  margin-right: 6px;
  font-size: 0.8rem;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -1.5px;
}

@media (max-width: 600px) {
  .hero-title {
    font-size: 2.5rem;
  }
}

.gradient-text {
  background: linear-gradient(135deg, #a78bfa 0%, #06b6d4 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.15rem;
  line-height: 1.6;
  color: var(--text-muted);
}

.hero-actions {
  margin-top: 10px;
}

.hero-actions .btn-primary i {
  margin-right: 8px;
}

.arrow {
  margin-left: 8px;
  transition: transform 0.2s;
  display: inline-block;
}

.btn-primary:hover .arrow {
  transform: translateX(4px);
}

/* Hero Visual Card Simulation */
.hero-visual {
  padding: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(15, 23, 42, 0.6);
  position: relative;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
  100% { transform: translateY(0px); }
}

.mock-card {
  width: 100%;
  max-width: 300px;
  background: rgba(30, 41, 59, 0.8);
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.05);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.mock-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.mock-header i {
  font-size: 0.7rem;
  margin-right: 4px;
}

.pulse-green {
  color: var(--success);
  font-weight: bold;
}

.pulse-green i {
  font-size: 0.6rem;
  animation: pulse 1.5s ease-in-out infinite;
}

.mock-image-placeholder {
  height: 160px;
  background: rgba(15, 23, 42, 0.5);
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
}

.mock-icon {
  font-size: 4rem;
  filter: drop-shadow(0 4px 10px rgba(0,0,0,0.3));
}

.mock-icon i {
  font-size: 4rem;
}

.mock-scan-line {
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--accent), transparent);
  box-shadow: 0 0 10px var(--accent);
  animation: scanner 3s linear infinite;
}

@keyframes scanner {
  0% { top: 0%; opacity: 0; }
  50% { top: 100%; opacity: 1; }
  100% { top: 0%; opacity: 0; }
}

.mock-details h3 {
  font-size: 1.15rem;
  font-weight: 700;
  margin-bottom: 6px;
}

.mock-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.mock-meta i {
  margin-right: 4px;
  font-size: 0.75rem;
}

.badge-fresh {
  background: rgba(16, 185, 129, 0.15);
  color: var(--success);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.badge-fresh i {
  font-size: 0.7rem;
  margin-right: 4px;
}

.progress-bar-container {
  height: 6px;
  background: rgba(255,255,255,0.1);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--success), #34d399);
  border-radius: 3px;
}

.mock-footer {
  font-size: 0.8rem;
  font-weight: 500;
  color: #34d399;
}

.mock-footer i {
  margin-right: 4px;
  font-size: 0.7rem;
}

/* Features Grid */
.features {
  margin-top: 40px;
  margin-bottom: 80px;
  text-align: center;
}

.section-title {
  font-size: 2rem;
  font-weight: 800;
  margin-bottom: 40px;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 24px;
}

.feature-card {
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.feature-icon {
  width: 70px;
  height: 70px;
  background: rgba(255,255,255,0.05);
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 10px rgba(0,0,0,0.15);
}

.feature-icon i {
  font-size: 2rem;
}

.feature-card h3 {
  font-size: 1.25rem;
  font-weight: 700;
}

.feature-card p {
  color: var(--text-muted);
  line-height: 1.5;
  font-size: 0.95rem;
}

/* Footer */
.footer {
  text-align: center;
  padding: 32px;
  border-top: 1px solid var(--border-color);
  color: var(--text-muted);
  font-size: 0.85rem;
}

.footer i {
  margin-right: 4px;
}

.loading-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: pulse 1s infinite alternate;
}

@keyframes pulse {
  0% { opacity: 0.3; }
  100% { opacity: 1; }
}

/* Button styles */
.btn-sm i, .btn-secondary i, .btn-primary i {
  margin-right: 6px;
}
</style>