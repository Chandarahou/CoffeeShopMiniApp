<template>
  <div class="live-bg" aria-hidden="true">
    <div class="grid" />
    <div class="sweep" />
    <div class="rings" />
  </div>
</template>

<style scoped>
.live-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(900px 520px at 85% -10%, rgb(239 168 35 / 0.14), transparent 60%),
    radial-gradient(800px 480px at -10% 110%, rgb(81 124 56 / 0.14), transparent 60%),
    var(--color-cream);
}

/* Drifting grid, faded out toward the edges */
.grid {
  position: absolute;
  inset: -50%;
  background-image:
    linear-gradient(rgb(81 124 56 / 0.12) 1px, transparent 1px),
    linear-gradient(90deg, rgb(81 124 56 / 0.12) 1px, transparent 1px);
  background-size: 46px 46px;
  animation: pan 26s linear infinite;
  mask-image: radial-gradient(circle at 50% 44%, #000, transparent 60%);
}

/* Slow rotating beam of honey light */
.sweep {
  position: absolute;
  left: 50%;
  top: 44%;
  width: 150vmax;
  height: 150vmax;
  transform: translate(-50%, -50%);
  background: conic-gradient(from 0deg, transparent 0deg, rgb(239 168 35 / 0.16) 16deg, transparent 44deg);
  animation: sweep 9s linear infinite;
}

/* Expanding rings, like a ping from the login card */
.rings,
.rings::before,
.rings::after {
  position: absolute;
  left: 50%;
  top: 44%;
  width: 120px;
  height: 120px;
  margin: -60px 0 0 -60px;
  border: 1px solid rgb(239 168 35 / 0.6);
  border-radius: 50%;
  animation: ping 4.2s ease-out infinite;
}
.rings::before,
.rings::after {
  content: '';
}
.rings::before {
  animation-delay: 1.4s;
  border-color: rgb(81 124 56 / 0.55);
}
.rings::after {
  animation-delay: 2.8s;
}

/* Soft vignette so the card stands out */
.live-bg::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(120% 90% at 50% 40%, transparent 40%, rgb(81 124 56 / 0.12) 100%);
}

@keyframes pan {
  to {
    transform: translate(46px, 46px);
  }
}
@keyframes sweep {
  to {
    transform: translate(-50%, -50%) rotate(360deg);
  }
}
@keyframes ping {
  0% {
    transform: scale(0.35);
    opacity: 0;
  }
  12% {
    opacity: 0.85;
  }
  100% {
    transform: scale(6.5);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .grid,
  .sweep,
  .rings,
  .rings::before,
  .rings::after {
    animation: none;
  }
}
</style>
