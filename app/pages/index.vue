<template>
  <div class="container">
    <h1 class="title">NAF Project - Toggle Demo</h1>
    <p class="subtitle">Sample page with an on/off toggle switch</p>
    
    <div class="toggle-section">
      <div class="toggle-container">
        <label class="toggle-label">
          <input 
            v-model="isToggled" 
            type="checkbox" 
            class="toggle-input"
          />
          <span class="toggle-slider"></span>
        </label>
        <span class="toggle-text">
          {{ isToggled ? 'ON' : 'OFF' }}
        </span>
      </div>
      
      <div class="status-display">
        <p class="status-text">
          Toggle is currently: 
          <strong :class="{ 'status-on': isToggled, 'status-off': !isToggled }">
            {{ isToggled ? 'ON' : 'OFF' }}
          </strong>
        </p>
      </div>
    </div>
    
    <div class="info-section">
      <h2>Features:</h2>
      <ul>
        <li>Responsive toggle switch</li>
        <li>Real-time status updates</li>
        <li>Smooth animations</li>
        <li>Modern design</li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
// Reactive state for toggle
const isToggled = ref(false)

// Watch for changes (optional - for debugging or side effects)
watch(isToggled, (newValue) => {
  console.log(`Toggle switched to: ${newValue ? 'ON' : 'OFF'}`)
})
</script>

<style scoped>
.container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.title {
  font-size: 2.5rem;
  font-weight: bold;
  color: #2d3748;
  text-align: center;
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1.2rem;
  color: #718096;
  text-align: center;
  margin-bottom: 3rem;
}

.toggle-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  margin-bottom: 3rem;
  padding: 2rem;
  background: #f7fafc;
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
}

.toggle-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.toggle-label {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
  cursor: pointer;
}

.toggle-input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  border-radius: 34px;
  transition: all 0.3s ease;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  border-radius: 50%;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.toggle-input:checked + .toggle-slider {
  background-color: #4caf50;
}

.toggle-input:focus + .toggle-slider {
  box-shadow: 0 0 1px #4caf50;
}

.toggle-input:checked + .toggle-slider:before {
  transform: translateX(26px);
}

.toggle-text {
  font-size: 1.2rem;
  font-weight: bold;
  color: #2d3748;
  min-width: 40px;
}

.status-display {
  text-align: center;
}

.status-text {
  font-size: 1.1rem;
  color: #4a5568;
}

.status-on {
  color: #48bb78;
}

.status-off {
  color: #f56565;
}

.info-section {
  background: white;
  padding: 2rem;
  border-radius: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.info-section h2 {
  color: #2d3748;
  margin-bottom: 1rem;
}

.info-section ul {
  color: #4a5568;
  padding-left: 1.5rem;
}

.info-section li {
  margin-bottom: 0.5rem;
}

/* Responsive design */
@media (max-width: 768px) {
  .container {
    padding: 1rem;
  }
  
  .title {
    font-size: 2rem;
  }
  
  .toggle-section {
    padding: 1.5rem;
  }
}
</style>