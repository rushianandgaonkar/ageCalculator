/* Ageason scroll-progress timeline: accessible, dependency-free enhancement.
   Content stays readable without JavaScript and when reduced motion is enabled. */
(function () {
  "use strict";
  var timelines = document.querySelectorAll("[data-timeline]");
  if (!timelines.length) return;
  var motionPreference = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
  if (motionPreference && motionPreference.matches) {
    timelines.forEach(function (timeline) {
      timeline.style.setProperty("--timeline-progress", "100%");
    });
    return;
  }
  var scheduled = false;
  var observer = null;
  if ("IntersectionObserver" in window) {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) entry.target.classList.add("is-in-view");
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -7% 0px" });
  }
  timelines.forEach(function (timeline) {
    timeline.classList.add("timeline-enhanced");
    timeline.querySelectorAll("[data-timeline-step]").forEach(function (step) {
      if (observer) observer.observe(step);
      else step.classList.add("is-in-view");
    });
  });
  function update() {
    scheduled = false;
    timelines.forEach(function (timeline) {
      var list = timeline.querySelector(".timeline-steps");
      if (!list) return;
      var rect = list.getBoundingClientRect();
      var begin = window.innerHeight * 0.78;
      var finish = window.innerHeight * 0.28;
      var distance = Math.max(1, rect.height - finish + begin);
      var value = (begin - rect.top) / distance;
      var percentage = Math.max(0, Math.min(100, value * 100));
      timeline.style.setProperty("--timeline-progress", percentage.toFixed(2) + "%");
    });
  }
  function queueUpdate() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(update);
  }
  window.addEventListener("scroll", queueUpdate, { passive: true });
  window.addEventListener("resize", queueUpdate, { passive: true });
  queueUpdate();
})();
