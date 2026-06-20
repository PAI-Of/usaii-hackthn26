<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";

const router = useRouter();
const username = ref(''); 
const password = ref('');
const email = ref('');
const isRegister = ref(false);
const showPassword = ref(false);
const errorMsg = ref('');
const isSubmitting = ref(false);
const showSuccess = ref(false);

async function submit() {
  if (!username.value.trim() || !password.value.trim()) {
    errorMsg.value = "Username and password are required.";
    return;
  }

  errorMsg.value = '';
  isSubmitting.value = true;

  try {
    let response;
    if (isRegister.value) {
      response = await axios.post('http://localhost:3000/auth/register', {
        name: username.value.trim(), 
        password: password.value.trim(),
        email: email.value.trim() || undefined
      }, {
        withCredentials: true
      });
    } else {
      response = await axios.post('http://localhost:3000/auth/cookie', {
        name: username.value.trim(), 
        password: password.value.trim()
      }, {
        withCredentials: true
      });
    }

    if (response.status === 200 || response.status === 201) {
      showSuccess.value = true;
      setTimeout(() => {
        router.push('/home');
      }, 1200);
    }
  } catch (err) {
    if (err.response && err.response.data && err.response.data.error) {
      errorMsg.value = err.response.data.error;
    } else {
      errorMsg.value = "Failed to connect to the authentication server. Please verify the backend is running.";
    }
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="auth-page-wrapper animate-fade-in">
    <div class="header-back">
      <router-link to="/" class="back-link">
        <i class="fas fa-arrow-left"></i> Back to Home
      </router-link>
    </div>

    <div class="auth-card glass-panel" :class="{ 'glow-success': showSuccess }">
      <!-- Success View -->
      <div v-if="showSuccess" class="success-content">
        <div class="success-icon">
          <i class="fas fa-key"></i>
        </div>
        <h2>Access Granted</h2>
        <p v-if="isRegister">Account created! Welcome, {{ username }}. Redirecting...</p>
        <p v-else>Welcome back, {{ username }}. Redirecting to your kitchen dashboard...</p>
        <div class="progress-bar-loading">
          <div class="progress-bar-loading-fill"></div>
        </div>
      </div>

      <!-- Login / Register Form -->
      <template v-else>
        <div class="auth-header">
          <span class="auth-icon">
            <i class="fas fa-utensils"></i>
          </span>
          <h2>{{ isRegister ? 'Join Flim.ai' : 'Enter Flim.ai' }}</h2>
          <p class="subtitle">Securely access your frictionless fridge dashboard</p>
        </div>

        <!-- Auth Tabs Toggle -->
        <div class="auth-tabs">
          <button 
            type="button" 
            class="tab-btn" 
            :class="{ active: !isRegister }" 
            @click="isRegister = false; errorMsg = ''"
          >
            Sign In
          </button>
          <button 
            type="button" 
            class="tab-btn" 
            :class="{ active: isRegister }" 
            @click="isRegister = true; errorMsg = ''"
          >
            Create Account
          </button>
        </div>

        <!-- Custom Error Alert -->
        <transition name="slide">
          <div v-if="errorMsg" class="alert-box">
            <span class="alert-icon">
              <i class="fas fa-exclamation-triangle"></i>
            </span>
            <span class="alert-text">{{ errorMsg }}</span>
          </div>
        </transition>

        <form @submit.prevent="submit" class="auth-form">
          <div class="form-group">
            <label for="username">Username</label>
            <div class="input-wrapper">
              <span class="input-icon">
                <i class="fas fa-user"></i>
              </span>
              <input 
                id="username" 
                type="text" 
                placeholder="Enter username" 
                v-model="username"
                :disabled="isSubmitting"
                required
              />
            </div>
          </div>

          <div v-if="isRegister" class="form-group">
            <label for="email">Email Address <span class="optional">(Optional)</span></label>
            <div class="input-wrapper">
              <span class="input-icon">
                <i class="fas fa-envelope"></i>
              </span>
              <input 
                id="email" 
                type="email" 
                placeholder="Enter email address" 
                v-model="email"
                :disabled="isSubmitting"
              />
            </div>
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <div class="input-wrapper">
              <span class="input-icon">
                <i class="fas fa-lock"></i>
              </span>
              <input 
                id="password" 
                :type="showPassword ? 'text' : 'password'" 
                placeholder="Enter password" 
                v-model="password"
                :disabled="isSubmitting"
                required
              />
              <button 
                type="button" 
                class="btn-toggle" 
                @click="showPassword = !showPassword"
                tabindex="-1"
              >
                <i :class="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'"></i>
              </button>
            </div>
          </div>

          <button type="submit" class="btn btn-primary w-full" :disabled="isSubmitting">
            <span v-if="isSubmitting" class="spinner"></span>
            <span v-else>
              <i :class="isRegister ? 'fas fa-user-plus' : 'fas fa-sign-in-alt'"></i> 
              {{ isRegister ? 'Register & Log In' : 'Authorize Session' }}
            </span>
          </button>
        </form>
      </template>
    </div>
  </div>
</template>

<style scoped>
.auth-page-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 24px;
  position: relative;
}

.header-back {
  position: absolute;
  top: 32px;
  left: 32px;
}

.back-link {
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 500;
  transition: var(--transition-smooth);
}

.back-link i {
  margin-right: 6px;
}

.back-link:hover {
  color: var(--accent);
  transform: translateX(-3px);
}

.auth-card {
  width: 100%;
  max-width: 440px;
  padding: 40px;
  background: rgba(15, 23, 42, 0.75);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  position: relative;
}

.auth-header {
  text-align: center;
  margin-bottom: 20px;
}

.auth-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 12px;
}

.auth-header h2 {
  font-size: 1.8rem;
  font-weight: 800;
  margin-bottom: 6px;
}

.subtitle {
  color: var(--text-muted);
  font-size: 0.9rem;
}

/* Tabs */
.auth-tabs {
  display: flex;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--border-color);
  padding: 4px;
  border-radius: 10px;
  margin-bottom: 24px;
}

.tab-btn {
  flex: 1;
  background: none;
  border: none;
  color: var(--text-muted);
  padding: 10px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: var(--transition-smooth);
}

.tab-btn:hover {
  color: var(--text-main);
}

.tab-btn.active {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid var(--border-color);
  color: var(--accent);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.optional {
  text-transform: none;
  font-weight: normal;
  font-size: 0.75rem;
  opacity: 0.7;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-icon {
  position: absolute;
  left: 14px;
  font-size: 1rem;
  color: var(--text-muted);
  pointer-events: none;
}

.input-wrapper input {
  padding-left: 44px;
}

.btn-toggle {
  position: absolute;
  right: 14px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: var(--text-muted);
  padding: 0;
}

.w-full {
  width: 100%;
}

/* Alert box */
.alert-box {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: #fca5a5;
  font-size: 0.9rem;
}

.alert-icon i {
  font-size: 1.1rem;
}

/* Success State styling */
.glow-success {
  border-color: var(--success);
  box-shadow: 0 0 30px var(--success-glow);
}

.success-content {
  text-align: center;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.success-icon {
  font-size: 3rem;
  animation: pulse 1s infinite alternate;
}

.success-icon i {
  color: var(--success);
}

.success-content h2 {
  font-size: 1.8rem;
  color: var(--success);
}

.success-content p {
  color: var(--text-muted);
  line-height: 1.5;
}

.progress-bar-loading {
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.1);
  border-radius: 2px;
  overflow: hidden;
  margin-top: 10px;
}

.progress-bar-loading-fill {
  height: 100%;
  width: 0%;
  background: var(--success);
  animation: fillProgress 1.2s linear forwards;
}

@keyframes fillProgress {
  0% { width: 0%; }
  100% { width: 100%; }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 0.8; }
  100% { transform: scale(1.1); opacity: 1; }
}

/* Loading Spinner */
.spinner {
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 3px solid rgba(255,255,255,.3);
  border-radius: 50%;
  border-top-color: #fff;
  animation: spin 0.8s ease-in-out infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Slide Transition */
.slide-enter-active, .slide-leave-active {
  transition: all 0.3s ease;
}
.slide-enter-from, .slide-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>