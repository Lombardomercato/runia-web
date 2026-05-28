document.documentElement.classList.add("js");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const header = document.querySelector(".header");
const sections = document.querySelectorAll("main section");

const updateHeader = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 20);
};

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const cardSwap = document.querySelector(".runia-card-swap");
const swapCards = cardSwap ? Array.from(cardSwap.querySelectorAll(".runia-swap-card")) : [];
const isCompactCardStack = window.matchMedia("(max-width: 520px)").matches;
const swapConfig = {
  cardDistance: isCompactCardStack ? 24 : 40,
  verticalDistance: isCompactCardStack ? 28 : 42,
  delay: 3400,
  skewAmount: 2.5,
  dropDistance: isCompactCardStack ? 240 : 340,
  dropDuration: 820,
  moveDelay: 260,
  returnDelay: 460
};

const makeSwapSlot = (index, total) => ({
  x: index * swapConfig.cardDistance,
  y: -index * swapConfig.verticalDistance,
  z: -index * swapConfig.cardDistance * 1.5,
  zIndex: total - index
});

const placeSwapCard = (card, slot, opacity = 1) => {
  card.style.zIndex = String(slot.zIndex);
  card.style.opacity = String(opacity);
  card.style.filter = `saturate(${Math.max(0.84, 1 - (swapCards.length - slot.zIndex) * 0.035)}) brightness(${Math.max(0.88, 1 - (swapCards.length - slot.zIndex) * 0.025)})`;
  card.style.transform = `translate(-50%, -50%) translate3d(${slot.x}px, ${slot.y}px, ${slot.z}px) skewY(${swapConfig.skewAmount}deg)`;
};

const renderSwapCards = () => {
  swapCards.forEach((card, index) => {
    const opacity = Math.max(0.46, 1 - index * 0.12);
    placeSwapCard(card, makeSwapSlot(index, swapCards.length), opacity);
  });
};

if (cardSwap && swapCards.length) {
  renderSwapCards();

  if (!prefersReducedMotion) {
    let swapTimer;
    let isPaused = false;
    let isSwapping = false;

    const advanceSwap = () => {
      if (isPaused || isSwapping || swapCards.length < 2) return;
      isSwapping = true;
      const first = swapCards.shift();
      const rest = [...swapCards];
      const backSlot = makeSwapSlot(swapCards.length, swapCards.length + 1);

      first.classList.add("is-exiting");
      first.style.transform = `translate(-50%, -50%) translate3d(0px, ${swapConfig.dropDistance}px, 80px) skewY(${swapConfig.skewAmount}deg)`;

      window.setTimeout(() => {
        rest.forEach((card, index) => {
          const opacity = Math.max(0.46, 1 - index * 0.12);
          placeSwapCard(card, makeSwapSlot(index, rest.length + 1), opacity);
        });
      }, swapConfig.moveDelay);

      window.setTimeout(() => {
        first.style.zIndex = String(backSlot.zIndex);
        first.style.opacity = "0.46";
        first.style.filter = "saturate(0.86) brightness(0.9)";
        first.style.transform = `translate(-50%, -50%) translate3d(${backSlot.x}px, ${backSlot.y}px, ${backSlot.z}px) skewY(${swapConfig.skewAmount}deg)`;
      }, swapConfig.returnDelay);

      window.setTimeout(() => {
        first.classList.remove("is-exiting");
        swapCards.push(first);
        renderSwapCards();
        isSwapping = false;
      }, swapConfig.dropDuration);
    };

    window.setTimeout(advanceSwap, 450);
    swapTimer = window.setInterval(advanceSwap, swapConfig.delay);

    cardSwap.addEventListener("mouseenter", () => {
      isPaused = true;
    });

    cardSwap.addEventListener("mouseleave", () => {
      isPaused = false;
    });

    cardSwap.addEventListener("focusin", () => {
      isPaused = true;
    });

    cardSwap.addEventListener("focusout", () => {
      isPaused = false;
    });
  }
}

const revealTargets = document.querySelectorAll(
  ".hero-copy > *, .runia-card-swap, .proof-grid article, .speed-panel, .speed-cards article, .section-heading, .problem-list article, .delivery-heading, .delivery-card, .delivery-statement, .system-board article, .result-strip article, .runia-panel, .timeline li, .compare-grid article, .plans article, .final-panel"
);

revealTargets.forEach((element) => element.classList.add("reveal"));

sections.forEach((section) => {
  section.querySelectorAll(".reveal").forEach((element, index) => {
    element.style.setProperty("--reveal-delay", `${Math.min(index * 70, 420)}ms`);
  });
});

if (prefersReducedMotion) {
  revealTargets.forEach((element) => element.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.16 }
  );

  revealTargets.forEach((element) => revealObserver.observe(element));
}

const motionSurfaces = document.querySelectorAll(
  ".proof-grid article, .speed-cards article, .problem-list article, .delivery-card, .system-board article, .result-strip article, .timeline li, .compare-grid article, .plans article"
);

motionSurfaces.forEach((surface) => surface.classList.add("motion-surface"));

if (!prefersReducedMotion) {
  let pointerRaf = 0;
  const pointer = {
    x: window.innerWidth * 0.5,
    y: window.innerHeight * 0.25,
    active: false
  };
  const spot = {
    x: 50,
    y: 24,
    tx: 50,
    ty: 24,
    opacity: 0,
    targetOpacity: 0
  };

  const updatePointerMotion = () => {
    pointerRaf = 0;

    spot.x += (spot.tx - spot.x) * 0.11;
    spot.y += (spot.ty - spot.y) * 0.11;
    spot.opacity += (spot.targetOpacity - spot.opacity) * 0.09;

    document.body.style.setProperty("--spot-x", `${spot.x.toFixed(2)}%`);
    document.body.style.setProperty("--spot-y", `${spot.y.toFixed(2)}%`);
    document.body.style.setProperty("--spot-opacity", spot.opacity.toFixed(3));

    motionSurfaces.forEach((surface) => {
      const rect = surface.getBoundingClientRect();
      const dx = (pointer.x - (rect.left + rect.width / 2)) / rect.width;
      const dy = (pointer.y - (rect.top + rect.height / 2)) / rect.height;

      if (!pointer.active || Math.abs(dx) > 1.08 || Math.abs(dy) > 1.08) {
        surface.style.setProperty("--tilt-x", "0deg");
        surface.style.setProperty("--tilt-y", "0deg");
        return;
      }

      surface.style.setProperty("--tilt-x", `${(-dy * 1.1).toFixed(2)}deg`);
      surface.style.setProperty("--tilt-y", `${(dx * 1.35).toFixed(2)}deg`);
      surface.style.setProperty("--shine-x", `${((pointer.x - rect.left) / rect.width * 100).toFixed(2)}%`);
      surface.style.setProperty("--shine-y", `${((pointer.y - rect.top) / rect.height * 100).toFixed(2)}%`);
    });

    if (pointer.active || spot.opacity > 0.01) {
      pointerRaf = requestAnimationFrame(updatePointerMotion);
    }
  };

  const requestPointerMotion = () => {
    if (!pointerRaf) pointerRaf = requestAnimationFrame(updatePointerMotion);
  };

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType === "touch") return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    spot.tx = (event.clientX / window.innerWidth) * 100;
    spot.ty = (event.clientY / window.innerHeight) * 100;
    spot.targetOpacity = 0.22;
    requestPointerMotion();
  }, { passive: true });

  window.addEventListener("pointerleave", () => {
    pointer.active = false;
    spot.targetOpacity = 0;
    requestPointerMotion();
  });

  window.addEventListener("scroll", () => {
    sections.forEach((section, index) => {
      const rect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight || 1;
      const progress = (rect.top + rect.height * 0.5 - viewportHeight * 0.5) / viewportHeight;
      section.style.setProperty("--section-shift", `${(progress * (1 + index * 0.18)).toFixed(2)}px`);
    });
  }, { passive: true });
}

const deliveryGrid = document.querySelector("[data-delivery-steps]");
const deliveryCards = deliveryGrid ? Array.from(deliveryGrid.querySelectorAll(".delivery-card")) : [];
const deliveryPanel = document.querySelector("[data-delivery-panel]");

if (deliveryGrid && deliveryCards.length && deliveryPanel) {
  const deliveryCurrent = deliveryPanel.querySelector("[data-delivery-current]");
  const deliveryTitle = deliveryPanel.querySelector(".delivery-statement-copy h3");
  const deliveryText = deliveryPanel.querySelector(".delivery-statement-copy > p:not(.delivery-kicker)");
  const deliveryStatusTitle = deliveryPanel.querySelector("[data-delivery-status-title]");
  const deliveryStatusNumber = deliveryPanel.querySelector("[data-delivery-status-number]");
  const deliveryStatusItems = Array.from(deliveryPanel.querySelectorAll(".delivery-status li"));
  const deliveryCopy = [
    {
      title: "Brief centralizado",
      text: "La informacion entra ordenada desde el inicio para que el proyecto avance sin reuniones de mas.",
      checks: ["Informacion ordenada", "Objetivo claro", "Material recibido"]
    },
    {
      title: "Sistema modular",
      text: "Usamos una base de componentes probada para construir rapido sin perder criterio visual.",
      checks: ["Estructura definida", "Componentes listos", "Secciones armadas"]
    },
    {
      title: "Diseno enfocado",
      text: "Ajustamos jerarquia, recorrido y llamados a la accion para que la web ayude a convertir.",
      checks: ["Mensaje claro", "CTA visibles", "Mobile revisado"]
    },
    {
      title: "Lanzamiento rapido",
      text: "Publicamos una primera version solida y dejamos la base preparada para seguir creciendo.",
      checks: ["Publicacion preparada", "Contacto conectado", "Base escalable"]
    }
  ];

  let activeDeliveryStep = 0;
  let deliveryTimer;
  let deliveryCheckTimers = [];

  const clearDeliveryCheckTimers = () => {
    deliveryCheckTimers.forEach((timer) => window.clearTimeout(timer));
    deliveryCheckTimers = [];
  };

  const animateDeliveryChecks = () => {
    clearDeliveryCheckTimers();
    deliveryStatusItems.forEach((item) => item.classList.remove("is-complete"));

    if (prefersReducedMotion) {
      deliveryStatusItems.forEach((item) => item.classList.add("is-complete"));
      return;
    }

    deliveryStatusItems.forEach((item, itemIndex) => {
      const timer = window.setTimeout(() => {
        item.classList.add("is-complete");
      }, 260 + itemIndex * 520);
      deliveryCheckTimers.push(timer);
    });
  };

  const setDeliveryStep = (index) => {
    activeDeliveryStep = index % deliveryCards.length;
    const current = deliveryCopy[activeDeliveryStep];
    const progress = `${((activeDeliveryStep + 1) / deliveryCards.length) * 100}%`;

    deliveryCards.forEach((card, cardIndex) => {
      const isActive = cardIndex === activeDeliveryStep;
      card.classList.toggle("is-active", isActive);
      card.style.setProperty("--step-progress", cardIndex <= activeDeliveryStep ? "1" : "0.22");
    });

    deliveryPanel.style.setProperty("--delivery-progress", progress);
    if (deliveryCurrent) deliveryCurrent.textContent = String(activeDeliveryStep + 1).padStart(2, "0");
    if (deliveryTitle) deliveryTitle.textContent = current.title;
    if (deliveryText) deliveryText.textContent = current.text;
    if (deliveryStatusTitle) deliveryStatusTitle.textContent = current.title;
    if (deliveryStatusNumber) deliveryStatusNumber.textContent = String(activeDeliveryStep + 1).padStart(2, "0");
    deliveryStatusItems.forEach((item, itemIndex) => {
      item.textContent = current.checks[itemIndex] || "";
    });
    animateDeliveryChecks();
  };

  setDeliveryStep(0);

  if (!prefersReducedMotion) {
    deliveryTimer = window.setInterval(() => {
      setDeliveryStep(activeDeliveryStep + 1);
    }, 3600);

    deliveryCards.forEach((card, index) => {
      card.addEventListener("mouseenter", () => {
        window.clearInterval(deliveryTimer);
        setDeliveryStep(index);
      });
    });

    deliveryGrid.addEventListener("mouseleave", () => {
      window.clearInterval(deliveryTimer);
      deliveryTimer = window.setInterval(() => {
        setDeliveryStep(activeDeliveryStep + 1);
      }, 3600);
    });
  }
}

const counters = document.querySelectorAll("[data-count]");

const animateCounter = (element) => {
  const target = Number(element.dataset.count);
  const duration = 1100;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(target * eased).toString();

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  };

  requestAnimationFrame(tick);
};

if (prefersReducedMotion) {
  counters.forEach((counter) => {
    counter.textContent = counter.dataset.count;
  });
} else {
  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.7 }
  );

  counters.forEach((counter) => counterObserver.observe(counter));
}

const typewriter = document.querySelector(".typewriter");

if (typewriter && !prefersReducedMotion) {
  const words = typewriter.dataset.words.split(",").map((word) => word.trim()).filter(Boolean);
  let wordIndex = 0;
  let charIndex = typewriter.textContent.length;
  let deleting = true;

  const type = () => {
    const word = words[wordIndex];

    if (deleting) {
      charIndex -= 1;
      typewriter.textContent = word.slice(0, charIndex);

      if (charIndex === 0) {
        deleting = false;
        wordIndex = (wordIndex + 1) % words.length;
      }
    } else {
      charIndex += 1;
      typewriter.textContent = words[wordIndex].slice(0, charIndex);

      if (charIndex === words[wordIndex].length) {
        deleting = true;
      }
    }

    const delay = deleting ? 70 : 105;
    const pause = charIndex === words[wordIndex]?.length ? 1400 : 0;
    window.setTimeout(type, delay + pause);
  };

  window.setTimeout(type, 1400);
}

const initRuniaPortfolio = () => {
  document.querySelectorAll(".runia-portfolio-face img").forEach((image) => {
    const markMissing = () => {
      image.closest(".runia-portfolio-face")?.classList.add("is-image-missing");
    };

    if (image.complete && image.naturalWidth === 0) {
      markMissing();
    } else {
      image.addEventListener("error", markMissing, { once: true });
    }
  });
};

initRuniaPortfolio();
