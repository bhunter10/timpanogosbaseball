(function() {
  'use strict';

  var state = {
    initialized: false,
    trainers: [],
    availability: {},
    requests: [],
    trainerId: '',
    editingTrainerKey: '',
    editingAvailability: null,
    photoCrop: {
      file: null,
      image: null,
      sourceUrl: '',
      x: 0,
      y: 0,
      zoom: 1,
      dirty: false
    }
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

  function cropProxyUrl(src) {
    var normalized = normalizeAssetUrl(src);
    if (!/^https?:\/\//i.test(normalized)) return normalized;
    return (window.__SITE_BASE_PATH || '') + '/api/trainer-photo-proxy?url=' + encodeURIComponent(normalized);
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
    return 'trainers/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.jpg';
  }

  function loadImageFile(file) {
    return new Promise(function(resolve, reject) {
      var url = URL.createObjectURL(file);
      var image = new Image();
      image.onload = function() {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = function() {
        URL.revokeObjectURL(url);
        reject(new Error('Unable to load that trainer photo.'));
      };
      image.src = url;
    });
  }

  function loadImageUrl(src) {
    return new Promise(function(resolve, reject) {
      if (!src) {
        reject(new Error('No trainer photo is saved yet.'));
        return;
      }
      var image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = function() {
        resolve(image);
      };
      image.onerror = function() {
        reject(new Error('Could not load the existing trainer photo for cropping.'));
      };
      image.src = cropProxyUrl(src);
    });
  }

  function imageDimensions(image) {
    return {
      width: image ? (image.naturalWidth || image.width || 1) : 1,
      height: image ? (image.naturalHeight || image.height || 1) : 1
    };
  }

  function cropSourceSize(image, zoom) {
    var dims = imageDimensions(image);
    return Math.min(dims.width, dims.height) / Math.max(1, +zoom || 1);
  }

  function clampPhotoCrop() {
    var crop = state.photoCrop;
    if (!crop.image) return;
    var dims = imageDimensions(crop.image);
    var sourceSize = cropSourceSize(crop.image, crop.zoom);
    var maxX = Math.max(0, (dims.width - sourceSize) / 2);
    var maxY = Math.max(0, (dims.height - sourceSize) / 2);
    crop.x = Math.max(-maxX, Math.min(maxX, +crop.x || 0));
    crop.y = Math.max(-maxY, Math.min(maxY, +crop.y || 0));
  }

  function drawPhotoCropPreview() {
    var canvas = $('trainerPhotoCropCanvas');
    var editor = $('trainerPhotoCropEditor');
    var crop = state.photoCrop;
    if (!canvas || !editor) return;
    if (!crop.image) {
      editor.hidden = true;
      return;
    }

    editor.hidden = false;
    clampPhotoCrop();
    var ctx = canvas.getContext('2d');
    var previewSize = canvas.width;
    var dims = imageDimensions(crop.image);
    var sourceSize = cropSourceSize(crop.image, crop.zoom);
    var sourceX = ((dims.width - sourceSize) / 2) + crop.x;
    var sourceY = ((dims.height - sourceSize) / 2) + crop.y;
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, previewSize, previewSize);
    ctx.drawImage(crop.image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, previewSize, previewSize);
  }

  function setPhotoCropZoom(value) {
    state.photoCrop.zoom = Math.max(1, Math.min(3, +value || 1));
    state.photoCrop.dirty = true;
    var input = $('trainerPhotoZoom');
    if (input) input.value = String(state.photoCrop.zoom);
    drawPhotoCropPreview();
  }

  function nudgePhotoCrop(dx, dy) {
    var crop = state.photoCrop;
    var sourceSize = cropSourceSize(crop.image, crop.zoom);
    var step = sourceSize * 0.08;
    crop.x += dx * step;
    crop.y += dy * step;
    crop.dirty = true;
    drawPhotoCropPreview();
  }

  function resetPhotoCrop() {
    state.photoCrop = {
      file: null,
      image: null,
      sourceUrl: '',
      x: 0,
      y: 0,
      zoom: 1,
      dirty: false
    };
    var input = $('trainerPhotoFile');
    if (input) input.value = '';
    var zoom = $('trainerPhotoZoom');
    if (zoom) zoom.value = '1';
    drawPhotoCropPreview();
  }

  function loadTrainerPhotoCrop(file) {
    if (!file) {
      resetPhotoCrop();
      return Promise.resolve();
    }
    return loadImageFile(file).then(function(image) {
      state.photoCrop = {
        file: file,
        image: image,
        sourceUrl: '',
        x: 0,
        y: 0,
        zoom: 1,
        dirty: false
      };
      var zoom = $('trainerPhotoZoom');
      if (zoom) zoom.value = '1';
      drawPhotoCropPreview();
    });
  }

  function loadTrainerPhotoCropUrl(src) {
    if (!src) {
      resetPhotoCrop();
      return Promise.resolve();
    }
    return loadImageUrl(src).then(function(image) {
      state.photoCrop = {
        file: null,
        image: image,
        sourceUrl: src,
        x: 0,
        y: 0,
        zoom: 1,
        dirty: false
      };
      var zoom = $('trainerPhotoZoom');
      if (zoom) zoom.value = '1';
      drawPhotoCropPreview();
    });
  }

  function optimizeTrainerPhoto(file) {
    var cropPromise = state.photoCrop.image && (!file || state.photoCrop.file === file)
      ? Promise.resolve(state.photoCrop.image)
      : loadImageFile(file);

    return cropPromise.then(function(image) {
      return new Promise(function(resolve, reject) {
        try {
          var outputSize = 800;
          var crop = state.photoCrop.image === image ? state.photoCrop : { x: 0, y: 0, zoom: 1 };
          var dims = imageDimensions(image);
          var sourceSize = cropSourceSize(image, crop.zoom);
          var sourceX = ((dims.width - sourceSize) / 2) + (+crop.x || 0);
          var sourceY = ((dims.height - sourceSize) / 2) + (+crop.y || 0);
          var canvas = document.createElement('canvas');
          var ctx = canvas.getContext('2d');
          canvas.width = outputSize;
          canvas.height = outputSize;
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, outputSize, outputSize);
          ctx.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
          canvas.toBlob(function(blob) {
            if (!blob) {
              reject(new Error('Unable to optimize that trainer photo.'));
              return;
            }
            resolve(blob);
          }, 'image/jpeg', 0.82);
        } catch (error) {
          reject(new Error('Could not crop that photo. If it is an existing image, upload the original file again and adjust it there.'));
        }
      });
    });
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
            '<label>Coach cell phone:<input type="tel" id="trainerCellPhone" placeholder="801-555-1234"></label>',
            '<label>Photo URL:<input type="url" id="trainerPhotoUrl" placeholder="https://..."></label>',
            '<label>Upload photo:<input type="file" id="trainerPhotoFile" accept="image/*"></label>',
            '<label>Sort order:<input type="number" id="trainerSortOrder" min="0" step="1" value="0"></label>',
          '</div>',
          '<div class="admin-photo-crop-editor" id="trainerPhotoCropEditor" hidden>',
            '<div class="admin-photo-crop-preview">',
              '<canvas id="trainerPhotoCropCanvas" width="260" height="260" aria-label="Trainer photo crop preview"></canvas>',
            '</div>',
            '<div class="admin-photo-crop-controls">',
              '<label>Zoom<input type="range" id="trainerPhotoZoom" min="1" max="3" step="0.01" value="1"></label>',
              '<div class="admin-photo-nudge-grid" aria-label="Pan trainer photo">',
                '<button type="button" class="btn small alt" data-photo-nudge="0,-1">Up</button>',
                '<button type="button" class="btn small alt" data-photo-nudge="-1,0">Left</button>',
                '<button type="button" class="btn small alt" data-photo-nudge="1,0">Right</button>',
                '<button type="button" class="btn small alt" data-photo-nudge="0,1">Down</button>',
              '</div>',
              '<button type="button" class="btn small alt" id="trainerPhotoReset">Reset photo crop</button>',
            '</div>',
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
            '<label>Start time:<input type="time" id="availabilityStartTime" required></label>',
            '<label>End time:<input type="time" id="availabilityEndTime" required></label>',
            '<label>Location:<input type="text" id="availabilityLocation" required placeholder="Timpanogos cages"></label>',
          '</div>',
          '<p class="muted">Add the trainer&apos;s open block and location. Visitors can request 30-minute ($30) or 1-hour ($50) appointments that fit inside it.</p>',
          '<div class="form-row">',
            '<button type="submit" class="btn" id="availabilitySubmitBtn">Add Availability Block</button>',
            '<button type="button" class="btn alt" id="availabilityCancelEditBtn" hidden>Cancel edit</button>',
          '</div>',
          '<p id="availabilitySaveStatus"></p>',
        '</form>',
        '<h3 class="admin-subsection-title">Saved Availability Blocks</h3>',
        '<ul id="availabilitySlotList" class="list admin-availability-list"></ul>',
      '</section>',
      '<section class="admin-card admin-appointments-card">',
        '<h2>Pending Appointments</h2>',
        '<p class="muted">Approve, deny, or delete appointment requests. Denying or deleting releases the time.</p>',
        '<ul id="appointmentRequestList" class="list admin-request-list"></ul>',
        '<p id="appointmentRequestStatus"></p>',
      '</section>',
      '<section class="admin-card admin-appointments-card">',
        '<h2>Approved Appointments</h2>',
        '<p class="muted">Approved appointments stay here. Canceling or deleting releases the time.</p>',
        '<ul id="approvedAppointmentList" class="list admin-request-list"></ul>',
      '</section>',
      '<section class="admin-card admin-appointments-card">',
        '<h2>Denied / Canceled Appointments</h2>',
        '<p class="muted">Denied and canceled requests are kept here for history. Delete removes the record.</p>',
        '<ul id="deniedAppointmentList" class="list admin-request-list"></ul>',
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
    resetPhotoCrop();
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
          '<small>' + escapeHtml(trainer.cellPhone || 'No coach phone saved') + ' · ' + (trainer.active === false ? 'Inactive' : 'Active') + '</small></div>' +
        '</div>' +
        '<div class="list-actions">' +
          '<button type="button" class="btn small alt" data-edit-trainer="' + escapeHtml(trainer._key) + '">Edit</button>' +
          '<button type="button" class="btn small alt" data-delete-trainer="' + escapeHtml(trainer._key) + '">Delete</button>' +
        '</div>' +
      '</li>';
    }).join('');
  }

  function getBlocksForSelectedDate() {
    var date = $('availabilityDate') ? $('availabilityDate').value : '';
    var blocks = state.availability[state.trainerId] && state.availability[state.trainerId][date];
    return { date: date, blocks: toArray(blocks).sort(function(a, b) {
      return String(a.timeValue || a.time || '').localeCompare(String(b.timeValue || b.time || ''));
    }) };
  }

  function getAllBlocksForSelectedTrainer() {
    var trainerAvailability = state.availability[state.trainerId] || {};
    var blocks = [];
    Object.keys(trainerAvailability).forEach(function(date) {
      toArray(trainerAvailability[date]).forEach(function(block) {
        block._date = date;
        blocks.push(block);
      });
    });
    return blocks.sort(function(a, b) {
      return String(a._date || '').localeCompare(String(b._date || '')) ||
        String(a.timeValue || a.time || '').localeCompare(String(b.timeValue || b.time || ''));
    });
  }

  function findAvailabilityBlock(date, key) {
    var blocks = state.availability[state.trainerId] && state.availability[state.trainerId][date];
    var block = blocks && blocks[key];
    if (block && typeof block === 'object') return Object.assign({ _key: key, _date: date }, block);
    return null;
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

  function blockRangeLabel(block) {
    var start = blockStartMinutes(block);
    var end = blockEndMinutes(block);
    var startLabel = block && block.time ? block.time : formatTimeLabel(block && (block.startTimeValue || block.timeValue));
    var endLabel = end == null ? '' : formatTimeLabel(minutesToTimeValue(end));
    return startLabel + (endLabel ? ' - ' + endLabel : '');
  }

  function blockLocation(block, trainer) {
    return block && block.location ? block.location : ((trainer && trainer.location) || '');
  }

  function renderAvailability() {
    renderTrainerSelects();
    var list = $('availabilitySlotList');
    if (!list) return;
    if (!state.trainerId) {
      list.innerHTML = '<li class="muted">Add a trainer before setting availability.</li>';
      return;
    }
    var blocks = getAllBlocksForSelectedTrainer();
    if (!blocks.length) {
      list.innerHTML = '<li class="muted">No availability blocks saved for this trainer.</li>';
      return;
    }
    list.innerHTML = blocks.map(function(block) {
      var trainer = getTrainerById(state.trainerId);
      return '<li class="admin-availability-item">' +
        '<div class="admin-availability-main"><strong>' + escapeHtml(formatDate(block._date) + ' · ' + blockRangeLabel(block)) + '</strong>' +
        '<span>' + escapeHtml(blockLocation(block, trainer) || 'No location set') + ' · ' + (block.active === false ? 'Inactive' : 'Open block') + '</span>' +
        '</div><div class="list-actions">' +
          '<button type="button" class="btn small alt" data-edit-slot="' + escapeHtml(block._key) + '" data-slot-date="' + escapeHtml(block._date) + '">Edit</button>' +
          '<button type="button" class="btn small alt" data-delete-slot="' + escapeHtml(block._key) + '" data-slot-date="' + escapeHtml(block._date) + '">Delete</button>' +
        '</div>' +
      '</li>';
    }).join('');
  }

  function requestListItem(request, actionsHtml) {
    var trainer = getTrainerById(request.trainerId);
    return '<li class="admin-request-item">' +
      '<div class="admin-request-main">' +
        '<strong>' + escapeHtml(request.fullName || 'Appointment request') + '</strong>' +
        '<span>' + escapeHtml(formatDate(request.date) + ' at ' + (request.time || '') + (request.endTime ? ' - ' + request.endTime : '') + (request.price ? ' · $' + request.price : '')) + '</span>' +
        '<small>' + escapeHtml((trainer && trainer.name) || request.trainerName || 'Trainer') + ' · ' + escapeHtml(request.phone || '') + ' · ' + escapeHtml(request.email || '') + '</small>' +
        '<small>' + escapeHtml(request.location || (trainer && trainer.location) || '') + '</small>' +
      '</div>' +
      '<div class="list-actions">' + actionsHtml + '</div>' +
    '</li>';
  }

  function sortRequests(a, b) {
    return String(a.date || '').localeCompare(String(b.date || '')) || String(a.time || '').localeCompare(String(b.time || ''));
  }

  function renderRequests() {
    var list = $('appointmentRequestList');
    if (!list) return;
    var pending = state.requests.filter(function(request) {
      return (request.status || 'pending') === 'pending';
    }).sort(sortRequests);

    if (!pending.length) {
      list.innerHTML = '<li class="muted">No pending appointment requests.</li>';
    } else {
      list.innerHTML = pending.map(function(request) {
        return requestListItem(request,
          '<button type="button" class="btn small" data-approve-request="' + escapeHtml(request._key) + '">Approve</button>' +
          '<button type="button" class="btn small alt" data-deny-request="' + escapeHtml(request._key) + '">Deny</button>' +
          '<button type="button" class="btn small alt" data-delete-request="' + escapeHtml(request._key) + '">Delete</button>'
        );
      }).join('');
    }

    var approvedList = $('approvedAppointmentList');
    if (!approvedList) return;
    var approved = state.requests.filter(function(request) {
      return request.status === 'approved';
    }).sort(sortRequests);

    if (!approved.length) {
      approvedList.innerHTML = '<li class="muted">No approved appointments yet.</li>';
      return;
    }

    approvedList.innerHTML = approved.map(function(request) {
      return requestListItem(request,
        '<button type="button" class="btn small alt" data-deny-request="' + escapeHtml(request._key) + '">Cancel</button>' +
        '<button type="button" class="btn small alt" data-delete-request="' + escapeHtml(request._key) + '">Delete</button>'
      );
    }).join('');

    var deniedList = $('deniedAppointmentList');
    if (!deniedList) return;
    var denied = state.requests.filter(function(request) {
      return request.status === 'denied';
    }).sort(sortRequests);

    if (!denied.length) {
      deniedList.innerHTML = '<li class="muted">No denied or canceled appointments yet.</li>';
      return;
    }

    deniedList.innerHTML = denied.map(function(request) {
      return requestListItem(request,
        '<button type="button" class="btn small alt" data-delete-request="' + escapeHtml(request._key) + '">Delete</button>'
      );
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
      cellPhone: $('trainerCellPhone').value.trim(),
      photoUrl: $('trainerPhotoUrl').value.trim(),
      photoStoragePath: existing && existing.photoStoragePath ? existing.photoStoragePath : '',
      active: $('trainerActive').checked,
      sortOrder: +$('trainerSortOrder').value || 0,
      updatedAt: now
    };
    if (!state.editingTrainerKey) trainer.createdAt = now;

    var button = $('trainerSubmitBtn');
    button.disabled = true;
    var shouldUploadPhoto = !!(file || (state.photoCrop.dirty && state.photoCrop.image));
    setStatus('trainerSaveStatus', shouldUploadPhoto ? 'Optimizing photo...' : 'Saving trainer...', false);

    var upload = shouldUploadPhoto
      ? optimizeTrainerPhoto(file).then(function(blob) {
          setStatus('trainerSaveStatus', 'Uploading optimized photo...', false);
          return fbUploadFile(trainerUploadPath(file), blob, {
            contentType: 'image/jpeg',
            customMetadata: {
              originalName: file && file.name ? file.name : 'existing-trainer-photo.jpg',
              optimizedWidth: '800',
              optimizedHeight: '800'
            }
          });
        }).then(function(result) {
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
    $('trainerCellPhone').value = trainer.cellPhone || '';
    $('trainerPhotoUrl').value = trainer.photoUrl || '';
    $('trainerSortOrder').value = trainer.sortOrder != null ? trainer.sortOrder : 0;
    $('trainerActive').checked = trainer.active !== false;
    $('trainerSubmitBtn').textContent = 'Update Trainer';
    $('trainerCancelEditBtn').hidden = false;
    resetPhotoCrop();
    setStatus('trainerSaveStatus', '', false);
    if (trainer.photoUrl) {
      loadTrainerPhotoCropUrl(trainer.photoUrl).catch(function(error) {
        setStatus('trainerSaveStatus', error && error.message ? error.message : 'Could not load the trainer photo crop controls.', true);
      });
    }
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

  function resetAvailabilityForm() {
    state.editingAvailability = null;
    var form = $('trainerAvailabilityForm');
    if (form) form.reset();
    var dateInput = $('availabilityDate');
    if (dateInput) dateInput.value = new Date().toISOString().slice(0, 10);
    var submit = $('availabilitySubmitBtn');
    if (submit) submit.textContent = 'Add Availability Block';
    var cancel = $('availabilityCancelEditBtn');
    if (cancel) cancel.hidden = true;
    setStatus('availabilitySaveStatus', '', false);
  }

  function saveAvailabilityBlock(event) {
    event.preventDefault();
    var date = $('availabilityDate').value;
    var startValue = $('availabilityStartTime').value;
    var endValue = $('availabilityEndTime').value;
    var location = $('availabilityLocation').value.trim();
    if (!state.trainerId || !date || !startValue || !endValue || !location) return;
    var startMinutes = timeToMinutes(startValue);
    var endMinutes = timeToMinutes(endValue);
    if (startMinutes == null || endMinutes == null || endMinutes <= startMinutes) {
      setStatus('availabilitySaveStatus', 'Choose a valid start and end time.', true);
      return;
    }
    if (endMinutes - startMinutes < 30) {
      setStatus('availabilitySaveStatus', 'Availability blocks must be at least 30 minutes.', true);
      return;
    }
    var editing = state.editingAvailability;
    var existingBlocks = getBlocksForSelectedDate().blocks.filter(function(block) {
      if (editing && editing.date === date && editing.key === block._key) return false;
      return block.active !== false;
    });
    var conflict = existingBlocks.find(function(block) {
      var blockStart = blockStartMinutes(block);
      var blockEnd = blockEndMinutes(block);
      return blockStart != null && blockEnd != null && rangesOverlap(startMinutes, endMinutes, blockStart, blockEnd);
    });
    if (conflict) {
      setStatus('availabilitySaveStatus', 'That block overlaps ' + blockRangeLabel(conflict) + '. Choose another time.', true);
      return;
    }
    var blockKey = editing && editing.date === date ? editing.key : safeKey(startValue + '-' + endValue);
    var block = {
      time: formatTimeLabel(startValue),
      timeValue: startValue,
      startTimeValue: startValue,
      endTime: formatTimeLabel(minutesToTimeValue(endMinutes)),
      endTimeValue: minutesToTimeValue(endMinutes),
      location: location,
      active: true,
      updatedAt: new Date().toISOString()
    };
    setStatus('availabilitySaveStatus', 'Saving availability block...', false);
    var updates = {};
    updates['trainerAvailability/' + state.trainerId + '/' + date + '/' + blockKey] = block;
    if (editing && editing.date !== date) {
      updates['trainerAvailability/' + state.trainerId + '/' + editing.date + '/' + editing.key] = null;
    }
    fbUpdate(updates).then(function() {
      return Object.assign({ _key: blockKey }, block);
    }).then(function(saved) {
      state.availability[state.trainerId] = state.availability[state.trainerId] || {};
      if (editing && editing.date !== date && state.availability[state.trainerId][editing.date]) {
        delete state.availability[state.trainerId][editing.date][editing.key];
      }
      state.availability[state.trainerId][date] = state.availability[state.trainerId][date] || {};
      state.availability[state.trainerId][date][blockKey] = saved;
      setStatus('availabilitySaveStatus', editing ? 'Availability block updated.' : 'Availability block saved.', false);
      resetAvailabilityForm();
      renderAvailability();
    }).catch(function(error) {
      setStatus('availabilitySaveStatus', error && error.message ? error.message : 'Could not save availability block.', true);
    });
  }

  function editSlot(date, slotKey) {
    var block = findAvailabilityBlock(date, slotKey);
    if (!block) return;
    state.editingAvailability = { date: date, key: slotKey };
    $('availabilityDate').value = date;
    $('availabilityStartTime').value = block.startTimeValue || block.timeValue || '';
    $('availabilityEndTime').value = block.endTimeValue || '';
    $('availabilityLocation').value = block.location || '';
    $('availabilitySubmitBtn').textContent = 'Update Availability Block';
    $('availabilityCancelEditBtn').hidden = false;
    setStatus('availabilitySaveStatus', '', false);
    $('availabilityDate').focus();
  }

  function deleteSlot(date, slotKey) {
    if (!state.trainerId || !date) return;
    fbDeleteChild('trainerAvailability/' + state.trainerId + '/' + date, slotKey).then(function() {
      if (state.availability[state.trainerId] && state.availability[state.trainerId][date]) {
        delete state.availability[state.trainerId][date][slotKey];
      }
      if (state.editingAvailability && state.editingAvailability.date === date && state.editingAvailability.key === slotKey) {
        resetAvailabilityForm();
      }
      renderAvailability();
    }).catch(function(error) {
      setStatus('availabilitySaveStatus', error && error.message ? error.message : 'Could not delete availability block.', true);
    });
  }

  function updateRequestStatus(key, status) {
    var request = state.requests.find(function(item) { return item._key === key; });
    if (!request) return;
    var now = new Date().toISOString();
    var claimBasePath = 'appointmentClaims/' + request.trainerId + '/' + request.date;
    var claimKeys = Array.isArray(request.claimKeys) && request.claimKeys.length ? request.claimKeys : [request.slotId];
    var updates = {};
    if (status === 'delete') {
      updates['appointmentRequests/' + key] = null;
      claimKeys.forEach(function(claimKey) {
        updates[claimBasePath + '/' + claimKey] = null;
      });
    } else {
      updates['appointmentRequests/' + key + '/status'] = status;
      updates['appointmentRequests/' + key + '/updatedAt'] = now;
      claimKeys.forEach(function(claimKey) {
        updates[claimBasePath + '/' + claimKey] = status === 'approved'
          ? {
              appointmentId: key,
              slotId: request.slotId || '',
              blockId: request.blockId || '',
              time: request.time || '',
              timeValue: request.timeValue || request.startTimeValue || '',
              startTimeValue: request.startTimeValue || request.timeValue || '',
              endTime: request.endTime || '',
              endTimeValue: request.endTimeValue || '',
              durationMinutes: request.durationMinutes || 30,
              price: request.price || 30,
              location: request.location || '',
              status: 'approved',
              createdAt: request.createdAt || now,
              updatedAt: now
            }
          : null;
      });
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
      resetAvailabilityForm();
      renderAvailability();
    });
    $('trainerAvailabilityForm').addEventListener('submit', saveAvailabilityBlock);
    $('availabilityCancelEditBtn').addEventListener('click', resetAvailabilityForm);
    $('trainerPhotoFile').addEventListener('change', function(event) {
      loadTrainerPhotoCrop(event.target.files[0]).catch(function(error) {
        setStatus('trainerSaveStatus', error && error.message ? error.message : 'Could not load that trainer photo.', true);
        resetPhotoCrop();
      });
    });
    $('trainerPhotoZoom').addEventListener('input', function(event) {
      setPhotoCropZoom(event.target.value);
    });
    $('trainerPhotoReset').addEventListener('click', function() {
      state.photoCrop.x = 0;
      state.photoCrop.y = 0;
      setPhotoCropZoom(1);
    });
    $('trainerPhotoCropCanvas').addEventListener('pointerdown', function(event) {
      if (!state.photoCrop.image) return;
      var canvas = event.currentTarget;
      var startX = event.clientX;
      var startY = event.clientY;
      var originalX = state.photoCrop.x;
      var originalY = state.photoCrop.y;
      canvas.setPointerCapture(event.pointerId);
      function move(moveEvent) {
        var sourceSize = cropSourceSize(state.photoCrop.image, state.photoCrop.zoom);
        var scale = sourceSize / canvas.clientWidth;
        state.photoCrop.x = originalX - ((moveEvent.clientX - startX) * scale);
        state.photoCrop.y = originalY - ((moveEvent.clientY - startY) * scale);
        state.photoCrop.dirty = true;
        drawPhotoCropPreview();
      }
      function stop() {
        canvas.removeEventListener('pointermove', move);
        canvas.removeEventListener('pointerup', stop);
        canvas.removeEventListener('pointercancel', stop);
      }
      canvas.addEventListener('pointermove', move);
      canvas.addEventListener('pointerup', stop);
      canvas.addEventListener('pointercancel', stop);
    });
    $('trainerPhotoCropEditor').addEventListener('click', function(event) {
      var btn = event.target.closest('[data-photo-nudge]');
      if (!btn) return;
      var parts = btn.dataset.photoNudge.split(',').map(function(part) { return +part; });
      nudgePhotoCrop(parts[0] || 0, parts[1] || 0);
    });
    $('availabilitySlotList').addEventListener('click', function(event) {
      var edit = event.target.closest('[data-edit-slot]');
      var btn = event.target.closest('[data-delete-slot]');
      if (edit) editSlot(edit.dataset.slotDate, edit.dataset.editSlot);
      if (btn) deleteSlot(btn.dataset.slotDate, btn.dataset.deleteSlot);
    });
    function handleRequestAction(event) {
      var approve = event.target.closest('[data-approve-request]');
      var deny = event.target.closest('[data-deny-request]');
      var del = event.target.closest('[data-delete-request]');
      if (approve) updateRequestStatus(approve.dataset.approveRequest, 'approved');
      if (deny) updateRequestStatus(deny.dataset.denyRequest, 'denied');
      if (del) updateRequestStatus(del.dataset.deleteRequest, 'delete');
    }
    $('appointmentRequestList').addEventListener('click', handleRequestAction);
    $('approvedAppointmentList').addEventListener('click', handleRequestAction);
    $('deniedAppointmentList').addEventListener('click', handleRequestAction);
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
