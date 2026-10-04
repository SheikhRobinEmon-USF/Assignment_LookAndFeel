/* Coaster Coast: Manage rides page (mock CRUD on the shared ride store) */
(function () {
  "use strict";

  var C = window.Coaster;
  var D = window.CoasterData;
  var Store = C.Store;

  var $ = function (id) { return document.getElementById(id); };

  var state = { q: "", park: "", type: "", height: "", sortKey: "name", sortDir: "ascending" };
  var editingId = null;
  var pendingConfirm = null;

  /* ---------- Select options ---------- */
  function fillSelect(select, items) {
    items.forEach(function (item) {
      var o = document.createElement("option");
      o.value = item.value;
      o.textContent = item.label;
      select.appendChild(o);
    });
  }
  var parkOptions = D.PARKS.map(function (p) { return { value: p.id, label: p.name }; });
  var typeOptions = D.RIDE_TYPES.map(function (t) { return { value: t, label: t }; });
  fillSelect($("f-park"), parkOptions);
  fillSelect($("f-type"), typeOptions);
  fillSelect($("f-ride-park"), parkOptions);
  fillSelect($("f-ride-type"), typeOptions);

  /* ---------- Read: filter, sort, render ---------- */
  function matches(r) {
    if (state.park && r.park !== state.park) return false;
    if (state.type && r.type !== state.type) return false;
    if (state.height) {
      var lim = state.height.split("-").map(Number);
      if (r.minHeight < lim[0] || r.minHeight > lim[1]) return false;
    }
    if (state.q) {
      var hay = (r.name + " " + C.parkName(r.park) + " " + r.type).toLowerCase();
      var terms = state.q.toLowerCase().split(/\s+/).filter(Boolean);
      if (!terms.every(function (t) { return hay.indexOf(t) !== -1; })) return false;
    }
    return true;
  }

  function compare(a, b) {
    var k = state.sortKey;
    var dir = state.sortDir === "ascending" ? 1 : -1;
    var va = a[k];
    var vb = b[k];
    if (va === null || va === undefined) return 1;   /* unrated speeds always sort last */
    if (vb === null || vb === undefined) return -1;
    if (typeof va === "string") return va.localeCompare(vb) * dir || a.name.localeCompare(b.name);
    return (va - vb) * dir || a.name.localeCompare(b.name);
  }

  function actionButton(kind, label, ride) {
    var iconName = kind === "view" ? "eye" : kind === "edit" ? "edit" : "trash";
    return '<button class="icon-btn' + (kind === "delete" ? " is-danger" : "") + '" type="button" data-action="' + kind +
      '" data-id="' + ride.id + '" aria-label="' + label + " " + C.escapeHtml(ride.name) + '" title="' + label + '">' + C.icon(iconName) + "</button>";
  }

  function render(highlightId) {
    var all = Store.all();
    var rows = all.filter(matches).sort(compare);

    $("rides-body").innerHTML = rows.map(function (r) {
      return '<tr data-id="' + r.id + '"' + (r.id === highlightId ? ' class="is-new"' : "") + ">" +
        '<td class="ride-cell"><strong>' + C.escapeHtml(r.name) + "</strong><span>" + C.escapeHtml(C.parkName(r.park)) + "</span></td>" +
        '<td class="type" data-label="Type">' + C.escapeHtml(r.type) + "</td>" +
        '<td class="n" data-label="Min height">' + C.fmtHeight(r.minHeight) + "</td>" +
        '<td class="n" data-label="Top speed">' + (r.topSpeed === null ? '<span class="muted">Not rated</span>' : C.fmtSpeed(r.topSpeed)) + "</td>" +
        '<td class="n" data-label="Opened">' + r.opened + "</td>" +
        '<td class="actions">' + actionButton("view", "View", r) + actionButton("edit", "Edit", r) + actionButton("delete", "Delete", r) + "</td></tr>";
    }).join("");

    var filtered = state.q || state.park || state.type || state.height;
    $("result-count").textContent = filtered
      ? "Showing " + rows.length + " of " + all.length + " rides"
      : "Showing all " + all.length + " rides";

    var empty = rows.length === 0;
    $("empty-state").hidden = !empty;
    $("rides-table").hidden = empty;
    if (empty) {
      $("empty-text").textContent = all.length === 0
        ? "The database is empty. Add a ride or reset the sample data."
        : "Try a different search or clear the filters.";
      $("clear-filters").hidden = all.length === 0;
    }
    $("modified-badge").hidden = !Store.isModified();

    document.querySelectorAll("#rides-table th[data-sort]").forEach(function (th) {
      if (th.dataset.sort === state.sortKey) th.setAttribute("aria-sort", state.sortDir);
      else th.removeAttribute("aria-sort");
    });
  }

  /* ---------- Filters and sorting ---------- */
  $("filters").addEventListener("submit", function (e) { e.preventDefault(); });
  $("q").addEventListener("input", function (e) { state.q = e.target.value.trim(); render(); });
  $("f-park").addEventListener("change", function (e) { state.park = e.target.value; render(); });
  $("f-type").addEventListener("change", function (e) { state.type = e.target.value; render(); });
  $("f-height").addEventListener("change", function (e) { state.height = e.target.value; render(); });

  function clearFilters() {
    state.q = state.park = state.type = state.height = "";
    $("q").value = "";
    $("f-park").value = "";
    $("f-type").value = "";
    $("f-height").value = "";
    render();
  }
  $("clear-filters").addEventListener("click", function () { clearFilters(); $("q").focus(); });

  document.querySelectorAll("#rides-table th[data-sort] .sort-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var key = btn.parentElement.dataset.sort;
      if (state.sortKey === key) state.sortDir = state.sortDir === "ascending" ? "descending" : "ascending";
      else { state.sortKey = key; state.sortDir = "ascending"; }
      render();
    });
  });

  /* ---------- Dialog helpers ----------
   * Each dialog remembers what to focus when it closes, so keyboard users
   * land back where they started (or on a sensible spot if that row is gone).
   */
  function openDialog(dialog, returnTo) {
    dialog._returnTo = returnTo || document.activeElement;
    dialog.showModal();
  }
  function closeDialog(dialog, returnTo) {
    if (returnTo !== undefined) dialog._returnTo = returnTo;
    if (dialog.open) dialog.close();
  }
  document.querySelectorAll("dialog.modal").forEach(function (dialog) {
    dialog.addEventListener("click", function (e) {
      if (e.target.closest("[data-close]")) closeDialog(dialog);
      else if (e.target === dialog) closeDialog(dialog);   /* click on the backdrop */
    });
    dialog.addEventListener("close", function () {
      if (document.querySelector("dialog.modal[open]")) return;   /* another dialog took over */
      var target = dialog._returnTo;
      if (target && document.contains(target)) target.focus();
      else $("add-ride").focus();
    });
  });

  /* ---------- Create and update ---------- */
  var form = $("ride-form");
  var fields = {
    name: $("f-name"),
    park: $("f-ride-park"),
    type: $("f-ride-type"),
    minHeight: $("f-min"),
    noMin: $("f-nomin"),
    topSpeed: $("f-speed"),
    opened: $("f-opened"),
    notes: $("f-notes")
  };
  var errorTargets = {
    name: "f-name-error", park: "f-ride-park-error", type: "f-ride-type-error",
    minHeight: "f-min-error", topSpeed: "f-speed-error", opened: "f-opened-error"
  };

  function syncNoMin() {
    fields.minHeight.disabled = fields.noMin.checked;
    if (fields.noMin.checked) { fields.minHeight.value = ""; setError("minHeight", ""); }
  }
  fields.noMin.addEventListener("change", syncNoMin);

  function syncNotesCount() {
    $("f-notes-count").textContent = fields.notes.value.length + " of 200 characters";
  }
  fields.notes.addEventListener("input", syncNotesCount);

  function setError(key, msg) {
    var input = fields[key];
    $(errorTargets[key]).textContent = msg;
    if (msg) input.setAttribute("aria-invalid", "true");
    else input.removeAttribute("aria-invalid");
  }

  function clearErrors() {
    Object.keys(errorTargets).forEach(function (k) { setError(k, ""); });
  }

  function openForm(ride, returnTo) {
    editingId = ride ? ride.id : null;
    form.reset();
    clearErrors();
    $("ride-dialog-title").textContent = ride ? "Edit ride" : "Add ride";
    $("ride-submit").textContent = ride ? "Save changes" : "Add ride";
    if (ride) {
      fields.name.value = ride.name;
      fields.park.value = ride.park;
      fields.type.value = ride.type;
      fields.noMin.checked = ride.minHeight === 0;
      fields.minHeight.value = ride.minHeight === 0 ? "" : ride.minHeight;
      fields.topSpeed.value = ride.topSpeed === null ? "" : ride.topSpeed;
      fields.opened.value = ride.opened;
      fields.notes.value = ride.notes || "";
    } else {
      fields.opened.value = new Date().getFullYear();
    }
    syncNoMin();
    syncNotesCount();
    openDialog($("ride-dialog"), returnTo);
    fields.name.focus();
  }

  function readNumber(input) {
    var raw = input.value.trim();
    if (raw === "") return { empty: true, value: null };
    var n = Number(raw);
    return { empty: false, value: n, valid: isFinite(n) };
  }

  function validate() {
    var errors = {};
    var out = {};

    var name = fields.name.value.replace(/\s+/g, " ").trim();
    if (!name) errors.name = "Enter the ride name.";
    else if (name.length < 2) errors.name = "Ride names need at least 2 characters.";
    out.name = name;

    out.park = fields.park.value;
    if (!out.park) errors.park = "Choose the park this ride is in.";

    out.type = fields.type.value;
    if (!out.type) errors.type = "Choose a ride type.";

    if (name && out.park) {
      var dupe = Store.all().some(function (r) {
        return r.id !== editingId && r.park === out.park && r.name.toLowerCase() === name.toLowerCase();
      });
      if (dupe) errors.name = C.parkName(out.park) + " already has a ride with this name.";
    }

    if (fields.noMin.checked) {
      out.minHeight = 0;
    } else {
      var h = readNumber(fields.minHeight);
      if (h.empty) errors.minHeight = "Enter a minimum height, or tick No minimum height.";
      else if (!h.valid || !Number.isInteger(h.value) || h.value < 30 || h.value > 60) errors.minHeight = "Use a whole number from 30 to 60.";
      out.minHeight = h.value;
    }

    var s = readNumber(fields.topSpeed);
    if (s.empty) out.topSpeed = null;
    else if (!s.valid || s.value < 1 || s.value > 150) errors.topSpeed = "Use a speed from 1 to 150 mph, or leave it blank.";
    else out.topSpeed = Math.round(s.value * 10) / 10;

    var y = readNumber(fields.opened);
    var maxYear = new Date().getFullYear() + 4;
    if (y.empty) errors.opened = "Enter the year the ride opened.";
    else if (!y.valid || !Number.isInteger(y.value) || y.value < 1955 || y.value > maxYear) errors.opened = "Use a year from 1955 to " + maxYear + ".";
    else if (out.park && C.park(out.park) && y.value < C.park(out.park).opened) {
      errors.opened = C.parkName(out.park) + " opened in " + C.park(out.park).opened + ", so the ride can't be older.";
    }
    out.opened = y.value;

    out.notes = fields.notes.value.trim();
    return { errors: errors, values: out };
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var result = validate();
    clearErrors();
    var keys = Object.keys(result.errors);
    if (keys.length) {
      keys.forEach(function (k) { setError(k, result.errors[k]); });
      var order = ["name", "park", "type", "minHeight", "topSpeed", "opened"];
      var first = order.filter(function (k) { return result.errors[k]; })[0];
      fields[first].focus();
      return;
    }
    var v = result.values;
    var saved;
    if (editingId) {
      saved = Store.update(editingId, v);
      C.toast("Saved changes to " + saved.name);
    } else {
      saved = Store.create(v);
      C.toast(matches(saved) ? "Added " + saved.name : "Added " + saved.name + ". Clear the filters to see it.");
    }
    render(saved.id);
    var row = document.querySelector('#rides-body tr[data-id="' + saved.id + '"]');
    closeDialog($("ride-dialog"), row ? row.querySelector('[data-action="edit"]') : null);
    if (row) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  /* live re-validation once a field has shown an error */
  Object.keys(errorTargets).forEach(function (k) {
    fields[k].addEventListener("input", function () {
      if (fields[k].getAttribute("aria-invalid") === "true") {
        var msg = validate().errors[k] || "";
        setError(k, msg);
      }
    });
  });

  $("add-ride").addEventListener("click", function () { openForm(null); });

  /* ---------- Read: details dialog ---------- */
  var viewingId = null;
  function openView(ride) {
    viewingId = ride.id;
    var p = C.park(ride.park);
    $("view-title").textContent = ride.name;
    $("view-park").textContent = p ? p.name + ", " + p.city : "";
    var rows = [
      ["Ride type", ride.type],
      ["Minimum height", ride.minHeight ? ride.minHeight + " in (" + C.inToCm(ride.minHeight) + " cm)" : "No minimum"],
      ["Top speed", C.fmtSpeed(ride.topSpeed)],
      ["Opened", String(ride.opened)],
      ["Operator", p ? D.OPERATORS[p.operator].name : ""]
    ];
    $("view-details").innerHTML = rows.map(function (r) {
      return "<dt>" + r[0] + "</dt><dd>" + C.escapeHtml(r[1]) + "</dd>";
    }).join("");
    $("view-notes").textContent = ride.notes || "No notes yet.";
    openDialog($("view-dialog"));
  }
  $("view-edit").addEventListener("click", function () {
    var ride = Store.get(viewingId);
    var dialog = $("view-dialog");
    var returnTo = dialog._returnTo;
    closeDialog(dialog);
    if (ride) openForm(ride, returnTo);
  });

  /* ---------- Delete and reset (shared confirm dialog) ---------- */
  function confirmAction(opts) {
    $("delete-title").textContent = opts.title;
    $("delete-text").textContent = opts.text;
    $("delete-confirm").textContent = opts.confirm;
    pendingConfirm = opts.onConfirm;
    openDialog($("delete-dialog"));
    $("delete-dialog").querySelector("[data-close]").focus();
  }
  $("delete-confirm").addEventListener("click", function () {
    var fn = pendingConfirm;
    pendingConfirm = null;
    if (fn) fn();
    closeDialog($("delete-dialog"));
  });

  function deleteRide(ride) {
    confirmAction({
      title: "Delete " + ride.name + "?",
      text: "This removes " + ride.name + " from the " + C.parkName(ride.park) + " list, the height checker and the charts. You can undo it right after.",
      confirm: "Delete ride",
      onConfirm: function () {
        var removed = Store.remove(ride.id);
        render();
        C.toast("Deleted " + ride.name, {
          label: "Undo",
          onClick: function () {
            Store.restore(removed.ride, removed.index);
            render(removed.ride.id);
            var row = document.querySelector('#rides-body tr[data-id="' + removed.ride.id + '"]');
            if (row) row.querySelector('[data-action="edit"]').focus();
            C.toast("Restored " + ride.name);
          }
        });
      }
    });
  }

  $("reset-data").addEventListener("click", function () {
    confirmAction({
      title: "Reset sample data?",
      text: "This brings back the original " + D.RIDES.length + " rides and removes every add, edit and delete made in this tab.",
      confirm: "Reset data",
      onConfirm: function () {
        Store.reset();
        clearFilters();
        C.toast("Sample data restored");
      }
    });
  });

  /* ---------- Row actions (event delegation) ---------- */
  $("rides-body").addEventListener("click", function (e) {
    var btn = e.target.closest("button[data-action]");
    if (!btn) return;
    var ride = Store.get(btn.dataset.id);
    if (!ride) return;
    if (btn.dataset.action === "view") openView(ride);
    else if (btn.dataset.action === "edit") openForm(ride);
    else if (btn.dataset.action === "delete") deleteRide(ride);
  });

  render();
})();
