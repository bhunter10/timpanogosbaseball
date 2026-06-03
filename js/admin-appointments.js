(function() {
  'use strict';

  var state = {
    initialized: false,
    trainers: [],
    availability: {},
    requests: [],
    trainerId: '',
    editingTrainerKey: ''
  };

  function $(id) { return document.getElementById(id); }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
    return (window.__SITE_BASE_PATH || '') + '/' + String(src).replace(/^\.?\//, '');
  }

  function formatDate(iso) {
    var parts = String(iso || '').split('-').map(function(part) { return +part; });
    if (parts.length !== 3 || parts.some(function(part) { return !Number.isFinite(part); })) return iso || '';
    return new Date(parts[0], parts[1] - 1, parts[2]).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function safeKey(value) {
    return String(value || 'slot')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'slot';
  }

  function trainerUploadPath(file) {
    var name = file && file.name ? file.name : 'trainer.jpg';
    var ext = (name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    return 'trainers/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
  }

  function getTrainerById(id) {
    return state.trainers.find(function(trainer) { return trainer._key === id; }) || null;
  }

  function setStatus(id, message, isError) {
    var el = $(id);
    if (!el) return;
    el.textContent = message || '';
    el.className = isError ? 'auth-error' : 'save-success';
  }

  function panelHtml() {
    return [
      '<section class="admin-card admin-appointments-card">',
        '<h2>Trainers</h2>',
        '<form id="trainerForm" class="admin-appointment-form">',
          '<div class="admin-appointment-grid">',
            '<label>Name:<input type="text" id="trainerName" required placeholder="Coach name"></label>',
            '<label>Specialty:<input type="text" id="trainerSpecialty" required placeholder="Hitting and catchers"></label>',
            '<label>Location:<input type="text" id="trainerLocation" required placeholder="Timpanogos Baseball Field"></label>',
            '<label>Photo URL:<input type="url" id="trainerPhotoUrl" placeholder="https://..."></label>',
            '<label>Upload photo:<input type="file" id="trainerPhotoFile" accept="image/*"></label>',
            '<label>Sort order:<input type="number" id="trainerSortOrder" min="0" step="1" value="0"></label>',
          '</div>',
          '<label class="checkbox-label"><input type="checkbox" id="trainerActive" checked> Active on public booking page</label>',
          '<div class="form-row">',
            '<button type="submit" class="btn" id="trainerSubmitBtn">Add Trainer</button>',
            '<button type="button" class="btn alt" id="trainerCancelEditBtn" hidden>Cancel edit</button>',
          '</div>',
          '<p id="trainerSaveStatus"></p>',
        '</form>',
        '<ul id="trainerAdminList" class="list admin-trainer-list"></ul>',
      '</section>',
      '<section class="admin-card admin-appointments-card">',
        '<h2>Availability</h2>',
        '<form id="trainerAvailabilityForm" class="admin-appointment-form">',
          '<div class="admin-appointment-grid">',
            '<label>Trainer:<select id="availabilityTrainerSelect"></select></label>',
            '<label>Date:<input type="date" id="availabilityDate" required></label>',
            '<label>Time:<input type="time" id="availabilityTime" required></label>',
            '<label>Time label:<input type="text" id="availabilityTimeLabel" placeholder="4:00 PM"></label>',
          '</div>',
          '<div class="form-row"><button type="submit" class="btn">Add Time Slot</button></div>',
          '<p id="availabilitySaveStatus"></p>',
        '</form>',
        '<ul id="availabilitySlotList" class="list admin-availability-list"></ul>',
      '</section>',
      '<section class="admin-card admin-appointments-card">',
        '<h2>Pending Appointments</h2>',
        '<p class="muted">Approve, deny, or delete appointment requests. Denying or deleting releases the time slot.</p>',
        '<ul id="appointmentRequestList" class="list admin-request-list"></ul>',
        '<p id="appointmentRequestStatus"></p>',
      '</section>'
    ].join('');
  }

  function resetTrainerForm() {
    state.editingTrainerKey = '';
    var form = $('trainerForm');
    if (form) form.reset();
    var active = $('trainerActive');
    if (active) active.checked = true;
    var sort = $('trainerSortOrder');
    if (sort) sort.value = String(state.trainers.length);
    var submit = $('trainerSubmitBtn');
    if (submit) submit.textContent = 'Add Trainer';
    var cancel = $('trainerCancelEditBtn');
    if (cancel) cancel.hidden = true;
    setStatus('trainerSaveStatus', '', false);
  }

  function renderTrainerSelects() {
    var select = $('availabilityTrainerSelect');
    if (!select) return;
    if (!state.trainers.length) {
      select.innerHTML = '<option value="">Add a trainer first</option>';
      return;
    }
    if (!state.trainerId || !getTrainerById(state.trainerId)) {
      state.trainerId = state.trainers[0]._key;
    }
    select.innerHTML = state.trainers.map(function(trainer) {
      return '<option value="' + escapeHtml(trainer._key) + '"' + (trainer._key === state.trainerId ? ' selected' : '') + '>' +
        escapeHtml(trainer.name || 'Trainer') + '</option>';
    }).join('');
  }

  function renderTrainers() {
    var list = $('trainerAdminList');
    if (!list) return;
    if (!state.trainers.length) {
      list.innerHTML = '<li class="muted">No trainers saved yet.</li>';
      return;
    }
    list.innerHTML = state.trainers.map(function(trainer) {
      var photo = normalizeAssetUrl(trainer.photoUrl);
      return '<li class="admin-trainer-item">' +
        '<div class="admin-trainer-main">' +
          (photo ? '<img src="' + escapeHtml(photo) + '" alt="">' : '<span class="admin-trainer-photo-placeholder"></span>') +
          '<div><strong>' + escapeHtml(trainer.name || 'Trainer') + '</strong>' +
          '<span>' + escapeHtml(trainer.specialty || 'Baseball training') + '</span>' +
          '<small>' + escapeHtml(trainer.location || 'No location set') + (trainer.active === false ? ' · Inactive' : '') + '</small></div>' +
        '</div>' +
        '<div class="list-actions">' +
          '<button type="button" class="btn small alt" data-edit-trainer="' + escapeHtml(trainer._key) + '">Edit</button>' +
          '<button type="button" class="btn small alt" data-delete-trainer="' + escapeHtml(trainer._key) + '">Delete</button>' +
        '</div>' +
      '</li>';
    }).join('');
  }

  function getSlotsForSelectedDate() {
    var date = $('availabilityDate') ? $('availabilityDate').value : '';
    var slots = state.availability[state.trainerId] && state.availability[state.trainerId][date];
    return { date: date, slots: toArray(slots).sort(function(a, b) {
      return String(a.timeValue || a.time || '').localeCompare(String(b.timeValue || b.time || ''));
    }) };
  }

  function renderAvailability() {
    renderTrainerSelects();
    var list = $('availabilitySlotList');
    if (!list) return;
    var data = getSlotsForSelectedDate();
    if (!state.trainerId) {
      list.innerHTML = '<li class="muted">Add a trainer before setting availability.</li>';
      return;
    }
    if (!data.date) {
      list.innerHTML = '<li class="muted">Choose a date to view slots.</li>';
      return;
    }
    if (!data.slots.length) {
      list.innerHTML = '<li class="muted">No slots saved for this date.</li>';
      return;
    }
    list.innerHTML = data.slots.map(function(slot) {
      return '<li class="admin-availability-item">' +
        '<strong>' + escapeHtml(slot.time || slot.timeValue || 'Time slot') + '</strong>' +
        '<span>' + (slot.active === false ? 'Inactive' : 'Available') + '</span>' +
        '<div class="list-actions"><button type="button" class="btn small alt" data-delete-slot="' + escapeHtml(slot._key) + '">Delete</button></div>' +
      '</li>';
    }).join('');
  }

  function renderRequests() {
    var list = $('appointmentRequestList');
    if (!list) return;
    var pending = state.requests.filter(function(request) {
      return (request.status || 'pending') === 'pending';
    }).sort(function(a, b) {
      return String(a.date || '').localeCompare(String(b.date || '')) || String(a.time || '').localeCompare(String(b.time || ''));
    });

    if (!pending.length) {
      list.innerHTML = '<li class="muted">No pending appointment requests.</li>';
      return;
    }

    list.innerHTML = pending.map(function(request) {
      var trainer = getTrainerById(request.trainerId);
      return '<li class="admin-request-item">' +
        '<div class="admin-request-main">' +
          '<strong>' + escapeHtml(request.fullName || 'Appointment request') + '</strong>' +
          '<span>' + escapeHtml(formatDate(request.date)) + ' at ' + escapeHtml(request.time || '') + '</span>' +
          '<small>' + escapeHtml((trainer && trainer.name) || request.trainerName || 'Trainer') + ' · ' + escapeHtml(request.phone || '') + ' · ' + escapeHtml(request.email || '') + '</small>' +
          '<small>' + escapeHtml(request.location || (trainer && trainer.location) || '') + '</small>' +
        '</div>' +
        '<div class="list-actions">' +
          '<button type="button" class="btn small" data-approve-request="' + escapeHtml(request._key) + '">Approve</button>' +
          '<button type="button" class="btn small alt" data-deny-request="' + escapeHtml(request._key) + '">Deny</button>' +
          '<button type="button" class="btn small alt" data-delete-request="' + escapeHtml(request._key) + '">Delete</button>' +
        '</div>' +
      '</li>';
    }).join('');
  }

  function renderAll() {
    state.trainers.sort(function(a, b) {
      return (+a.sortOrder || 0) - (+b.sortOrder || 0);
    });
    renderTrainers();
    renderAvailability();
    renderRequests();
  }

  function loadAll() {
    if (typeof fbGet !== 'function') {
      setStatus('trainerSaveStatus', 'Firebase is not available.', true);
      return Promise.resolve();
    }
    return Promise.all([
      fbGet('trainers').catch(function() { return null; }),
      fbGet('trainerAvailability').catch(function() { return null; }),
      fbGet('appointmentRequests').catch(function() { return null; })
    ]).then(function(values) {
      state.trainers = toArray(values[0]);
      state.availability = values[1] || {};
      state.requests = toArray(values[2]);
      if (!state.trainerId && state.trainers[0]) state.trainerId = state.trainers[0]._key;
      renderAll();
      resetTrainerForm();
    }).catch(function(error) {
      setStatus('trainerSaveStatus', error && error.message ? error.message : 'Could not load appointment data.', true);
    });
  }

  function saveTrainer(event) {
    event.preventDefault();
    var file = $('trainerPhotoFile').files[0];
    var now = new Date().toISOString();
    var existing = state.editingTrainerKey ? getTrainerById(state.editingTrainerKey) : null;
    var trainer = {
      name: $('trainerName').value.trim(),
      specialty: $('trainerSpecialty').value.trim(),
      location: $('trainerLocation').value.trim(),
      photoUrl: $('trainerPhotoUrl').value.trim(),
      photoStoragePath: existing && existing.photoStoragePath ? existing.photoStoragePath : '',
      active: $('trainerActive').checked,
      sortOrder: +$('trainerSortOrder').value || 0,
      updatedAt: now
    };
    if (!state.editingTrainerKey) trainer.createdAt = now;

    var button = $('trainerSubmitBtn');
    button.disabled = true;
    setStatus('trainerSaveStatus', file ? 'Uploading photo...' : 'Saving trainer...', false);

    var upload = file
      ? fbUploadFile(trainerUploadPath(file), file, { contentType: file.type || 'image/jpeg' }).then(function(result) {
          trainer.photoUrl = result.url;
          trainer.photoStoragePath = result.storagePath;
        })
      : Promise.resolve();

    upload.then(function() {
      if (state.editingTrainerKey) {
        return fbSaveChild('trainers', state.editingTrainerKey, trainer).then(function(saved) {
          var index = state.trainers.findIndex(function(item) { return item._key === saved._key; });
          if (index >= 0) state.trainers[index] = saved;
        });
      }
      return fbAddChild('trainers', trainer).then(function(saved) {
        state.trainers.push(saved);
        state.trainerId = saved._key;
      });
    }).then(function() {
      setStatus('trainerSaveStatus', 'Trainer saved.', false);
      renderAll();
      resetTrainerForm();
    }).catch(function(error) {
      setStatus('trainerSaveStatus', error && error.message ? error.message : 'Could not save trainer.', true);
    }).finally(function() {
      button.disabled = false;
    });
  }

  function editTrainer(key) {
    var trainer = getTrainerById(key);
    if (!trainer) return;
    state.editingTrainerKey = key;
    $('trainerName').value = trainer.name || '';
    $('trainerSpecialty').value = trainer.specialty || '';
    $('trainerLocation').value = trainer.location || '';
    $('trainerPhotoUrl').value = trainer.photoUrl || '';
    $('trainerSortOrder').value = trainer.sortOrder != null ? trainer.sortOrder : 0;
    $('trainerActive').checked = trainer.active !== false;
    $('trainerSubmitBtn').textContent = 'Update Trainer';
    $('trainerCancelEditBtn').hidden = false;
    setStatus('trainerSaveStatus', '', false);
    $('trainerName').focus();
  }

  function deleteTrainer(key) {
    if (!window.confirm('Delete this trainer and their availability? Pending requests will remain for records.')) return;
    var previousTrainers = state.trainers.slice();
    var previousAvailability = state.availability;
    state.trainers = state.trainers.filter(function(item) { return item._key !== key; });
    if (state.availability[key]) {
      state.availability = Object.assign({}, state.availability);
      delete state.availability[key];
    }
    if (state.trainerId === key) state.trainerId = state.trainers[0] ? state.trainers[0]._key : '';
    renderAll();
    fbUpdate({
      ['trainers/' + key]: null,
      ['trainerAvailability/' + key]: null
    }).catch(function(error) {
      state.trainers = previousTrainers;
      state.availability = previousAvailability;
      renderAll();
      setStatus('trainerSaveStatus', error && error.message ? error.message : 'Could not delete trainer.', true);
    });
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

  function addSlot(event) {
    event.preventDefault();
    var date = $('availabilityDate').value;
    var timeValue = $('availabilityTime').value;
    if (!state.trainerId || !date || !timeValue) return;
    var slotKey = safeKey(timeValue);
    var slot = {
      time: $('availabilityTimeLabel').value.trim() || formatTimeLabel(timeValue),
      timeValue: timeValue,
      active: true,
      updatedAt: new Date().toISOString()
    };
    setStatus('availabilitySaveStatus', 'Saving slot...', false);
    fbSaveChild('trainerAvailability/' + state.trainerId + '/' + date, slotKey, slot).then(function(saved) {
      state.availability[state.trainerId] = state.availability[state.trainerId] || {};
      state.availability[state.trainerId][date] = state.availability[state.trainerId][date] || {};
      state.availability[state.trainerId][date][slotKey] = saved;
      $('availabilityTime').value = '';
      $('availabilityTimeLabel').value = '';
      setStatus('availabilitySaveStatus', 'Time slot saved.', false);
      renderAvailability();
    }).catch(function(error) {
      setStatus('availabilitySaveStatus', error && error.message ? error.message : 'Could not save time slot.', true);
    });
  }

  function deleteSlot(slotKey) {
    var data = getSlotsForSelectedDate();
    if (!state.trainerId || !data.date) return;
    fbDeleteChild('trainerAvailability/' + state.trainerId + '/' + data.date, slotKey).then(function() {
      if (state.availability[state.trainerId] && state.availability[state.trainerId][data.date]) {
        delete state.availability[state.trainerId][data.date][slotKey];
      }
      renderAvailability();
    }).catch(function(error) {
      setStatus('availabilitySaveStatus', error && error.message ? error.message : 'Could not delete time slot.', true);
    });
  }

  function updateRequestStatus(key, status) {
    var request = state.requests.find(function(item) { return item._key === key; });
    if (!request) return;
    var now = new Date().toISOString();
    var claimPath = 'appointmentClaims/' + request.trainerId + '/' + request.date + '/' + request.slotId;
    var updates = {};
    if (status === 'delete') {
      updates['appointmentRequests/' + key] = null;
      updates[claimPath] = null;
    } else {
      updates['appointmentRequests/' + key + '/status'] = status;
      updates['appointmentRequests/' + key + '/updatedAt'] = now;
      updates[claimPath] = status === 'approved'
        ? { appointmentId: key, status: 'approved', createdAt: request.createdAt || now, updatedAt: now }
        : null;
    }

    setStatus('appointmentRequestStatus', 'Updating request...', false);
    fbUpdate(updates).then(function() {
      if (status === 'delete') {
        state.requests = state.requests.filter(function(item) { return item._key !== key; });
      } else {
        request.status = status;
        request.updatedAt = now;
      }
      setStatus('appointmentRequestStatus', status === 'approved' ? 'Appointment approved.' : 'Request updated.', false);
      renderRequests();
    }).catch(function(error) {
      setStatus('appointmentRequestStatus', error && error.message ? error.message : 'Could not update request.', true);
    });
  }

  function wireEvents() {
    $('trainerForm').addEventListener('submit', saveTrainer);
    $('trainerCancelEditBtn').addEventListener('click', resetTrainerForm);
    $('trainerAdminList').addEventListener('click', function(event) {
      var edit = event.target.closest('[data-edit-trainer]');
      var del = event.target.closest('[data-delete-trainer]');
      if (edit) editTrainer(edit.dataset.editTrainer);
      if (del) deleteTrainer(del.dataset.deleteTrainer);
    });
    $('availabilityTrainerSelect').addEventListener('change', function(event) {
      state.trainerId = event.target.value;
      renderAvailability();
    });
    $('availabilityDate').addEventListener('change', renderAvailability);
    $('trainerAvailabilityForm').addEventListener('submit', addSlot);
    $('availabilitySlotList').addEventListener('click', function(event) {
      var btn = event.target.closest('[data-delete-slot]');
      if (btn) deleteSlot(btn.dataset.deleteSlot);
    });
    $('appointmentRequestList').addEventListener('click', function(event) {
      var approve = event.target.closest('[data-approve-request]');
      var deny = event.target.closest('[data-deny-request]');
      var del = event.target.closest('[data-delete-request]');
      if (approve) updateRequestStatus(approve.dataset.approveRequest, 'approved');
      if (deny) updateRequestStatus(deny.dataset.denyRequest, 'denied');
      if (del) updateRequestStatus(del.dataset.deleteRequest, 'delete');
    });
  }

  function initPanel() {
    var panel = $('appointmentsAdminPanel');
    if (!panel || state.initialized) return;
    state.initialized = true;
    wireEvents();
    var dateInput = $('availabilityDate');
    if (dateInput && !dateInput.value) dateInput.value = new Date().toISOString().slice(0, 10);
    loadAll();
  }

  window.AdminAppointments = {
    panelHtml: panelHtml,
    initPanel: initPanel,
    refresh: loadAll
  };
})();
