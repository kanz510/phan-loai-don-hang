// DEMO ONLY — hiệu ứng xuất hiện nhẹ, tôn trọng prefers-reduced-motion.
(function(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!window.gsap) return;
  gsap.from('.page-heading, .card, .quick-action, .panel', {y:10, opacity:0, duration:.45, stagger:.05, ease:'power2.out', clearProps:'all'});
  if (window.lucide) lucide.createIcons();
})();
