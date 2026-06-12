const setupRevealAnimations = () => {
  const animatedNodes = document.querySelectorAll('.reveal, .system-shot-frame, .info-card, .step-card');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  animatedNodes.forEach((node, index) => {
    node.style.transitionDelay = `${Math.min(index * 40, 260)}ms`;
    observer.observe(node);
  });
};

setupRevealAnimations();

const setupSectionParallax = () => {
  const sections = document.querySelectorAll('main .section');

  const updateOffsets = () => {
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      const progress = (window.innerHeight - rect.top) / (window.innerHeight + rect.height);
      const offset = Math.max(-18, Math.min(18, (progress - 0.5) * 36));
      section.style.setProperty('--float-offset', `${offset.toFixed(2)}px`);
    });
  };

  window.addEventListener('scroll', updateOffsets, { passive: true });
  window.addEventListener('resize', updateOffsets);
  updateOffsets();
};

setupSectionParallax();

const setupPartnersMarquee = () => {
  const marquee = document.querySelector('.partners-marquee');
  const track = marquee?.querySelector('.partners-marquee__track');

  if (!marquee || !track) return;

  const originalItems = [...track.children].map((node) => node.cloneNode(true));
  const minItems = originalItems.length;

  const buildTrack = () => {
    track.innerHTML = '';

    const containerWidth = marquee.clientWidth;
    let safeGuard = 0;

    while (track.scrollWidth < containerWidth * 2 && safeGuard < 12) {
      originalItems.forEach((node) => {
        const clone = node.cloneNode(true);
        const img = clone.querySelector('img');

        if (img && safeGuard > 0) {
          img.alt = '';
          img.setAttribute('aria-hidden', 'true');
        }

        track.appendChild(clone);
      });

      safeGuard += 1;
      if (safeGuard === 1 && minItems === 1) break;
    }

    const pixelsPerSecond = 70;
    const duration = Math.max(16, track.scrollWidth / 2 / pixelsPerSecond);
    track.style.setProperty('--partners-speed', `${duration.toFixed(2)}s`);
  };

  buildTrack();
  window.addEventListener('resize', buildTrack);
};

setupPartnersMarquee();
