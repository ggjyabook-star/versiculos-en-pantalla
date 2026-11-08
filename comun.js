// Lista de diapositivas compartida entre el panel y la proyección (se guarda en este navegador).
// Cada diapositiva es un versículo (tipo "verso") o una imagen (tipo "imagen", guardada en IndexedDB).
(function () {
  const CLAVE = "vp-lista";

  function porDefecto() {
    return (window.VERSICULOS || []).map((v, i) => ({ id: "v" + i, tipo: "verso", ref: v.ref, texto: v.texto, fondo: v.fondo, activo: true, imagen: "", ajuste: "contener" }));
  }
  function limpia(l) {
    return l
      .filter((v) => v && typeof v === "object")
      .map((v, i) => ({
        id: String(v.id || "i" + Date.now().toString(36) + i),
        tipo: v.tipo === "imagen" ? "imagen" : "verso",
        ref: String(v.ref || ""),
        texto: String(v.texto || ""),
        fondo: window.FONDOS && window.FONDOS[v.fondo] ? v.fondo : "estrellas",
        activo: v.activo !== false,
        imagen: v.imagen ? String(v.imagen) : "",
        ajuste: v.ajuste === "cubrir" ? "cubrir" : "contener",
        ...(v.imagenData ? { imagenData: String(v.imagenData) } : {}),
      }));
  }
  const tieneContenido = (v) => (v.tipo === "imagen" ? !!v.imagen : !!v.texto.trim());
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

  // ---------- Imágenes en IndexedDB ----------
  let dbP = null;
  function db() {
    if (!dbP) {
      dbP = new Promise((res, rej) => {
        const r = indexedDB.open("vp", 1);
        r.onupgradeneeded = () => r.result.createObjectStore("imagenes");
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    }
    return dbP;
  }
  async function tx(modo, fn) {
    const d = await db();
    return new Promise((res, rej) => {
      const t = d.transaction("imagenes", modo);
      const pedido = fn(t.objectStore("imagenes"));
      t.oncomplete = () => res(pedido ? pedido.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  }
  const urls = {};
  const imagenes = {
    async guarda(blob) {
      const id = "img" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      await tx("readwrite", (st) => st.put(blob, id));
      return id;
    },
    lee: (id) => tx("readonly", (st) => st.get(id)),
    async borra(id) {
      if (urls[id]) { URL.revokeObjectURL(urls[id]); delete urls[id]; }
      await tx("readwrite", (st) => st.delete(id));
    },
    claves: () => tx("readonly", (st) => st.getAllKeys()),
    async url(id) {
      if (!id) return null;
      if (urls[id]) return urls[id];
      try {
        const b = await imagenes.lee(id);
        if (!b) return null;
        return (urls[id] = URL.createObjectURL(b));
      } catch (e) { return null; }
    },
    // Borra las imágenes que ya ninguna diapositiva usa
    async limpia(l) {
      try {
        const usadas = new Set(l.filter((v) => v.tipo === "imagen").map((v) => v.imagen));
        for (const k of await imagenes.claves()) if (!usadas.has(k)) await imagenes.borra(k);
      } catch (e) {}
    },
  };

  let canal = null;
  try { canal = new BroadcastChannel("vp"); } catch (e) {}

  window.VP = { CLAVE, porDefecto, limpia, lista, guardaLista, leer, guardar, canal, tieneContenido, imagenes };
})();
