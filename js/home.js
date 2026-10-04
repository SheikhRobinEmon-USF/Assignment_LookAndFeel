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
    document.getElementById("fact-parks").textContent = D.PARKS.length;
    document.getElementById("fact-rides").textContent = C.Store.all().length;
    document.getElementById("fact-visitors").textContent = C.fmtMillions(total2024);
  }

  /* ---------- Height checker ---------- */
  function update() {
    var h = parseInt(els.range.value, 10);
    var rides = C.Store.all();
    var ok = rides.filter(function (r) { return canRide(r, h); });

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
        els.note.textContent = "Grow to " + next + " inches to unlock " + more + " more " + (more === 1 ? "ride" : "rides") + ". Parks measure at the entrance, so treat this as a guide.";
      } else {
        els.note.textContent = "Every ride on the list is open to this rider. Parks still measure at the entrance.";
      }
    }
    renderGroups(rides, h);
  }

  function renderGroups(rides, h) {
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
        return '<li class="' + (yes ? "ok" : "no") + '">' +
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
    update();
  }

  els.range.addEventListener("input", update);
  els.down.addEventListener("click", function () { step(-1); });
  els.up.addEventListener("click", function () { step(1); });
  els.onlyOk.addEventListener("change", update);

  renderFacts();
  renderParks();
  update();
})();
