/*
 * Coaster Coast: shared script for every page.
 * Mobile navigation, the ride store used by the CRUD and chart pages,
 * formatting helpers, icons and toasts.
 */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  var Data = window.CoasterData;

  /* ---------- Mobile navigation ---------- */
  function initNav() {
    var toggle = document.querySelector(".nav-toggle");
    var nav = document.getElementById("site-nav");
    if (!toggle || !nav) return;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      nav.classList.toggle("is-open", open);
    }

    toggle.addEventListener("click", function () {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        setOpen(false);
        toggle.focus();
      }
    });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("is-open") && !nav.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    window.matchMedia("(min-width: 48rem)").addEventListener("change", function () { setOpen(false); });
  }

  /* ---------- Ride store ----------
   * Mock persistence: rides live in sessionStorage, so edits carry across
   * pages in the same tab and disappear when the tab is closed or reset.
   */
  var STORAGE_KEY = "coastercoast.rides.v1";

  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  function safeGet() {
    try { return window.sessionStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }
  function safeSet(value) {
    try {
      if (value === null) window.sessionStorage.removeItem(STORAGE_KEY);
      else window.sessionStorage.setItem(STORAGE_KEY, value);
    } catch (e) { /* storage blocked: keep working in memory */ }
  }

  function isValidRide(r) {
    return r && typeof r.id === "string" && typeof r.name === "string" &&
      typeof r.park === "string" && typeof r.type === "string" &&
      typeof r.minHeight === "number" && typeof r.opened === "number";
  }

  var rides = (function load() {
    var raw = safeGet();
    if (raw) {
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.every(isValidRide)) return parsed;
      } catch (e) { /* fall through to seed data */ }
    }
    return clone(Data.RIDES);
  })();

  var listeners = [];
  function persist() {
    safeSet(JSON.stringify(rides));
    listeners.forEach(function (fn) { fn(); });
  }

  function nextId() {
    var max = rides.reduce(function (m, r) {
      var n = parseInt(String(r.id).replace(/\D/g, ""), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return "r" + String(max + 1).padStart(2, "0");
  }

  var Store = {
    all: function () { return rides.slice(); },
    get: function (id) { return rides.find(function (r) { return r.id === id; }) || null; },
    create: function (fields) {
      var ride = Object.assign({ id: nextId() }, fields);
      rides.push(ride);
      persist();
      return ride;
    },
    update: function (id, fields) {
      var i = rides.findIndex(function (r) { return r.id === id; });
      if (i === -1) return null;
      rides[i] = Object.assign({}, rides[i], fields, { id: id });
      persist();
      return rides[i];
    },
    remove: function (id) {
      var i = rides.findIndex(function (r) { return r.id === id; });
      if (i === -1) return null;
      var removed = rides.splice(i, 1)[0];
      persist();
      return { ride: removed, index: i };
    },
    restore: function (ride, index) {
      rides.splice(Math.min(index, rides.length), 0, ride);
      persist();
    },
    reset: function () {
      rides = clone(Data.RIDES);
      safeSet(null);
      listeners.forEach(function (fn) { fn(); });
    },
    isModified: function () { return safeGet() !== null; },
    onChange: function (fn) { listeners.push(fn); }
  };

  /* ---------- Lookups and formatting ---------- */
  var parkById = {};
  Data.PARKS.forEach(function (p) { parkById[p.id] = p; });

  function park(id) { return parkById[id] || null; }
  function parkName(id) { var p = park(id); return p ? p.name : "Unknown park"; }
  function operatorOf(parkId) { var p = park(parkId); return p ? p.operator : null; }

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }
  function operatorColor(opId) { return cssVar("--series-" + opId); }

  var nf = new Intl.NumberFormat("en-US");
  function fmtInt(n) { return nf.format(n); }
  function fmtMillions(n, digits) {
    return (n / 1e6).toFixed(digits === undefined ? 1 : digits) + "M";
  }
  function fmtHeight(inches) { return inches > 0 ? inches + " in" : "Any height"; }
  function fmtSpeed(mph) { return mph === null || mph === undefined ? "Not rated" : nf.format(mph) + " mph"; }
  function inToCm(inches) { return Math.round(inches * 2.54); }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------- Icons (inline SVG, stroke based) ---------- */
  var ICON_PATHS = {
    check: '<path d="M20 6 9 17l-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    sort: '<path d="m7 15 5 5 5-5M7 9l5-5 5 5"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>'
  };
  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICON_PATHS[name] + "</svg>";
  }

  /* ---------- Toasts ---------- */
  function toast(message, action) {
    var region = document.querySelector(".toast-region");
    if (!region) return;
    var el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    var text = document.createElement("span");
    text.textContent = message;
    el.appendChild(text);
    var timer;
    function dismiss() { clearTimeout(timer); if (el.parentNode) el.parentNode.removeChild(el); }
    if (action) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = action.label;
      btn.addEventListener("click", function () { action.onClick(); dismiss(); });
      el.appendChild(btn);
    }
    region.appendChild(el);
    while (region.children.length > 3) region.removeChild(region.firstChild);
    timer = setTimeout(dismiss, action ? 7000 : 4000);
  }

  window.Coaster = {
    Store: Store,
    park: park,
    parkName: parkName,
    operatorOf: operatorOf,
    operatorColor: operatorColor,
    cssVar: cssVar,
    fmtInt: fmtInt,
    fmtMillions: fmtMillions,
    fmtHeight: fmtHeight,
    fmtSpeed: fmtSpeed,
    inToCm: inToCm,
    escapeHtml: escapeHtml,
    icon: icon,
    toast: toast
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initNav);
  else initNav();
})();
