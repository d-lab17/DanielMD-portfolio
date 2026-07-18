// Every possible appearance a variant tab can show. Most apps expose the
// standard six; some expose a different subset (see APPS below) via a
// `variants` field, whose first entry is treated as that app's default.
const VARIANT_DEFS = {
  Default: { label: "Default", suffix: "iOS-Default-1024@1x" },
  Dark: { label: "Dark", suffix: "iOS-Dark-1024@1x" },
  TintedLight: { label: "Tinted Light", suffix: "iOS-TintedLight-1024@1x" },
  TintedDark: { label: "Tinted Dark", suffix: "iOS-TintedDark-1024@1x" },
  ClearLight: { label: "Clear Light", suffix: "iOS-ClearLight-1024@1x" },
  ClearDark: { label: "Clear Dark", suffix: "iOS-ClearDark-1024@1x" },
  WatchOS: { label: "watchOS", suffix: "watchOS-Default-1088@1x" },
};

const DEFAULT_VARIANT_KEYS = ["Default", "Dark", "TintedLight", "TintedDark", "ClearLight", "ClearDark"];

const APPS = [
  { id: "Lumina", name: "Lumina" },
  // Redesigned as a dark-mode-only app: no Default/Tinted (light) variants,
  // just Dark and the two Clear appearances. Dark is shown first, so it's
  // also the shelf thumbnail.
  { id: "Marrow", name: "Marrow", variants: ["Dark", "ClearLight", "ClearDark"] },
  { id: "MarrowChat", name: "MarrowChat" },
  { id: "NodePad", name: "NodePad" },
  { id: "autoWall", name: "autoWall" },
  { id: "AutoClicker", name: "AutoClicker" },
  { id: "YoutubeDownloader", name: "YT Downloader" },
];

const ICONS_PER_SHELF = 4;

function iconPath(appId, variantKey) {
  return `assets/icons/${appId}/AppIcon-${VARIANT_DEFS[variantKey].suffix}.png`;
}

function appVariantKeys(app) {
  return app.variants || DEFAULT_VARIANT_KEYS;
}

function defaultIconPath(app) {
  return iconPath(app.id, appVariantKeys(app)[0]);
}

// --- Build the shelf scene ---
const shelfScene = document.getElementById("shelfScene");
const shelves = [];
for (let i = 0; i < APPS.length; i += ICONS_PER_SHELF) {
  shelves.push(APPS.slice(i, i + ICONS_PER_SHELF));
}

shelves.forEach((appsOnShelf) => {
  const row = document.createElement("div");
  row.className = "shelf-row";
  appsOnShelf.forEach((app) => {
    const icon = document.createElement("button");
    icon.className = "shelf-icon";
    icon.innerHTML = `
      <img src="${defaultIconPath(app)}" alt="${app.name} icon">
      <span>${app.name}</span>
    `;
    icon.addEventListener("click", () => openModal(app));
    row.appendChild(icon);
  });
  shelfScene.appendChild(row);
});

// --- Hero icon collage: purely decorative, fills the side margins ---
const heroDeco = document.getElementById("heroDeco");
const HERO_DECO = [
  // Left column
  { id: "Lumina", top: "8%", left: "9%", size: 88, rot: -14, delay: 0, duration: 6.5 },
  { id: "Marrow", top: "24%", left: "22%", size: 60, rot: 12, delay: 1.2, duration: 7.5 },
  { id: "MarrowChat", top: "42%", left: "6%", size: 104, rot: -8, delay: 0.6, duration: 8 },
  { id: "NodePad", top: "60%", left: "19%", size: 68, rot: 18, delay: 2, duration: 6.8 },
  { id: "autoWall", top: "76%", left: "9%", size: 96, rot: -10, delay: 0.9, duration: 7.2 },
  { id: "Lumina", top: "92%", left: "23%", size: 56, rot: 20, delay: 1.6, duration: 6.9 },
  // Right column
  { id: "AutoClicker", top: "9%", left: "91%", size: 92, rot: 14, delay: 0.4, duration: 7.4 },
  { id: "YoutubeDownloader", top: "26%", left: "79%", size: 64, rot: -16, delay: 1.8, duration: 6.6 },
  { id: "MarrowChat", top: "45%", left: "94%", size: 78, rot: 10, delay: 0.2, duration: 7.9 },
  { id: "NodePad", top: "63%", left: "81%", size: 102, rot: -12, delay: 1.1, duration: 7 },
  { id: "Marrow", top: "80%", left: "92%", size: 58, rot: 16, delay: 2.2, duration: 6.4 },
  { id: "autoWall", top: "93%", left: "78%", size: 72, rot: -6, delay: 0.7, duration: 7.6 },
];

const appsById = Object.fromEntries(APPS.map((app) => [app.id, app]));

HERO_DECO.forEach((d) => {
  const img = document.createElement("img");
  img.src = defaultIconPath(appsById[d.id] || { id: d.id });
  img.alt = "";
  img.style.top = d.top;
  img.style.left = d.left;
  img.style.width = `${d.size}px`;
  img.style.height = `${d.size}px`;
  // Center on the top/left point via margin, since the bob animation
  // owns the `transform` property (translateY + rotate) once it starts.
  img.style.marginTop = `${-d.size / 2}px`;
  img.style.marginLeft = `${-d.size / 2}px`;
  img.style.setProperty("--rot", `${d.rot}deg`);
  img.style.setProperty("--delay", `${d.delay}s`);
  img.style.setProperty("--duration", `${d.duration}s`);
  heroDeco.appendChild(img);
});

// --- Scroll-driven push through the phone screen into the shelf scene ---
// The lock screen and shelf scene are stacked inside the same .screen element.
// The whole rig scales up as you scroll; past a certain scale the screen's
// bezel and rounded corners are pushed outside the viewport, so it reads as
// flying through the glass rather than a cross-fade between two flat layers.
const zoomScene = document.getElementById("zoomScene");
const phoneRig = document.getElementById("phoneRig");
const screenEl = document.getElementById("screen");
const lockContent = document.getElementById("lockContent");
const shelfContent = document.getElementById("shelfContent");

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

let maxScale = 6;

function measureMaxScale() {
  const prevTransform = phoneRig.style.transform;
  phoneRig.style.transform = "none";
  const rect = screenEl.getBoundingClientRect();
  phoneRig.style.transform = prevTransform;
  if (rect.width > 0 && rect.height > 0) {
    // Big enough that the screen's rounded corners are pushed off-frame
    // in both dimensions, on any viewport shape (phone or desktop).
    maxScale = Math.max(window.innerWidth / rect.width, window.innerHeight / rect.height) * 1.2;
  }
}

let ticking = false;
let lastProgress = 0;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// Two beats, one motion at a time: (1) zoom through the screen until the
// bezel is fully off-frame, with a touch of motion blur during the fastest
// part of the push; (2) only once that's settled does the shelf reveal.
const BEAT1_END = 0.5;

function applyProgress(p) {
  lastProgress = p;
  const rigScale = 1 + (maxScale - 1) * smoothstep(0, BEAT1_END, p);
  const blurP = clamp(p / BEAT1_END, 0, 1);
  const blur = 10 * Math.sin(Math.PI * blurP);
  phoneRig.style.transform = `scale(${rigScale})`;
  phoneRig.style.filter = blur > 0.1 ? `blur(${blur.toFixed(1)}px)` : "none";

  lockContent.style.opacity = 1 - smoothstep(0, 0.3, p);
  lockContent.style.pointerEvents = p > 0.15 ? "none" : "auto";

  shelfContent.style.opacity = smoothstep(BEAT1_END, 0.75, p);
  shelfContent.style.pointerEvents = p > 0.65 ? "auto" : "none";

  // shelf-content sits inside the same rig that's scaling up, so left alone
  // its icons would balloon (and blur) right along with the phone. Counter-
  // scale it so the icons only grow gently as you approach, instead of
  // scaling 1:1 with the phone and turning into a blurry close-up.
  const netShelfScale = 1 + 0.15 * smoothstep(BEAT1_END, 1, p);
  shelfContent.style.transform = `scale(${netShelfScale / rigScale})`;
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    const rect = zoomScene.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    const progress = total > 0 ? clamp(-rect.top / total, 0, 1) : 0;
    applyProgress(progress);
    ticking = false;
  });
}

measureMaxScale();

if (prefersReducedMotion) {
  // Skip the scroll-jacked zoom entirely: land directly on the settled
  // shelf view, no animation, no extra scroll distance required.
  zoomScene.classList.add("reduced-motion");
  applyProgress(1);
} else {
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    measureMaxScale();
    onScroll();
  });
  onScroll();

  // Subtle mouse-parallax on the shelf once it's settled in view — a small
  // drift and tilt opposite the cursor, like glancing around the room.
  let targetTiltX = 0, targetTiltY = 0, targetPanX = 0, targetPanY = 0;
  let currentTiltX = 0, currentTiltY = 0, currentPanX = 0, currentPanY = 0;

  window.addEventListener("mousemove", (e) => {
    if (lastProgress < BEAT1_END) return;
    const nx = (e.clientX / window.innerWidth - 0.5) * 2;
    const ny = (e.clientY / window.innerHeight - 0.5) * 2;
    targetTiltY = nx * 4;
    targetTiltX = -ny * 3;
    targetPanX = nx * 10;
    targetPanY = ny * 6;
  });

  function animateParallax() {
    currentTiltX += (targetTiltX - currentTiltX) * 0.06;
    currentTiltY += (targetTiltY - currentTiltY) * 0.06;
    currentPanX += (targetPanX - currentPanX) * 0.06;
    currentPanY += (targetPanY - currentPanY) * 0.06;
    const active = lastProgress >= BEAT1_END ? 1 : 0;
    shelfScene.style.transform =
      `translate(${(currentPanX * active).toFixed(2)}px, ${(currentPanY * active).toFixed(2)}px) ` +
      `rotateX(${(currentTiltX * active).toFixed(2)}deg) rotateY(${(currentTiltY * active).toFixed(2)}deg)`;
    requestAnimationFrame(animateParallax);
  }
  animateParallax();
}

// --- Modal ---
const modal = document.getElementById("modal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalClose = document.getElementById("modalClose");
const modalImage = document.getElementById("modalImage");
const modalTitle = document.getElementById("modalTitle");
const variantTabs = document.getElementById("variantTabs");

function openModal(app) {
  modalTitle.textContent = app.name;
  variantTabs.innerHTML = "";

  const keys = appVariantKeys(app);
  keys.forEach((key, i) => {
    const tab = document.createElement("button");
    tab.className = "variant-tab" + (i === 0 ? " active" : "");
    tab.textContent = VARIANT_DEFS[key].label;
    tab.addEventListener("click", () => {
      modalImage.style.opacity = 0;
      setTimeout(() => {
        modalImage.src = iconPath(app.id, key);
        modalImage.style.opacity = 1;
      }, 100);
      variantTabs.querySelectorAll(".variant-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
    });
    variantTabs.appendChild(tab);
  });

  modalImage.src = iconPath(app.id, keys[0]);
  modalImage.alt = `${app.name} — ${VARIANT_DEFS[keys[0]].label}`;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
}

modalBackdrop.addEventListener("click", closeModal);
modalClose.addEventListener("click", closeModal);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

// --- Easter egg: the Konami code unlocks a secret icon on the shelf ---
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
let konamiIndex = 0;
let konamiUnlocked = false;

const SECRET_APP = {
  id: "TeamFortress2",
  name: "Team Fortress 2",
  variants: [...DEFAULT_VARIANT_KEYS, "WatchOS"],
};

function unlockSecretIcon() {
  if (konamiUnlocked) return;
  konamiUnlocked = true;

  const row = document.createElement("div");
  row.className = "shelf-row";
  const icon = document.createElement("button");
  icon.className = "shelf-icon secret-icon";
  icon.innerHTML = `
    <img src="${defaultIconPath(SECRET_APP)}" alt="${SECRET_APP.name} icon">
    <span>${SECRET_APP.name}</span>
  `;
  icon.addEventListener("click", () => openModal(SECRET_APP));
  row.appendChild(icon);
  shelfScene.appendChild(row);

  const toast = document.createElement("div");
  toast.className = "egg-toast";
  toast.textContent = "🥚 Secret icon unlocked";
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 2600);
}

document.addEventListener("keydown", (e) => {
  const expected = KONAMI[konamiIndex];
  const matches = e.key === expected || e.key.toLowerCase() === expected;
  konamiIndex = matches ? konamiIndex + 1 : 0;
  if (konamiIndex === KONAMI.length) {
    konamiIndex = 0;
    unlockSecretIcon();
  }
});

// Touch devices don't have a keyboard for the Konami code, so give them a
// question instead — same unlock, different door.
const mobileSecretToggle = document.getElementById("mobileSecretToggle");
const mobileSecretForm = document.getElementById("mobileSecretForm");
const mobileSecretInput = document.getElementById("mobileSecretInput");
const SECRET_ANSWER = 4019.6;

mobileSecretToggle.addEventListener("click", () => {
  mobileSecretForm.hidden = false;
  mobileSecretToggle.hidden = true;
  mobileSecretInput.focus();
});

mobileSecretForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const value = parseFloat(mobileSecretInput.value.replace(/,/g, ""));
  if (Math.abs(value - SECRET_ANSWER) < 0.05) {
    unlockSecretIcon();
    mobileSecretForm.hidden = true;
  } else {
    mobileSecretForm.classList.remove("wrong");
    void mobileSecretForm.offsetWidth;
    mobileSecretForm.classList.add("wrong");
  }
});
