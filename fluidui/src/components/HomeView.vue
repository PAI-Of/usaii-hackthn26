<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";

const router = useRouter();

// Auth & User State
const currentUser = ref("");
const authorizationRes = ref("");
const authChecked = ref(false);

// Foods State
const foods = ref([]);
const isLoadingFoods = ref(false);
const fetchError = ref("");
const imageErrors = ref({}); // Tracks images that fail to load to show emoji fallback

// Upload State
const fileInput = ref(null);
const isUploading = ref(false);
const uploadError = ref("");
const uploadPreview = ref("");
const uploadSuccessMessage = ref("");
const scanningText = ref("Uploading food image...");
let scanningInterval = null;

// Camera State
const isCameraMode = ref(false); // Toggle between Camera and File upload UI
const videoStream = ref(null);
const videoEl = ref(null);
const canvasEl = ref(null);
const cameraError = ref("");
const isCameraLoading = ref(false);
const capturedBlob = ref(null);
const capturedPreview = ref("");

// Location State
const userLocation = ref(null);
const locationStatus = ref("");

// Order State
const isOrdering = ref({});

// Messages & Inbox State
const messages = ref([]);
const showInbox = ref(false);
const isResponding = ref({});
let pollingInterval = null;

// Realtime Expiry Engine
const currentUnixTime = ref(Math.floor(Date.now() / 1000));
let timerInterval = null;

// Search, Filters & Sorting
const searchQuery = ref("");
const onlyMyItems = ref(false);
const sortBy = ref("expiry"); // 'expiry', 'newest', 'name'
const viewMode = ref("grid"); // 'grid', 'list'

const scanTexts = [
  "Uploading to secure server...",
  "Initializing Gemini Vision API...",
  "Running neural classification model...",
  "Analyzing visual ingredients & textures...",
  "Estimating food safety & shelf-life...",
  "Finalizing record persistence..."
];

// Emojis mapping for fallback
function getFoodEmoji(name) {
  if (!name) return '🥗';
  const n = name.toLowerCase();
  if (n.includes('pizza')) return '🍕';
  if (n.includes('burger')) return '🍔';
  if (n.includes('biryani') || n.includes('rice') || n.includes('curry')) return '🍛';
  if (n.includes('apple')) return '🍎';
  if (n.includes('banana')) return '🍌';
  if (n.includes('fruit')) return '🍇';
  if (n.includes('sandwich')) return '🥪';
  if (n.includes('salad')) return '🥗';
  if (n.includes('sushi')) return '🍣';
  if (n.includes('cake') || n.includes('dessert') || n.includes('cookie')) return '🍰';
  if (n.includes('soup') || n.includes('stew')) return '🍲';
  if (n.includes('chicken') || n.includes('meat') || n.includes('steak')) return '🍗';
  if (n.includes('egg')) return '🥚';
  if (n.includes('milk') || n.includes('dairy') || n.includes('cheese')) return '🧀';
  if (n.includes('coffee') || n.includes('drink') || n.includes('juice')) return '☕';
  if (n.includes('bread') || n.includes('toast')) return '🍞';
  if (n.includes('pasta') || n.includes('noodle')) return '🍝';
  if (n.includes('fish') || n.includes('seafood')) return '🐟';
  if (n.includes('taco')) return '🌮';
  return '🍱';
}

// Lifecycle
onMounted(async () => {
  // 1. Verify Authentication
  try {
    const res = await axios.get('http://localhost:3000/valid', {
      withCredentials: true
    });
    if (res.status === 200 && res.data.user) {
      currentUser.value = res.data.user;
      authorizationRes.value = res.data.message;
      authChecked.value = true;
      
      // Fetch initial data
      await fetchAvailableFoods();
      await fetchMessages();
      
      // Request location in the background if possible
      try {
        await getUserLocation(true); // Silent request
      } catch (e) {}
    } else {
      router.push('/auth');
    }
  } catch (err) {
    router.push('/auth');
  }

  // 2. Start Realtime Clock (runs every second)
  timerInterval = setInterval(() => {
    currentUnixTime.value = Math.floor(Date.now() / 1000);
  }, 1000);

  // 3. Start Polling for foods and messages
  pollingInterval = setInterval(async () => {
    await fetchAvailableFoods();
    await fetchMessages();
  }, 10000);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
  if (scanningInterval) clearInterval(scanningInterval);
  if (pollingInterval) clearInterval(pollingInterval);
  stopCamera();
});

// Geolocation Handling
function getUserLocation(silent = false) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      locationStatus.value = "Geolocation not supported";
      const fallback = { latitude: 12.9716, longitude: 77.5946 };
      userLocation.value = fallback;
      resolve(fallback);
      return;
    }

    if (!silent) {
      locationStatus.value = "Acquiring location...";
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          latitude: parseFloat(position.coords.latitude.toFixed(6)),
          longitude: parseFloat(position.coords.longitude.toFixed(6))
        };
        userLocation.value = coords;
        locationStatus.value = `Acquired: ${coords.latitude}, ${coords.longitude}`;
        resolve(coords);
      },
      (error) => {
        console.warn("Location error:", error.message);
        locationStatus.value = "Location denied (using default)";
        // Fallback standard coords for Bangalore
        const fallback = { latitude: 12.9716, longitude: 77.5946 };
        userLocation.value = fallback;
        resolve(fallback);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });
}

// Camera Functions
async function startCamera() {
  isCameraMode.value = true;
  cameraError.value = "";
  capturedPreview.value = "";
  capturedBlob.value = null;
  isCameraLoading.value = true;

  try {
    // Request location access along with camera
    try {
      await getUserLocation(true);
    } catch(e){}

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" }
    }).catch(() => {
      // Fallback for laptops / front cams
      return navigator.mediaDevices.getUserMedia({ video: true });
    });

    videoStream.value = stream;
    if (videoEl.value) {
      videoEl.value.srcObject = stream;
    }
  } catch (err) {
    cameraError.value = "Camera access failed: " + err.message;
    isCameraMode.value = false;
  } finally {
    isCameraLoading.value = false;
  }
}

function stopCamera() {
  if (videoStream.value) {
    videoStream.value.getTracks().forEach(track => track.stop());
    videoStream.value = null;
  }
}

function capturePhoto() {
  if (!videoEl.value || !canvasEl.value) return;

  const video = videoEl.value;
  const canvas = canvasEl.value;
  const ctx = canvas.getContext('2d');

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  capturedPreview.value = canvas.toDataURL('image/jpeg');
  stopCamera();

  canvas.toBlob((blob) => {
    capturedBlob.value = blob;
  }, 'image/jpeg', 0.85);
}

function retakePhoto() {
  capturedPreview.value = "";
  capturedBlob.value = null;
  startCamera();
}

function cancelCamera() {
  stopCamera();
  isCameraMode.value = false;
  capturedPreview.value = "";
  capturedBlob.value = null;
}

// API Fetching
async function fetchAvailableFoods() {
  isLoadingFoods.value = true;
  fetchError.value = "";
  try {
    const res = await axios.get('http://localhost:3000/food/available', {
      withCredentials: true
    });
    foods.value = res.data;
  } catch (err) {
    fetchError.value = "Failed to load foods list: " + err.message;
  } finally {
    isLoadingFoods.value = false;
  }
}

async function fetchMessages() {
  try {
    const res = await axios.get('http://localhost:3000/messages/my', {
      withCredentials: true
    });
    messages.value = res.data || [];
  } catch (err) {
    console.error("Failed to load messages inbox", err);
  }
}

// Upload Handling
function triggerUpload() {
  fileInput.value.click();
}

function handleFileChange(event) {
  const file = event.target.files[0];
  if (file) {
    processUpload(file);
  }
}

function handleDragOver() {
  // Can only drag file when not in camera mode
  if (!isCameraMode.value) isDragging.value = true;
}

const isDragging = ref(false);
function handleDragLeave() {
  isDragging.value = false;
}
function handleDrop(event) {
  isDragging.value = false;
  if (isCameraMode.value) return;
  const file = event.dataTransfer.files[0];
  if (file) {
    processUpload(file);
  }
}

async function processUpload(fileOrBlob) {
  uploadError.value = "";
  uploadSuccessMessage.value = "";
  isUploading.value = true;

  // Local preview
  if (fileOrBlob instanceof Blob) {
    uploadPreview.value = URL.createObjectURL(fileOrBlob);
  } else {
    if (!fileOrBlob.type.startsWith('image/')) {
      uploadError.value = "Please select a valid image file.";
      isUploading.value = false;
      return;
    }
    uploadPreview.value = URL.createObjectURL(fileOrBlob);
  }

  // Scanning cycle messages
  let scanIndex = 0;
  scanningText.value = scanTexts[0];
  scanningInterval = setInterval(() => {
    scanIndex = (scanIndex + 1) % scanTexts.length;
    scanningText.value = scanTexts[scanIndex];
  }, 1300);

  // Guarantee location is acquired
  let locCoords = userLocation.value;
  if (!locCoords) {
    locCoords = await getUserLocation();
  }

  const formData = new FormData();
  formData.append('food', fileOrBlob, 'food-upload.jpg');
  
  // Format location as JSON string
  const locStr = JSON.stringify(locCoords);
  formData.append('location', locStr);
  formData.append('from_location', locStr);
  formData.append('latitude', String(locCoords.latitude));
  formData.append('longitude', String(locCoords.longitude));

  try {
    const res = await axios.post('http://localhost:3000/food/snap', formData, {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (res.status === 200) {
      uploadSuccessMessage.value = `Identified: ${res.data.name}!`;
      setTimeout(() => {
        uploadPreview.value = "";
        uploadSuccessMessage.value = "";
      }, 3000);
      
      // Reload lists
      await fetchAvailableFoods();
    }
  } catch (err) {
    uploadError.value = err.response?.data?.error || "Failed to classify food item.";
  } finally {
    isUploading.value = false;
    isCameraMode.value = false;
    capturedBlob.value = null;
    capturedPreview.value = "";
    if (scanningInterval) {
      clearInterval(scanningInterval);
      scanningInterval = null;
    }
  }
}

// Order & Respond Actions
async function orderFoodItem(item) {
  isOrdering.value[item.id] = true;
  try {
    // Acquire location
    let locCoords = userLocation.value;
    if (!locCoords) {
      locCoords = await getUserLocation();
    }

    const res = await axios.post('http://localhost:3000/order/create', {
      food_id: item.id,
      location: locCoords
    }, {
      withCredentials: true
    });

    if (res.status === 201) {
      alert(`Request sent to publisher for ${item.name}! Check 'Requests' page and 'Inbox'.`);
      await fetchAvailableFoods();
      await fetchMessages();
    }
  } catch (err) {
    alert("Failed to order: " + (err.response?.data?.error || err.message));
  } finally {
    isOrdering.value[item.id] = false;
  }
}

async function respondToOrder(message, responseType) {
  isResponding.value[message.id] = true;
  try {
    const res = await axios.post('http://localhost:3000/order/respond', {
      order_id: message.order_id,
      response: responseType
    }, {
      withCredentials: true
    });

    if (res.status === 200) {
      await fetchMessages();
      await fetchAvailableFoods();
    }
  } catch (err) {
    alert("Response failed: " + (err.response?.data?.error || err.message));
  } finally {
    isResponding.value[message.id] = false;
  }
}

// Image Fallback
function handleImageError(id) {
  imageErrors.value[id] = true;
}

// Expiry Logic
function getExpiryTimeLeft(item) {
  const expiryTime = item.time_posted + item.shelf_life;
  const diff = expiryTime - currentUnixTime.value;
  if (diff <= 0) return { text: "Expired", class: "critical", percent: 0 };
  
  const percent = Math.max(0, Math.min(100, (diff / item.shelf_life) * 100));
  
  let statusClass = "fresh";
  if (percent <= 20) {
    statusClass = "critical";
  } else if (percent <= 50) {
    statusClass = "warning";
  }

  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;

  let timeText = "";
  if (days > 0) {
    timeText = `${days}d ${hours}h ${minutes}m`;
  } else if (hours > 0) {
    timeText = `${hours}h ${minutes}m ${seconds}s`;
  } else {
    timeText = `${minutes}m ${seconds}s`;
  }

  return { text: timeText, class: statusClass, percent: percent };
}

function formatPostedTime(timePosted) {
  if (!timePosted) return '';
  const diff = currentUnixTime.value - timePosted;
  if (diff < 60) return "Just now";
  const mins = Math.floor(diff / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timePosted * 1000).toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

function formatLocation(locStr) {
  if (!locStr || locStr === 'none') return 'Not specified';
  try {
    const loc = JSON.parse(locStr);
    if (loc.latitude && loc.longitude) {
      return `${loc.latitude.toFixed(4)}°, ${loc.longitude.toFixed(4)}°`;
    }
  } catch (e) {}
  return locStr;
}

// Log out
async function logout() {
  try {
    await axios.delete('http://localhost:3000/auth/logout', {
      withCredentials: true
    });
    router.push('/auth');
  } catch (err) {
    router.push('/auth');
  }
}

// Filtered Foods
const filteredFoods = computed(() => {
  let list = [...foods.value];

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase();
    list = list.filter(item => item.name.toLowerCase().includes(q));
  }

  if (onlyMyItems.value) {
    list = list.filter(item => item.publisher === currentUser.value);
  }

  if (sortBy.value === "expiry") {
    list.sort((a, b) => {
      const aExpiry = a.time_posted + a.shelf_life;
      const bExpiry = b.time_posted + b.shelf_life;
      return aExpiry - bExpiry;
    });
  } else if (sortBy.value === "newest") {
    list.sort((a, b) => b.time_posted - a.time_posted);
  } else if (sortBy.value === "name") {
    list.sort((a, b) => a.name.localeCompare(b.name));
  }

  return list;
});

// Stats Computed
const stats = computed(() => {
  const total = foods.value.length;
  let fresh = 0;
  let warning = 0;
  let critical = 0;

  foods.value.forEach(item => {
    const expiryTime = item.time_posted + item.shelf_life;
    const diff = expiryTime - currentUnixTime.value;
    if (diff <= 0) {
      critical++;
    } else {
      const percent = (diff / item.shelf_life) * 100;
      if (percent <= 20) critical++;
      else if (percent <= 50) warning++;
      else fresh++;
    }
  });

  return { total, fresh, warning, critical };
});

const unreadCount = computed(() => {
  return messages.value.filter(m => m.status === 'unread' && m.recipient === currentUser.value).length;
});
</script>

<template>
  <div v-if="authChecked" class="dashboard-wrapper animate-fade-in">
    <!-- Navbar Header -->
    <header class="navbar glass-panel">
      <div class="logo" @click="router.push('/')" style="cursor:pointer">
        <span class="logo-icon"><i class="fas fa-utensils"></i></span>
        <span class="logo-text">Flim<span class="dot">.ai</span></span>
      </div>

      <!-- Center navigation -->
      <nav class="nav-menu">
        <router-link to="/home" class="nav-link-item active">
          <i class="fas fa-kitchen-set"></i> Kitchen
        </router-link>
        <router-link to="/orders" class="nav-link-item">
          <i class="fas fa-clipboard-list"></i> Requests
        </router-link>
        <router-link to="/about" class="nav-link-item">
          <i class="fas fa-circle-info"></i> About
        </router-link>
      </nav>

      <!-- User controls -->
      <div class="user-profile">
        <!-- Inbox notification bell -->
        <button class="btn btn-secondary btn-sm btn-inbox" @click="showInbox = true">
          <i class="fas fa-bell"></i>
          <span v-if="unreadCount > 0" class="unread-badge">{{ unreadCount }}</span>
        </button>

        <div class="user-avatar">👤</div>
        <div class="user-meta">
          <span class="user-name">{{ currentUser }}</span>
          <span class="user-role">Kitchen Admin</span>
        </div>
        <button class="btn btn-secondary btn-sm btn-logout" @click="logout">
          Logout
        </button>
      </div>
    </header>

    <div class="dashboard-layout">
      <!-- Left Sidebar: Snap / Upload -->
      <aside class="sidebar-section">
        <!-- Quick Stats Card -->
        <div class="glass-panel stat-card">
          <h3>Fridge Inventory</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-num">{{ stats.total }}</span>
              <span class="stat-lbl">Active</span>
            </div>
            <div class="stat-item text-success">
              <span class="stat-num">{{ stats.fresh }}</span>
              <span class="stat-lbl">Fresh</span>
            </div>
            <div class="stat-item text-warning">
              <span class="stat-num">{{ stats.warning }}</span>
              <span class="stat-lbl">Warning</span>
            </div>
            <div class="stat-item text-danger">
              <span class="stat-num">{{ stats.critical }}</span>
              <span class="stat-lbl">Critical</span>
            </div>
          </div>
        </div>

        <!-- Location Information Indicator -->
        <div class="glass-panel location-indicator-card" @click="getUserLocation(false)">
          <div class="indicator-icon">
            <i class="fas fa-location-crosshairs" :class="{ 'spinning': locationStatus.includes('Acquiring') }"></i>
          </div>
          <div class="indicator-text">
            <h4>Device Location</h4>
            <p>{{ locationStatus || "Location not requested" }}</p>
          </div>
        </div>

        <!-- Snap Upload Card Container -->
        <div 
          class="glass-panel upload-card"
          :class="{ 'dragging': isDragging, 'uploading': isUploading || isCameraLoading }"
          @dragover.prevent="handleDragOver"
          @dragenter.prevent="handleDragOver"
          @dragleave="handleDragLeave"
          @drop.prevent="handleDrop"
        >
          <div class="upload-header">
            <h3>AI Food Scanner</h3>
            <p>Snap a camera picture or upload files to identify</p>
          </div>

          <!-- Upload Selector Buttons -->
          <div v-if="!isUploading && !isCameraMode && !capturedPreview" class="scanner-selectors">
            <button class="btn btn-secondary w-full select-btn" @click="triggerUpload">
              <i class="fas fa-file-image"></i> Select Image File
            </button>
            <button class="btn btn-primary w-full select-btn btn-camera" @click="startCamera">
              <i class="fas fa-camera"></i> Use Live Camera
            </button>
          </div>

          <!-- Web Cam Stream UI -->
          <div v-if="isCameraMode" class="camera-stream-container">
            <div class="camera-feed-wrapper">
              <video ref="videoEl" class="video-feed" autoplay playsinline></video>
              <div class="scan-overlay-grid"></div>
              <div class="laser-scanner-line"></div>
              <div v-if="isCameraLoading" class="camera-loader">
                <div class="loader-spinner"></div>
              </div>
            </div>
            <div class="camera-actions">
              <button class="btn btn-danger btn-sm" @click="cancelCamera">Cancel</button>
              <button class="btn btn-primary btn-sm btn-shutter" @click="capturePhoto" :disabled="isCameraLoading">
                <i class="fas fa-circle"></i> Capture
              </button>
            </div>
          </div>

          <!-- Captured Photo Confirmation UI -->
          <div v-if="capturedPreview && !isUploading" class="camera-preview-container">
            <div class="camera-feed-wrapper">
              <img :src="capturedPreview" class="video-feed" />
            </div>
            <div class="camera-actions">
              <button class="btn btn-secondary btn-sm" @click="retakePhoto">Retake</button>
              <button class="btn btn-accent btn-sm" @click="processUpload(capturedBlob)">
                <i class="fas fa-bolt"></i> Upload & Scan
              </button>
            </div>
          </div>

          <!-- Uploading scanner overlay -->
          <div v-if="isUploading" class="scanning-overlay">
            <div class="scan-image-container">
              <img :src="uploadPreview" class="scan-preview" />
              <div class="laser-scanner"></div>
            </div>
            <div class="scan-status-container">
              <span class="scanner-dot"></span>
              <p class="scanning-msg">{{ scanningText }}</p>
              <div class="scanning-bar">
                <div class="scanning-bar-fill"></div>
              </div>
            </div>
          </div>

          <!-- Dropzone content when idle -->
          <div v-else-if="uploadPreview && uploadSuccessMessage" class="scan-success-overlay">
            <div class="success-tick"><i class="fas fa-circle-check"></i></div>
            <h4>Classification Success</h4>
            <p class="success-msg">{{ uploadSuccessMessage }}</p>
          </div>

          <div v-else-if="!isCameraMode && !capturedPreview" class="dropzone-content" @click="triggerUpload">
            <div class="drop-icon"><i class="fas fa-cloud-arrow-up"></i></div>
            <p class="drop-text-primary">Drag & drop files here</p>
            <p class="drop-text-secondary">Or click to select image</p>
          </div>

          <input 
            type="file" 
            ref="fileInput" 
            @change="handleFileChange" 
            accept="image/*" 
            style="display: none" 
          />

          <!-- Hidden Canvas for camera captures -->
          <canvas ref="canvasEl" style="display: none"></canvas>

          <p v-if="uploadError" class="upload-error-banner animate-fade-in">
            ⚠️ {{ uploadError }}
          </p>
          <p v-if="cameraError" class="upload-error-banner animate-fade-in">
            ⚠️ {{ cameraError }}
          </p>
        </div>
      </aside>

      <!-- Main Section: Food Gallery -->
      <main class="main-content">
        <!-- Controls Panel (Search & Sort) -->
        <div class="glass-panel controls-card">
          <div class="search-box">
            <span class="search-icon"><i class="fa-solid fa-magnifying-glass"></i></span>
            <input 
              type="text" 
              placeholder="Search fridge items (e.g. Pizza, Salad)..." 
              v-model="searchQuery"
            />
          </div>

          <div class="filter-actions">
            <!-- Sort dropdown -->
            <div class="select-wrapper">
              <select v-model="sortBy">
                <option value="expiry">Soonest to expire</option>
                <option value="newest">Newest first</option>
                <option value="name">Alphabetical</option>
              </select>
            </div>

            <!-- Only My Items Toggle -->
            <label class="checkbox-wrapper">
              <input type="checkbox" v-model="onlyMyItems" />
              <span class="checkbox-label">Only My Items</span>
            </label>

            <!-- Layout toggle -->
            <div class="layout-toggle-group">
              <button 
                class="btn-toggle-layout" 
                :class="{ 'active': viewMode === 'grid' }"
                @click="viewMode = 'grid'"
                title="Grid View"
              >
                <i class="fas fa-th-large"></i>
              </button>
              <button 
                class="btn-toggle-layout" 
                :class="{ 'active': viewMode === 'list' }"
                @click="viewMode = 'list'"
                title="List View"
              >
                <i class="fas fa-list"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- Food List / Gallery -->
        <div class="gallery-wrapper">
          <div v-if="isLoadingFoods" class="loader-container">
            <div class="loader-spinner"></div>
            <p>Scanning food database...</p>
          </div>

          <div v-else-if="fetchError" class="error-container glass-panel">
            <span class="error-icon">❌</span>
            <p>{{ fetchError }}</p>
            <button class="btn btn-secondary btn-sm" @click="fetchAvailableFoods">Retry</button>
          </div>

          <div v-else-if="filteredFoods.length === 0" class="empty-container glass-panel">
            <span class="empty-icon"><i class="fas fa-kitchen-set"></i></span>
            <h3>No Food Items Found</h3>
            <p v-if="searchQuery || onlyMyItems">Try clearing your filters or search query.</p>
            <p v-else>Your fridge is empty! Snap a photo on the left to add your first item.</p>
          </div>

          <template v-else>
            <transition-group 
              name="list-fade" 
              tag="div" 
              :class="viewMode === 'grid' ? 'food-grid' : 'food-list'"
            >
              <!-- Food Item Card -->
              <div 
                v-for="item in filteredFoods" 
                :key="item.id" 
                class="food-card glass-panel"
                :class="getExpiryTimeLeft(item).class"
              >
                <!-- Card Image section -->
                <div class="card-image-wrapper">
                  <div 
                    v-if="imageErrors[item.id]" 
                    class="card-image-placeholder"
                  >
                    <span class="fallback-emoji">{{ getFoodEmoji(item.name) }}</span>
                  </div>
                  <img 
                    v-else
                    :src="`http://localhost:3000/uploads/${item.image}`" 
                    @error="handleImageError(item.id)" 
                    class="card-image" 
                    alt="Food item"
                  />
                  <!-- Freshness badge floating -->
                  <div class="floating-badge" :class="getExpiryTimeLeft(item).class">
                    {{ getExpiryTimeLeft(item).class.toUpperCase() }}
                  </div>
                </div>

                <!-- Card Info -->
                <div class="card-info">
                  <div class="card-title-row">
                    <h3 class="food-name">{{ item.name }}</h3>
                    <span class="food-id">#{{ item.id }}</span>
                  </div>

                  <div class="card-meta">
                    <span class="meta-item"><i class="fas fa-user-circle"></i> {{ item.publisher }}</span>
                    <span class="meta-item"><i class="far fa-clock"></i> {{ formatPostedTime(item.time_posted) }}</span>
                  </div>

                  <!-- Location metadata field -->
                  <div class="location-meta-row">
                    <i class="fas fa-location-dot"></i> {{ formatLocation(item.from_location) }}
                  </div>

                  <!-- Expiry Progress Indicator -->
                  <div class="expiry-progress-section">
                    <div class="progress-labels">
                      <span>Shelf Life Remaining</span>
                      <span class="percent-lbl">{{ Math.round(getExpiryTimeLeft(item).percent) }}%</span>
                    </div>
                    <div class="progress-track">
                      <div 
                        class="progress-fill" 
                        :class="getExpiryTimeLeft(item).class"
                        :style="{ width: `${getExpiryTimeLeft(item).percent}%` }"
                      ></div>
                    </div>
                  </div>

                  <!-- Card Footer Countdown / Order Button -->
                  <div class="card-footer-actions">
                    <div class="countdown-display" :class="getExpiryTimeLeft(item).class">
                      <span class="clock-icon">⏳</span>
                      <span class="countdown-value">{{ getExpiryTimeLeft(item).text }}</span>
                    </div>

                    <!-- Order button logic -->
                    <template v-if="getExpiryTimeLeft(item).text !== 'Expired'">
                      <!-- My own post -->
                      <span v-if="item.publisher === currentUser" class="action-badge mine-badge">
                        <i class="fas fa-kitchen-set"></i> Your Post
                      </span>
                      <!-- Claimed by someone else -->
                      <span v-else-if="item.buyer !== 'none' && item.buyer !== currentUser" class="action-badge claimed-badge">
                        Claimed by @{{ item.buyer }}
                      </span>
                      <!-- Ordered by current user -->
                      <span v-else-if="item.buyer === currentUser" class="action-badge requested-badge">
                        <i class="fas fa-circle-check"></i> Requested
                      </span>
                      <!-- Available to order -->
                      <button 
                        v-else
                        class="btn btn-accent btn-sm btn-order-claim" 
                        :disabled="isOrdering[item.id]"
                        @click="orderFoodItem(item)"
                      >
                        <i v-if="isOrdering[item.id]" class="fas fa-circle-notch fa-spin"></i>
                        <i v-else class="fas fa-cart-shopping"></i> Order Food
                      </button>
                    </template>
                  </div>
                </div>
              </div>
            </transition-group>
          </template>
        </div>
      </main>
    </div>

    <!-- Messages / Inbox Sliding Drawer -->
    <transition name="drawer">
      <div v-if="showInbox" class="inbox-drawer-backdrop" @click="showInbox = false">
        <div class="inbox-drawer glass-panel animate-fade-in" @click.stop>
          <div class="drawer-header">
            <h3><i class="fas fa-bell"></i> Messages & Requests</h3>
            <button class="btn-close" @click="showInbox = false">&times;</button>
          </div>
          
          <div class="drawer-body">
            <div v-if="messages.length === 0" class="empty-inbox">
              <i class="fas fa-envelope-open"></i>
              <p>Your inbox is clear! No messages yet.</p>
            </div>
            
            <div v-else class="messages-list">
              <div 
                v-for="msg in messages" 
                :key="msg.id" 
                class="message-item glass-panel"
                :class="{ 'unread': msg.status === 'unread' && msg.recipient === currentUser }"
              >
                <!-- Notification Card Info -->
                <div class="msg-header">
                  <span class="msg-tag" :class="msg.type">
                    {{ msg.type === 'order_request' ? 'Request' : 'Alert' }}
                  </span>
                  <span class="msg-time">{{ formatPostedTime(msg.time_sent) }}</span>
                </div>
                
                <div class="msg-content-wrapper">
                  <div class="msg-img-container">
                    <img :src="`http://localhost:3000/uploads/${msg.food_image}`" class="msg-food-thumb" alt="thumb" />
                  </div>
                  <div class="msg-text-details">
                    <p class="msg-text">
                      <strong>@{{ msg.sender }}</strong>: {{ msg.content }}
                    </p>
                  </div>
                </div>

                <!-- Two Dedicated action buttons for order requests -->
                <div 
                  v-if="msg.type === 'order_request' && msg.recipient === currentUser" 
                  class="msg-actions"
                >
                  <button 
                    class="btn-success-sm" 
                    :disabled="isResponding[msg.id]"
                    @click="respondToOrder(msg, 'yes')"
                  >
                    <i v-if="isResponding[msg.id]" class="fas fa-circle-notch fa-spin"></i>
                    <i v-else class="fas fa-check"></i> Yes
                  </button>
                  <button 
                    class="btn-danger-sm" 
                    :disabled="isResponding[msg.id]"
                    @click="respondToOrder(msg, 'no')"
                  >
                    <i v-if="isResponding[msg.id]" class="fas fa-circle-notch fa-spin"></i>
                    <i v-else class="fas fa-times"></i> No
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.dashboard-wrapper {
  padding: 24px;
  max-width: 1300px;
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

.nav-menu {
  display: flex;
  gap: 16px;
}

@media (max-width: 768px) {
  .nav-menu {
    display: none; /* Hide on mobile to prevent clutter */
  }
}

.nav-link-item {
  color: var(--text-muted);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.95rem;
  padding: 8px 14px;
  border-radius: 8px;
  transition: var(--transition-smooth);
  display: flex;
  align-items: center;
  gap: 6px;
}

.nav-link-item:hover {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.04);
}

.nav-link-item.active {
  color: var(--accent);
  background: rgba(6, 182, 212, 0.08);
  border: 1px solid rgba(6, 182, 212, 0.15);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-inbox {
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  padding: 0;
  display: flex;
  justify-content: center;
  align-items: center;
}

.unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  background: var(--danger);
  color: #fff;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  font-size: 0.7rem;
  font-weight: bold;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 2px solid var(--bg-dark);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  border: 1px solid var(--border-color);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.1rem;
}

.user-meta {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  font-size: 0.9rem;
}

.user-role {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.btn-logout {
  padding: 6px 12px;
  font-size: 0.85rem;
}

/* Layout */
.dashboard-layout {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  align-items: start;
}

@media (max-width: 900px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
  }
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* Location indicator */
.location-indicator-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 20px;
  cursor: pointer;
}

.location-indicator-card:hover {
  background: rgba(255,255,255,0.02);
}

.indicator-icon {
  width: 38px;
  height: 38px;
  border-radius: 8px;
  background: rgba(6, 182, 212, 0.08);
  border: 1px solid rgba(6, 182, 212, 0.15);
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.1rem;
  color: var(--accent);
}

.indicator-icon i.spinning {
  animation: spin 1.5s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.indicator-text h4 {
  font-size: 0.85rem;
  font-weight: 700;
}

.indicator-text p {
  font-size: 0.75rem;
  color: var(--text-muted);
  word-break: break-all;
}

/* Stats Card */
.stat-card {
  padding: 20px;
}

.stat-card h3 {
  font-size: 0.95rem;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.5px;
  margin-bottom: 16px;
  font-weight: 700;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.03);
  padding: 10px 2px;
  border-radius: 8px;
}

.stat-num {
  font-size: 1.25rem;
  font-weight: 800;
}

.stat-lbl {
  font-size: 0.65rem;
  color: var(--text-muted);
  margin-top: 4px;
}

.text-success { color: var(--success); }
.text-warning { color: var(--warning); }
.text-danger { color: #f87171; }

/* Upload Card / Scanner */
.upload-card {
  padding: 24px;
  text-align: center;
  position: relative;
  overflow: hidden;
  min-height: 280px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  border: 1px dashed var(--border-color);
}

.upload-card.dragging {
  border-color: var(--accent);
  background: rgba(6, 182, 212, 0.08);
}

.upload-card.uploading {
  border-style: solid;
}

.upload-header {
  margin-bottom: 16px;
}

.upload-header h3 {
  font-size: 1.1rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.upload-header p {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.scanner-selectors {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 10px 0;
}

.select-btn {
  font-size: 0.9rem;
  padding: 10px 16px;
}

.btn-camera {
  background: linear-gradient(135deg, var(--accent) 0%, #0891b2 100%);
  box-shadow: 0 4px 12px rgba(6, 182, 212, 0.25);
}

/* Live Cam Containers */
.camera-stream-container, .camera-preview-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
  width: 100%;
}

.camera-feed-wrapper {
  position: relative;
  width: 100%;
  height: 200px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-hover);
  background: #000;
}

.video-feed {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.scan-overlay-grid {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: 2px solid rgba(6, 182, 212, 0.4);
  background: radial-gradient(circle, transparent 60%, rgba(0,0,0,0.5) 100%);
  pointer-events: none;
}

.laser-scanner-line {
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
  animation: scanner 2.5s linear infinite;
  pointer-events: none;
}

.camera-loader {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(0,0,0,0.7);
}

.camera-actions {
  display: flex;
  justify-content: space-around;
  width: 100%;
  gap: 12px;
}

.btn-shutter {
  flex: 1;
}

.dropzone-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 0;
  transition: var(--transition-smooth);
  cursor: pointer;
}

.dropzone-content:hover .drop-icon {
  transform: scale(1.08);
  color: var(--accent);
}

.drop-icon {
  font-size: 3rem;
  color: var(--text-muted);
  transition: var(--transition-smooth);
}

.drop-text-primary {
  font-size: 0.95rem;
  font-weight: 600;
}

.drop-text-secondary {
  font-size: 0.75rem;
  color: var(--text-muted);
}

/* Scanner Overlay */
.scanning-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  width: 100%;
}

.scan-image-container {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid var(--border-hover);
}

.scan-preview {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.laser-scanner {
  position: absolute;
  left: 0;
  width: 100%;
  height: 2px;
  background: var(--accent);
  box-shadow: 0 0 12px var(--accent);
  animation: scanner 2s linear infinite;
}

.scan-status-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  gap: 8px;
}

.scanner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 1s infinite alternate;
}

.scanning-msg {
  font-size: 0.85rem;
  color: var(--accent);
  font-weight: 500;
}

.scanning-bar {
  width: 80%;
  height: 4px;
  background: rgba(255,255,255,0.05);
  border-radius: 2px;
  overflow: hidden;
}

.scanning-bar-fill {
  height: 100%;
  background: var(--accent);
  width: 100%;
  animation: fillProgress 1.3s linear infinite;
}

/* Success upload state */
.scan-success-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 0;
  animation: fadeIn 0.4s ease-out;
}

.success-tick {
  font-size: 2.5rem;
  color: var(--success);
}

.scan-success-overlay h4 {
  color: var(--success);
  font-size: 1rem;
}

.success-msg {
  font-size: 0.9rem;
  font-weight: 600;
}

.upload-error-banner {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #fca5a5;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  margin-top: 12px;
  width: 100%;
}

/* Main Content Controls */
.controls-card {
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

@media (max-width: 768px) {
  .controls-card {
    flex-direction: column;
    align-items: stretch;
  }
}

.search-box {
  position: relative;
  flex: 1;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted);
}

.search-box input {
  padding-left: 44px;
}

.filter-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

@media (max-width: 768px) {
  .filter-actions {
    justify-content: space-between;
  }
}

.select-wrapper select {
  padding: 10px 36px 10px 16px;
  background: var(--bg-input);
  font-size: 0.9rem;
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  font-size: 0.9rem;
}

.checkbox-wrapper input {
  width: 16px;
  height: 16px;
}

.layout-toggle-group {
  display: flex;
  gap: 4px;
  background: rgba(255,255,255,0.04);
  padding: 4px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.btn-toggle-layout {
  border: none;
  background: none;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  color: var(--text-muted);
  transition: var(--transition-smooth);
}

.btn-toggle-layout:hover {
  background: rgba(255,255,255,0.05);
  color: var(--text-main);
}

.btn-toggle-layout.active {
  background: rgba(255,255,255,0.12);
  color: var(--accent);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

/* Gallery View states */
.loader-container, .empty-container, .error-container {
  padding: 60px 40px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.loader-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255,255,255,0.1);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.empty-icon { font-size: 4rem; color: var(--text-muted); }
.error-icon { font-size: 3rem; }

.empty-container h3 {
  font-size: 1.4rem;
  font-weight: 700;
}

.empty-container p, .error-container p {
  color: var(--text-muted);
  max-width: 400px;
}

/* Grid & List Layouts */
.food-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

.food-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Card Styling */
.food-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  background: rgba(15, 23, 42, 0.45);
}

.food-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.3);
}

.card-image-wrapper {
  position: relative;
  height: 160px;
  background: rgba(15, 23, 42, 0.8);
  overflow: hidden;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.5s ease;
}

.food-card:hover .card-image {
  transform: scale(1.05);
}

.card-image-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.8) 0%, rgba(17, 24, 39, 0.8) 100%);
}

.fallback-emoji {
  font-size: 4.5rem;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.4));
  animation: float 4s ease-in-out infinite;
}

.floating-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 0.7rem;
  font-weight: 800;
  padding: 4px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.25);
  backdrop-filter: blur(4px);
}

.food-card.fresh { border-color: rgba(16, 185, 129, 0.35); }
.food-card.warning { border-color: rgba(245, 158, 11, 0.35); }
.food-card.critical { border-color: rgba(239, 68, 68, 0.35); }

.floating-badge.fresh { background: rgba(16, 185, 129, 0.85); color: #fff; }
.floating-badge.warning { background: rgba(245, 158, 11, 0.85); color: #fff; }
.floating-badge.critical { background: rgba(239, 68, 68, 0.85); color: #fff; }

.card-info {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.food-name {
  font-size: 1.15rem;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.food-id {
  font-size: 0.8rem;
  color: var(--text-muted);
  font-weight: bold;
}

.card-meta {
  display: flex;
  gap: 12px;
  font-size: 0.8rem;
  color: var(--text-muted);
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.location-meta-row {
  font-size: 0.8rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.02);
  padding: 6px 10px;
  border-radius: 6px;
}

.expiry-progress-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-muted);
}

.progress-track {
  height: 6px;
  background: rgba(255,255,255,0.06);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 1s linear;
}

.progress-fill.fresh { background: linear-gradient(90deg, #10b981, #34d399); }
.progress-fill.warning { background: linear-gradient(90deg, #f59e0b, #fbbf24); }
.progress-fill.critical { background: linear-gradient(90deg, #ef4444, #f87171); }

/* Card Action Footer */
.card-footer-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 8px;
  gap: 10px;
}

.countdown-display {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 700;
  flex: 1;
}

.countdown-display.fresh { background: rgba(16, 185, 129, 0.1); color: #a7f3d0; }
.countdown-display.warning { background: rgba(245, 158, 11, 0.1); color: #fde68a; }
.countdown-display.critical { background: rgba(239, 68, 68, 0.1); color: #fecaca; }

.btn-order-claim {
  padding: 8px 12px;
  font-size: 0.8rem;
  border-radius: 8px;
}

.action-badge {
  font-size: 0.8rem;
  padding: 6px 10px;
  border-radius: 8px;
  font-weight: 600;
}

.mine-badge {
  background: rgba(139, 92, 246, 0.12);
  border: 1px solid rgba(139, 92, 246, 0.25);
  color: #c084fc;
}

.claimed-badge {
  background: rgba(100, 116, 139, 0.12);
  border: 1px solid rgba(100, 116, 139, 0.25);
  color: #94a3b8;
}

.requested-badge {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: var(--success);
}

/* List View overrides */
.food-list .food-card {
  flex-direction: row;
  height: 120px;
}

.food-list .card-image-wrapper {
  width: 120px;
  height: 100%;
  flex-shrink: 0;
}

.food-list .card-info {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  gap: 16px;
}

.food-list .card-title-row {
  flex-direction: column;
  width: 160px;
  flex-shrink: 0;
}

.food-list .card-meta {
  flex-direction: column;
  gap: 4px;
  width: 120px;
}

.food-list .location-meta-row {
  width: 130px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.food-list .expiry-progress-section {
  flex: 1;
}

.food-list .card-footer-actions {
  width: 260px;
  margin-top: 0;
  padding-top: 0;
}

@media (max-width: 900px) {
  .food-list .food-card {
    flex-direction: column;
    height: auto;
  }
  .food-list .card-image-wrapper {
    width: 100%;
    height: 140px;
  }
  .food-list .card-info {
    flex-direction: column;
    align-items: stretch;
    padding: 16px;
    gap: 12px;
  }
  .food-list .card-title-row, .food-list .card-meta, .food-list .location-meta-row, .food-list .card-footer-actions {
    width: auto;
  }
}

/* Sliding Inbox Drawer */
.inbox-drawer-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.inbox-drawer {
  width: 100%;
  max-width: 420px;
  height: 100%;
  background: rgba(15, 23, 42, 0.95);
  box-shadow: -10px 0 30px rgba(0,0,0,0.5);
  border-left: 1px solid var(--border-color);
  border-radius: 0;
  display: flex;
  flex-direction: column;
  padding: 24px;
}

.drawer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 16px;
  margin-bottom: 20px;
}

.drawer-header h3 {
  font-size: 1.25rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 8px;
}

.drawer-header h3 i {
  color: var(--accent);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.8rem;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
  transition: var(--transition-smooth);
}

.btn-close:hover {
  color: var(--text-main);
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-right: 4px;
}

.empty-inbox {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  height: 200px;
  color: var(--text-muted);
}

.empty-inbox i {
  font-size: 3rem;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.message-item {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--border-color);
  background: rgba(255,255,255,0.02);
}

.message-item.unread {
  border-color: rgba(6, 182, 212, 0.3);
  background: rgba(6, 182, 212, 0.03);
}

.msg-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.75rem;
}

.msg-tag {
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 2px 6px;
  border-radius: 4px;
}

.msg-tag.order_request {
  background: rgba(6, 182, 212, 0.15);
  color: var(--accent);
}

.msg-tag.order_response {
  background: rgba(139, 92, 246, 0.15);
  color: #c084fc;
}

.msg-time {
  color: var(--text-muted);
}

.msg-content-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.msg-img-container {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  flex-shrink: 0;
  background: rgba(0,0,0,0.3);
}

.msg-food-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.msg-text-details {
  flex: 1;
}

.msg-text {
  font-size: 0.85rem;
  line-height: 1.4;
}

.msg-actions {
  display: flex;
  gap: 10px;
  margin-top: 4px;
}

.btn-success-sm {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid var(--success);
  color: #a7f3d0;
  padding: 6px 14px;
  font-size: 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  transition: var(--transition-smooth);
}

.btn-success-sm:hover {
  background: var(--success);
  color: #fff;
  box-shadow: 0 4px 10px rgba(16, 185, 129, 0.3);
}

.btn-danger-sm {
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid var(--danger);
  color: #fecaca;
  padding: 6px 14px;
  font-size: 0.8rem;
  border-radius: 6px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-weight: 700;
  transition: var(--transition-smooth);
}

.btn-danger-sm:hover {
  background: var(--danger);
  color: #fff;
  box-shadow: 0 4px 10px rgba(239, 68, 68, 0.3);
}

/* Transitions for Drawer */
.drawer-enter-active, .drawer-leave-active {
  transition: all 0.3s ease;
}
.drawer-enter-from, .drawer-leave-to {
  opacity: 0;
}
.drawer-enter-active .inbox-drawer, .drawer-leave-active .inbox-drawer {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.drawer-enter-from .inbox-drawer, .drawer-leave-to .inbox-drawer {
  transform: translateX(100%);
}

/* Fade list animations */
.list-fade-enter-active,
.list-fade-leave-active {
  transition: all 0.4s ease;
}

.list-fade-enter-from,
.list-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>