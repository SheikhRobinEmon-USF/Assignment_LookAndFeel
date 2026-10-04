/* Coaster Coast: home page (height checker, rides by park, parks table) */
(function () {
  "use strict";

  var C = window.Coaster;
  var D = window.CoasterData;

  var MIN = 30;
  var MAX = 60;

  var els = {
    range: document.getElementById("height"),
    out: document.getElementById("height-out"),
    metric: document.getElementById("height-metric"),
    count: document.getElementById("height-count"),
    note: document.getElementById("height-note"),
    ruler: document.getElementById("ruler"),
    down: document.getElementById("height-down"),
    up: document.getElementById("height-up"),
    onlyOk: document.getElementById("only-ok"),
    groups: document.getElementById("park-groups"),
    parksBody: document.getElementById("parks-body")
  };

  function canRide(ride, height) {
    return ride.minHeight === 0 || height >= ride.minHeight;
  }

  function heightLabel(h) { return h >= MAX ? "60+" : String(h); }

  /* ---------- Facts ---------- */
  function renderFacts() {
    var total2024 = Object.keys(D.ATTENDANCE).reduce(function (sum, id) {
      return sum + D.ATTENDANCE[id][D.ATTENDANCE[id].length - 1];
    }, 0);
    var whole = function (v) { return String(Math.round(v)); };
    C.countUp(document.getElementById("fact-parks"), D.PARKS.length, whole, 900);
    C.countUp(document.getElementById("fact-rides"), C.Store.all().length, whole, 1100);
    C.countUp(document.getElementById("fact-visitors"), total2024, function (v) { return C.fmtMillions(v); }, 1300);
  }

  /* ---------- Height checker ---------- */
  var lastOk = null;      /* ids open at the previous height, to animate newly unlocked rides */
  var lastCount = null;

  function update() {
    var h = parseInt(els.range.value, 10);
    var rides = C.Store.all();
    var ok = rides.filter(function (r) { return canRide(r, h); });
    var okIds = {};
    ok.forEach(function (r) { okIds[r.id] = true; });
    var unlocked = {};
    if (lastOk) ok.forEach(function (r) { if (!lastOk[r.id]) unlocked[r.id] = true; });

    els.out.textContent = heightLabel(h);
    els.range.setAttribute("aria-valuetext", (h >= MAX ? "60 inches or taller" : h + " inches"));
    els.metric.textContent = (h >= MAX ? "152 cm or taller" : C.inToCm(h) + " cm");
    els.ruler.style.setProperty("--pct", ((h - MIN) / (MAX - MIN)) * 100 + "%");
    els.down.disabled = h <= MIN;
    els.up.disabled = h >= MAX;

    if (rides.length === 0) {
      els.count.textContent = "No rides in the database";
      els.note.textContent = "Add rides on the Manage rides page to use the checker.";
    } else {
      els.count.textContent = ok.length + " of " + rides.length + " rides";
      var next = rides
        .filter(function (r) { return !canRide(r, h); })
        .map(function (r) { return r.minHeight; })
        .sort(function (a, b) { return a - b; })[0];
      if (next) {
        var more = rides.filter(function (r) { return r.minHeight === next; }).length;
        els.note.textContent = more + " more " + (more === 1 ? "ride opens" : "rides open") + " up at " + next + " inches. Parks measure every rider at the entrance, so treat this as a guide.";
      } else {
        els.note.textContent = "Every ride on the list is unlocked. Have a blast, and remember parks still measure at the entrance.";
      }
    }

    if (lastCount !== null && lastCount !== ok.length) {
      els.count.classList.remove("pop");
      void els.count.offsetWidth;   /* restart the animation */
      els.count.classList.add("pop");
      if (ok.length === rides.length && rides.length > 0) C.confetti();
    }
    lastCount = ok.length;
    renderGroups(rides, h, unlocked);
    lastOk = okIds;
  }

  function renderGroups(rides, h, unlocked) {
    var onlyOk = els.onlyOk.checked;
    var html = D.PARKS.map(function (p) {
      var list = rides
        .filter(function (r) { return r.park === p.id; })
        .sort(function (a, b) { return a.minHeight - b.minHeight || a.name.localeCompare(b.name); });
      if (!list.length) return "";
      var okCount = list.filter(function (r) { return canRide(r, h); }).length;
      var shown = onlyOk ? list.filter(function (r) { return canRide(r, h); }) : list;
      var items = shown.map(function (r) {
        var yes = canRide(r, h);
        return '<li class="' + (yes ? "ok" : "no") + (unlocked[r.id] ? " just-unlocked" : "") + '">' +
          C.icon(yes ? "check" : "lock") +
          '<span class="ride-name">' + C.escapeHtml(r.name) +
          '<span class="visually-hidden">' + (yes ? ", can ride" : ", too short") + "</span></span>" +
          '<span class="req">' + C.fmtHeight(r.minHeight) + "</span></li>";
      }).join("");
      if (!shown.length) items = '<li class="no"><span></span><span>No rides at this height yet.</span><span></span></li>';
      return '<article class="park-group" style="--c: var(--series-' + p.operator + ')">' +
        "<h3><span>" + C.escapeHtml(p.name) + '</span><span class="count">' + okCount + " of " + list.length + "</span></h3>" +
        '<ul class="ride-list">' + items + "</ul></article>";
    }).join("");
    els.groups.innerHTML = html || '<p class="muted">No rides yet. <a href="managerides.html">Add one on the Manage rides page.</a></p>';
  }

  /* ---------- Parks table ---------- */
  function renderParks() {
    var lastIdx = D.ATTENDANCE_YEARS.length - 1;
    var maxVisitors = Math.max.apply(null, Object.keys(D.ATTENDANCE).map(function (id) { return D.ATTENDANCE[id][lastIdx]; }));
    var parks = D.PARKS.slice().sort(function (a, b) {
      var va = D.ATTENDANCE[a.id] ? D.ATTENDANCE[a.id][lastIdx] : -1;
      var vb = D.ATTENDANCE[b.id] ? D.ATTENDANCE[b.id][lastIdx] : -1;
      return vb - va;
    });
    els.parksBody.innerHTML = parks.map(function (p) {
      var op = D.OPERATORS[p.operator];
      var v = D.ATTENDANCE[p.id] ? D.ATTENDANCE[p.id][lastIdx] : null;
      var bar = v === null
        ? '<span class="na">Opened 2025</span>'
        : '<span class="mini-bar" style="--c: var(--series-' + p.operator + ')"><span style="width:' + (v / maxVisitors * 70).toFixed(1) + '%"></span><span>' + C.fmtMillions(v) + "</span></span>";
      var opShort = op.name.replace(" (SeaWorld and Busch Gardens)", "");
      return "<tr>" +
        '<th scope="row">' + C.escapeHtml(p.name) + "</th>" +
        '<td><span class="op"><span class="dot" style="--c: var(--series-' + p.operator + ')"></span>' + C.escapeHtml(opShort) + "</span></td>" +
        '<td class="city">' + C.escapeHtml(p.city) + "</td>" +
        '<td class="opened num">' + p.opened + "</td>" +
        '<td class="bar-cell">' + bar + "</td></tr>";
    }).join("");
  }

  function step(delta) {
    var v = Math.min(MAX, Math.max(MIN, parseInt(els.range.value, 10) + delta));
    els.range.value = v;
    C.paintRange(els.range);
    update();
  }

  /* ---------- The coaster that rides across the hero ----------
   * The track is drawn in pixels for the hero's real width, so the car's
   * CSS offset-path and the SVG rails always line up, loop included.
   */
  var ride = {
    box: document.getElementById("coaster-ride"),
    art: document.getElementById("track-art"),
    rail: document.getElementById("track-rail"),
    ties: document.getElementById("track-ties"),
    car: document.getElementById("coaster-car")
  };

  function trackPath(w, h) {
    var b = h - 14;            /* ground level of the track */
    var hill = h * 0.18;       /* top of the hills */
    var loopX = Math.round(w * 0.58);
    var r = Math.min(34, h * 0.3);
    var f = function (n) { return Math.round(n); };
    if (w < 640) {
      /* phones: one hill and the loop, so the track stays readable */
      var lx = Math.round(w * 0.62);
      return [
        "M", -90, b,
        "C", f(w * 0.05), b, f(w * 0.12), hill, f(w * 0.26), hill,
        "S", f(lx - r * 1.6), b, lx, b,
        "C", f(lx + r * 1.5), b, f(lx + r * 1.2), b - r * 2.2, lx, b - r * 2.2,
        "C", f(lx - r * 1.2), b - r * 2.2, f(lx - r * 1.5), b, lx + 6, b,
        "S", f(w * 0.95), b, w + 90, b
      ].join(" ");
    }
    return [
      "M", -90, b,
      "C", f(w * 0.08), b, f(w * 0.1), hill, f(w * 0.2), hill,
      "S", f(w * 0.3), b, f(w * 0.38), b - 6,
      "S", f(w * 0.44), hill + 22, f(w * 0.5), hill + 22,
      "S", f(loopX - r * 1.6), b, loopX, b,
      "C", f(loopX + r * 1.5), b, f(loopX + r * 1.2), b - r * 2.2, loopX, b - r * 2.2,
      "C", f(loopX - r * 1.2), b - r * 2.2, f(loopX - r * 1.5), b, loopX + 6, b,
      "C", f(w * 0.78), b, f(w * 0.82), hill + 8, f(w * 0.9), hill + 8,
      "S", f(w * 0.97), b, w + 90, b
    ].join(" ");
  }

  function layTrack() {
    if (!ride.box || !ride.car) return;
    var w = ride.box.clientWidth;
    var h = ride.box.clientHeight;
    if (!w || !h) return;
    var d = trackPath(w, h);
    ride.art.setAttribute("viewBox", "0 0 " + w + " " + h);
    ride.rail.setAttribute("d", d);
    ride.ties.setAttribute("d", d);
    if (C.motionOK() && window.CSS && CSS.supports("offset-path", 'path("M0 0L1 1")')) {
      ride.car.style.offsetPath = 'path("' + d + '")';
    } else {
      ride.car.style.display = "none";
    }
  }

  if (ride.box) {
    layTrack();
    var trackFrame = 0;
    window.addEventListener("resize", function () {
      cancelAnimationFrame(trackFrame);
      trackFrame = requestAnimationFrame(layTrack);
    });
  }

  els.range.addEventListener("input", update);
  els.down.addEventListener("click", function () { step(-1); });
  els.up.addEventListener("click", function () { step(1); });
  els.onlyOk.addEventListener("change", update);

  renderFacts();
  renderParks();
  update();
})();
