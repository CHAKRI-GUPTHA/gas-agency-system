if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((reg) => reg.unregister()));

      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      if (!sessionStorage.getItem("sw-cleared")) {
        sessionStorage.setItem("sw-cleared", "1");
        window.location.reload();
      }
    } catch (err) {
      console.warn("Service worker cleanup failed", err);
    }
  });
}
