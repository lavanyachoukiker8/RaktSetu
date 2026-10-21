import { BLOOD_GROUPS, CITIES, DEFAULT_THRESHOLD, donorGroupsFor } from '../utils/constants';
import { DAY, daysSince } from '../utils/helpers';

const iso = (offsetDays, hour) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  if (hour != null) d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export const matchDonors = (db, req) => {
  const compat = donorGroupsFor(req.group);
  return db.donors.filter(
    (d) => d.active && d.available && d.city === req.city && compat.includes(d.group) && daysSince(d.lastDonation) >= 90
  );
};

export function seed() {
  const R = rng(7);
  const pick = (a) => a[Math.floor(R() * a.length)];
  const db = {
    hospitals: [],
    donors: [],
    users: [],
    donations: [],
    requests: [],
    camps: [],
    units: [],
    thresholds: {},
    transfers: [],
    audit: [],
    counters: { donor: 41, hospital: 9, request: 13, camp: 7, donation: 1, unit: 1, transfer: 1, audit: 1 },
  };

  /* ---------- Hospitals (8: 7 approved, 1 pending) ---------- */
  const H = [
    ['Lifeline Multispeciality Hospital', 'Surat', 'Ring Road, Surat 395002', 'APPROVED'],
    ['Sunrise Medical Centre', 'Surat', 'Adajan, Surat 395009', 'APPROVED'],
    ['Sabarmati Care Hospital', 'Ahmedabad', 'Navrangpura, Ahmedabad 380009', 'APPROVED'],
    ['Narmada General Hospital', 'Ahmedabad', 'Satellite, Ahmedabad 380015', 'APPROVED'],
    ['Vadodara Heart Institute', 'Vadodara', 'Alkapuri, Vadodara 390007', 'APPROVED'],
    ['Marine Lines City Hospital', 'Mumbai', 'Marine Lines, Mumbai 400002', 'APPROVED'],
    ['Deccan Lifecare Hospital', 'Pune', 'Deccan Gymkhana, Pune 411004', 'APPROVED'],
    ['Andheri Hope Hospital', 'Mumbai', 'Andheri West, Mumbai 400058', 'PENDING'],
  ];
  H.forEach(([name, city, address, status], i) => {
    db.hospitals.push({
      id: `H${i + 1}`,
      name,
      city,
      address,
      status,
      license: `GJ/BB/${2015 + i}/${1000 + i * 37}`,
      phone: `9${(700000000 + i * 1234567).toString().slice(0, 9)}`,
      email: `contact${i + 1}@${name.split(' ')[0].toLowerCase()}.in`,
      contactPerson: ['Dr. Meera Nair', 'Dr. Suresh Rao', 'Dr. Kiran Shah', 'Dr. Alpa Desai', 'Dr. R. Iyer', 'Dr. N. Kapoor', 'Dr. V. Joshi', 'Dr. P. Menon'][i],
      createdAt: iso(-200 + i * 10),
      stockUpdatedAt: iso(-0.1 * (i + 1)),
    });
  });

  /* ---------- Donors (40) ---------- */
  const FM = ['Aarav', 'Vihaan', 'Arjun', 'Rohan', 'Karan', 'Harsh', 'Jay', 'Dev', 'Nikhil', 'Rahul', 'Amit', 'Yash', 'Manav', 'Kunal', 'Sahil', 'Pranav', 'Ishaan', 'Tejas', 'Hardik', 'Mitesh'];
  const FF = ['Priya', 'Ananya', 'Diya', 'Kavya', 'Neha', 'Riya', 'Pooja', 'Isha', 'Meera', 'Sneha', 'Anjali', 'Foram', 'Nidhi', 'Shreya', 'Tanvi', 'Khushi', 'Jinal', 'Hetal', 'Komal', 'Bhavna'];
  const LN = ['Patel', 'Shah', 'Mehta', 'Desai', 'Joshi', 'Sharma', 'Verma', 'Kulkarni', 'Iyer', 'Gupta', 'Trivedi', 'Parikh', 'Modi', 'Naik', 'Deshmukh', 'Singh', 'Kapoor', 'Bhatt', 'Chauhan', 'Pandya'];
  const GW = ['O+', 'O+', 'O+', 'B+', 'B+', 'A+', 'A+', 'AB+', 'O-', 'A-', 'B-', 'AB-'];
  const AREAS = { Surat: ['Adajan', 'Vesu', 'Varachha', 'Athwa'], Ahmedabad: ['Navrangpura', 'Satellite', 'Maninagar'], Vadodara: ['Alkapuri', 'Fatehgunj', 'Manjalpur'], Mumbai: ['Andheri', 'Bandra', 'Dadar'], Pune: ['Kothrud', 'Hadapsar', 'Baner'] };
  const PIN = { Surat: 3950, Ahmedabad: 3800, Vadodara: 3900, Mumbai: 4000, Pune: 4110 };
  for (let i = 0; i < 40; i++) {
    const female = i === 1 || (i > 1 && R() > 0.5);
    const first = i === 0 ? 'Aarav' : i === 1 ? 'Priya' : pick(female ? FF : FM);
    const last = i === 0 ? 'Patel' : i === 1 ? 'Shah' : pick(LN);
    const city = i < 14 ? 'Surat' : CITIES[i % 5];
    const age = 19 + Math.floor(R() * 36);
    const phone = i === 0 ? '9876543210' : i === 1 ? '9876543211' : `9${String(100000000 + Math.floor(R() * 899999999))}`;
    const lastDonation = i === 0 ? iso(-100) : i === 1 ? iso(-67) : R() < 0.25 ? null : iso(-(10 + Math.floor(R() * 350)));
    db.donors.push({
      id: `D${i + 1}`,
      name: `${first} ${last}`,
      gender: female ? 'F' : 'M',
      dob: new Date(Date.now() - age * 365.25 * DAY).toISOString().slice(0, 10),
      phone,
      email: `${first}.${last}${i}@example.in`.toLowerCase(),
      group: i === 0 ? 'O+' : i === 1 ? 'A+' : pick(GW),
      city,
      area: pick(AREAS[city]),
      pincode: `${PIN[city]}${String(Math.floor(R() * 90) + 10)}`,
      weight: 52 + Math.floor(R() * 35),
      available: i < 2 ? true : R() > 0.15,
      active: true,
      preferredTime: pick(['Morning (8-12)', 'Afternoon (12-4)', 'Evening (4-9)', 'Anytime']),
      lastDonation,
      createdAt: iso(-(30 + Math.floor(R() * 300))),
    });
    db.users.push({ username: i === 0 ? 'donor' : i === 1 ? 'donor2' : phone, phone, password: 'donor123', role: 'donor', donorId: `D${i + 1}` });
  }

  /* ---------- Users for hospitals + admin ---------- */
  db.users.push({ username: 'hospital', phone: db.hospitals[0].phone, email: db.hospitals[0].email, password: 'hospital123', role: 'hospital', hospitalId: 'H1' });
  db.hospitals.slice(1).forEach((h) => {
    db.users.push({ username: h.email, phone: h.phone, email: h.email, password: 'hospital123', role: 'hospital', hospitalId: h.id });
  });
  db.users.push({ username: 'admin', phone: '9000000000', password: 'admin123', role: 'admin', adminId: 'A1', name: 'RaktSetu Admin' });

  /* ---------- Camps (6) ---------- */
  const C = [
    ['Surat Mega Blood Drive', 'Rotary Club of Surat', 'Surat', 'Sardar Patel Stadium, Athwa', 5, 0],
    ['TechPark Employees Camp', 'Gujarat Red Cross Society', 'Ahmedabad', 'GIFT Tech Park Atrium', 9, 0],
    ['Marine Drive Community Camp', 'Lions Club of Mumbai', 'Mumbai', 'Community Hall, Marine Lines', 14, 0],
    ['Pune Pride Donation Day', 'Pune Blood Foundation', 'Pune', 'Deccan Gymkhana Club', 20, 0],
    ['Gandhi Jayanti Seva Camp', 'Seva Trust Surat', 'Surat', 'Town Hall, Surat', -19, 72],
    ['University Youth Camp', 'NSS Unit, MSU', 'Vadodara', 'MSU Convocation Hall', -67, 118],
  ];
  C.forEach(([name, organizer, city, venue, off, collected], i) => {
    const regs = db.donors.filter((d) => d.city === city).slice(0, off > 0 ? 3 + i : 5).map((d) => d.id);
    db.camps.push({ id: `C${i + 1}`, name, organizer, city, venue, date: iso(off, 9), unitsCollected: collected, registrations: regs });
  });

  /* ---------- Inventory ---------- */
  db.hospitals.forEach((h, hi) => {
    if (h.status !== 'APPROVED') return;
    BLOOD_GROUPS.forEach((g) => {
      db.thresholds[`${h.id}|${g}`] = DEFAULT_THRESHOLD;
      const rare = g.endsWith('-');
      let n = rare ? 1 + Math.floor(R() * 8) : 5 + Math.floor(R() * 18);
      if (hi === 0 && g === 'B+') n = 3; // guaranteed low stock for demo hospital
      if (hi === 0 && g === 'O+') n = 14;
      for (let k = 0; k < n; k++) {
        const ago = Math.floor(R() * 34);
        let status = 'AVAILABLE';
        let collected = ago;
        if (R() < 0.05) collected = 36 + Math.floor(R() * 4); // naturally expired
        if (hi === 0 && k < 2 && (g === 'O+' || g === 'A+')) collected = 31 + k; // expiring soon
        db.units.push({
          id: `BU-${h.id}-${String(db.counters.unit++).padStart(4, '0')}`,
          hospitalId: h.id,
          group: g,
          collectedOn: iso(-collected),
          expiry: iso(35 - collected),
          status,
        });
      }
    });
  });

  /* ---------- Requests (12) ---------- */
  const Q = [
    [0, 'B+', 2, 'CRITICAL', 'OPEN', 1, 0.3, 'Ramesh Solanki'],
    [1, 'A+', 3, 'URGENT', 'OPEN', 2, 1, 'Sunita Bhatt'],
    [0, 'O+', 1, 'NORMAL', 'PARTIAL', 4, 2, 'Kamlesh Rana'],
    [0, 'AB+', 2, 'URGENT', 'FULFILLED', -1, 6, 'Dhruv Mistry'],
    [0, 'O-', 1, 'CRITICAL', 'CANCELLED', -3, 9, 'Baby of Rekha Jain'],
    [2, 'B-', 2, 'URGENT', 'OPEN', 2, 1, 'Harish Pandit'],
    [3, 'A-', 2, 'NORMAL', 'FULFILLED', -5, 14, 'Lata Mangeshkar'],
    [4, 'O+', 4, 'CRITICAL', 'OPEN', 1, 0.5, 'Vinod Chauhan'],
    [5, 'AB-', 1, 'URGENT', 'PARTIAL', 3, 2, 'Farhan Qureshi'],
    [6, 'B+', 2, 'NORMAL', 'OPEN', 6, 3, 'Shalini Kulkarni'],
    [1, 'O+', 2, 'URGENT', 'FULFILLED', -10, 40, 'Mohan Thakkar'],
    [5, 'A+', 3, 'CRITICAL', 'FULFILLED', -20, 70, 'Nilesh Parab'],
  ];
  Q.forEach(([hi, group, units, urgency, status, reqBy, created, patient], i) => {
    const h = db.hospitals[hi];
    const req = {
      id: `R${i + 1}`,
      hospitalId: h.id,
      hospitalName: h.name,
      city: h.city,
      patientName: patient,
      group,
      units,
      urgency,
      status,
      requiredBy: iso(reqBy, 18),
      contactPerson: h.contactPerson,
      phone: h.phone,
      notes: urgency === 'CRITICAL' ? 'Emergency surgery scheduled. Please respond immediately.' : 'Planned procedure.',
      createdAt: new Date(Date.now() - created * DAY).toISOString(),
      notified: [],
      accepted: [],
      declined: [],
    };
    const m = matchDonors(db, req);
    if (status === 'PARTIAL' || status === 'FULFILLED') {
      req.notified = m.slice(0, 3).map((d) => d.id);
      req.accepted = m.slice(0, status === 'FULFILLED' ? Math.min(units, 2) : 1).map((d) => d.id);
    } else if (status === 'OPEN' && i % 2 === 0) {
      req.notified = m.slice(0, 2).map((d) => d.id);
    }
    db.requests.push(req);
  });

  /* ---------- Donation history ---------- */
  db.donors.forEach((d, i) => {
    if (!d.lastDonation) return;
    const n = i === 0 ? 4 : 1 + Math.floor(R() * 4);
    const hosp = db.hospitals.filter((h) => h.city === d.city && h.status === 'APPROVED');
    for (let k = 0; k < n; k++) {
      const h = hosp.length ? pick(hosp) : db.hospitals[0];
      const camp = R() > 0.6 ? db.camps.find((c) => c.city === d.city && new Date(c.date) < new Date()) : null;
      const date = new Date(new Date(d.lastDonation).getTime() - k * (110 + Math.floor(R() * 40)) * DAY).toISOString();
      db.donations.push({
        id: `DN${db.counters.donation++}`,
        donorId: d.id,
        donorName: d.name,
        group: d.group,
        hospitalId: h.id,
        hospitalName: h.name,
        units: 1,
        date,
        campId: camp?.id || null,
        campName: camp?.name || null,
        requestId: null,
      });
    }
  });

  /* ---------- Transfers ---------- */
  [
    ['H3', 'H1', 'O-', 3, 'COMPLETED', 12],
    ['H2', 'H1', 'B+', 4, 'REQUESTED', 1],
    ['H1', 'H2', 'A-', 2, 'COMPLETED', 20],
    ['H5', 'H3', 'AB-', 1, 'REJECTED', 6],
  ].forEach(([from, to, group, units, status, ago]) => {
    db.transfers.push({ id: `T${db.counters.transfer++}`, fromHospitalId: from, toHospitalId: to, group, units, status, at: iso(-ago) });
  });

  /* ---------- Audit ---------- */
  const A = [
    ['Dr. Meera Nair', 'hospital', 'CREATE_REQUEST', 'Request R1', 'Critical request for 2 units B+'],
    ['Dr. Meera Nair', 'hospital', 'STATUS_CHANGE', 'Request R4', 'OPEN → FULFILLED'],
    ['Dr. Meera Nair', 'hospital', 'STATUS_CHANGE', 'Request R5', 'OPEN → CANCELLED'],
    ['RaktSetu Admin', 'admin', 'APPROVE_HOSPITAL', 'Hospital H7', 'PENDING → APPROVED'],
    ['Dr. Kiran Shah', 'hospital', 'INVENTORY_UPDATE', 'Hospital H3', 'Fulfilled R7: 2 units A- deducted'],
    ['RaktSetu Admin', 'admin', 'CREATE_CAMP', 'Camp C4', 'Pune Pride Donation Day'],
    ['Dr. Suresh Rao', 'hospital', 'INVENTORY_UPDATE', 'Hospital H2', 'Recorded 1 unit O+ donation'],
    ['RaktSetu Admin', 'admin', 'OVERRIDE_STATUS', 'Request R9', 'OPEN → PARTIAL'],
  ];
  A.forEach(([user, role, action, entity, detail], i) => {
    db.audit.push({ id: `AU${db.counters.audit++}`, at: iso(-(i * 1.7 + 0.2)), user, role, action, entity, detail });
  });

  return db;
}
