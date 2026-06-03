(function() {
  'use strict';

  var state = {
    trainers: [],
    availability: {},
    claims: {},
    trainerId: '',
    monthDate: startOfMonth(new Date()),
    selectedDate: '',
    selectedSlotId: ''
  };

  var basePath = window.__SITE_BASE_PATH || '';
  var fallbackCoachPhoto = basePath + '/images/home/coach-talk-wide.jpg';

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pad(value) {
    return String(value).padStart(2, '0');
  }

  function isoFromDate(date) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
  }

  function startOfMonth(date) {
    return new Date(date.getFullYear(), date.getMonth(), 1);
  }

  function parseIso(iso) {
    var parts = String(iso || '').split('-').map(function(part) { return +part; });
    if (parts.length !== 3 || parts.some(function(part) { return !Number.isFinite(part); })) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function formatDate(iso, options) {
    var date = parseIso(iso);
    if (!date) return iso || '';
    return date.toLocaleDateString('en-US', options || { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  }

  function toArray(value) {
    if (!value) return [];
    return Object.keys(value).map(function(key) {
      var item = value[key];
      if (item && typeof item === 'object') item._key = key;
      return item;
    }).filter(Boolean);
  }

  function normalizeAssetUrl(src) {
    if (!src) return '';
    if (/^(https?:|data:|blob:|\/\/)/i.test(src)) return src;
    return basePath + '/' + String(src).replace(/^\.?\//, '');
  }

  function getTrainer() {
    return state.trainers.find(function(trainer) { return trainer._key === state.trainerId; }) || null;
  }

  function getSlotsForDate(iso) {
    var slots = state.availability[state.trainerId] && state.availability[state.trainerId][iso];
    return toArray(slots)
      .filter(function(slot) { return slot.active !== false; })
      .sort(function(a, b) {
        return String(a.timeValue || a.time || '').localeCompare(String(b.timeValue || b.time || ''));
      });
  }

  function hasClaim(iso, slotId) {
    return !!(state.claims[state.trainerId] && state.claims[state.trainerId][iso] && state.claims[state.trainerId][iso][slotId]);
  }

  function getOpenSlotsForDate(iso) {
    return getSlotsForDate(iso).filter(function(slot) {
      return !hasClaim(iso, slot._key);
    });
  }

  function setStatus(message, isError) {
    var el = $('trainStatus');
    if (!el) return;
    el.textContent = message || '';
    el.classList.toggle('is-error', !!isError);
  }

  function renderTrainers() {
    var list = $('trainerList');
    if (!list) return;
    if (!state.trainers.length) {
      list.innerHTML = '<p class="v2-train-empty">No trainers are available yet.</p>';
      return;
    }
    list.innerHTML = state.trainers.map(function(trainer) {
      var photo = normalizeAssetUrl(trainer.photoUrl) || fallbackCoachPhoto;
      return '<button type="button" class="v2-trainer-option' + (trainer._key === state.trainerId ? ' is-selected' : '') + '" data-trainer-id="' + escapeHtml(trainer._key) + '">' +
        '<img src="' + escapeHtml(photo) + '" alt="">' +
        '<span><strong>' + escapeHtml(trainer.name || 'Trainer') + '</strong><span>' + escapeHtml(trainer.specialty || 'Baseball training') + '</span></span>' +
      '</button>';
    }).join('');
  }

  function renderCalendar() {
    var grid = $('trainCalendarGrid');
    var label = $('trainMonthLabel');
    if (!grid || !label) return;

    label.textContent = state.monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    var first = startOfMonth(state.monthDate);
    var cursor = new Date(first);
    cursor.setDate(1 - first.getDay());
    var todayIso = isoFromDate(new Date());
    var cells = [];

    for (var i = 0; i < 42; i += 1) {
      var iso = isoFromDate(cursor);
      var outside = cursor.getMonth() !== state.monthDate.getMonth();
      var openSlots = getOpenSlotsForDate(iso);
      var allSlots = getSlotsForDate(iso);
      var isPast = iso < todayIso;
      var disabled = isPast || !state.trainerId || !openSlots.length;
      var labelText = allSlots.length ? (openSlots.length ? openSlots.length + ' open' : 'Booked') : 'No times';
      cells.push('<button type="button" class="v2-train-day' +
        (outside ? ' is-outside' : '') +
        (disabled ? ' is-full' : '') +
        (iso === state.selectedDate ? ' is-selected' : '') +
        '" data-date="' + iso + '"' + (disabled ? ' disabled' : '') + '>' +
        '<span>' + cursor.getDate() + '</span><small>' + escapeHtml(labelText) + '</small></button>');
      cursor.setDate(cursor.getDate() + 1);
    }

    grid.innerHTML = cells.join('');
  }

  function renderSlots() {
    var list = $('trainSlotList');
    var label = $('trainSelectedDateLabel');
    var continueBtn = $('trainContinueBtn');
    if (!list || !label || !continueBtn) return;

    if (!state.selectedDate) {
      label.textContent = 'Select a date';
      list.innerHTML = '<p class="v2-train-empty">Choose an available date on the calendar.</p>';
      continueBtn.disabled = true;
      return;
    }

    label.textContent = formatDate(state.selectedDate, { weekday: 'long', month: 'long', day: 'numeric' });
    var slots = getOpenSlotsForDate(state.selectedDate);
    if (!slots.length) {
      list.innerHTML = '<p class="v2-train-empty">This date is fully booked.</p>';
      continueBtn.disabled = true;
      return;
    }

    list.innerHTML = slots.map(function(slot) {
      return '<button type="button" class="v2-train-slot' + (slot._key === state.selectedSlotId ? ' is-selected' : '') + '" data-slot-id="' + escapeHtml(slot._key) + '">' +
        '<strong>' + escapeHtml(slot.time || slot.timeValue || 'Training time') + '</strong>' +
      '</button>';
    }).join('');
    continueBtn.disabled = !state.selectedSlotId;
  }

  function render() {
    renderTrainers();
    renderCalendar();
    renderSlots();
  }

  function openModal() {
    var trainer = getTrainer();
    var slot = getOpenSlotsForDate(state.selectedDate).find(function(item) { return item._key === state.selectedSlotId; });
    var modal = $('trainRequestModal');
    if (!trainer || !slot || !modal) return;

    $('trainModalCoachPhoto').src = normalizeAssetUrl(trainer.photoUrl) || fallbackCoachPhoto;
    $('trainModalCoachPhoto').alt = trainer.name ? trainer.name + ' photo' : 'Coach photo';
    $('trainModalTitle').textContent = trainer.name || 'Training session';
    $('trainModalSpecialty').textContent = trainer.specialty || 'Baseball training';
    $('trainModalDetails').innerHTML =
      '<div><dt>Date</dt><dd>' + escapeHtml(formatDate(state.selectedDate)) + '</dd></div>' +
      '<div><dt>Time</dt><dd>' + escapeHtml(slot.time || slot.timeValue || '') + '</dd></div>' +
      '<div><dt>Location</dt><dd>' + escapeHtml(trainer.location || 'Timpanogos Baseball') + '</dd></div>' +
      '<div><dt>Coach</dt><dd>' + escapeHtml(trainer.name || 'Trainer') + '</dd></div>';
    $('trainFormStatus').textContent = '';
    modal.hidden = false;
    document.body.classList.add('v2-train-modal-open');
    setTimeout(function() {
      var input = $('trainCustomerName');
      if (input) input.focus();
    }, 0);
  }

  function closeModal() {
    var modal = $('trainRequestModal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('v2-train-modal-open');
  }

  function submitRequest(event) {
    event.preventDefault();
    var trainer = getTrainer();
    var slot = getOpenSlotsForDate(state.selectedDate).find(function(item) { return item._key === state.selectedSlotId; });
    var status = $('trainFormStatus');
    var button = event.target.querySelector('button[type="submit"]');
    if (!trainer || !slot || !status || !button) return;

    var requestRef = db.ref('appointmentRequests').push();
    var claimPath = 'appointmentClaims/' + trainer._key + '/' + state.selectedDate + '/' + slot._key;
    var now = new Date().toISOString();
    var claim = {
      appointmentId: requestRef.key,
      status: 'pending',
      createdAt: now
    };
    var request = {
      trainerId: trainer._key,
      trainerName: trainer.name || '',
      date: state.selectedDate,
      slotId: slot._key,
      time: slot.time || slot.timeValue || '',
      location: trainer.location || '',
      fullName: $('trainCustomerName').value.trim(),
      phone: $('trainCustomerPhone').value.trim(),
      email: $('trainCustomerEmail').value.trim(),
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };

    button.disabled = true;
    status.textContent = 'Submitting request...';

    db.ref(claimPath).transaction(function(current) {
      return current ? undefined : claim;
    }).then(function(result) {
      if (!result.committed) throw new Error('That time was just booked. Please choose another slot.');
      return requestRef.set(request).catch(function(error) {
        return db.ref(claimPath).remove().then(function() { throw error; });
      });
    }).then(function() {
      status.textContent = 'Request sent. We will review it and follow up soon.';
      state.claims[trainer._key] = state.claims[trainer._key] || {};
      state.claims[trainer._key][state.selectedDate] = state.claims[trainer._key][state.selectedDate] || {};
      state.claims[trainer._key][state.selectedDate][slot._key] = claim;
      state.selectedSlotId = '';
      render();
      event.target.reset();
      setTimeout(closeModal, 1400);
    }).catch(function(error) {
      status.textContent = error && error.message ? error.message : 'Could not submit the request.';
    }).finally(function() {
      button.disabled = false;
    });
  }

  function wireHeader() {
    var header = document.querySelector('.v2-header');
    var toggle = $('v2NavToggle');
    var nav = $('v2Nav');
    if (!header) return;
    function syncScroll() {
      header.classList.toggle('is-scrolled', window.scrollY > 12);
    }
    syncScroll();
    window.addEventListener('scroll', syncScroll, { passive: true });
    if (toggle && nav) {
      toggle.addEventListener('click', function() {
        var open = !header.classList.contains('nav-open');
        header.classList.toggle('nav-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
  }

  function wireEvents() {
    $('trainerList').addEventListener('click', function(event) {
      var btn = event.target.closest('[data-trainer-id]');
      if (!btn) return;
      state.trainerId = btn.dataset.trainerId;
      state.selectedDate = '';
      state.selectedSlotId = '';
      render();
    });

    $('trainCalendarGrid').addEventListener('click', function(event) {
      var btn = event.target.closest('[data-date]');
      if (!btn || btn.disabled) return;
      state.selectedDate = btn.dataset.date;
      state.selectedSlotId = '';
      render();
    });

    $('trainSlotList').addEventListener('click', function(event) {
      var btn = event.target.closest('[data-slot-id]');
      if (!btn) return;
      state.selectedSlotId = btn.dataset.slotId;
      renderSlots();
    });

    $('trainPrevMonth').addEventListener('click', function() {
      state.monthDate = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() - 1, 1);
      renderCalendar();
    });

    $('trainNextMonth').addEventListener('click', function() {
      state.monthDate = new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() + 1, 1);
      renderCalendar();
    });

    $('trainContinueBtn').addEventListener('click', openModal);
    $('trainModalBackdrop').addEventListener('click', closeModal);
    $('trainModalClose').addEventListener('click', closeModal);
    $('trainRequestForm').addEventListener('submit', submitRequest);
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') closeModal();
    });
  }

  function loadData() {
    if (typeof fbGet !== 'function') {
      setStatus('Firebase is not available.', true);
      return Promise.resolve();
    }
    return Promise.all([
      fbGet('trainers').catch(function() { return null; }),
      fbGet('trainerAvailability').catch(function() { return null; }),
      fbGet('appointmentClaims').catch(function() { return null; })
    ]).then(function(values) {
      state.trainers = toArray(values[0])
        .filter(function(trainer) { return trainer.active !== false; })
        .sort(function(a, b) { return (+a.sortOrder || 0) - (+b.sortOrder || 0); });
      state.availability = values[1] || {};
      state.claims = values[2] || {};
      state.trainerId = state.trainers[0] ? state.trainers[0]._key : '';
      setStatus(state.trainers.length ? 'Choose a coach and date.' : 'No trainers are available yet.', !state.trainers.length);
      render();
    }).catch(function(error) {
      setStatus(error && error.message ? error.message : 'Could not load appointments.', true);
    });
  }

  function init() {
    wireHeader();
    wireEvents();
    loadData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
