<template>
  <div id="app">
    <!-- Global Navigation Bar -->
    <header class="top-nav">
      <div class="logo">NAF Data Portal</div>

      <nav class="nav-bar">
        <router-link
          to="/system-control"
          class="nav-item"
          active-class="active-tab"
        >
          System Control
        </router-link>

        <router-link
          to="/database-viewer"
          class="nav-item"
          active-class="active-tab"
        >
          Database Viewer
        </router-link>
      </nav>
    </header>

    <!-- Routed Pages -->
    <main class="content">
      <router-view />
    </main>
  </div>
</template>

<style>
/* -------- GLOBAL LAYOUT -------- */

#app {
  font-family: "Inter", "Segoe UI", sans-serif;
  color: #1a1a1a;
  background: #f8fafb;
}

/* -------- TOP NAVBAR -------- */

.top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 50px;
  border-bottom: 1px solid #e6e6e6;
  background: white;
}

.logo {
  font-size: 22px;
  font-weight: 700;
  color: #00703c; /* NAF green */
}

/* -------- NAV LINKS -------- */

.nav-bar {
  display: flex;
  gap: 35px;
}

.nav-item {
  font-size: 18px;
  text-decoration: none;
  font-weight: 500;
  color: #555;
  padding-bottom: 5px;
  transition: 0.25s;
}

.nav-item:hover {
  color: #00703c;
}

/* Highlight for the active tab */
.active-tab {
  color: #00703c;
  border-bottom: 3px solid #00703c;
}

/* -------- MAIN CONTENT -------- */

.content {
  padding: 40px 50px;
}
</style>
