/* LimLanguage — comportamento do site (sem bibliotecas, sem cookies, sem coleta de dados).
   Faz: cabeçalho e rodapé, troca de idioma (PT/ES/EN), troca de tema de cor,
   lista de eventos (lê data/events.json), abas, copiar e-mail. */
(function () {
  "use strict";

  var CFG = window.LL_CONFIG || {};
  var DICT = window.LL_I18N || {};
  var LANGS = ["pt", "es", "en"];
  var THEMES = ["brand", "rg", "hc"];
  var HTML_LANG = { pt: "pt-BR", es: "es", en: "en" };
  var state = { lang: "pt", theme: "brand", events: null, eventsFailed: false, notes: [] };

  /* ---------- utilidades ---------- */
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ok */ } }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  function t(key) {
    var cur = DICT[state.lang] || {};
    if (cur[key] !== undefined) return cur[key];
    var pt = DICT.pt || {};
    return pt[key] !== undefined ? pt[key] : key;
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function isExternalForm() { return !!(CFG.formUrl && String(CFG.formUrl).trim()); }
  function ctaHref() { return "participar.html"; }   // os botões "Entrar na comunidade" passam sempre pela explicação
  function formHref() { return isExternalForm() ? CFG.formUrl : "participar.html"; }

  function currentPage() {
    var p = location.pathname.split("/").pop();
    return p === "" ? "index.html" : p;
  }

  /* ---------- idioma e tema ---------- */
  function pickInitialLang() {
    var q = null;
    try { q = new URLSearchParams(location.search).get("lang"); } catch (e) { /* ok */ }
    if (q && LANGS.indexOf(q) > -1) return q;
    var saved = load("ll-lang");
    if (saved && LANGS.indexOf(saved) > -1) return saved;
    var nav = (navigator.language || "pt").slice(0, 2).toLowerCase();
    return LANGS.indexOf(nav) > -1 ? nav : "pt";
  }

  function pickInitialTheme() {
    var saved = load("ll-theme");
    if (saved && THEMES.indexOf(saved) > -1) return saved;
    try {
      if (window.matchMedia && window.matchMedia("(prefers-contrast: more)").matches) return "hc";
    } catch (e) { /* ok */ }
    return "brand";
  }

  function setTheme(name) {
    if (THEMES.indexOf(name) < 0) name = "brand";
    state.theme = name;
    document.documentElement.setAttribute("data-theme", name);
    store("ll-theme", name);
  }

  function setLang(code) {
    if (LANGS.indexOf(code) < 0) code = "pt";
    state.lang = code;
    store("ll-lang", code);
    document.documentElement.lang = HTML_LANG[code];
    renderChrome();
    applyI18n(document);
    renderEvents();
  }

  /* ---------- logo (monograma LL, recriado em SVG) ---------- */
  var LOGO =
    '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">' +
    '<circle cx="32" cy="32" r="30" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 3"/>' +
    '<circle cx="32" cy="32" r="22" fill="none" stroke="currentColor" stroke-width="3"/>' +
    '<text x="32" y="40" text-anchor="middle" font-family="Georgia, \'Times New Roman\', serif" font-weight="700" font-size="22" fill="currentColor">LL</text>' +
    "</svg>";
  
  /* ---------- cabeçalho e rodapé ---------- */
 var NAV = [
    ["o-que-somos.html", "nav.about"],
    ["como-funciona.html", "nav.how"],
    ["eventos.html", "nav.events"],
    ["parcerias.html", "nav.partners"],
    ["contato.html", "nav.contact"]
  ];
  var EXTRA_PAGES = [
    ["index.html", "brand.home"],
    ["carimbos.html", "stamps.title"],
    ["participar.html", "join.title"],
    ["faq.html", "faq.title"]
  ];

  function renderChrome() {
    var page = currentPage();
    var header = document.getElementById("site-header");
    var footer = document.getElementById("site-footer");

    if (header) {
      var links = NAV.map(function (n) {
        var cur = n[0] === page ? ' aria-current="page"' : "";
        return '<li><a href="' + n[0] + '"' + cur + ">" + esc(t(n[1])) + "</a></li>";
      }).join("");

      var allLinks = [EXTRA_PAGES[0]].concat(NAV, EXTRA_PAGES.slice(1)).map(function (n) {
        var cur = n[0] === page ? ' aria-current="page"' : "";
        var label = t(n[1]).replace(/^LimLanguage,\s*/i, "");
        label = label.charAt(0).toUpperCase() + label.slice(1);
        return '<li><a href="' + n[0] + '"' + cur + ">" + esc(label) + "</a></li>";
      }).join("");

      var listIconSVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
        [5, 10, 15, 20].map(function (y) {
          return '<circle cx="4" cy="' + y + '" r="1.8"/><rect x="8" y="' + (y - 1.5) + '" width="13" height="3" rx="1.5"/>';
        }).join("") + "</svg>";

      var langBtns = LANGS.map(function (c) {
        var names = { pt: "Português", es: "Español", en: "English" };
        return '<button type="button" data-lang="' + c + '" lang="' + c + '" aria-label="' + names[c] +
          '" aria-pressed="' + (state.lang === c) + '">' + c.toUpperCase() + "</button>";
      }).join("");

      var themeOpts = THEMES.map(function (n) {
        return '<option value="' + n + '"' + (state.theme === n ? " selected" : "") + ">" +
          esc(t("theme." + n)) + "</option>";
      }).join("");

      header.className = "site-header";
      header.innerHTML =
        '<div class="airmail-bar" aria-hidden="true"></div>' +
        '<div class="util-bar"><div class="wrap">' +
          '<div class="util-group" role="group" aria-label="' + esc(t("util.lang")) + '">' +
            '<span class="util-label" aria-hidden="true">' + esc(t("util.lang")) + '</span>' +
            '<div class="lang-switch">' + langBtns + "</div></div>" +
          '<div class="util-group"><label class="util-label" for="theme-select">' + esc(t("util.theme")) + "</label>" +
            '<select class="theme-select" id="theme-select">' + themeOpts + "</select></div>" +
        "</div></div>" +
        '<div class="main-bar"><div class="wrap">' +
          '<div class="menu-paginas" id="menu-paginas">' +
            '<button type="button" class="btn-lista" id="btn-lista-paginas" aria-label="Todas as páginas" aria-expanded="false">' +
              listIconSVG +
            "</button>" +
            '<ul class="dropdown-paginas" id="dropdown-paginas">' + allLinks + "</ul>" +
          "</div>" +
          '<a class="brand" href="index.html" aria-label="' + esc(t("brand.home")) + '">' + LOGO +
            '<span class="brand-name">LimLanguage</span></a>' +
          '<a class="btn btn-primary btn-small" id="header-cta" href="' + esc(ctaHref()) + '">' + esc(t("cta.join")) + "</a>" +
          '<button type="button" class="nav-toggle" id="nav-toggle" aria-expanded="false" aria-controls="site-nav">' +
            esc(t("nav.menu")) + "</button>" +
          '<nav class="site-nav" id="site-nav" aria-label="' + esc(t("nav.label")) + '"><ul>' + links + "</ul></nav>" +
        "</div></div>";
    
      header.querySelectorAll("[data-lang]").forEach(function (b) {
        b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); });
      });
      document.getElementById("theme-select").addEventListener("change", function (e) { setTheme(e.target.value); });
      var toggle = document.getElementById("nav-toggle");
      var nav = document.getElementById("site-nav");
      toggle.addEventListener("click", function () {
        var open = nav.classList.toggle("open");
        toggle.setAttribute("aria-expanded", String(open));
      });
      nav.addEventListener("click", function (e) {
        if (e.target.tagName === "A") { nav.classList.remove("open"); toggle.setAttribute("aria-expanded", "false"); }
      });

      var btnLista = document.getElementById("btn-lista-paginas");
      var dropPaginas = document.getElementById("dropdown-paginas");
      var menuPaginas = document.getElementById("menu-paginas");
      var timerMenu;
      var fixado = false;

      btnLista.addEventListener("click", function (e) {
        e.stopPropagation();
        fixado = !fixado;
        dropPaginas.classList.toggle("ativo", fixado);
        btnLista.setAttribute("aria-expanded", String(fixado));
      });

      menuPaginas.addEventListener("mouseenter", function () {
        clearTimeout(timerMenu);
        dropPaginas.classList.add("ativo");
      });

      menuPaginas.addEventListener("mouseleave", function () {
        if (fixado) return; // Se foi aberto por clique, não fecha ao tirar o mouse
        timerMenu = setTimeout(function () {
          dropPaginas.classList.remove("ativo");
          btnLista.setAttribute("aria-expanded", "false");
        }, 150);
      });

      document.addEventListener("click", function () {
        fixado = false;
        dropPaginas.classList.remove("ativo");
        btnLista.setAttribute("aria-expanded", "false");
      });
    }

    if (footer) {
      footer.className = "site-footer";
      var mail = esc(CFG.email || "");
      footer.innerHTML =
        '<div class="wrap">' +
        '<div class="footer-cols">' +
          '<div><h2>' + esc(t("footer.about")) + "</h2><p>" + esc(t("footer.tag")) + "</p></div>" +
          '<div><h2>' + esc(t("footer.contact")) + "</h2><ul>" +
            '<li><a href="mailto:' + mail + '">' + mail + "</a></li>" +
            '<li><a href="' + esc(CFG.instagramUrl || "#") + '" target="_blank" rel="noopener">' +
              "Instagram" + '<span class="sr-only">' + esc(t("common.newtab")) + "</span></a></li>" +
            '<li><a href="' + esc(CFG.linkedinUrl || "#") + '" target="_blank" rel="noopener">LinkedIn<span class="sr-only">' + esc(t("common.newtab")) + "</span></a></li>" +
            "</ul></div>" +
          '<div><h2>' + esc(t("footer.more")) + "</h2><ul>" +
            '<li><a href="carimbos.html">' + esc(t("stamps.title")) + "</a></li>" +
            '<li><a href="faq.html">' + esc(t("faq.title")) + "</a></li>" +
            '<li><a href="participar.html">' + esc(t("join.title")) + "</a></li></ul></div>" +
        "</div>" +
        '<p class="indep">' + esc(t("footer.indep")) + "</p></div>";
    }
  }

  /* ---------- textos estáticos ---------- */
  function applyI18n(root) {
    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    root.querySelectorAll("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split(";").forEach(function (pair) {
        var p = pair.split(":");
        if (p.length === 2) el.setAttribute(p[0].trim(), t(p[1].trim()));
      });
    });

    // Botões "Entrar na comunidade": levam à página "Como participar" (explicação antes do formulário)
    root.querySelectorAll("[data-cta]").forEach(function (a) {
      a.textContent = t(a.getAttribute("data-i18n") || "cta.join");
      a.setAttribute("href", ctaHref());
    });

    // Botão da página "Como participar": é o único que abre o formulário (em nova aba)
    root.querySelectorAll("[data-form]").forEach(function (a) {
      var label = t(a.getAttribute("data-i18n") || "join.open");
      a.setAttribute("href", formHref());
      if (isExternalForm()) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener");
        a.textContent = label + t("common.newtab");   // um só texto, para não quebrar em duas colunas no botão
      } else {
        a.textContent = label;
        a.removeAttribute("target");
      }
    });

    // Links externos (Instagram etc.)
    root.querySelectorAll("[data-instagram]").forEach(function (a) {
      a.setAttribute("href", CFG.instagramUrl || "#");
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
      a.textContent = "Instagram";
      var s = document.createElement("span");
      s.className = "sr-only";
      s.textContent = t("common.newtab");
      a.appendChild(s);
    });
    root.querySelectorAll("[data-linkedin]").forEach(function (a) {
      a.setAttribute("href", CFG.linkedinUrl || "#");
      a.setAttribute("target", "_blank");
      a.setAttribute("rel", "noopener");
      a.textContent = "LinkedIn";
      var s = document.createElement("span");
      s.className = "sr-only";
      s.textContent = t("common.newtab");
      a.appendChild(s);
    });
    root.querySelectorAll("[data-email]").forEach(function (el) { el.textContent = CFG.email || ""; });
    root.querySelectorAll("[data-mailto]").forEach(function (a) { a.setAttribute("href", "mailto:" + (CFG.email || "")); });

    // Aviso de formulário pendente (só aparece para a equipe, enquanto formUrl estiver vazio)
    root.querySelectorAll("[data-form-pending]").forEach(function (el) { el.hidden = isExternalForm(); });

    // Título da aba do navegador
    var key = document.documentElement.getAttribute("data-title");
    if (key) {
      var name = t(key);
      document.title = key === "home.title" ? name : name + " · LimLanguage";
    }
  }

  /* ---------- eventos ---------- */
  function pad2(n) { return (n < 10 ? "0" : "") + n; }
  function todayISO() {
    var d = new Date();
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function loadEvents() {
    return fetch("data/events.json", { cache: "no-cache" })
      .then(function (r) { if (!r.ok) throw new Error("http " + r.status); return r.json(); })
      .then(function (json) {
        var list = Array.isArray(json) ? json : json && json.events;
        if (!Array.isArray(list)) throw new Error("formato");
        var today = todayISO();
        state.notes = [];
        state.events = [];
        list.forEach(function (e, i) {
          if (!e || typeof e.name !== "string" || !e.name.trim()) {
            state.notes.push("Evento nº " + (i + 1) + " ignorado: falta o campo \"name\" (nome do evento).");
            return;
          }
          if (e.status !== "upcoming" && e.status !== "done") {
            state.notes.push("Evento \"" + e.name + "\" ignorado: o campo \"status\" precisa ser \"upcoming\" ou \"done\" (está " + JSON.stringify(e.status) + ").");
            return;
          }
          var c = {};
          for (var k in e) { if (Object.prototype.hasOwnProperty.call(e, k)) c[k] = e[k]; }
          if (c.date && !/^\d{4}-\d{2}-\d{2}$/.test(c.date)) {
            state.notes.push("Evento \"" + c.name + "\": a data \"" + c.date + "\" não está no formato ano-mês-dia (ex.: 2026-12-05); o evento aparece sem data.");
          } else if (c.status === "upcoming" && c.date && c.date < today) {
            // a data já passou: o evento vai sozinho para "Realizados"
            c.status = "done";
            state.notes.push("Evento \"" + c.name + "\": a data " + c.date + " já passou, então ele aparece em \"Realizados\" (não precisa trocar o status).");
          }
          state.events.push(c);
        });
      })
      .catch(function () {
        state.eventsFailed = true;
        state.events = [];
        state.notes = ["Não foi possível ler data/events.json. Confira vírgulas, aspas e chaves do arquivo."];
      });
  }

  /* Aviso para a equipe: abra o site com ?checar=1 no final do endereço (ex.: eventos.html?checar=1) */
  function renderCheck() {
    var old = document.getElementById("ll-check");
    if (old) old.parentNode.removeChild(old);
    if (!/[?&]checar=1(&|$)/.test(location.search)) return;
    var main = document.getElementById("main");
    if (!main) return;
    var box = document.createElement("div");
    box.id = "ll-check";
    box.className = "wrap notice";
    box.setAttribute("role", "status");
    var notes = state.notes || [];
    box.innerHTML = "<strong>Verificação da agenda (só para a equipe)</strong>" +
      (notes.length
        ? "<ul>" + notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>"
        : "<p>Nenhum problema encontrado em data/events.json.</p>");
    main.insertBefore(box, main.firstChild);
  }

  function formatDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso || "")) return "";
    try {
      return new Date(iso + "T00:00:00Z").toLocaleDateString(HTML_LANG[state.lang],
        { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
    } catch (e) { return iso; }
  }

  var CHECK_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 12.5l5 5L20 6.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function placeText(p) {
    if (!p) return "";
    var k = String(p).toLowerCase();
    if (k === "online") return t("place.online");
    if (k === "presencial" || k === "in-person") return t("place.inperson");
    return p;
  }

  function eventCard(ev) {
    var done = ev.status === "done";
    var chips = [];
    var d = formatDate(ev.date);
    if (d) chips.push(d);
    if (ev.time) chips.push(ev.time);
    if (ev.place) chips.push(placeText(ev.place));
    if (ev.language) chips.push(DICT[state.lang]["lang." + ev.language] || ev.language);

    var badge = done
      ? '<span class="stamp-done">' + CHECK_SVG + "<span>" + esc(t("event.done")) + "</span></span>"
      : '<span class="stamp-next">' + esc(t("event.next")) + "</span>";

    var link = "";
    if (!done && ev.link && /^https?:\/\//i.test(ev.link)) {
      link = '<a class="event-link" href="' + esc(ev.link) + '" target="_blank" rel="noopener">' +
        esc(t("event.link")) + '<span class="sr-only">' + esc(t("common.newtab")) + "</span></a>";
    }

    return '<li class="event">' + badge +
      "<h3>" + esc(ev.name) + "</h3>" +
      (chips.length ? '<ul class="event-meta">' + chips.map(function (c) { return '<li class="chip">' + esc(c) + "</li>"; }).join("") + "</ul>" : "") +
      (ev.description ? '<p class="event-desc">' + esc(ev.description) + "</p>" : "") +
      link + "</li>";
  }

  function byDateAsc(a, b) { return String(a.date || "9999").localeCompare(String(b.date || "9999")); }
  function byDateDesc(a, b) { return String(b.date || "").localeCompare(String(a.date || "")); }

  function emptyUpcoming(withRecent) {
    var done = (state.events || []).filter(function (e) { return e.status === "done"; });
    var html = '<div class="empty-state"><p>' + esc(t(state.eventsFailed ? "event.error" : "event.empty")) + "</p>" +
      '<a class="btn btn-ghost" href="' + esc(CFG.instagramUrl || "#") + '" target="_blank" rel="noopener">' +
      esc(t("event.insta")) + '<span class="sr-only">' + esc(t("common.newtab")) + "</span></a></div>";
    if (withRecent && done.length) {
      html += '<h3 class="subhead">' + esc(t("event.recent")) + '</h3><ul class="event-list">' +
        done.slice(0, 2).map(eventCard).join("") + "</ul>";
    }
    return html;
  }

  function renderEvents() {
    var targets = document.querySelectorAll("[data-events]");
    if (!targets.length) return;
    if (state.events === null) return;

    targets.forEach(function (el) {
      var mode = el.getAttribute("data-events");
      var limit = parseInt(el.getAttribute("data-limit") || "0", 10);
      var all = state.events;

      if (mode === "done") {
        var done = all.filter(function (e) { return e.status === "done"; }).sort(byDateDesc);
        el.innerHTML = done.length
          ? '<ul class="event-list">' + done.map(eventCard).join("") + "</ul>"
          : '<div class="empty-state"><p>' + esc(t("event.emptyDone")) + "</p></div>";
        return;
      }

      var up = all.filter(function (e) { return e.status === "upcoming"; }).sort(byDateAsc);
      if (limit) up = up.slice(0, limit);
      el.innerHTML = up.length
        ? '<ul class="event-list">' + up.map(eventCard).join("") + "</ul>"
        : emptyUpcoming(true);
    });
  }

  /* ---------- abas (Eventos) ---------- */
  function initTabs() {
    var tablist = document.querySelector('[role="tablist"]');
    if (!tablist) return;
    var tabs = Array.prototype.slice.call(tablist.querySelectorAll('[role="tab"]'));

    function select(tab, focus) {
      tabs.forEach(function (x) {
        var on = x === tab;
        x.setAttribute("aria-selected", String(on));
        x.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(x.getAttribute("aria-controls"));
        if (panel) panel.hidden = !on;
      });
      if (focus) tab.focus();
      try { history.replaceState(null, "", "#" + tab.getAttribute("data-hash")); } catch (e) { /* ok */ }
    }

    tabs.forEach(function (tab, i) {
      tab.addEventListener("click", function () { select(tab, false); });
      tab.addEventListener("keydown", function (e) {
        var n = null;
        if (e.key === "ArrowRight") n = tabs[(i + 1) % tabs.length];
        else if (e.key === "ArrowLeft") n = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === "Home") n = tabs[0];
        else if (e.key === "End") n = tabs[tabs.length - 1];
        if (n) { e.preventDefault(); select(n, true); }
      });
    });

    var wanted = tabs.filter(function (x) { return "#" + x.getAttribute("data-hash") === location.hash; })[0];
    select(wanted || tabs[0], false);
  }

  /* ---------- copiar e-mail ---------- */
  function initCopy() {
    var btn = document.getElementById("copy-email");
    var status = document.getElementById("copy-status");
    if (!btn || !status) return;
    btn.addEventListener("click", function () {
      var text = CFG.email || "";
      function ok() { status.textContent = t("contact.copied"); }
      function fail() { status.textContent = t("contact.copyFail"); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, fail);
      } else {
        fail();
      }
    });
  }

  /* ---------- início ---------- */
  function init() {
    state.lang = pickInitialLang();
    state.theme = pickInitialTheme();
    document.documentElement.setAttribute("data-theme", state.theme);
    document.documentElement.lang = HTML_LANG[state.lang];
    renderChrome();
    applyI18n(document);
    initTabs();
    initCopy();
    if (document.querySelector("[data-events]")) {
      loadEvents().then(function () { renderEvents(); renderCheck(); });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
