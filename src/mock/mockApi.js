import { BLOOD_GROUPS, MIN_GAP_DAYS, DEFAULT_THRESHOLD, donorGroupsFor } from '../utils/constants';
import { DAY, daysSince, ageFromDob } from '../utils/helpers';
import { seed, matchDonors } from './seed';

const KEY = 'raktsetu_db_v1';
let db;
try {
  db = JSON.parse(localStorage.getItem(KEY) || 'null');
} catch {
  db = null;
}
if (!db || !db.hospitals) db = seed();
const save = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    /* storage full or blocked: keep in memory */
  }
};
save();

const clone = (v) => JSON.parse(JSON.stringify(v));
const wait = (ms = 220) => new Promise((r) => setTimeout(r, ms));
const fail = (message, status = 400) => {
  const e = new Error(message);
  e.response = { status, data: { message } };
  throw e;
};
const wrap = (fn) => async (...args) => {
  await wait();
  const out = fn(...args);
  return clone(out);
};

const nextId = (key, prefix) => `${prefix}${db.counters[key]++}`;
const log = (user, role, action, entity, detail) => {
  db.audit.unshift({ id: nextId('audit', 'AU'), at: new Date().toISOString(), user, role, action, entity, detail });
};
const hospital = (id) => db.hospitals.find((h) => h.id === id);
const donor = (id) => db.donors.find((d) => d.id === id);
const request = (id) => db.requests.find((r) => r.id === id);
const unitStatus = (u) => (u.status === 'AVAILABLE' && new Date(u.expiry) < new Date() ? 'EXPIRED' : u.status);
const thresholdOf = (hid, g) => db.thresholds[`${hid}|${g}`] ?? DEFAULT_THRESHOLD;
const touchStock = (hid) => {
  const h = hospital(hid);
  if (h) h.stockUpdatedAt = new Date().toISOString();
};
const eligibility = (d) => {
  const since = daysSince(d.lastDonation);
  const remaining = Math.max(0, MIN_GAP_DAYS - (since === Infinity ? MIN_GAP_DAYS : since));
  const mine = db.donations.filter((x) => x.donorId === d.id);
  return {
    eligible: remaining === 0,
    daysSince: since === Infinity ? null : since,
    daysRemaining: remaining,
    nextDate: d.lastDonation ? new Date(new Date(d.lastDonation).getTime() + MIN_GAP_DAYS * DAY).toISOString() : null,
    lastDonation: d.lastDonation,
    available: d.available,
    totalDonations: mine.length,
    totalUnits: mine.reduce((s, x) => s + x.units, 0),
  };
};
const publicDonor = (d) => ({ id: d.id, name: d.name, group: d.group, city: d.city, area: d.area, available: d.available, lastDonation: d.lastDonation });
const stockOf = (hid, g) => db.units.filter((u) => u.hospitalId === hid && u.group === g && unitStatus(u) === 'AVAILABLE').length;
const enrichRequest = (r) => ({
  ...r,
  matchCount: matchDonors(db, r).length,
});

export const mock = {
  /* ---------------- Auth ---------------- */
  login: wrap(({ identifier, password, role }) => {
    const id = String(identifier || '').trim().toLowerCase();
    const u = db.users.find((x) => {
      if (x.role !== role) return false;
      const d = x.donorId ? donor(x.donorId) : null;
      const h = x.hospitalId ? hospital(x.hospitalId) : null;
      const donorName = (d?.name || x.name || '').toLowerCase().trim();
      const donorFirstName = donorName.split(/\s+/)[0];
      const hospitalName = (h?.name || '').toLowerCase().trim();

      return (
        String(x.username || '').toLowerCase().trim() === id ||
        String(x.phone || '').trim() === id ||
        (x.email && x.email.toLowerCase().trim() === id) ||
        (donorName && (donorName === id || donorFirstName === id)) ||
        (hospitalName && hospitalName === id)
      );
    });
    if (!u || u.password !== password) fail('Invalid username or password for the selected role.', 401);
    if (role === 'donor') {
      const d = donor(u.donorId) || { id: u.donorId || 'D0', name: u.name || u.username || 'Donor', city: 'Surat', active: true };
      if (!d?.active) fail('This donor account has been deactivated. Please contact support.', 403);
      return { token: `mock-${d.id}-${Date.now()}`, user: { id: d.id, role, name: d.name, donorId: d.id, city: d.city || 'Surat' } };
    }
    if (role === 'hospital') {
      const h = hospital(u.hospitalId);
      if (h.status === 'PENDING') fail('Your hospital is awaiting admin verification. You will be able to log in once approved.', 403);
      if (h.status === 'REJECTED') fail('Your hospital registration was rejected. Please contact RaktSetu support.', 403);
      return { token: `mock-${h.id}-${Date.now()}`, user: { id: h.id, role, name: h.name, hospitalId: h.id, city: h.city } };
    }
    return { token: `mock-admin-${Date.now()}`, user: { id: 'A1', role: 'admin', name: u.name || 'Admin' } };
  }),

  registerDonor: wrap((p) => {
    if (!/^\d{10}$/.test(p.phone || '')) fail('Phone number must be 10 digits.');
    if (db.users.some((u) => u.phone === p.phone)) fail('This phone number is already registered.', 409);
    const age = ageFromDob(p.dob);
    if (!(age >= 18 && age <= 65)) fail('Donors must be between 18 and 65 years old.');
    const id = nextId('donor', 'D');
    const d = {
      id, name: p.name, gender: p.gender, dob: p.dob, phone: p.phone, email: p.email || '', group: p.group, city: p.city,
      area: p.area || '', pincode: p.pincode || '', weight: Number(p.weight) || 0, available: p.available !== false, active: true,
      preferredTime: 'Anytime', lastDonation: null, createdAt: new Date().toISOString(),
    };
    db.donors.push(d);
    db.users.push({
      username: p.name || p.phone,
      name: p.name,
      phone: p.phone,
      email: p.email || '',
      password: p.password,
      role: 'donor',
      donorId: id,
    });
    log(p.name, 'donor', 'REGISTER_DONOR', `Donor ${id}`, `${p.group} · ${p.city}`);
    save();
    return { token: `mock-${id}-${Date.now()}`, user: { id, role: 'donor', name: d.name, donorId: id, city: d.city } };
  }),

  registerHospital: wrap((p) => {
    if (db.users.some((u) => u.email === p.email || u.phone === p.phone)) fail('A hospital with this email or phone is already registered.', 409);
    const id = nextId('hospital', 'H');
    db.hospitals.push({
      id, name: p.name, city: p.city, address: p.address, status: 'PENDING', license: p.license, phone: p.phone, email: p.email,
      contactPerson: p.contactPerson, createdAt: new Date().toISOString(), stockUpdatedAt: new Date().toISOString(),
    });
    db.users.push({ username: p.email, phone: p.phone, email: p.email, password: p.password, role: 'hospital', hospitalId: id });
    log(p.contactPerson, 'hospital', 'REGISTER_HOSPITAL', `Hospital ${id}`, p.name);
    save();
    return { id, status: 'PENDING' };
  }),

  /* ---------------- Stats ---------------- */
  getStats: wrap(() => {
    const now = new Date();
    return {
      donors: db.donors.filter((d) => d.active).length,
      donations: db.donations.length,
      openRequests: db.requests.filter((r) => r.status === 'OPEN' || r.status === 'PARTIAL').length,
      hospitals: db.hospitals.filter((h) => h.status === 'APPROVED').length,
      campsThisMonth: db.camps.filter((c) => new Date(c.date).getMonth() === now.getMonth() && new Date(c.date).getFullYear() === now.getFullYear()).length,
    };
  }),

  getCharts: wrap(() => {
    const stockByGroup = BLOOD_GROUPS.map((g) => ({
      name: g,
      value: db.units.filter((u) => u.group === g && unitStatus(u) === 'AVAILABLE').length,
    }));
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      months.push({ y: d.getFullYear(), m: d.getMonth(), name: d.toLocaleString('en-IN', { month: 'short' }), value: 0 });
    }
    db.requests.forEach((r) => {
      const c = new Date(r.createdAt);
      const slot = months.find((x) => x.y === c.getFullYear() && x.m === c.getMonth());
      if (slot) slot.value++;
    });
    const count = (s) => db.requests.filter((r) => r.status === s).length;
    return {
      stockByGroup,
      requestsPerMonth: months.map(({ name, value }) => ({ name, value })),
      fulfilment: [
        { name: 'Fulfilled', value: count('FULFILLED') },
        { name: 'Open', value: count('OPEN') },
        { name: 'Partial', value: count('PARTIAL') },
        { name: 'Cancelled', value: count('CANCELLED') },
      ],
      donationsByCamp: db.camps.map((c) => ({ name: c.name.split(' ').slice(0, 2).join(' '), value: c.unitsCollected })),
      kpis: {
        donors: db.donors.length,
        hospitals: db.hospitals.length,
        pendingHospitals: db.hospitals.filter((h) => h.status === 'PENDING').length,
        requests: db.requests.length,
        donations: db.donations.length,
        units: db.units.filter((u) => unitStatus(u) === 'AVAILABLE').length,
      },
    };
  }),

  /* ---------------- Inventory ---------------- */
  getInventory: wrap(({ hospitalId, city, group } = {}) => {
    let hs = db.hospitals.filter((h) => h.status === 'APPROVED');
    if (hospitalId) hs = hs.filter((h) => h.id === hospitalId);
    if (city) hs = hs.filter((h) => h.city === city);
    return hs.map((h) => {
      const groups = BLOOD_GROUPS.map((g) => {
        const units = stockOf(h.id, g);
        const threshold = thresholdOf(h.id, g);
        const expiring = db.units.filter(
          (u) => u.hospitalId === h.id && u.group === g && unitStatus(u) === 'AVAILABLE' && new Date(u.expiry) < new Date(Date.now() + 5 * DAY)
        ).length;
        return { group: g, units, threshold, low: units < threshold, expiring };
      });
      const out = { hospitalId: h.id, hospitalName: h.name, city: h.city, updatedAt: h.stockUpdatedAt, groups };
      if (group) out.groups = out.groups.filter((x) => x.group === group);
      if (hospitalId) {
        out.units = db.units
          .filter((u) => u.hospitalId === h.id)
          .map((u) => ({ ...u, status: unitStatus(u) }))
          .sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
      }
      return out;
    });
  }),

  setThreshold: wrap(({ hospitalId, group, threshold }) => {
    const t = Number(threshold);
    if (!(t >= 0 && t <= 100)) fail('Threshold must be between 0 and 100.');
    db.thresholds[`${hospitalId}|${group}`] = t;
    log(hospital(hospitalId).contactPerson, 'hospital', 'INVENTORY_UPDATE', `Hospital ${hospitalId}`, `Low-stock threshold for ${group} set to ${t}`);
    save();
    return { ok: true };
  }),

  /* ---------------- Requests ---------------- */
  getRequests: wrap((p = {}) => {
    let r = db.requests;
    if (p.status) r = r.filter((x) => x.status === p.status);
    if (p.urgency) r = r.filter((x) => x.urgency === p.urgency);
    if (p.group) r = r.filter((x) => x.group === p.group);
    if (p.city) r = r.filter((x) => x.city === p.city);
    if (p.hospitalId) r = r.filter((x) => x.hospitalId === p.hospitalId);
    return [...r].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(enrichRequest);
  }),

  getRequest: wrap((id) => {
    const r = request(id);
    if (!r) fail('Request not found.', 404);
    return enrichRequest(r);
  }),

  createRequest: wrap((p) => {
    const h = p.hospitalId ? hospital(p.hospitalId) : null;
    const units = Number(p.units);
    if (!(units >= 1 && units <= 10)) fail('Units needed must be between 1 and 10.');
    if (!BLOOD_GROUPS.includes(p.group)) fail('Please select a valid blood group.');
    const r = {
      id: nextId('request', 'R'),
      hospitalId: h?.id || null,
      hospitalName: h?.name || p.hospitalName || 'Emergency (public request)',
      city: h?.city || p.city,
      patientName: p.patientName,
      group: p.group,
      units,
      urgency: p.urgency || 'NORMAL',
      status: 'OPEN',
      requiredBy: new Date(p.requiredBy).toISOString(),
      contactPerson: p.contactPerson,
      phone: p.phone,
      notes: p.notes || '',
      createdAt: new Date().toISOString(),
      notified: [],
      accepted: [],
      declined: [],
    };
    if (r.urgency === 'CRITICAL') r.notified = matchDonors(db, r).map((d) => d.id); // auto-notify on critical
    db.requests.unshift(r);
    log(p.contactPerson, h ? 'hospital' : 'public', 'CREATE_REQUEST', `Request ${r.id}`, `${r.urgency} request for ${units} unit(s) ${r.group}`);
    save();
    return { ...enrichRequest(r), autoNotified: r.notified.length };
  }),

  getMatches: wrap((id) => {
    const r = request(id);
    if (!r) fail('Request not found.', 404);
    return matchDonors(db, r)
      .map((d) => ({
        id: d.id, name: d.name, group: d.group, city: d.city, area: d.area,
        exact: d.group === r.group,
        daysSince: daysSince(d.lastDonation) === Infinity ? null : daysSince(d.lastDonation),
        notified: r.notified.includes(d.id),
        accepted: r.accepted.includes(d.id),
        phone: r.accepted.includes(d.id) ? d.phone : null,
      }))
      .sort((a, b) => Number(b.exact) - Number(a.exact) || (b.daysSince ?? 999) - (a.daysSince ?? 999));
  }),

  notify: wrap((id, { donorIds } = {}) => {
    const r = request(id);
    if (!r) fail('Request not found.', 404);
    if (r.status === 'FULFILLED' || r.status === 'CANCELLED') fail(`Cannot notify donors: request is ${r.status.toLowerCase()}.`);
    const ids = donorIds?.length ? donorIds : matchDonors(db, r).map((d) => d.id);
    const fresh = ids.filter((x) => !r.notified.includes(x));
    r.notified.push(...fresh);
    log(r.contactPerson, 'hospital', 'NOTIFY_DONORS', `Request ${id}`, `${fresh.length} donor(s) notified`);
    save();
    return { notified: fresh.length };
  }),

  fulfill: wrap((id) => {
    const r = request(id);
    if (!r) fail('Request not found.', 404);
    if (r.status === 'FULFILLED') fail('This request is already fulfilled.');
    if (r.status === 'CANCELLED') fail('A cancelled request cannot be fulfilled.');
    if (!r.hospitalId) fail('Public emergency requests have no hospital inventory to deduct from.');
    const avail = db.units
      .filter((u) => u.hospitalId === r.hospitalId && u.group === r.group && unitStatus(u) === 'AVAILABLE')
      .sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
    if (avail.length < r.units) fail(`Insufficient stock: only ${avail.length} unit(s) of ${r.group} available, ${r.units} needed.`);
    avail.slice(0, r.units).forEach((u) => (u.status = 'USED'));
    const prev = r.status;
    r.status = 'FULFILLED';
    touchStock(r.hospitalId);
    log(r.contactPerson, 'hospital', 'STATUS_CHANGE', `Request ${id}`, `${prev} → FULFILLED`);
    log(r.contactPerson, 'hospital', 'INVENTORY_UPDATE', `Hospital ${r.hospitalId}`, `Fulfilled ${id}: ${r.units} unit(s) ${r.group} deducted`);
    save();
    return { ok: true, deducted: r.units };
  }),

  cancelRequest: wrap((id) => {
    const r = request(id);
    if (!r) fail('Request not found.', 404);
    if (r.status === 'FULFILLED') fail('A fulfilled request cannot be cancelled.');
    const prev = r.status;
    r.status = 'CANCELLED';
    log(r.contactPerson, 'hospital', 'STATUS_CHANGE', `Request ${id}`, `${prev} → CANCELLED`);
    save();
    return { ok: true };
  }),

  overrideStatus: wrap((id, status) => {
    const r = request(id);
    if (!r) fail('Request not found.', 404);
    const prev = r.status;
    r.status = status;
    log('RaktSetu Admin', 'admin', 'OVERRIDE_STATUS', `Request ${id}`, `${prev} → ${status}`);
    save();
    return { ok: true };
  }),

  /* ---------------- Donors ---------------- */
  getDonors: wrap((p = {}) => {
    let d = db.donors;
    if (p.group) d = d.filter((x) => x.group === p.group);
    if (p.city) d = d.filter((x) => x.city === p.city);
    if (p.available === 'true' || p.available === true) d = d.filter((x) => x.available);
    if (p.available === 'false' || p.available === false) d = d.filter((x) => !x.available);
    if (p.search) {
      const s = p.search.toLowerCase();
      d = d.filter((x) => x.name.toLowerCase().includes(s) || x.phone.includes(s));
    }
    return d.map((x) => ({ ...x, ...eligibility(x) }));
  }),

  countDonors: wrap(({ group, city } = {}) => {
    const compat = group ? donorGroupsFor(group) : BLOOD_GROUPS;
    const list = db.donors.filter((d) => d.active && d.available && (!city || d.city === city) && compat.includes(d.group) && daysSince(d.lastDonation) >= MIN_GAP_DAYS);
    return { count: list.length };
  }),

  getDonor: wrap((id) => {
    const d = donor(id);
    if (!d) fail('Donor not found.', 404);
    return d;
  }),

  updateDonor: wrap((id, patch) => {
    const d = donor(id);
    if (!d) fail('Donor not found.', 404);
    if (patch.phone && !/^\d{10}$/.test(patch.phone)) fail('Phone number must be 10 digits.');
    ['name', 'phone', 'email', 'city', 'preferredTime', 'available'].forEach((k) => {
      if (patch[k] !== undefined) d[k] = patch[k];
    });
    save();
    return d;
  }),

  changePassword: wrap((id, { current, next }) => {
    const u = db.users.find((x) => x.donorId === id);
    if (!u || u.password !== current) fail('Current password is incorrect.');
    if (!next || next.length < 6) fail('New password must be at least 6 characters.');
    u.password = next;
    save();
    return { ok: true };
  }),

  getEligibility: wrap((id) => {
    const d = donor(id);
    if (!d) fail('Donor not found.', 404);
    return eligibility(d);
  }),

  setAvailability: wrap((id, available) => {
    const d = donor(id);
    if (!d) fail('Donor not found.', 404);
    d.available = !!available;
    save();
    return { available: d.available };
  }),

  setDonorActive: wrap((id, active) => {
    const d = donor(id);
    if (!d) fail('Donor not found.', 404);
    d.active = !!active;
    log('RaktSetu Admin', 'admin', active ? 'ACTIVATE_DONOR' : 'DEACTIVATE_DONOR', `Donor ${id}`, d.name);
    save();
    return { ok: true };
  }),

  getDonorRequests: wrap((id) => {
    const d = donor(id);
    if (!d) fail('Donor not found.', 404);
    const elig = eligibility(d);
    return db.requests
      .filter((r) => (r.status === 'OPEN' || r.status === 'PARTIAL') && r.city === d.city && donorGroupsFor(r.group).includes(d.group))
      .map((r) => {
        const mine = r.accepted.includes(id) ? 'ACCEPTED' : r.declined.includes(id) ? 'DECLINED' : null;
        const eligibleByDeadline = elig.eligible || (elig.nextDate && new Date(elig.nextDate) <= new Date(r.requiredBy));
        return {
          id: r.id, hospitalName: r.hospitalName, city: r.city, group: r.group, units: r.units, urgency: r.urgency, status: r.status,
          requiredBy: r.requiredBy, createdAt: r.createdAt, notes: r.notes, contactPerson: mine === 'ACCEPTED' ? r.contactPerson : null,
          phone: mine === 'ACCEPTED' ? r.phone : null, myResponse: mine, directlyNotified: r.notified.includes(id), eligibleByDeadline: !!eligibleByDeadline,
          area: db.hospitals.find((h) => h.id === r.hospitalId)?.address || r.city,
        };
      })
      .filter((r) => r.myResponse !== 'DECLINED')
      .sort((a, b) => ['CRITICAL', 'URGENT', 'NORMAL'].indexOf(a.urgency) - ['CRITICAL', 'URGENT', 'NORMAL'].indexOf(b.urgency));
  }),

  respond: wrap((requestId, donorId, accept) => {
    const r = request(requestId);
    const d = donor(donorId);
    if (!r || !d) fail('Request not found.', 404);
    if (r.status === 'FULFILLED' || r.status === 'CANCELLED') fail(`This request is already ${r.status.toLowerCase()}.`);
    if (accept) {
      const elig = eligibility(d);
      if (!elig.eligible && !(elig.nextDate && new Date(elig.nextDate) <= new Date(r.requiredBy))) {
        fail(`You are not eligible to donate before this deadline (eligible again on ${new Date(elig.nextDate).toDateString()}).`);
      }
      if (!r.accepted.includes(donorId)) r.accepted.push(donorId);
      if (!r.notified.includes(donorId)) r.notified.push(donorId);
      r.declined = r.declined.filter((x) => x !== donorId);
      if (r.status === 'OPEN') r.status = 'PARTIAL';
      log(d.name, 'donor', 'DONOR_ACCEPTED', `Request ${requestId}`, `${d.name} accepted`);
      save();
      return { phone: r.phone, contactPerson: r.contactPerson, hospitalName: r.hospitalName };
    }
    if (!r.declined.includes(donorId)) r.declined.push(donorId);
    r.accepted = r.accepted.filter((x) => x !== donorId);
    save();
    return { declined: true };
  }),

  getDonorDonations: wrap((id) => db.donations.filter((x) => x.donorId === id).sort((a, b) => new Date(b.date) - new Date(a.date))),

  getLeaderboard: wrap(() => {
    const counts = {};
    db.donations.forEach((x) => (counts[x.donorId] = (counts[x.donorId] || 0) + x.units));
    return Object.entries(counts)
      .map(([id, count]) => ({ id, name: donor(id)?.name, city: donor(id)?.city, group: donor(id)?.group, count }))
      .filter((x) => x.name)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }),

  /* ---------------- Donations ---------------- */
  recordDonation: wrap((p) => {
    const d = donor(p.donorId);
    if (!d) fail('Please select a donor.');
    const h = hospital(p.hospitalId);
    if (!h) fail('Hospital not found.', 404);
    const units = Number(p.units);
    if (!(units >= 1 && units <= 2)) fail('Units per donation must be 1 or 2.');
    const date = new Date(p.date);
    if (date > new Date(Date.now() + 3600000)) fail('Donation date cannot be in the future.');
    if (!d.active) fail('This donor account is deactivated.');
    const prior = [...db.donations.filter((x) => x.donorId === d.id).map((x) => new Date(x.date))].filter((x) => x <= date).sort((a, b) => b - a)[0];
    if (prior && (date - prior) / DAY < MIN_GAP_DAYS) {
      fail(`Donor donated within last ${MIN_GAP_DAYS} days (last donation ${prior.toDateString()}). Next eligible: ${new Date(prior.getTime() + MIN_GAP_DAYS * DAY).toDateString()}.`);
    }
    const camp = p.campId ? db.camps.find((c) => c.id === p.campId) : null;
    const req = p.requestId ? request(p.requestId) : null;
    const rec = {
      id: nextId('donation', 'DN'), donorId: d.id, donorName: d.name, group: d.group, hospitalId: h.id, hospitalName: h.name, units,
      date: date.toISOString(), campId: camp?.id || null, campName: camp?.name || null, requestId: req?.id || null,
    };
    db.donations.unshift(rec);
    for (let i = 0; i < units; i++) {
      db.units.push({
        id: `BU-${h.id}-${String(db.counters.unit++).padStart(4, '0')}`, hospitalId: h.id, group: d.group,
        collectedOn: date.toISOString(), expiry: new Date(date.getTime() + 35 * DAY).toISOString(), status: 'AVAILABLE',
      });
    }
    if (!d.lastDonation || new Date(d.lastDonation) < date) d.lastDonation = date.toISOString();
    if (camp) camp.unitsCollected += units;
    if (req && !req.accepted.includes(d.id)) req.accepted.push(d.id);
    touchStock(h.id);
    log(h.contactPerson, 'hospital', 'INVENTORY_UPDATE', `Hospital ${h.id}`, `Recorded ${units} unit(s) ${d.group} from ${d.name}`);
    save();
    return rec;
  }),

  /* ---------------- Camps ---------------- */
  getCamps: wrap((p = {}) => {
    let c = db.camps;
    if (p.city) c = c.filter((x) => x.city === p.city);
    if (p.from) c = c.filter((x) => new Date(x.date) >= new Date(p.from));
    return [...c].sort((a, b) => new Date(a.date) - new Date(b.date)).map((x) => ({ ...x, registrationCount: x.registrations.length }));
  }),

  getCamp: wrap((id) => {
    const c = db.camps.find((x) => x.id === id);
    if (!c) fail('Camp not found.', 404);
    return { ...c, registrationCount: c.registrations.length, registered: c.registrations.map((r) => ({ id: r, name: donor(r)?.name, group: donor(r)?.group })) };
  }),

  createCamp: wrap((p) => {
    if (!p.name || !p.city || !p.date) fail('Name, city and date are required.');
    const c = { id: nextId('camp', 'C'), name: p.name, organizer: p.organizer || '', city: p.city, venue: p.venue || '', date: new Date(p.date).toISOString(), unitsCollected: 0, registrations: [] };
    db.camps.push(c);
    log('RaktSetu Admin', 'admin', 'CREATE_CAMP', `Camp ${c.id}`, c.name);
    save();
    return c;
  }),

  updateCamp: wrap((id, p) => {
    const c = db.camps.find((x) => x.id === id);
    if (!c) fail('Camp not found.', 404);
    ['name', 'organizer', 'city', 'venue'].forEach((k) => p[k] !== undefined && (c[k] = p[k]));
    if (p.date) c.date = new Date(p.date).toISOString();
    if (p.unitsCollected !== undefined) c.unitsCollected = Number(p.unitsCollected) || 0;
    log('RaktSetu Admin', 'admin', 'UPDATE_CAMP', `Camp ${id}`, c.name);
    save();
    return c;
  }),

  deleteCamp: wrap((id) => {
    const c = db.camps.find((x) => x.id === id);
    if (!c) fail('Camp not found.', 404);
    db.camps = db.camps.filter((x) => x.id !== id);
    log('RaktSetu Admin', 'admin', 'DELETE_CAMP', `Camp ${id}`, c.name);
    save();
    return { ok: true };
  }),

  registerForCamp: wrap((campId, donorId) => {
    const c = db.camps.find((x) => x.id === campId);
    if (!c) fail('Camp not found.', 404);
    if (new Date(c.date) < new Date()) fail('This camp has already taken place.');
    if (c.registrations.includes(donorId)) fail('You are already registered for this camp.');
    c.registrations.push(donorId);
    save();
    return { ok: true };
  }),

  /* ---------------- Hospitals ---------------- */
  getHospitals: wrap((p = {}) => {
    let h = db.hospitals;
    if (p.status) h = h.filter((x) => x.status === p.status);
    if (p.city) h = h.filter((x) => x.city === p.city);
    return h;
  }),

  setHospitalStatus: wrap((id, status) => {
    const h = hospital(id);
    if (!h) fail('Hospital not found.', 404);
    const prev = h.status;
    h.status = status;
    if (status === 'APPROVED') BLOOD_GROUPS.forEach((g) => (db.thresholds[`${id}|${g}`] ??= DEFAULT_THRESHOLD));
    log('RaktSetu Admin', 'admin', `${status === 'APPROVED' ? 'APPROVE' : 'REJECT'}_HOSPITAL`, `Hospital ${id}`, `${prev} → ${status}`);
    save();
    return { ok: true };
  }),

  addHospital: wrap((p) => {
    if (db.users.some((u) => u.email === p.email)) fail('A hospital with this email already exists.', 409);
    const id = nextId('hospital', 'H');
    db.hospitals.push({ id, name: p.name, city: p.city, address: p.address || '', status: 'APPROVED', license: p.license, phone: p.phone, email: p.email, contactPerson: p.contactPerson, createdAt: new Date().toISOString(), stockUpdatedAt: new Date().toISOString() });
    db.users.push({ username: p.email, phone: p.phone, email: p.email, password: 'hospital123', role: 'hospital', hospitalId: id });
    BLOOD_GROUPS.forEach((g) => (db.thresholds[`${id}|${g}`] = DEFAULT_THRESHOLD));
    log('RaktSetu Admin', 'admin', 'ADD_HOSPITAL', `Hospital ${id}`, p.name);
    save();
    return { id };
  }),

  /* ---------------- Transfers ---------------- */
  getTransfers: wrap(({ hospitalId } = {}) =>
    db.transfers
      .filter((t) => !hospitalId || t.fromHospitalId === hospitalId || t.toHospitalId === hospitalId)
      .map((t) => ({ ...t, fromName: hospital(t.fromHospitalId)?.name, toName: hospital(t.toHospitalId)?.name }))
      .sort((a, b) => new Date(b.at) - new Date(a.at))
  ),

  createTransfer: wrap((p) => {
    const units = Number(p.units);
    if (!p.fromHospitalId) fail('Please choose a hospital to request stock from.');
    if (p.fromHospitalId === p.toHospitalId) fail('You cannot request stock from your own hospital.');
    if (!(units >= 1 && units <= 20)) fail('Units must be between 1 and 20.');
    const have = stockOf(p.fromHospitalId, p.group);
    if (have < units) fail(`${hospital(p.fromHospitalId).name} only has ${have} unit(s) of ${p.group} available.`);
    const t = { id: nextId('transfer', 'T'), fromHospitalId: p.fromHospitalId, toHospitalId: p.toHospitalId, group: p.group, units, status: 'REQUESTED', at: new Date().toISOString() };
    db.transfers.unshift(t);
    log(hospital(p.toHospitalId).contactPerson, 'hospital', 'TRANSFER_REQUEST', `Transfer ${t.id}`, `${units} unit(s) ${p.group} requested from ${hospital(p.fromHospitalId).name}`);
    save();
    return t;
  }),

  /* ---------------- Reports & audit ---------------- */
  getMonthlyReport: wrap(({ from, to, hospitalId } = {}) => {
    const f = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const t = to ? new Date(`${to}T23:59:59`) : new Date();
    const don = db.donations.filter((x) => new Date(x.date) >= f && new Date(x.date) <= t && (!hospitalId || x.hospitalId === hospitalId));
    const reqs = db.requests.filter((x) => new Date(x.createdAt) >= f && new Date(x.createdAt) <= t && (!hospitalId || x.hospitalId === hospitalId));
    const byGroup = BLOOD_GROUPS.map((g) => ({ name: g, value: don.filter((x) => x.group === g).reduce((s, x) => s + x.units, 0) }));
    const counts = {};
    don.forEach((x) => (counts[x.donorId] = (counts[x.donorId] || 0) + x.units));
    const topDonors = Object.entries(counts)
      .map(([id, units]) => ({ id, name: donor(id)?.name, group: donor(id)?.group, units }))
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);
    return {
      from: f.toISOString(), to: t.toISOString(),
      totalDonations: don.length,
      totalUnits: don.reduce((s, x) => s + x.units, 0),
      byGroup,
      fulfilled: reqs.filter((r) => r.status === 'FULFILLED').length,
      pending: reqs.filter((r) => r.status === 'OPEN' || r.status === 'PARTIAL').length,
      cancelled: reqs.filter((r) => r.status === 'CANCELLED').length,
      totalRequests: reqs.length,
      topDonors,
    };
  }),

  getAudit: wrap(({ from, to, user } = {}) => {
    let a = db.audit;
    if (from) a = a.filter((x) => new Date(x.at) >= new Date(from));
    if (to) a = a.filter((x) => new Date(x.at) <= new Date(`${to}T23:59:59`));
    if (user) a = a.filter((x) => x.user.toLowerCase().includes(user.toLowerCase()));
    return a;
  }),

  resetDemo: () => {
    localStorage.removeItem(KEY);
    window.location.reload();
  },
};
