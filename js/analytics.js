/* Coaster Coast: analytics page. Four D3 charts, each with a data table view.
 * D3.js v7.9.0 loads from the jsDelivr CDN. If the CDN is blocked or fails its
 * integrity check, the same release loads from js/vendor as a backup.
 */
(function () {
  "use strict";

  if (window.d3) {
    renderAnalytics(window.d3);
  } else {
    var backup = document.createElement("script");
    backup.src = "js/vendor/d3.v7.9.0.min.js";
    backup.onload = function () { renderAnalytics(window.d3); };
    backup.onerror = function () {
      document.querySelectorAll(".chart").forEach(function (el) {
        el.innerHTML = '<p class="muted">The chart library could not load. The data table below has every number.</p>';
      });
      document.querySelectorAll(".table-toggle").forEach(function (btn) { btn.click(); });
    };
    document.head.appendChild(backup);
  }

  function renderAnalytics(d3) {
    var C = window.Coaster;
    var D = window.CoasterData;

    var OPS = ["disney", "universal", "united"];
    var OP_LABEL = { disney: "Walt Disney World", universal: "Universal Orlando", united: "United Parks" };
    var OP_SHORT = { disney: "Disney", universal: "Universal", united: "United Parks" };
    var PARK_SHORT = {
      mk: "Magic Kingdom", ep: "EPCOT", hs: "Hollywood Studios", ak: "Animal Kingdom",
      usf: "Universal Studios", ioa: "Islands of Adventure", eu: "Epic Universe",
      swo: "SeaWorld Orlando", bgt: "Busch Gardens"
    };
    var RIDE_SHORT = {
      "Hagrid's Magical Creatures Motorbike Adventure": "Hagrid's Motorbike Adventure",
      "Guardians of the Galaxy: Cosmic Rewind": "Cosmic Rewind",
      "Jurassic World VelociCoaster": "VelociCoaster",
      "The Incredible Hulk Coaster": "Incredible Hulk Coaster",
      "Pipeline: The Surf Coaster": "Pipeline",
      "Big Thunder Mountain Railroad": "Big Thunder Mountain",
      "Harry Potter and the Escape from Gringotts": "Escape from Gringotts",
      "The Twilight Zone Tower of Terror": "Tower of Terror",
      "Star Wars: Rise of the Resistance": "Rise of the Resistance"
    };

    var YEARS = D.ATTENDANCE_YEARS;
    var LAST = YEARS.length - 1;
    var fmtPct = d3.format("+.1%");
    var fmtM = function (v) { return C.fmtMillions(v); };

    function color(op) { return C.operatorColor(op); }
    function shortRide(name, max) {
      var s = RIDE_SHORT[name] || name;
      return s.length > max ? s.slice(0, max - 1).trim() + "…" : s;
    }

    /* ---------- Shared chart plumbing ---------- */
    function responsive(el, draw) {
      var lastWidth = 0;
      var frame = 0;
      function run(force) {
        var w = Math.floor(el.clientWidth);
        if (!w || (!force && w === lastWidth)) return;
        lastWidth = w;
        draw(w);
      }
      if ("ResizeObserver" in window) {
        new ResizeObserver(function () {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(function () { run(false); });
        }).observe(el);
      } else {
        window.addEventListener("resize", function () { run(false); });
      }
      run(true);
      return function redraw() { run(true); };
    }

    function makeTooltip(el) {
      var tip = document.createElement("div");
      tip.className = "tooltip";
      tip.setAttribute("aria-hidden", "true");
      el.appendChild(tip);
      return {
        show: function (html, x, y) {
          tip.innerHTML = html;
          tip.classList.add("is-on");
          var w = tip.offsetWidth;
          var h = tip.offsetHeight;
          var left = x + 14;
          if (left + w > el.clientWidth) left = x - w - 14;
          if (left < 0) left = Math.max(0, Math.min(el.clientWidth - w, x - w / 2));
          var top = Math.max(0, y - h - 10);
          tip.style.left = left + "px";
          tip.style.top = top + "px";
        },
        hide: function () { tip.classList.remove("is-on"); }
      };
    }

    function svgFor(el, width, height, label) {
      d3.select(el).selectAll("svg").remove();
      return d3.select(el).insert("svg", ":first-child")
        .attr("viewBox", "0 0 " + width + " " + height)
        .attr("width", width)
        .attr("height", height)
        .attr("role", "img")
        .attr("aria-label", label);
    }

    /* horizontal bar with only the data end rounded */
    function hbar(x0, y, w, h, r) {
      r = Math.min(r, w, h / 2);
      if (w <= 0) return "";
      return "M" + x0 + "," + y +
        "H" + (x0 + w - r) +
        "Q" + (x0 + w) + "," + y + " " + (x0 + w) + "," + (y + r) +
        "V" + (y + h - r) +
        "Q" + (x0 + w) + "," + (y + h) + " " + (x0 + w - r) + "," + (y + h) +
        "H" + x0 + "Z";
    }

    function swatch(op) { return '<span class="dot" style="--c:' + color(op) + '"></span>'; }

    function tableHtml(caption, head, rows, numericCols) {
      var num = numericCols || [];
      return '<table class="chart-table"><caption class="visually-hidden">' + caption + "</caption><thead><tr>" +
        head.map(function (h, i) { return '<th scope="col"' + (num.indexOf(i) > -1 ? ' class="n"' : "") + ">" + h + "</th>"; }).join("") +
        "</tr></thead><tbody>" +
        rows.map(function (r) {
          return "<tr>" + r.map(function (c, i) {
            return i === 0 ? '<th scope="row">' + c + "</th>" : "<td" + (num.indexOf(i) > -1 ? ' class="n"' : "") + ">" + c + "</td>";
          }).join("") + "</tr>";
        }).join("") + "</tbody></table>";
    }

    /* legends */
    document.querySelectorAll('[data-legend="operators"]').forEach(function (ul) {
      ul.innerHTML = OPS.map(function (op) {
        return '<li><span class="swatch" style="--c: var(--series-' + op + ')"></span>' + OP_LABEL[op] + "</li>";
      }).join("");
    });

    /* table toggles */
    document.querySelectorAll(".table-toggle").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var target = document.getElementById(btn.getAttribute("aria-controls"));
        var open = btn.getAttribute("aria-expanded") !== "true";
        btn.setAttribute("aria-expanded", String(open));
        btn.textContent = open ? "Hide data table" : "Show data table";
        target.hidden = !open;
      });
    });

    /* ---------- Data prep ---------- */
    var parks = D.PARKS.filter(function (p) { return D.ATTENDANCE[p.id]; }).map(function (p) {
      var a = D.ATTENDANCE[p.id];
      return { id: p.id, name: p.name, short: PARK_SHORT[p.id], op: p.operator, v: a[LAST], prev: a[LAST - 1] };
    }).sort(function (a, b) { return b.v - a.v; });

    var byOperator = OPS.map(function (op) {
      return {
        op: op,
        values: YEARS.map(function (year, i) {
          var total = D.PARKS.filter(function (p) { return p.operator === op && D.ATTENDANCE[p.id]; })
            .reduce(function (s, p) { return s + D.ATTENDANCE[p.id][i]; }, 0);
          return { year: year, v: total };
        })
      };
    });

    var rides = C.Store.all();

    /* ---------- KPIs ---------- */
    (function kpis() {
      var total = d3.sum(parks, function (p) { return p.v; });
      var prev = d3.sum(parks, function (p) { return p.prev; });
      var change = total / prev - 1;
      document.getElementById("kpi-total").textContent = fmtM(total);
      document.getElementById("kpi-total-sub").textContent = (change < 0 ? "Down " : "Up ") + Math.abs(change * 100).toFixed(1) + "% from 2023";
      document.getElementById("kpi-share").textContent = Math.round(total / D.NA_TOP20_TOTAL_2024 * 100) + "%";
      document.getElementById("kpi-share-sub").textContent = parks.length + " of the 20 parks are in Florida";
      document.getElementById("kpi-top").textContent = fmtM(parks[0].v);
      document.getElementById("kpi-top-sub").textContent = C.fmtInt(parks[0].v) + " visits";

      var fastest = rides.filter(function (r) { return r.topSpeed !== null && r.topSpeed !== undefined; })
        .sort(function (a, b) { return b.topSpeed - a.topSpeed; })[0];
      document.getElementById("kpi-fast").textContent = fastest ? C.fmtSpeed(fastest.topSpeed) : "None";
      document.getElementById("kpi-fast-sub").textContent = fastest ? fastest.name + ", " + C.parkName(fastest.park) : "No speed-rated rides in the database";
    })();

    /* ---------- Chart 1: visitors per park ---------- */
    (function attendance() {
      var el = document.getElementById("chart-attendance");
      var tip = makeTooltip(el);

      responsive(el, function (width) {
        var narrow = width < 480;
        var m = { top: 8, right: 52, bottom: 28, left: narrow ? 128 : 150 };
        var rowH = 34;
        var height = m.top + m.bottom + parks.length * rowH;
        var svg = svgFor(el, width, height, "Bar chart of 2024 visitors for eight Florida theme parks. Magic Kingdom leads with " + fmtM(parks[0].v) + ".");

        var x = d3.scaleLinear().domain([0, d3.max(parks, function (p) { return p.v; })]).nice().range([m.left, width - m.right]);
        var y = d3.scaleBand().domain(parks.map(function (p) { return p.id; })).range([m.top, height - m.bottom]).padding(0.32);

        svg.append("g").attr("class", "axis").attr("transform", "translate(0," + (height - m.bottom) + ")")
          .call(d3.axisBottom(x).ticks(narrow ? 3 : 5).tickSize(-(height - m.top - m.bottom)).tickFormat(function (v) { return v === 0 ? "0" : v / 1e6 + "M"; }))
          .call(function (g) { g.selectAll("line").attr("class", "gridline"); });

        svg.append("g").attr("class", "axis y-cat").attr("transform", "translate(" + (m.left - 8) + ",0)")
          .call(d3.axisLeft(y).tickSize(0).tickFormat(function (id) { return PARK_SHORT[id]; }))
          .call(function (g) { g.selectAll("text").attr("font-size", 12.5).style("fill", "var(--ink)"); });

        svg.append("line").attr("class", "baseline").attr("x1", m.left).attr("x2", m.left).attr("y1", m.top).attr("y2", height - m.bottom);

        var bars = svg.append("g").selectAll("path").data(parks).join("path")
          .attr("class", "mark")
          .attr("fill", function (p) { return color(p.op); })
          .attr("d", function (p) { return hbar(m.left, y(p.id), x(p.v) - m.left, y.bandwidth(), 4); });

        svg.append("g").selectAll("text").data(parks).join("text")
          .attr("class", "value-label")
          .attr("x", function (p) { return x(p.v) + 6; })
          .attr("y", function (p) { return y(p.id) + y.bandwidth() / 2; })
          .attr("dy", "0.35em")
          .text(function (p) { return fmtM(p.v); });

        svg.append("g").selectAll("rect").data(parks).join("rect")
          .attr("class", "hit")
          .attr("x", 0).attr("width", width)
          .attr("y", function (p) { return y(p.id) - (y.step() - y.bandwidth()) / 2; })
          .attr("height", y.step())
          .on("pointermove", function (event, p) {
            bars.classed("is-dim", function (d) { return d !== p; });
            var pt = d3.pointer(event, el);
            tip.show("<strong>" + C.escapeHtml(p.name) + "</strong>" +
              '<div class="row"><span>' + swatch(p.op) + OP_SHORT[p.op] + "</span></div>" +
              '<div class="row"><span>2024 visitors</span><b>' + C.fmtInt(p.v) + "</b></div>" +
              '<div class="row"><span>Change from 2023</span><b>' + fmtPct(p.v / p.prev - 1) + "</b></div>", pt[0], pt[1]);
          })
          .on("pointerleave", function () { bars.classed("is-dim", false); tip.hide(); });
      });

      document.getElementById("table-attendance").innerHTML = tableHtml(
        "Visitors per park, 2023 and 2024",
        ["Park", "Operator", "2023", "2024", "Change"],
        parks.map(function (p) {
          return [C.escapeHtml(p.name), OP_SHORT[p.op], C.fmtInt(p.prev), C.fmtInt(p.v), fmtPct(p.v / p.prev - 1)];
        }), [2, 3, 4]);
    })();

    /* ---------- Chart 2: operator trend ---------- */
    (function trend() {
      var el = document.getElementById("chart-trend");
      var tip = makeTooltip(el);

      responsive(el, function (width) {
        var narrow = width < 520;
        var m = { top: 16, right: narrow ? 76 : 128, bottom: 30, left: 44 };
        var height = 300;
        var svg = svgFor(el, width, height, "Line chart of yearly visitors by operator from 2021 to 2024. Disney grew from " +
          fmtM(byOperator[0].values[0].v) + " to " + fmtM(byOperator[0].values[LAST].v) + ".");

        var x = d3.scalePoint().domain(YEARS).range([m.left, width - m.right]).padding(0.15);
        var maxV = d3.max(byOperator, function (s) { return d3.max(s.values, function (d) { return d.v; }); });
        var y = d3.scaleLinear().domain([0, maxV]).nice().range([height - m.bottom, m.top]);

        svg.append("g").attr("class", "axis").attr("transform", "translate(" + m.left + ",0)")
          .call(d3.axisLeft(y).ticks(5).tickSize(-(width - m.left - m.right)).tickFormat(function (v) { return v === 0 ? "0" : v / 1e6 + "M"; }))
          .call(function (g) { g.selectAll("line").attr("class", "gridline"); g.selectAll("text").attr("x", -8); });

        svg.append("g").attr("class", "axis").attr("transform", "translate(0," + (height - m.bottom) + ")")
          .call(d3.axisBottom(x).tickSize(0).tickPadding(10));

        svg.append("line").attr("class", "baseline").attr("x1", m.left).attr("x2", width - m.right).attr("y1", y(0)).attr("y2", y(0));

        var line = d3.line().x(function (d) { return x(d.year); }).y(function (d) { return y(d.v); });

        var series = svg.append("g").selectAll("g").data(byOperator).join("g").attr("class", "mark");
        series.append("path")
          .attr("fill", "none")
          .attr("stroke", function (s) { return color(s.op); })
          .attr("stroke-width", 2)
          .attr("stroke-linejoin", "round")
          .attr("d", function (s) { return line(s.values); });
        series.selectAll("circle").data(function (s) { return s.values.map(function (v) { return { op: s.op, year: v.year, v: v.v }; }); })
          .join("circle")
          .attr("cx", function (d) { return x(d.year); })
          .attr("cy", function (d) { return y(d.v); })
          .attr("r", 4)
          .attr("fill", function (d) { return color(d.op); })
          .attr("stroke", "var(--surface)")
          .attr("stroke-width", 2);

        /* direct labels at the line ends */
        series.append("text")
          .attr("class", "series-label")
          .attr("x", width - m.right + 10)
          .attr("y", function (s) { return y(s.values[LAST].v); })
          .attr("dy", "0.35em")
          .text(function (s) { return narrow ? OP_SHORT[s.op].replace(" Parks", "") : OP_SHORT[s.op] + " " + fmtM(s.values[LAST].v); });

        var cross = svg.append("line").attr("class", "crosshair").attr("y1", m.top).attr("y2", height - m.bottom).style("opacity", 0);

        svg.append("rect").attr("class", "hit")
          .attr("x", m.left).attr("y", m.top).attr("width", width - m.left - m.right).attr("height", height - m.top - m.bottom)
          .on("pointermove", function (event) {
            var px = d3.pointer(event)[0];
            var year = YEARS.reduce(function (best, yr) { return Math.abs(x(yr) - px) < Math.abs(x(best) - px) ? yr : best; }, YEARS[0]);
            var i = YEARS.indexOf(year);
            cross.attr("x1", x(year)).attr("x2", x(year)).style("opacity", 1);
            series.selectAll("circle").attr("r", function (d) { return d.year === year ? 6 : 4; });
            var rows = byOperator.slice().sort(function (a, b) { return b.values[i].v - a.values[i].v; }).map(function (s) {
              return '<div class="row"><span>' + swatch(s.op) + OP_SHORT[s.op] + "</span><b>" + fmtM(s.values[i].v) + "</b></div>";
            }).join("");
            var pt = d3.pointer(event, el);
            tip.show("<strong>" + year + "</strong>" + rows, x(year) * el.clientWidth / width, pt[1]);
          })
          .on("pointerleave", function () {
            cross.style("opacity", 0);
            series.selectAll("circle").attr("r", 4);
            tip.hide();
          });
      });

      document.getElementById("table-trend").innerHTML = tableHtml(
        "Yearly visitors by operator",
        ["Year"].concat(OPS.map(function (op) { return OP_SHORT[op]; })).concat(["Total"]),
        YEARS.map(function (yr, i) {
          var vals = byOperator.map(function (s) { return s.values[i].v; });
          return [String(yr)].concat(vals.map(C.fmtInt)).concat([C.fmtInt(d3.sum(vals))]);
        }), [1, 2, 3, 4]);
    })();

    /* ---------- Chart 3: top speeds ---------- */
    (function speeds() {
      var el = document.getElementById("chart-speed");
      var tip = makeTooltip(el);
      var rated = rides.filter(function (r) { return r.topSpeed !== null && r.topSpeed !== undefined; })
        .map(function (r) { return { id: r.id, name: r.name, park: r.park, op: C.operatorOf(r.park), v: r.topSpeed, minHeight: r.minHeight }; })
        .sort(function (a, b) { return b.v - a.v || a.name.localeCompare(b.name); });
      var LIMIT = 12;
      var shown = rated.slice(0, LIMIT);

      var lede = document.getElementById("speed-lede");
      if (!rated.length) {
        lede.textContent = "No rides in the database have a top speed yet.";
        el.innerHTML = '<p class="muted">Add a top speed to a ride on the <a href="managerides.html">Manage rides</a> page.</p>';
        return;
      }
      lede.textContent = rated[0].name + " at " + C.parkName(rated[0].park) + " leads at " + C.fmtSpeed(rated[0].v) +
        (rated.length > LIMIT ? ". Showing the top " + LIMIT + " of " + rated.length + " speed-rated rides." : ".");

      responsive(el, function (width) {
        var narrow = width < 440;
        var m = { top: 4, right: 58, bottom: 28, left: narrow ? 130 : 176 };
        var rowH = 28;
        var height = m.top + m.bottom + shown.length * rowH;
        var svg = svgFor(el, width, height, "Bar chart of top speeds. " + rated[0].name + " is fastest at " + C.fmtSpeed(rated[0].v) + ".");

        var x = d3.scaleLinear().domain([0, d3.max(shown, function (r) { return r.v; })]).nice().range([m.left, width - m.right]);
        var y = d3.scaleBand().domain(shown.map(function (r) { return r.id; })).range([m.top, height - m.bottom]).padding(0.3);
        var nameById = {};
        shown.forEach(function (r) { nameById[r.id] = shortRide(r.name, narrow ? 17 : 25); });

        svg.append("g").attr("class", "axis").attr("transform", "translate(0," + (height - m.bottom) + ")")
          .call(d3.axisBottom(x).ticks(narrow ? 3 : 4).tickSize(-(height - m.top - m.bottom)).tickFormat(function (v) { return v + " mph"; }))
          .call(function (g) { g.selectAll("line").attr("class", "gridline"); });

        svg.append("g").attr("class", "axis y-cat").attr("transform", "translate(" + (m.left - 8) + ",0)")
          .call(d3.axisLeft(y).tickSize(0).tickFormat(function (id) { return nameById[id]; }))
          .call(function (g) { g.selectAll("text").attr("font-size", 12.5).style("fill", "var(--ink)"); });

        svg.append("line").attr("class", "baseline").attr("x1", m.left).attr("x2", m.left).attr("y1", m.top).attr("y2", height - m.bottom);

        var bars = svg.append("g").selectAll("path").data(shown).join("path")
          .attr("class", "mark")
          .attr("fill", function (r) { return color(r.op); })
          .attr("d", function (r) { return hbar(m.left, y(r.id), x(r.v) - m.left, y.bandwidth(), 4); });

        svg.append("g").selectAll("text").data(shown).join("text")
          .attr("class", "value-label")
          .attr("x", function (r) { return x(r.v) + 6; })
          .attr("y", function (r) { return y(r.id) + y.bandwidth() / 2; })
          .attr("dy", "0.35em")
          .text(function (r) { return C.fmtSpeed(r.v); });

        svg.append("g").selectAll("rect").data(shown).join("rect")
          .attr("class", "hit")
          .attr("x", 0).attr("width", width)
          .attr("y", function (r) { return y(r.id) - (y.step() - y.bandwidth()) / 2; })
          .attr("height", y.step())
          .on("pointermove", function (event, r) {
            bars.classed("is-dim", function (d) { return d !== r; });
            var pt = d3.pointer(event, el);
            tip.show("<strong>" + C.escapeHtml(r.name) + "</strong>" +
              '<div class="row"><span>' + swatch(r.op) + C.escapeHtml(C.parkName(r.park)) + "</span></div>" +
              '<div class="row"><span>Top speed</span><b>' + C.fmtSpeed(r.v) + "</b></div>" +
              '<div class="row"><span>Minimum height</span><b>' + C.fmtHeight(r.minHeight) + "</b></div>", pt[0], pt[1]);
          })
          .on("pointerleave", function () { bars.classed("is-dim", false); tip.hide(); });
      });

      document.getElementById("table-speed").innerHTML = tableHtml(
        "Top speed of every speed-rated ride",
        ["Ride", "Park", "Top speed"],
        rated.map(function (r) { return [C.escapeHtml(r.name), C.escapeHtml(C.parkName(r.park)), C.fmtSpeed(r.v)]; }), [2]);
    })();

    /* ---------- Chart 4: rides open at each height ---------- */
    (function heights() {
      var el = document.getElementById("chart-height");
      var range = document.getElementById("a-height");
      var out = document.getElementById("a-height-out");
      var tip = makeTooltip(el);
      var H_MIN = 30;
      var H_MAX = 60;
      var total = rides.length;

      function openAt(h) { return rides.filter(function (r) { return r.minHeight <= h; }).length; }
      var points = d3.range(H_MIN, H_MAX + 1).map(function (h) { return { h: h, n: openAt(h) }; });

      /* the two biggest jumps, for the caption */
      var jumps = d3.range(H_MIN + 1, H_MAX + 1).map(function (h) {
        return { h: h, gain: openAt(h) - openAt(h - 1) };
      }).filter(function (j) { return j.gain > 0; }).sort(function (a, b) { return b.gain - a.gain || a.h - b.h; });
      if (jumps.length >= 2) {
        var j = jumps.slice(0, 2).sort(function (a, b) { return a.h - b.h; });
        document.getElementById("height-lede").textContent = "The biggest jumps come at " + j[0].h + " inches (+" + j[0].gain +
          ") and " + j[1].h + " inches (+" + j[1].gain + ").";
      }

      var redraw = responsive(el, function (width) {
        var current = parseInt(range.value, 10);
        var m = { top: 24, right: 16, bottom: 36, left: 36 };
        var height = 300;
        var svg = svgFor(el, width, height, "Step chart of rides open by rider height. At " + current + " inches, " + openAt(current) + " of " + total + " rides are open.");

        var x = d3.scaleLinear().domain([H_MIN, H_MAX]).range([m.left, width - m.right]);
        var y = d3.scaleLinear().domain([0, Math.max(total, 1)]).nice().range([height - m.bottom, m.top]);

        svg.append("g").attr("class", "axis").attr("transform", "translate(" + m.left + ",0)")
          .call(d3.axisLeft(y).ticks(5).tickSize(-(width - m.left - m.right)))
          .call(function (g) { g.selectAll("line").attr("class", "gridline"); g.selectAll("text").attr("x", -8); });

        svg.append("g").attr("class", "axis").attr("transform", "translate(0," + (height - m.bottom) + ")")
          .call(d3.axisBottom(x).tickValues(d3.range(H_MIN, H_MAX + 1, 6)).tickSize(0).tickPadding(10).tickFormat(function (v) { return v + " in"; }));

        svg.append("line").attr("class", "baseline").attr("x1", m.left).attr("x2", width - m.right).attr("y1", y(0)).attr("y2", y(0));

        svg.append("path")
          .attr("fill", "none")
          .attr("stroke", "var(--lagoon)")
          .attr("stroke-width", 2.5)
          .attr("stroke-linejoin", "round")
          .attr("d", d3.line().curve(d3.curveStepAfter).x(function (d) { return x(d.h); }).y(function (d) { return y(d.n); })(points));

        /* marker for the chosen height */
        var n = openAt(current);
        var mx = x(current);
        var g = svg.append("g");
        g.append("line").attr("class", "marker-line").attr("x1", mx).attr("x2", mx).attr("y1", y(0)).attr("y2", y(n));
        g.append("circle").attr("cx", mx).attr("cy", y(n)).attr("r", 5.5).attr("fill", "var(--sign)").attr("stroke", "var(--ink)").attr("stroke-width", 2);
        var anchorEnd = mx > width - 120;
        g.append("text").attr("class", "value-label halo")
          .attr("x", mx + (anchorEnd ? -10 : 10)).attr("y", y(n) - 10)
          .attr("text-anchor", anchorEnd ? "end" : "start")
          .text(n + " of " + total + " rides");

        var cross = svg.append("line").attr("class", "crosshair").attr("y1", m.top).attr("y2", height - m.bottom).style("opacity", 0);

        svg.append("rect").attr("class", "hit")
          .attr("x", m.left).attr("y", m.top).attr("width", width - m.left - m.right).attr("height", height - m.top - m.bottom)
          .on("pointermove", function (event) {
            var h = Math.round(x.invert(d3.pointer(event)[0]));
            h = Math.max(H_MIN, Math.min(H_MAX, h));
            cross.attr("x1", x(h)).attr("x2", x(h)).style("opacity", 1);
            var unlocked = rides.filter(function (r) { return r.minHeight === h; });
            var pt = d3.pointer(event, el);
            tip.show("<strong>" + h + " inches</strong>" +
              '<div class="row"><span>Rides open</span><b>' + openAt(h) + " of " + total + "</b></div>" +
              (unlocked.length ? '<div class="row"><span>New here: ' + unlocked.map(function (r) { return C.escapeHtml(shortRide(r.name, 28)); }).join(", ") + "</span></div>" : ""),
              x(h) * el.clientWidth / width, pt[1]);
          })
          .on("pointerleave", function () { cross.style("opacity", 0); tip.hide(); });
      });

      range.addEventListener("input", function () {
        var h = parseInt(range.value, 10);
        out.textContent = h + " in";
        range.setAttribute("aria-valuetext", h + " inches, " + openAt(h) + " of " + total + " rides open");
        redraw();
      });

      var levels = Array.from(new Set(rides.map(function (r) { return r.minHeight; }))).sort(function (a, b) { return a - b; });
      document.getElementById("table-height").innerHTML = tableHtml(
        "Rides by minimum height",
        ["Minimum height", "Rides with this minimum", "Rides open at this height"],
        levels.map(function (lv) {
          return [lv === 0 ? "No minimum" : lv + " in", String(rides.filter(function (r) { return r.minHeight === lv; }).length), String(openAt(lv)) + " of " + total];
        }), [1, 2]);
    })();
  }
})();
