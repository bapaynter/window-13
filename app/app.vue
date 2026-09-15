<script setup lang="ts">
const DEPARTMENT_NAME = 'Department of Soul Registry'

const navigationLinks = [
  { label: 'Home', path: '/' },
  { label: 'Wish Intake', path: '/wish' },
  { label: 'Contract', path: '/contract' },
  { label: 'Filings', path: '/filings' },
  { label: 'Regulations', path: '/regulations' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Contact', path: '/contact' }
]

const isCookieNoticeVisible = ref(false)

onMounted((): void => {
  isCookieNoticeVisible.value = localStorage.getItem('soul-registry-cookies') !== 'accepted'
})

function acceptInfernalCookies(): void {
  localStorage.setItem('soul-registry-cookies', 'accepted')
  isCookieNoticeVisible.value = false
}
</script>

<template>
  <div class="site-frame">
    <header class="site-header">
      <div class="seal" aria-hidden="true">🔥</div>
      <div>
        <h1 class="site-title">{{ DEPARTMENT_NAME }}</h1>
        <div class="site-tagline">Eternity, processed in the order received.</div>
      </div>
    </header>

    <nav class="site-nav">
      <NuxtLink v-for="link in navigationLinks" :key="link.path" :to="link.path">
        {{ link.label }}
      </NuxtLink>
    </nav>

    <div class="ticker-bar" role="status" aria-live="off">
      <span class="ticker-track">
        NOW SERVING: A-113 &nbsp;•&nbsp; WISH INTAKE WAIT TIME: ONE ETERNITY &nbsp;•&nbsp; ALL SALES FINAL &nbsp;•&nbsp;
        THIS OFFICE IS CLOSED ON HOLY DAYS &nbsp;•&nbsp; PLEASE HAVE YOUR SOUL READY FOR INSPECTION &nbsp;•&nbsp; NOW
        SERVING: A-113
      </span>
    </div>

    <div class="session-warning">
      Your session will expire in 30 seconds. &nbsp;
      <a class="dead-link" href="#" @click.prevent>Renew session</a>
    </div>

    <main class="layout">
      <aside class="sidebar">
        <h3>Forms</h3>
        <ul>
          <li><NuxtLink to="/wish">Form 666-A — Wish Intake</NuxtLink></li>
          <li><NuxtLink to="/contract">Form 666-D — Contract</NuxtLink></li>
          <li><a class="dead-link" href="#" @click.prevent>Form 666-TOS — Terms</a></li>
          <li><a class="dead-link" href="#" @click.prevent>Form 999 — Appeal (denied)</a></li>
        </ul>
        <h3>Notices</h3>
        <ul>
          <li><a class="dead-link" href="#" @click.prevent>Fee Schedule</a></li>
          <li><a class="dead-link" href="#" @click.prevent>Office Closures</a></li>
          <li><a class="dead-link" href="#" @click.prevent>Careers</a></li>
        </ul>
        <p class="small-print">
          This site is best viewed at 800×600 in a climate of mild dread.
        </p>
      </aside>

      <section class="content">
        <NuxtPage />
      </section>
    </main>

    <footer class="footer">
      <p>
        {{ DEPARTMENT_NAME }} — an equal-opportunity collector. All contracts are final and non-transferable.
      </p>
      <p>
        <span class="mono">Page 1 of 666</span> &nbsp;|&nbsp; Last updated 1998 &nbsp;|&nbsp;
        <NuxtLink to="/regulations">Statutes</NuxtLink> &nbsp;|&nbsp;
        <NuxtLink to="/faq">Help</NuxtLink>
      </p>
    </footer>

    <div v-if="isCookieNoticeVisible" class="cookie-banner">
      <span>This site uses infernal cookies to remember your soul across visits.</span>
      <button class="gov-button" type="button" @click="acceptInfernalCookies">Accept All</button>
    </div>
  </div>
</template>
