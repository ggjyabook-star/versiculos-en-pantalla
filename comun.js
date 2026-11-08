// Lista de versículos compartida entre el panel y la proyección (se guarda en este navegador)
(function () {
  const CLAVE = "vp-lista";

  function porDefecto() {
    return (window.VERSICULOS || []).map((v, i) => ({ id: "v" + i, ref: v.ref, texto: v.texto, fondo: v.fondo, activo: true }));
  }
  function limpia(l) {
    return l
      .filter((v) => v && typeof v === "object")
      .map((v, i) => ({
        id: String(v.id || "i" + Date.now().toString(36) + i),
        ref: String(v.ref || ""),
        texto: String(v.texto || ""),
        fondo: window.FONDOS && window.FONDOS[v.fondo] ? v.fondo : "estrellas",
        activo: v.activo !== false,
      }));
  }
  function lista() {
    try {
      const l = JSON.parse(localStorage.getItem(CLAVE));
      if (Array.isArray(l)) return limpia(l);
    } catch (e) {}
    return porDefecto();
  }
  function guardaLista(l) {
    try { localStorage.setItem(CLAVE, JSON.stringify(l)); return true; } catch (e) { return false; }
  }
  function leer(k) { try { return localStorage.getItem("vp-" + k); } catch (e) { return null; } }
  function guardar(k, v) { try { localStorage.setItem("vp-" + k, v); } catch (e) {} }

  let canal = null;
  try { canal = new BroadcastChannel("vp"); } catch (e) {}

  window.VP = { CLAVE, porDefecto, limpia, lista, guardaLista, leer, guardar, canal };
})();
