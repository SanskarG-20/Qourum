export function scrollToElement(element, block = 'start') {
  if (!element) return;

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  element.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block });
}
