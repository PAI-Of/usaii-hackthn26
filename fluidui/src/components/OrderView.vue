<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();
const orders = ref([]);
const filledStomachsCount = ref(0);
const isLoading = ref(true);
const errorMsg = ref('');

onMounted(async () => {
  await fetchMyOrders();
});

async function fetchMyOrders() {
  isLoading.value = true;
  errorMsg.value = '';
  try {
    const res = await axios.get('http://localhost:3000/orders/my?format=object', {
      withCredentials: true
    });
    if (res.data) {
      orders.value = res.data.orders || [];
      filledStomachsCount.value = res.data.filled_stomachs_count || 0;
    }
  } catch (err) {
    if (err.response && err.response.status === 401) {
      router.push('/auth');
    } else {
      errorMsg.value = 'Failed to load order history: ' + (err.response?.data?.error || err.message);
    }
  } finally {
    isLoading.value = false;
  }
}

function formatUnixTime(seconds) {
  if (!seconds) return '';
  const date = new Date(seconds * 1000);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>

<template>
  <div class="orders-container animate-fade-in">
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

    <div class="orders-content">
      <!-- Stats Highlights -->
      <section class="stats-overview glass-panel">
        <div class="stat-highlight">
          <div class="stat-icon-wrapper pulse-emerald">
            <i class="fas fa-hand-holding-heart"></i>
          </div>
          <div class="stat-text">
            <h2>{{ filledStomachsCount }}</h2>
            <p>Stomachs Filled Globally</p>
          </div>
        </div>
        <div class="stat-divider"></div>
        <div class="stat-highlight">
          <div class="stat-icon-wrapper pulse-blue">
            <i class="fas fa-cart-shopping"></i>
          </div>
          <div class="stat-text">
            <h2>{{ orders.length }}</h2>
            <p>My Total Orders</p>
          </div>
        </div>
      </section>

      <!-- Orders Main Section -->
      <main class="orders-main">
        <h2 class="section-title"><i class="fas fa-history"></i> My Order Requests</h2>

        <!-- Loader -->
        <div v-if="isLoading" class="loader-container glass-panel">
          <div class="loader-spinner"></div>
          <p>Retrieving your order ledger...</p>
        </div>

        <!-- Error Panel -->
        <div v-else-if="errorMsg" class="error-container glass-panel">
          <span class="error-icon"><i class="fas fa-triangle-exclamation"></i></span>
          <p>{{ errorMsg }}</p>
          <button class="btn btn-secondary btn-sm" @click="fetchMyOrders">Retry</button>
        </div>

        <!-- Empty State -->
        <div v-else-if="orders.length === 0" class="empty-container glass-panel">
          <div class="empty-icon"><i class="fas fa-plate-wheat"></i></div>
          <h3>No Orders Placed Yet</h3>
          <p>You haven't requested any food items from the kitchen yet. Browse active listings on the dashboard!</p>
          <button class="btn btn-primary" @click="router.push('/home')">
            <i class="fas fa-pizza-slice"></i> Browse Food
          </button>
        </div>

        <!-- Orders Grid -->
        <div v-else class="orders-grid">
          <div 
            v-for="order in orders" 
            :key="order.id" 
            class="order-card glass-panel"
            :class="order.status"
          >
            <!-- Card Image -->
            <div class="order-image-wrapper">
              <img 
                :src="`http://localhost:3000/uploads/${order.food_image}`" 
                class="order-image" 
                alt="Food Ordered" 
              />
              <span class="status-badge" :class="order.status">
                {{ order.status }}
              </span>
            </div>

            <!-- Card Info -->
            <div class="order-info">
              <div class="order-header-row">
                <h3>{{ order.food_name }}</h3>
                <span class="order-id">ID: #{{ order.id }}</span>
              </div>

              <div class="order-meta">
                <div class="meta-row">
                  <span class="lbl"><i class="fas fa-user-circle"></i> Cook:</span>
                  <span class="val">@{{ order.publisher }}</span>
                </div>
                <div class="meta-row">
                  <span class="lbl"><i class="fas fa-user"></i> Claimer:</span>
                  <span class="val">@{{ order.buyer }} (You)</span>
                </div>
                <div class="meta-row">
                  <span class="lbl"><i class="far fa-clock"></i> Date:</span>
                  <span class="val">{{ formatUnixTime(order.time_ordered) }}</span>
                </div>
              </div>

              <!-- Extra Design Element based on status -->
              <div class="status-footer-bar" :class="order.status">
                <span v-if="order.status === 'pending'">
                  <i class="fas fa-circle-notch fa-spin"></i> Awaiting chef availability confirmation
                </span>
                <span v-else-if="order.status === 'accepted'">
                  <i class="fas fa-circle-check"></i> Request approved! Enjoy your meal!
                </span>
                <span v-else>
                  <i class="fas fa-circle-xmark"></i> Sorry, this item is no longer available
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped>
.orders-container {
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

.orders-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Stats Overview */
.stats-overview {
  display: flex;
  justify-content: space-around;
  align-items: center;
  padding: 24px;
  text-align: center;
}

@media (max-width: 600px) {
  .stats-overview {
    flex-direction: column;
    gap: 20px;
  }
  .stat-divider {
    display: none;
  }
}

.stat-highlight {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon-wrapper {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 1.5rem;
  background: rgba(255,255,255,0.05);
}

.pulse-emerald {
  color: var(--success);
  border: 1px solid rgba(16, 185, 129, 0.3);
  box-shadow: 0 0 15px rgba(16, 185, 129, 0.1);
  animation: pulse-emerald-anim 2s infinite;
}

.pulse-blue {
  color: var(--accent);
  border: 1px solid rgba(6, 182, 212, 0.3);
  box-shadow: 0 0 15px rgba(6, 182, 212, 0.1);
}

@keyframes pulse-emerald-anim {
  0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
  70% { box-shadow: 0 0 0 12px rgba(16, 185, 129, 0); }
  100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
}

.stat-text h2 {
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1;
}

.stat-text p {
  font-size: 0.85rem;
  color: var(--text-muted);
  margin-top: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-divider {
  width: 1px;
  height: 50px;
  background: var(--border-color);
}

/* Section Main */
.orders-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-title {
  font-size: 1.5rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 10px;
}

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

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 4rem;
  color: var(--text-muted);
}

.error-icon {
  font-size: 3rem;
  color: var(--danger);
}

/* Orders Grid */
.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.order-card {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border-color);
  background: rgba(15, 23, 42, 0.45);
}

.order-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.3);
}

.order-image-wrapper {
  position: relative;
  height: 160px;
  background: rgba(15, 23, 42, 0.8);
}

.order-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 0.75rem;
  font-weight: 800;
  padding: 4px 10px;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.3);
  backdrop-filter: blur(4px);
}

.status-badge.pending {
  background: rgba(245, 158, 11, 0.85);
  color: #fff;
  border: 1px solid rgba(245, 158, 11, 0.3);
}

.status-badge.accepted {
  background: rgba(16, 185, 129, 0.85);
  color: #fff;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.status-badge.rejected {
  background: rgba(239, 68, 68, 0.85);
  color: #fff;
  border: 1px solid rgba(239, 68, 68, 0.3);
}

/* Card Glows based on status */
.order-card.pending { border-color: rgba(245, 158, 11, 0.25); }
.order-card.accepted { border-color: rgba(16, 185, 129, 0.25); }
.order-card.rejected { border-color: rgba(239, 68, 68, 0.25); }

/* Info Section */
.order-info {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-header-row h3 {
  font-size: 1.15rem;
  font-weight: 700;
}

.order-id {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: bold;
}

.order-meta {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(255,255,255,0.02);
  padding: 10px;
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.03);
}

.meta-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.meta-row .lbl {
  color: var(--text-muted);
}

.meta-row .val {
  font-weight: 600;
}

.status-footer-bar {
  font-size: 0.8rem;
  padding: 8px 10px;
  border-radius: 6px;
  font-weight: 500;
}

.status-footer-bar.pending {
  background: rgba(245, 158, 11, 0.08);
  color: #fde68a;
}

.status-footer-bar.accepted {
  background: rgba(16, 185, 129, 0.08);
  color: #a7f3d0;
}

.status-footer-bar.rejected {
  background: rgba(239, 68, 68, 0.08);
  color: #fecaca;
}
</style>
