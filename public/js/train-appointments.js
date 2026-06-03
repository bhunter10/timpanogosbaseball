(function() {
  'use strict';

  var state = {
    trainers: [],
    availability: {},
    claims: {},
    trainerId: '',
    monthDate: new Date(2026, 5, 1),
    selectedDate: '',
    selectedSlotId: ''
  };

  var firstTrainingMonth = new Date(2026, 5, 1);
  var lastTrainingMonth = new Date(2026, 7, 1);
  var firstTrainingDate = '2026-06-01';
  var lastTrainingDate = '2026-08-31';
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

  function monthIndex(date) {
    return date.getFullYear() * 12 + date.getMonth();
  }

  function clampCalendarMonth(date) {
    var month = startOfMonth(date);
    if (monthIndex(month) < monthIndex(firstTrainingMonth)) return new Date(firstTrainingMonth);
    if (monthIndex(month) > monthIndex(lastTrainingMonth)) return new Date(lastTrainingMonth);
    return month;
  }

  function isTrainingDate(iso) {
    return iso >= firstTrainingDate && iso <= lastTrainingDate;
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

  function trainerSpecialtiesFromText(value) {
    return String(value || '')
      .split(/[,/&]+|\band\b/i)
      .map(function(item) { return item.trim(); })
      .filter(Boolean);
  }

  function normalizeTrainerSpecialtyName(value) {
    var text = String(value || '').trim();
    var lower = text.toLowerCase();
    if (lower === 'catcher' || lower === 'catchers' || lower === 'catching') return 'Catching';
    if (lower === 'hit' || lower === 'hitter' || lower === 'hitters' || lower === 'hitting') return 'Hitting';
    return text;
  }

  function normalizeTrainerSpecialties(trainer) {
    var specialties;
    if (Array.isArray(trainer && trainer.specialties)) {
      specialties = trainer.specialties;
    } else {
      specialties = trainerSpecialtiesFromText(trainer && trainer.specialty);
    }
    return specialties.map(normalizeTrainerSpecialtyName).filter(Boolean).filter(function(item, index, all) {
      return all.indexOf(item) === index;
    });
  }

  function renderTrainerSpecialties(trainer) {
    var specialties = normalizeTrainerSpecialties(trainer);
    if (!specialties.length) specialties = [trainer && trainer.specialty ? trainer.specialty : 'Baseball training'];
    return '<span class="v2-trainer-specialties-label">Specialties:</span>' +
      '<span class="v2-trainer-specialties">' +
        specialties.map(function(item) {
          return '<span class="v2-trainer-specialty"><span aria-hidden="true">&#10003;</span>' + escapeHtml(item) + '</span>';
        }).join('') +
      '</span>';
  }

  function getTrainer() {
    return state.trainers.find(function(trainer) { return trainer._key === state.trainerId; }) || null;
  }

  function getBlocksForDate(iso) {
    var blocks = state.availability[state.trainerId] && state.availability[state.trainerId][iso];
    return toArray(blocks)
      .filter(function(block) { return block.active !== false; })
      .sort(function(a, b) {
        return String(a.timeValue || a.time || '').localeCompare(String(b.timeValue || b.time || ''));
      });
  }

  function timeToMinutes(value) {
    var parts = String(value || '').split(':');
    if (parts.length < 2) return null;
    var hour = +parts[0];
    var minute = +parts[1];
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    return hour * 60 + minute;
  }

  function minutesToTimeValue(minutes) {
    minutes = ((minutes % 1440) + 1440) % 1440;
    return String(Math.floor(minutes / 60)).padStart(2, '0') + ':' + String(minutes % 60).padStart(2, '0');
  }

  function formatTimeLabel(timeValue) {
    if (!timeValue) return '';
    var parts = String(timeValue).split(':');
    var hour = +parts[0];
    var minute = parts[1] || '00';
    var suffix = hour >= 12 ? 'PM' : 'AM';
    var displayHour = hour % 12 || 12;
    return displayHour + ':' + minute + ' ' + suffix;
  }

  function slotDuration(slot) {
    return +((slot && slot.durationMinutes) || 30);
  }

  function slotPrice(slot) {
    var duration = slotDuration(slot);
    return slot && slot.price != null ? +slot.price : (duration >= 60 ? 50 : 30);
  }

  function slotRangeLabel(slot) {
    var startMinutes = timeToMinutes(slot && (slot.startTimeValue || slot.timeValue || slot.time));
    var endValue = slot && (slot.endTimeValue || slot.endTime);
    var endMinutes = timeToMinutes(endValue);
    if (endMinutes == null && startMinutes != null) endMinutes = startMinutes + slotDuration(slot);
    var startLabel = slot && slot.time ? slot.time : formatTimeLabel(slot && slot.timeValue);
    var endLabel = endMinutes == null ? '' : formatTimeLabel(minutesToTimeValue(endMinutes));
    return startLabel + (endLabel ? ' - ' + endLabel : '');
  }

  function blockStartMinutes(block) {
    return timeToMinutes(block && (block.startTimeValue || block.timeValue || block.time));
  }

  function blockEndMinutes(block) {
    var explicit = timeToMinutes(block && (block.endTimeValue || block.endTime));
    if (explicit != null) return explicit;
    var start = blockStartMinutes(block);
    var duration = +((block && block.durationMinutes) || 30);
    return start == null ? null : start + duration;
  }

  function rangesOverlap(startA, endA, startB, endB) {
    return startA < endB && startB < endA;
  }

  function claimStartMinutes(claim) {
    return timeToMinutes(claim && (claim.startTimeValue || claim.timeValue || claim.time));
  }

  function claimEndMinutes(claim) {
    var explicit = timeToMinutes(claim && (claim.endTimeValue || claim.endTime));
    if (explicit != null) return explicit;
    var start = claimStartMinutes(claim);
    var duration = +((claim && claim.durationMinutes) || 30);
    return start == null ? null : start + duration;
  }

  function getClaimsForDate(iso) {
    return toArray(state.claims[state.trainerId] && state.claims[state.trainerId][iso]);
  }

  function hasClaimOverlap(iso, option) {
    var optionStart = timeToMinutes(option.startTimeValue);
    var optionEnd = timeToMinutes(option.endTimeValue);
    return getClaimsForDate(iso).some(function(claim) {
      var claimStart = claimStartMinutes(claim);
      var claimEnd = claimEndMinutes(claim);
      if (claimStart == null || claimEnd == null) return claim._key === option._key || claim.slotId === option._key;
      return rangesOverlap(optionStart, optionEnd, claimStart, claimEnd);
    });
  }

  function buildOption(block, startMinutes, duration) {
    var endMinutes = startMinutes + duration;
    var startValue = minutesToTimeValue(startMinutes);
    var endValue = minutesToTimeValue(endMinutes);
    return {
      _key: [block._key || 'block', startValue, duration].join('-').replace(/[^a-zA-Z0-9_-]+/g, '-'),
      blockId: block._key || '',
      time: formatTimeLabel(startValue),
      timeValue: startValue,
      startTimeValue: startValue,
      endTime: formatTimeLabel(endValue),
      endTimeValue: endValue,
      durationMinutes: duration,
      price: duration >= 60 ? 50 : 30,
      location: block.location || '',
      active: true
    };
  }

  function claimKeyFromMinutes(minutes) {
    return 'segment-' + minutesToTimeValue(minutes).replace(/[^0-9a-zA-Z_-]+/g, '-');
  }

  function claimKeysForSlot(slot) {
    var start = timeToMinutes(slot && (slot.startTimeValue || slot.timeValue));
    var end = timeToMinutes(slot && slot.endTimeValue);
    var keys = [];
    if (start == null || end == null) return [slot && slot._key ? slot._key : 'slot'];
    for (var cursor = start; cursor < end; cursor += 30) {
      keys.push(claimKeyFromMinutes(cursor));
    }
    return keys;
  }

  function getOptionsForDate(iso) {
    var options = [];
    getBlocksForDate(iso).forEach(function(block) {
      var start = blockStartMinutes(block);
      var end = blockEndMinutes(block);
      if (start == null || end == null || end <= start) return;
      for (var cursor = start; cursor + 30 <= end; cursor += 30) {
        options.push(buildOption(block, cursor, 30));
        if (cursor + 60 <= end) options.push(buildOption(block, cursor, 60));
      }
    });
    return options.sort(function(a, b) {
      return String(a.timeValue || '').localeCompare(String(b.timeValue || '')) || a.durationMinutes - b.durationMinutes;
    });
  }

  function getOpenSlotsForDate(iso) {
    return getOptionsForDate(iso).filter(function(slot) {
      return !hasClaimOverlap(iso, slot);
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
        '<span class="v2-trainer-copy"><strong>' + escapeHtml(trainer.name || 'Trainer') + '</strong>' + renderTrainerSpecialties(trainer) + '</span>' +
      '</button>';
    }).join('');
  }

  function renderCalendar() {
    var grid = $('trainCalendarGrid');
    var label = $('trainMonthLabel');
    if (!grid || !label) return;
    state.monthDate = clampCalendarMonth(state.monthDate);

    label.textContent = state.monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    var prevBtn = $('trainPrevMonth');
    var nextBtn = $('trainNextMonth');
    if (prevBtn) prevBtn.disabled = monthIndex(state.monthDate) <= monthIndex(firstTrainingMonth);
    if (nextBtn) nextBtn.disabled = monthIndex(state.monthDate) >= monthIndex(lastTrainingMonth);

    var first = startOfMonth(state.monthDate);
    var cursor = new Date(first);
    cursor.setDate(1 - first.getDay());
    var todayIso = isoFromDate(new Date());
    var cells = [];

    for (var i = 0; i < 42; i += 1) {
      var iso = isoFromDate(cursor);
      var outside = cursor.getMonth() !== state.monthDate.getMonth();
      var openSlots = getOpenSlotsForDate(iso);
      var allSlots = getOptionsForDate(iso);
      var isPast = iso < todayIso;
      var disabled = !isTrainingDate(iso) || isPast || !state.trainerId || !openSlots.length;
      var labelText = allSlots.length ? (openSlots.length ? openSlots.length + ' open' : 'Booked') : 'No times';
      cells.push('<button type="button" class="v2-train-day' +
        (outside ? ' is-outside' : '') +
        (disabled ? ' is-full' : '') +
        (openSlots.length ? ' has-open-slots' : '') +
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
    var continueTopBtn = $('trainContinueTopBtn');
    if (!list || !label || !continueTopBtn) return;

    if (!state.selectedDate) {
      label.textContent = 'Select a date';
      list.innerHTML = '<p class="v2-train-empty">Choose an available date on the calendar.</p>';
      continueTopBtn.disabled = true;
      return;
    }

    label.textContent = formatDate(state.selectedDate, { weekday: 'long', month: 'long', day: 'numeric' });
    var slots = getOpenSlotsForDate(state.selectedDate);
    if (!slots.length) {
      list.innerHTML = '<p class="v2-train-empty">This date is fully booked.</p>';
      continueTopBtn.disabled = true;
      return;
    }

    list.innerHTML = slots.map(function(slot) {
      return '<button type="button" class="v2-train-slot' + (slot._key === state.selectedSlotId ? ' is-selected' : '') + '" data-slot-id="' + escapeHtml(slot._key) + '">' +
        '<strong>' + escapeHtml(slotRangeLabel(slot)) + '</strong>' +
        '<span>' + escapeHtml(slotDuration(slot) + ' min · $' + slotPrice(slot)) + '</span>' +
      '</button>';
    }).join('');
    continueTopBtn.disabled = !state.selectedSlotId;
  }

  function render() {
    renderTrainers();
    renderCalendar();
    renderSlots();
  }

  function scrollSlotsIntoViewOnMobile() {
    if (!window.matchMedia || !window.matchMedia('(max-width: 760px)').matches) return;
    var slots = document.querySelector('.v2-train-slots');
    if (!slots) return;
    window.setTimeout(function() {
      var header = document.querySelector('.v2-header');
      var headerHeight = header ? header.getBoundingClientRect().height : 0;
      var top = slots.getBoundingClientRect().top + window.scrollY - headerHeight - 12;
      window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    }, 80);
  }

  function openModal() {
    var trainer = getTrainer();
    var slot = getOpenSlotsForDate(state.selectedDate).find(function(item) { return item._key === state.selectedSlotId; });
    var modal = $('trainRequestModal');
    if (!trainer || !slot || !modal) return;

    $('trainModalCoachPhoto').src = normalizeAssetUrl(trainer.photoUrl) || fallbackCoachPhoto;
    $('trainModalCoachPhoto').alt = trainer.name ? trainer.name + ' photo' : 'Coach photo';
    $('trainModalTitle').textContent = 'Appointment request';
    $('trainModalSpecialty').textContent = 'with ' + (trainer.name || 'your coach');
    $('trainModalDetails').innerHTML =
      '<div><dt>Date</dt><dd>' + escapeHtml(formatDate(state.selectedDate)) + '</dd></div>' +
      '<div><dt>Time</dt><dd>' + escapeHtml(slotRangeLabel(slot)) + '</dd></div>' +
      '<div><dt>Length</dt><dd>' + escapeHtml(slotDuration(slot) + ' minutes') + '</dd></div>' +
      '<div><dt>Price</dt><dd>$' + escapeHtml(slotPrice(slot)) + '</dd></div>' +
      '<div><dt>Location</dt><dd>' + escapeHtml(slot.location || trainer.location || 'Timpanogos Baseball') + '</dd></div>' +
      '<div><dt>Coach</dt><dd>' + escapeHtml(trainer.name || 'Trainer') + '</dd></div>';
    $('trainFormStatus').textContent = '';
    modal.hidden = false;
    document.body.classList.add('v2-train-modal-open');
    setTimeout(function() {
      var card = modal.querySelector('.v2-train-modal-card');
      if (card) card.scrollTop = 0;
      if (window.matchMedia && window.matchMedia('(max-width: 760px)').matches) return;
      var input = $('trainCustomerName');
      if (input) input.focus({ preventScroll: true });
    }, 0);
  }

  function closeModal() {
    var modal = $('trainRequestModal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('v2-train-modal-open');
  }

  function showSuccess(request, trainer) {
    closeModal();
    var hero = document.querySelector('.v2-train-hero');
    var booking = document.querySelector('.v2-train-booking');
    var success = $('trainSuccess');
    if (hero) hero.hidden = true;
    if (booking) booking.hidden = true;
    if (!success) return;

    var coachName = (trainer && trainer.name) || request.trainerName || 'your coach';
    var coachPhone = (trainer && trainer.cellPhone) || request.trainerPhone || '';
    var summary = $('trainSuccessSummary');
    var phone = $('trainSuccessCoachPhone');
    if (summary) {
      summary.textContent = 'Your request with ' + coachName + ' for ' + formatDate(request.date) + ' at ' + slotRangeFromRequest(request) + ' has been sent.';
    }
    if (phone) {
      phone.textContent = coachPhone ? 'Text ' + coachName + ' at ' + coachPhone + '.' : 'Coach cell phone not listed yet.';
    }
    success.hidden = false;
    success.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function slotRangeFromRequest(request) {
    var start = request.time || request.timeValue || '';
    var end = request.endTime || '';
    if (start && end) return start + ' - ' + end;
    return start || 'your selected time';
  }

  function resetSuccess() {
    var hero = document.querySelector('.v2-train-hero');
    var booking = document.querySelector('.v2-train-booking');
    var success = $('trainSuccess');
    if (hero) hero.hidden = false;
    if (booking) booking.hidden = false;
    if (success) success.hidden = true;
    setStatus(state.trainers.length ? '' : 'No trainers are available yet.', !state.trainers.length);
    var title = $('trainBookingTitle');
    if (title) title.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function submitRequest(event) {
    event.preventDefault();
    var trainer = getTrainer();
    var slot = getOpenSlotsForDate(state.selectedDate).find(function(item) { return item._key === state.selectedSlotId; });
    var status = $('trainFormStatus');
    var button = event.target.querySelector('button[type="submit"]');
    if (!trainer || !slot || !status || !button) return;

    var requestRef = db.ref('appointmentRequests').push();
    var claimDatePath = 'appointmentClaims/' + trainer._key + '/' + state.selectedDate;
    var claimKeys = claimKeysForSlot(slot);
    var now = new Date().toISOString();
    var claim = {
      appointmentId: requestRef.key,
      slotId: slot._key,
      blockId: slot.blockId || '',
      time: slot.time || slot.timeValue || '',
      timeValue: slot.timeValue || '',
      startTimeValue: slot.startTimeValue || slot.timeValue || '',
      endTime: slot.endTime || '',
      endTimeValue: slot.endTimeValue || '',
      durationMinutes: slotDuration(slot),
      price: slotPrice(slot),
      location: slot.location || trainer.location || '',
      status: 'pending',
      createdAt: now
    };
    var request = {
      trainerId: trainer._key,
      trainerName: trainer.name || '',
      trainerPhone: trainer.cellPhone || '',
      date: state.selectedDate,
      slotId: slot._key,
      blockId: slot.blockId || '',
      claimKeys: claimKeys,
      time: slot.time || slot.timeValue || '',
      endTime: slot.endTime || '',
      timeValue: slot.timeValue || '',
      startTimeValue: slot.startTimeValue || slot.timeValue || '',
      endTimeValue: slot.endTimeValue || '',
      durationMinutes: slotDuration(slot),
      price: slotPrice(slot),
      location: slot.location || trainer.location || '',
      fullName: $('trainCustomerName').value.trim(),
      phone: $('trainCustomerPhone').value.trim(),
      email: $('trainCustomerEmail').value.trim(),
      status: 'pending',
      createdAt: now,
      updatedAt: now
    };

    button.disabled = true;
    status.textContent = 'Submitting request...';

    var acquiredKeys = [];
    claimKeys.reduce(function(promise, key) {
      return promise.then(function() {
        return db.ref(claimDatePath + '/' + key).transaction(function(current) {
          return current ? undefined : claim;
        }).then(function(result) {
          if (!result.committed) throw new Error('That time was just booked. Please choose another slot.');
          acquiredKeys.push(key);
        });
      });
    }, Promise.resolve()).then(function() {
      return requestRef.set(request).catch(function(error) {
        var cleanup = {};
        acquiredKeys.forEach(function(key) {
          cleanup[claimDatePath + '/' + key] = null;
        });
        return db.ref().update(cleanup).then(function() { throw error; });
      });
    }).then(function() {
      status.textContent = 'Request sent.';
      state.claims[trainer._key] = state.claims[trainer._key] || {};
      state.claims[trainer._key][state.selectedDate] = state.claims[trainer._key][state.selectedDate] || {};
      claimKeys.forEach(function(key) {
        state.claims[trainer._key][state.selectedDate][key] = claim;
      });
      state.selectedSlotId = '';
      render();
      event.target.reset();
      showSuccess(request, trainer);
    }).catch(function(error) {
      if (acquiredKeys && acquiredKeys.length) {
        var cleanup = {};
        acquiredKeys.forEach(function(key) {
          cleanup[claimDatePath + '/' + key] = null;
        });
        db.ref().update(cleanup).catch(function() {});
      }
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
      scrollSlotsIntoViewOnMobile();
    });

    $('trainSlotList').addEventListener('click', function(event) {
      var btn = event.target.closest('[data-slot-id]');
      if (!btn) return;
      state.selectedSlotId = btn.dataset.slotId;
      renderSlots();
    });

    $('trainPrevMonth').addEventListener('click', function() {
      state.monthDate = clampCalendarMonth(new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() - 1, 1));
      renderCalendar();
    });

    $('trainNextMonth').addEventListener('click', function() {
      state.monthDate = clampCalendarMonth(new Date(state.monthDate.getFullYear(), state.monthDate.getMonth() + 1, 1));
      renderCalendar();
    });

    $('trainContinueTopBtn').addEventListener('click', openModal);
    $('trainModalBackdrop').addEventListener('click', closeModal);
    $('trainModalClose').addEventListener('click', closeModal);
    $('trainRequestForm').addEventListener('submit', submitRequest);
    var successReset = $('trainSuccessReset');
    if (successReset) successReset.addEventListener('click', resetSuccess);
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
      setStatus(state.trainers.length ? '' : 'No trainers are available yet.', !state.trainers.length);
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
