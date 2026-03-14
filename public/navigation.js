export const goToPage = (page) => {
  const base = window.location.pathname.includes("/public/") ? "/public/" : "/public/";
  window.location.href = `${window.location.origin}${base}${page}`;
};
