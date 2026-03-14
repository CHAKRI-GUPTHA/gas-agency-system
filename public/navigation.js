export const goToPage = (page) => {
  const target = new URL(page, window.location.href);
  window.location.href = target.href;
};
