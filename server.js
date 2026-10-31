import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import pool from './backend/db.js';
import { verifyToken, optionalToken, requireRole } from './backend/middleware/auth.js';
import { BLOOD_GROUPS, CITIES, MIN_GAP_DAYS, DEFAULT_THRESHOLD, donorGroupsFor } from './src/utils/constants.js';
import { ageFromDob, daysSince } from './src/utils/helpers.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'raktsetu_super_secret_jwt_key_2026';

app.use(cors());
app.use(express.json());

// Helper function to write to audit_logs
async function logAudit(entity, entityId, action, performedBy = null, role = null, detail = null) {
  try {
    await pool.execute(
      `INSERT INTO audit_logs (entity, entity_id, action, performed_by, role, detail, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [entity, String(entityId), action, performedBy ? String(performedBy) : null, role, detail ? String(detail) : null]
    );
  } catch (err) {
    console.error('Audit log failed:', err.message);
  }
}

// Format donor eligibility
function computeEligibility(donor, totalDonations = 0) {
  const since = daysSince(donor.last_donation);
  const remaining = Math.max(0, MIN_GAP_DAYS - (since === Infinity ? MIN_GAP_DAYS : since));
  return {
    eligible: remaining === 0,
    daysSince: since === Infinity ? null : since,
    daysRemaining: remaining,
    nextDate: donor.last_donation ? new Date(new Date(donor.last_donation).getTime() + MIN_GAP_DAYS * 86400000).toISOString() : null,
    lastDonation: donor.last_donation,
    available: !!donor.available,
    totalDonations: totalDonations || Number(donor.donation_count || 0),
    totalUnits: totalDonations || Number(donor.donation_count || 0),
  };
}

/* ==========================================================================
   1. AUTHENTICATION & REGISTRATION
   ========================================================================== */

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { identifier, password, role } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ message: 'Identifier and password are required' });
    }

    const cleanId = String(identifier).trim().toLowerCase();

    // Query user by username, email, or phone
    const [users] = await pool.execute(
      `SELECT u.id, u.username, u.email, u.phone, u.password_hash, u.role_id, u.donor_id, u.hospital_id, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE (LOWER(u.username) = ? OR LOWER(u.email) = ? OR u.phone = ?)`,
      [cleanId, cleanId, cleanId]
    );

    if (!users.length) {
      return res.status(401).json({ message: 'Invalid username, email, or phone number' });
    }

    const user = users[0];

    // Check role match if requested
    if (role && user.role_name !== role) {
      return res.status(401).json({ message: `Account exists but is not registered as a ${role}` });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    if (user.role_name === 'donor') {
      const [donors] = await pool.execute('SELECT * FROM donors WHERE id = ?', [user.donor_id]);
      if (!donors.length) {
        return res.status(404).json({ message: 'Donor profile not found' });
      }
      const d = donors[0];
      if (!d.active) {
        return res.status(403).json({ message: 'This donor account has been deactivated. Please contact support.' });
      }

      const token = jwt.sign(
        { id: user.id, role: 'donor', donorId: d.id, name: d.name, city: d.city },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        user: { id: d.id, role: 'donor', name: d.name, donorId: d.id, city: d.city },
      });
    }

    if (user.role_name === 'hospital') {
      const [hospitals] = await pool.execute('SELECT * FROM hospitals WHERE id = ?', [user.hospital_id]);
      if (!hospitals.length) {
        return res.status(404).json({ message: 'Hospital profile not found' });
      }
      const h = hospitals[0];
      if (h.status === 'PENDING') {
        return res.status(403).json({ message: 'Your hospital is awaiting admin verification. You will be able to log in once approved.' });
      }
      if (h.status === 'REJECTED') {
        return res.status(403).json({ message: 'Your hospital registration was rejected. Please contact RaktSetu support.' });
      }

      const token = jwt.sign(
        { id: user.id, role: 'hospital', hospitalId: h.id, name: h.name, city: h.city },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      return res.json({
        token,
        user: { id: h.id, role: 'hospital', name: h.name, hospitalId: h.id, city: h.city },
      });
    }

    // Admin role
    const token = jwt.sign(
      { id: user.id, role: 'admin', name: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      token,
      user: { id: `A${user.id}`, role: 'admin', name: user.username || 'Admin' },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Server error during login', error: err.message });
  }
});

// POST /api/donors/register
app.post('/api/donors/register', async (req, res) => {
  try {
    const { name, dob, gender, phone, email, group, city, area, weight, available, password } = req.body;

    if (!name || !dob || !phone || !group || !city || !password) {
      return res.status(400).json({ message: 'Required fields are missing' });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
    }

    const age = ageFromDob(dob);
    if (age < 18 || age > 65) {
      return res.status(400).json({ message: 'Donors must be between 18 and 65 years old' });
    }

    const weightNum = Number(weight || 55);
    if (weightNum < 45) {
      return res.status(400).json({ message: 'You must weigh at least 45 kg to donate' });
    }

    // Check duplicate phone or email in users
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE phone = ? OR (email IS NOT NULL AND email = ?)',
      [phone, email || '']
    );
    if (existingUsers.length) {
      return res.status(409).json({ message: 'This phone number or email is already registered' });
    }

    // Format gender
    let g = 'Other';
    if (gender === 'M' || gender === 'Male') g = 'Male';
    else if (gender === 'F' || gender === 'Female') g = 'Female';

    const donorId = `donor-${crypto.randomUUID().slice(0, 8)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    // Get donor role_id
    const [roles] = await pool.execute("SELECT id FROM roles WHERE name = 'donor'");
    const roleId = roles[0].id;

    // Insert donor
    await pool.execute(
      `INSERT INTO donors (id, name, gender, dob, phone, email, blood_group, city, area, weight_kg, available, active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, TRUE, NOW())`,
      [donorId, name, g, dob, phone, email || null, group, city, area || null, weightNum, available !== false]
    );

    // Insert user
    const [userResult] = await pool.execute(
      `INSERT INTO users (username, email, phone, password_hash, role_id, donor_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [phone, email || null, phone, passwordHash, roleId, donorId]
    );

    await logAudit('donors', donorId, 'REGISTER', name, 'donor', `Donor registered in ${city}`);

    const token = jwt.sign(
      { id: userResult.insertId, role: 'donor', donorId, name, city },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: { id: donorId, role: 'donor', name, donorId, city },
    });
  } catch (err) {
    console.error('Donor register error:', err);
    return res.status(500).json({ message: 'Registration failed', error: err.message });
  }
});

// POST /api/hospitals/register
app.post('/api/hospitals/register', async (req, res) => {
  try {
    const { name, license, city, address, phone, email, contactPerson, password } = req.body;

    if (!name || !license || !city || !address || !phone || !email || !contactPerson || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits' });
    }

    // Check duplicate license or email
    const [existing] = await pool.execute(
      'SELECT id FROM hospitals WHERE license = ? OR email = ? OR phone = ?',
      [license, email, phone]
    );
    if (existing.length) {
      return res.status(409).json({ message: 'A hospital with this license, email, or phone is already registered' });
    }

    const hospitalId = `hosp-${crypto.randomUUID().slice(0, 8)}`;
    const passwordHash = await bcrypt.hash(password, 10);

    const [roles] = await pool.execute("SELECT id FROM roles WHERE name = 'hospital'");
    const roleId = roles[0].id;

    await pool.execute(
      `INSERT INTO hospitals (id, name, city, address, status, license, phone, email, contact_person, created_at)
       VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, NOW())`,
      [hospitalId, name, city, address, license, phone, email, contactPerson]
    );

    await pool.execute(
      `INSERT INTO users (username, email, phone, password_hash, role_id, hospital_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [email, email, phone, passwordHash, roleId, hospitalId]
    );

    // Initialize default inventory thresholds
    for (const bg of BLOOD_GROUPS) {
      await pool.execute(
        `INSERT INTO inventory_thresholds (hospital_id, blood_group, threshold)
         VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE threshold = VALUES(threshold)`,
        [hospitalId, bg, DEFAULT_THRESHOLD]
      );
    }

    await logAudit('hospitals', hospitalId, 'REGISTER_PENDING', contactPerson, 'hospital', `${name} submitted for verification`);

    return res.status(201).json({ ok: true, id: hospitalId, message: 'Hospital submitted for admin approval' });
  } catch (err) {
    console.error('Hospital register error:', err);
    return res.status(500).json({ message: 'Hospital registration failed', error: err.message });
  }
});

/* ==========================================================================
   2. STATS & ANALYTICS
   ========================================================================== */

// GET /api/stats
app.get('/api/stats', async (req, res) => {
  try {
    const detail = req.query.detail === '1';

    if (detail) {
      // Detailed charts for Admin Dashboard
      // 1. Stock by blood group across all approved hospitals
      const [stockRows] = await pool.execute(
        `SELECT bg.code AS name, COUNT(u.id) AS value
         FROM blood_groups bg
         LEFT JOIN units u ON bg.code = u.blood_group AND u.status = 'AVAILABLE' AND u.expiry > NOW()
         GROUP BY bg.code`
      );

      // 2. Monthly requests trend (last 6 months)
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        months.push({
          y: d.getFullYear(),
          m: d.getMonth(),
          name: d.toLocaleString('en-IN', { month: 'short' }),
          value: 0,
        });
      }

      const [reqRows] = await pool.execute(
        `SELECT created_at FROM requests WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)`
      );
      reqRows.forEach((r) => {
        const c = new Date(r.created_at);
        const slot = months.find((x) => x.y === c.getFullYear() && x.m === c.getMonth());
        if (slot) slot.value++;
      });

      // 3. Status breakdown
      const [statusRows] = await pool.execute(
        `SELECT status, COUNT(*) AS cnt FROM requests GROUP BY status`
      );
      const statusMap = { OPEN: 0, PARTIAL: 0, FULFILLED: 0, CANCELLED: 0 };
      statusRows.forEach((row) => {
        statusMap[row.status] = Number(row.cnt);
      });

      return res.json({
        stockByGroup: stockRows,
        monthlyRequests: months.map(({ name, value }) => ({ name, value })),
        byStatus: [
          { name: 'Open', value: statusMap.OPEN },
          { name: 'Partial', value: statusMap.PARTIAL },
          { name: 'Fulfilled', value: statusMap.FULFILLED },
          { name: 'Cancelled', value: statusMap.CANCELLED },
        ],
      });
    }

    // Summary stats
    const [[{ activeDonors }]] = await pool.execute('SELECT COUNT(*) AS activeDonors FROM donors WHERE active = TRUE');
    const [[{ totalDonations }]] = await pool.execute('SELECT COUNT(*) AS totalDonations FROM donations');
    const [[{ openRequests }]] = await pool.execute(
      "SELECT COUNT(*) AS openRequests FROM requests WHERE status IN ('OPEN', 'PARTIAL')"
    );
    const [[{ approvedHospitals }]] = await pool.execute(
      "SELECT COUNT(*) AS approvedHospitals FROM hospitals WHERE status = 'APPROVED'"
    );
    const [[{ campsThisMonth }]] = await pool.execute(
      'SELECT COUNT(*) AS campsThisMonth FROM camps WHERE MONTH(date) = MONTH(CURRENT_DATE()) AND YEAR(date) = YEAR(CURRENT_DATE())'
    );

    return res.json({
      donors: Number(activeDonors),
      donations: Number(totalDonations),
      openRequests: Number(openRequests),
      hospitals: Number(approvedHospitals),
      campsThisMonth: Number(campsThisMonth),
    });
  } catch (err) {
    console.error('Stats error:', err);
    return res.status(500).json({ message: 'Error retrieving stats', error: err.message });
  }
});

/* ==========================================================================
   3. INVENTORY & THRESHOLDS
   ========================================================================== */

// GET /api/inventory
app.get('/api/inventory', async (req, res) => {
  try {
    const { hospitalId, city, group } = req.query;

    let hospitalQuery = "SELECT id, name, city, stock_updated_at FROM hospitals WHERE status = 'APPROVED'";
    const params = [];

    if (hospitalId) {
      hospitalQuery += ' AND id = ?';
      params.push(hospitalId);
    }
    if (city) {
      hospitalQuery += ' AND city = ?';
      params.push(city);
    }

    const [hospitals] = await pool.execute(hospitalQuery, params);

    // Get units count and thresholds
    const results = await Promise.all(
      hospitals.map(async (h) => {
        // Query available units grouped by blood group
        const [counts] = await pool.execute(
          `SELECT blood_group, COUNT(*) AS units,
                  SUM(CASE WHEN expiry <= DATE_ADD(NOW(), INTERVAL 5 DAY) THEN 1 ELSE 0 END) AS expiring
           FROM units
           WHERE hospital_id = ? AND status = 'AVAILABLE' AND expiry > NOW()
           GROUP BY blood_group`,
          [h.id]
        );

        // Query thresholds
        const [thresh] = await pool.execute(
          'SELECT blood_group, threshold FROM inventory_thresholds WHERE hospital_id = ?',
          [h.id]
        );
        const threshMap = {};
        thresh.forEach((t) => {
          threshMap[t.blood_group] = Number(t.threshold);
        });

        const countMap = {};
        counts.forEach((c) => {
          countMap[c.blood_group] = {
            units: Number(c.units),
            expiring: Number(c.expiring || 0),
          };
        });

        let groups = BLOOD_GROUPS.map((g) => {
          const u = countMap[g]?.units || 0;
          const t = threshMap[g] ?? DEFAULT_THRESHOLD;
          return {
            group: g,
            units: u,
            threshold: t,
            low: u < t,
            expiring: countMap[g]?.expiring || 0,
          };
        });

        if (group) {
          groups = groups.filter((x) => x.group === group);
        }

        const out = {
          hospitalId: h.id,
          hospitalName: h.name,
          city: h.city,
          updatedAt: h.stock_updated_at,
          groups,
        };

        if (hospitalId) {
          // Include unit-level details
          const [unitBags] = await pool.execute(
            `SELECT id, bag_barcode, blood_group AS \`group\`, component, collected_at AS collectedOn, expiry, status
             FROM units
             WHERE hospital_id = ?
             ORDER BY expiry ASC`,
            [h.id]
          );
          out.units = unitBags;
        }

        return out;
      })
    );

    return res.json(results);
  } catch (err) {
    console.error('Inventory error:', err);
    return res.status(500).json({ message: 'Error retrieving inventory', error: err.message });
  }
});

// PUT /api/inventory/threshold
app.put('/api/inventory/threshold', verifyToken, async (req, res) => {
  try {
    const { hospitalId, group, threshold } = req.body;
    const t = Number(threshold);

    if (t < 0 || t > 100) {
      return res.status(400).json({ message: 'Threshold must be between 0 and 100' });
    }

    await pool.execute(
      `INSERT INTO inventory_thresholds (hospital_id, blood_group, threshold)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE threshold = VALUES(threshold)`,
      [hospitalId, group, t]
    );

    await logAudit(
      'inventory_thresholds',
      `${hospitalId}:${group}`,
      'INVENTORY_UPDATE',
      req.user.name || req.user.id,
      req.user.role,
      `Threshold for ${group} set to ${t}`
    );

    return res.json({ ok: true, hospitalId, group, threshold: t });
  } catch (err) {
    console.error('Set threshold error:', err);
    return res.status(500).json({ message: 'Failed to set threshold', error: err.message });
  }
});

/* ==========================================================================
   4. DONORS
   ========================================================================== */

// GET /api/donors
app.get('/api/donors', async (req, res) => {
  try {
    const { group, city, available, search } = req.query;

    let sql = 'SELECT * FROM donors WHERE 1=1';
    const params = [];

    if (group) {
      sql += ' AND blood_group = ?';
      params.push(group);
    }
    if (city) {
      sql += ' AND city = ?';
      params.push(city);
    }
    if (available === 'true' || available === true) {
      sql += ' AND available = TRUE';
    } else if (available === 'false' || available === false) {
      sql += ' AND available = FALSE';
    }
    if (search) {
      sql += ' AND (LOWER(name) LIKE ? OR phone LIKE ?)';
      const s = `%${search.toLowerCase()}%`;
      params.push(s, `%${search}%`);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(sql, params);

    const result = rows.map((d) => ({
      id: d.id,
      name: d.name,
      gender: d.gender,
      dob: d.dob,
      phone: d.phone,
      email: d.email,
      group: d.blood_group,
      city: d.city,
      area: d.area,
      pincode: d.pincode,
      weight: d.weight_kg,
      available: !!d.available,
      active: !!d.active,
      preferredTime: d.preferred_time,
      lastDonation: d.last_donation,
      nextEligibleDate: d.next_eligible_date,
      donationCount: d.donation_count,
      ...computeEligibility(d),
    }));

    return res.json(result);
  } catch (err) {
    console.error('Get donors error:', err);
    return res.status(500).json({ message: 'Failed to retrieve donors', error: err.message });
  }
});

// GET /api/donors/count
app.get('/api/donors/count', async (req, res) => {
  try {
    const { group, city } = req.query;
    const compat = group ? donorGroupsFor(group) : BLOOD_GROUPS;

    let sql = `SELECT COUNT(*) AS count
               FROM donors
               WHERE active = TRUE
                 AND available = TRUE
                 AND (last_donation IS NULL OR DATEDIFF(CURRENT_DATE(), last_donation) >= ?)
                 AND blood_group IN (${compat.map(() => '?').join(',')})`;
    const params = [MIN_GAP_DAYS, ...compat];

    if (city) {
      sql += ' AND city = ?';
      params.push(city);
    }

    const [[{ count }]] = await pool.execute(sql, params);
    return res.json({ count: Number(count) });
  } catch (err) {
    console.error('Count donors error:', err);
    return res.status(500).json({ message: 'Failed to count donors', error: err.message });
  }
});

// GET /api/donors/leaderboard
app.get('/api/donors/leaderboard', async (req, res) => {
  try {
    // Try querying the view v_donor_leaderboard
    const [rows] = await pool.execute(
      `SELECT donor_id AS id, donor_name AS name, city, blood_group AS \`group\`, donation_count AS count, badge
       FROM v_donor_leaderboard
       ORDER BY donation_count DESC, last_donation ASC
       LIMIT 10`
    );

    return res.json(rows);
  } catch (err) {
    // Fallback directly to donors table
    try {
      const [rows] = await pool.execute(
        `SELECT id, name, city, blood_group AS \`group\`, donation_count AS count
         FROM donors
         WHERE active = TRUE AND donation_count > 0
         ORDER BY donation_count DESC
         LIMIT 10`
      );
      return res.json(rows);
    } catch (e) {
      console.error('Leaderboard error:', e);
      return res.status(500).json({ message: 'Failed to get leaderboard', error: e.message });
    }
  }
});

// GET /api/donors/:id
app.get('/api/donors/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM donors WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Donor not found' });
    const d = rows[0];
    return res.json({
      id: d.id,
      name: d.name,
      gender: d.gender,
      dob: d.dob,
      phone: d.phone,
      email: d.email,
      group: d.blood_group,
      city: d.city,
      area: d.area,
      pincode: d.pincode,
      weight: d.weight_kg,
      available: !!d.available,
      active: !!d.active,
      preferredTime: d.preferred_time,
      lastDonation: d.last_donation,
      nextEligibleDate: d.next_eligible_date,
      donationCount: d.donation_count,
      ...computeEligibility(d),
    });
  } catch (err) {
    console.error('Get donor error:', err);
    return res.status(500).json({ message: 'Failed to get donor', error: err.message });
  }
});

// PUT /api/donors/:id
app.put('/api/donors/:id', verifyToken, async (req, res) => {
  try {
    const { name, phone, email, city, preferredTime, available } = req.body;
    const id = req.params.id;

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ message: 'Phone number must be 10 digits' });
    }

    const updates = [];
    const params = [];

    if (name !== undefined) { updates.push('name = ?'); params.push(name); }
    if (phone !== undefined) { updates.push('phone = ?'); params.push(phone); }
    if (email !== undefined) { updates.push('email = ?'); params.push(email); }
    if (city !== undefined) { updates.push('city = ?'); params.push(city); }
    if (preferredTime !== undefined) { updates.push('preferred_time = ?'); params.push(preferredTime); }
    if (available !== undefined) { updates.push('available = ?'); params.push(!!available); }

    if (updates.length) {
      params.push(id);
      await pool.execute(`UPDATE donors SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    return res.json({ ok: true, message: 'Profile updated' });
  } catch (err) {
    console.error('Update donor error:', err);
    return res.status(500).json({ message: 'Failed to update donor', error: err.message });
  }
});

// PUT /api/donors/:id/password
app.put('/api/donors/:id/password', verifyToken, async (req, res) => {
  try {
    const { current, next } = req.body;
    const id = req.params.id;

    if (!next || next.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const [users] = await pool.execute('SELECT id, password_hash FROM users WHERE donor_id = ?', [id]);
    if (!users.length) {
      return res.status(404).json({ message: 'User account not found' });
    }

    const user = users[0];
    const match = await bcrypt.compare(current, user.password_hash);
    if (!match) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(next, 10);
    await pool.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, user.id]);

    return res.json({ ok: true, message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ message: 'Failed to update password', error: err.message });
  }
});

// GET /api/donors/:id/eligibility
app.get('/api/donors/:id/eligibility', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM donors WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Donor not found' });
    return res.json(computeEligibility(rows[0]));
  } catch (err) {
    console.error('Get eligibility error:', err);
    return res.status(500).json({ message: 'Failed to check eligibility', error: err.message });
  }
});

// PUT /api/donors/:id/availability
app.put('/api/donors/:id/availability', verifyToken, async (req, res) => {
  try {
    const { available } = req.body;
    const isAvail = !!available;
    await pool.execute('UPDATE donors SET available = ? WHERE id = ?', [isAvail, req.params.id]);
    return res.json({ available: isAvail });
  } catch (err) {
    console.error('Set availability error:', err);
    return res.status(500).json({ message: 'Failed to change availability', error: err.message });
  }
});

// PUT /api/donors/:id/active
app.put('/api/donors/:id/active', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { active } = req.body;
    const isActive = !!active;
    await pool.execute('UPDATE donors SET active = ? WHERE id = ?', [isActive, req.params.id]);
    await logAudit(
      'donors',
      req.params.id,
      isActive ? 'ACTIVATE_DONOR' : 'DEACTIVATE_DONOR',
      req.user.name || 'Admin',
      'admin',
      `Donor ${isActive ? 'activated' : 'deactivated'}`
    );
    return res.json({ ok: true, active: isActive });
  } catch (err) {
    console.error('Set donor active error:', err);
    return res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
});

// GET /api/donors/:id/requests
app.get('/api/donors/:id/requests', async (req, res) => {
  try {
    const donorId = req.params.id;
    const [donors] = await pool.execute('SELECT * FROM donors WHERE id = ?', [donorId]);
    if (!donors.length) return res.status(404).json({ message: 'Donor not found' });
    const d = donors[0];

    const elig = computeEligibility(d);

    // Find compatible open requests in donor city
    const [reqs] = await pool.execute(
      `SELECT r.*, h.address AS hospital_address
       FROM requests r
       LEFT JOIN hospitals h ON r.hospital_id = h.id
       WHERE r.city = ? AND r.status IN ('OPEN', 'PARTIAL')
       ORDER BY FIELD(r.urgency, 'CRITICAL', 'URGENT', 'NORMAL') ASC, r.created_at DESC`,
      [d.city]
    );

    // Get donor notified, accepted, declined statuses
    const [notifiedRows] = await pool.execute('SELECT request_id FROM request_notified WHERE donor_id = ?', [donorId]);
    const [acceptedRows] = await pool.execute('SELECT request_id FROM request_accepted WHERE donor_id = ?', [donorId]);
    const [declinedRows] = await pool.execute('SELECT request_id FROM request_declined WHERE donor_id = ?', [donorId]);

    const notifiedSet = new Set(notifiedRows.map((x) => x.request_id));
    const acceptedSet = new Set(acceptedRows.map((x) => x.request_id));
    const declinedSet = new Set(declinedRows.map((x) => x.request_id));

    const result = reqs
      .filter((r) => {
        const compat = donorGroupsFor(r.blood_group);
        return compat.includes(d.blood_group) && !declinedSet.has(r.id);
      })
      .map((r) => {
        const isAccepted = acceptedSet.has(r.id);
        const isEligibleByDeadline =
          elig.eligible || (elig.nextDate && new Date(elig.nextDate) <= new Date(r.required_by));

        return {
          id: r.id,
          hospitalId: r.hospital_id,
          hospitalName: r.hospital_name,
          city: r.city,
          group: r.blood_group,
          units: r.units_needed,
          urgency: r.urgency,
          status: r.status,
          requiredBy: r.required_by,
          createdAt: r.created_at,
          notes: r.notes,
          contactPerson: isAccepted ? r.contact_person : null,
          phone: isAccepted ? r.phone : null,
          myResponse: isAccepted ? 'ACCEPTED' : null,
          directlyNotified: notifiedSet.has(r.id),
          eligibleByDeadline: !!isEligibleByDeadline,
          area: r.hospital_address || r.city,
        };
      });

    return res.json(result);
  } catch (err) {
    console.error('Get donor requests error:', err);
    return res.status(500).json({ message: 'Failed to retrieve donor requests', error: err.message });
  }
});

// GET /api/donors/:id/donations
app.get('/api/donors/:id/donations', async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT d.id, d.donor_id AS donorId, dn.name AS donorName, dn.blood_group AS \`group\`,
              d.hospital_id AS hospitalId, h.name AS hospitalName, d.units,
              d.collected_at AS date, d.certificate_id AS certificateId
       FROM donations d
       JOIN donors dn ON d.donor_id = dn.id
       JOIN hospitals h ON d.hospital_id = h.id
       WHERE d.donor_id = ?
       ORDER BY d.collected_at DESC`,
      [req.params.id]
    );
    return res.json(rows);
  } catch (err) {
    console.error('Get donor donations error:', err);
    return res.status(500).json({ message: 'Failed to retrieve donations', error: err.message });
  }
});

/* ==========================================================================
   5. REQUESTS & MATCHING
   ========================================================================== */

// Helper to enrich request with matches
async function enrichDbRequest(r) {
  const compat = donorGroupsFor(r.blood_group);
  const [matches] = await pool.execute(
    `SELECT COUNT(*) AS cnt
     FROM donors
     WHERE active = TRUE AND available = TRUE AND city = ?
       AND (last_donation IS NULL OR DATEDIFF(CURRENT_DATE(), last_donation) >= ?)
       AND blood_group IN (${compat.map(() => '?').join(',')})`,
    [r.city, MIN_GAP_DAYS, ...compat]
  );

  return {
    id: r.id,
    hospitalId: r.hospital_id,
    hospitalName: r.hospital_name,
    city: r.city,
    patientName: r.patient_name,
    group: r.blood_group,
    units: r.units_needed,
    urgency: r.urgency,
    status: r.status,
    requiredBy: r.required_by,
    contactPerson: r.contact_person,
    phone: r.phone,
    notes: r.notes || '',
    createdAt: r.created_at,
    notifiedAt: r.notified_at,
    matchCount: Number(matches[0]?.cnt || 0),
  };
}

// GET /api/requests
app.get('/api/requests', async (req, res) => {
  try {
    const { status, urgency, group, city, hospitalId } = req.query;

    let sql = 'SELECT * FROM requests WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (urgency) {
      sql += ' AND urgency = ?';
      params.push(urgency);
    }
    if (group) {
      sql += ' AND blood_group = ?';
      params.push(group);
    }
    if (city) {
      sql += ' AND city = ?';
      params.push(city);
    }
    if (hospitalId) {
      sql += ' AND hospital_id = ?';
      params.push(hospitalId);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(sql, params);
    const enriched = await Promise.all(rows.map(enrichDbRequest));
    return res.json(enriched);
  } catch (err) {
    console.error('List requests error:', err);
    return res.status(500).json({ message: 'Failed to list requests', error: err.message });
  }
});

// GET /api/requests/:id
app.get('/api/requests/:id', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM requests WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ message: 'Request not found' });
    const r = await enrichDbRequest(rows[0]);
    return res.json(r);
  } catch (err) {
    console.error('Get request error:', err);
    return res.status(500).json({ message: 'Failed to get request', error: err.message });
  }
});

// POST /api/requests
app.post('/api/requests', async (req, res) => {
  try {
    const { hospitalId, hospitalName, city, patientName, group, units, urgency, requiredBy, contactPerson, phone, notes } = req.body;

    const unitsNum = Number(units);
    if (!unitsNum || unitsNum < 1 || unitsNum > 10) {
      return res.status(400).json({ message: 'Units needed must be between 1 and 10' });
    }
    if (!BLOOD_GROUPS.includes(group)) {
      return res.status(400).json({ message: 'Invalid blood group' });
    }
    if (!patientName || !contactPerson || !phone || !requiredBy) {
      return res.status(400).json({ message: 'Missing required request fields' });
    }

    let hName = hospitalName || 'Emergency (public request)';
    let hCity = city;

    if (hospitalId) {
      const [hospRows] = await pool.execute('SELECT name, city FROM hospitals WHERE id = ?', [hospitalId]);
      if (hospRows.length) {
        hName = hospRows[0].name;
        hCity = hospRows[0].city;
      }
    }

    if (!hCity) {
      return res.status(400).json({ message: 'City is required' });
    }

    const requestId = `req-${crypto.randomUUID().slice(0, 8)}`;

    await pool.execute(
      `INSERT INTO requests (id, hospital_id, hospital_name, city, patient_name, blood_group, units_needed, urgency, status, required_by, contact_person, phone, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?, ?, ?, ?, NOW())`,
      [
        requestId,
        hospitalId || null,
        hName,
        hCity,
        patientName,
        group,
        unitsNum,
        urgency || 'NORMAL',
        new Date(requiredBy),
        contactPerson,
        phone,
        notes || null,
      ]
    );

    await logAudit(
      'requests',
      requestId,
      'CREATE_REQUEST',
      contactPerson,
      hospitalId ? 'hospital' : 'public',
      `Emergency request for ${unitsNum} unit(s) of ${group} in ${hCity}`
    );

    const [createdRows] = await pool.execute('SELECT * FROM requests WHERE id = ?', [requestId]);
    const out = await enrichDbRequest(createdRows[0]);
    return res.status(201).json(out);
  } catch (err) {
    console.error('Create request error:', err);
    return res.status(500).json({ message: 'Failed to create request', error: err.message });
  }
});

// GET /api/requests/:id/matches
app.get('/api/requests/:id/matches', async (req, res) => {
  try {
    const requestId = req.params.id;
    const [reqRows] = await pool.execute('SELECT * FROM requests WHERE id = ?', [requestId]);
    if (!reqRows.length) return res.status(404).json({ message: 'Request not found' });
    const r = reqRows[0];

    // Read notified & accepted donors for this request
    const [notifiedRows] = await pool.execute('SELECT donor_id FROM request_notified WHERE request_id = ?', [requestId]);
    const [acceptedRows] = await pool.execute('SELECT donor_id FROM request_accepted WHERE request_id = ?', [requestId]);

    const notifiedSet = new Set(notifiedRows.map((x) => x.donor_id));
    const acceptedSet = new Set(acceptedRows.map((x) => x.donor_id));

    // Try executing stored procedure sp_match_emergency_donors
    let donorMatches = [];
    try {
      const [spResult] = await pool.execute('CALL sp_match_emergency_donors(?)', [requestId]);
      if (Array.isArray(spResult) && spResult[0]) {
        donorMatches = spResult[0].map((d) => ({
          id: d.donor_id,
          name: d.donor_name,
          group: d.blood_group,
          city: d.city,
          area: d.area,
          exact: d.match_type === 'EXACT',
          daysSince: d.days_since_last_donation === 999 ? null : Number(d.days_since_last_donation),
          notified: notifiedSet.has(d.donor_id),
          accepted: acceptedSet.has(d.donor_id),
          phone: acceptedSet.has(d.donor_id) ? d.phone : null,
        }));
      }
    } catch (spErr) {
      console.warn('sp_match_emergency_donors fallback:', spErr.message);
      // Fallback matching query
      const compat = donorGroupsFor(r.blood_group);
      const [donors] = await pool.execute(
        `SELECT id, name, blood_group, city, area, phone, last_donation
         FROM donors
         WHERE active = TRUE AND available = TRUE AND city = ?
           AND (last_donation IS NULL OR DATEDIFF(CURRENT_DATE(), last_donation) >= ?)
           AND blood_group IN (${compat.map(() => '?').join(',')})`,
        [r.city, MIN_GAP_DAYS, ...compat]
      );

      donorMatches = donors.map((d) => ({
        id: d.id,
        name: d.name,
        group: d.blood_group,
        city: d.city,
        area: d.area,
        exact: d.blood_group === r.blood_group,
        daysSince: daysSince(d.last_donation) === Infinity ? null : daysSince(d.last_donation),
        notified: notifiedSet.has(d.id),
        accepted: acceptedSet.has(d.id),
        phone: acceptedSet.has(d.id) ? d.phone : null,
      }));
    }

    donorMatches.sort(
      (a, b) => Number(b.exact) - Number(a.exact) || (b.daysSince ?? 999) - (a.daysSince ?? 999)
    );

    return res.json(donorMatches);
  } catch (err) {
    console.error('Get matches error:', err);
    return res.status(500).json({ message: 'Failed to get donor matches', error: err.message });
  }
});

// POST /api/requests/:id/notify
app.post('/api/requests/:id/notify', verifyToken, async (req, res) => {
  try {
    const requestId = req.params.id;
    const { donorIds } = req.body;

    const [reqRows] = await pool.execute('SELECT * FROM requests WHERE id = ?', [requestId]);
    if (!reqRows.length) return res.status(404).json({ message: 'Request not found' });
    const r = reqRows[0];

    if (r.status === 'FULFILLED' || r.status === 'CANCELLED') {
      return res.status(400).json({ message: `Cannot notify donors: request is ${r.status.toLowerCase()}` });
    }

    let targetIds = donorIds;
    if (!targetIds || !targetIds.length) {
      // Find all compatible donors
      const compat = donorGroupsFor(r.blood_group);
      const [donors] = await pool.execute(
        `SELECT id FROM donors WHERE active = TRUE AND available = TRUE AND city = ? AND blood_group IN (${compat.map(() => '?').join(',')})`,
        [r.city, ...compat]
      );
      targetIds = donors.map((d) => d.id);
    }

    let newlyNotified = 0;
    for (const dId of targetIds) {
      try {
        await pool.execute(
          `INSERT IGNORE INTO request_notified (request_id, donor_id, notified_at) VALUES (?, ?, NOW())`,
          [requestId, dId]
        );
        newlyNotified++;
      } catch (e) {
        // Ignore duplicate key errors
      }
    }

    await pool.execute('UPDATE requests SET notified_at = NOW() WHERE id = ?', [requestId]);
    await logAudit(
      'requests',
      requestId,
      'NOTIFY_DONORS',
      req.user.name || req.user.id,
      req.user.role,
      `${newlyNotified} donor(s) notified for request ${requestId}`
    );

    return res.json({ ok: true, notified: newlyNotified });
  } catch (err) {
    console.error('Notify error:', err);
    return res.status(500).json({ message: 'Failed to notify donors', error: err.message });
  }
});

// POST /api/requests/:id/fulfill
app.post('/api/requests/:id/fulfill', verifyToken, async (req, res) => {
  try {
    const requestId = req.params.id;
    const [reqRows] = await pool.execute('SELECT * FROM requests WHERE id = ?', [requestId]);
    if (!reqRows.length) return res.status(404).json({ message: 'Request not found' });
    const r = reqRows[0];

    if (r.status === 'FULFILLED') {
      return res.status(400).json({ message: 'This request is already fulfilled' });
    }

    // If hospital request, deduct units from inventory
    if (r.hospital_id) {
      const [units] = await pool.execute(
        `SELECT id FROM units
         WHERE hospital_id = ? AND blood_group = ? AND status = 'AVAILABLE' AND expiry > NOW()
         ORDER BY expiry ASC
         LIMIT ?`,
        [r.hospital_id, r.blood_group, r.units_needed]
      );

      for (const u of units) {
        await pool.execute("UPDATE units SET status = 'USED' WHERE id = ?", [u.id]);
      }
    }

    await pool.execute("UPDATE requests SET status = 'FULFILLED' WHERE id = ?", [requestId]);
    await logAudit(
      'requests',
      requestId,
      'FULFILL_REQUEST',
      req.user.name || req.user.id,
      req.user.role,
      `Request ${requestId} fulfilled`
    );

    return res.json({ ok: true, message: 'Request fulfilled' });
  } catch (err) {
    console.error('Fulfill request error:', err);
    return res.status(500).json({ message: 'Failed to fulfill request', error: err.message });
  }
});

// POST /api/requests/:id/cancel
app.post('/api/requests/:id/cancel', verifyToken, async (req, res) => {
  try {
    const requestId = req.params.id;
    const [reqRows] = await pool.execute('SELECT * FROM requests WHERE id = ?', [requestId]);
    if (!reqRows.length) return res.status(404).json({ message: 'Request not found' });
    const r = reqRows[0];

    if (r.status === 'FULFILLED') {
      return res.status(400).json({ message: 'A fulfilled request cannot be cancelled' });
    }

    await pool.execute("UPDATE requests SET status = 'CANCELLED' WHERE id = ?", [requestId]);
    await logAudit(
      'requests',
      requestId,
      'CANCEL_REQUEST',
      req.user.name || req.user.id,
      req.user.role,
      `Request ${requestId} cancelled`
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error('Cancel request error:', err);
    return res.status(500).json({ message: 'Failed to cancel request', error: err.message });
  }
});

// PUT /api/requests/:id/status
app.put('/api/requests/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const requestId = req.params.id;
    const { status } = req.body;
    if (!['OPEN', 'PARTIAL', 'FULFILLED', 'CANCELLED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    await pool.execute('UPDATE requests SET status = ? WHERE id = ?', [status, requestId]);
    await logAudit(
      'requests',
      requestId,
      'OVERRIDE_STATUS',
      req.user.name || 'Admin',
      'admin',
      `Status set to ${status}`
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error('Override status error:', err);
    return res.status(500).json({ message: 'Failed to update status', error: err.message });
  }
});

// POST /api/requests/:id/respond
app.post('/api/requests/:id/respond', verifyToken, async (req, res) => {
  try {
    const requestId = req.params.id;
    const { donorId, accept } = req.body;

    const [reqRows] = await pool.execute('SELECT * FROM requests WHERE id = ?', [requestId]);
    if (!reqRows.length) return res.status(404).json({ message: 'Request not found' });
    const r = reqRows[0];

    const [donorRows] = await pool.execute('SELECT * FROM donors WHERE id = ?', [donorId]);
    if (!donorRows.length) return res.status(404).json({ message: 'Donor not found' });
    const d = donorRows[0];

    if (r.status === 'FULFILLED' || r.status === 'CANCELLED') {
      return res.status(400).json({ message: `This request is already ${r.status.toLowerCase()}` });
    }

    if (accept) {
      const elig = computeEligibility(d);
      if (!elig.eligible && !(elig.nextDate && new Date(elig.nextDate) <= new Date(r.required_by))) {
        return res.status(400).json({
          message: `You are not eligible to donate before this deadline (eligible again on ${new Date(elig.nextDate).toDateString()})`,
        });
      }

      await pool.execute(
        'INSERT IGNORE INTO request_accepted (request_id, donor_id, accepted_at) VALUES (?, ?, NOW())',
        [requestId, donorId]
      );
      await pool.execute('DELETE FROM request_declined WHERE request_id = ? AND donor_id = ?', [requestId, donorId]);

      await logAudit('requests', requestId, 'DONOR_ACCEPTED', d.name, 'donor', `${d.name} accepted request ${requestId}`);

      return res.json({
        ok: true,
        contactPerson: r.contact_person,
        phone: r.phone,
        hospitalName: r.hospital_name,
        city: r.city,
      });
    } else {
      await pool.execute(
        'INSERT IGNORE INTO request_declined (request_id, donor_id, declined_at) VALUES (?, ?, NOW())',
        [requestId, donorId]
      );
      await pool.execute('DELETE FROM request_accepted WHERE request_id = ? AND donor_id = ?', [requestId, donorId]);

      return res.json({ ok: true, message: 'Request declined' });
    }
  } catch (err) {
    console.error('Respond request error:', err);
    return res.status(500).json({ message: 'Failed to respond to request', error: err.message });
  }
});

/* ==========================================================================
   6. DONATIONS
   ========================================================================== */

// POST /api/donations
app.post('/api/donations', verifyToken, async (req, res) => {
  try {
    const { donorId, hospitalId, units, date, campId, requestId } = req.body;
    const unitsNum = Number(units || 1);

    if (unitsNum < 1 || unitsNum > 2) {
      return res.status(400).json({ message: 'Units per donation must be 1 or 2' });
    }

    const donationDate = date ? new Date(date) : new Date();
    if (donationDate > new Date(Date.now() + 3600000)) {
      return res.status(400).json({ message: 'Donation date cannot be in the future' });
    }

    const [donors] = await pool.execute('SELECT * FROM donors WHERE id = ?', [donorId]);
    if (!donors.length) return res.status(404).json({ message: 'Donor not found' });
    const d = donors[0];

    if (!d.active) return res.status(403).json({ message: 'This donor account is deactivated' });

    // Enforce 90-day cooldown check
    if (d.last_donation) {
      const diffDays = (donationDate.getTime() - new Date(d.last_donation).getTime()) / 86400000;
      if (diffDays < MIN_GAP_DAYS) {
        return res.status(400).json({
          message: `Donor donated within last ${MIN_GAP_DAYS} days (last donation ${new Date(d.last_donation).toDateString()}). Next eligible: ${new Date(new Date(d.last_donation).getTime() + MIN_GAP_DAYS * 86400000).toDateString()}`,
        });
      }
    }

    const [hospitals] = await pool.execute('SELECT * FROM hospitals WHERE id = ?', [hospitalId]);
    if (!hospitals.length) return res.status(404).json({ message: 'Hospital not found' });
    const h = hospitals[0];

    const donationId = `DN-${crypto.randomUUID().slice(0, 8)}`;
    const certificateId = `CERT-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 6).toUpperCase()}`;

    // Insert donation record (triggers trg_after_donation_completed in DB)
    await pool.execute(
      `INSERT INTO donations (id, donor_id, hospital_id, units, collected_at, status, certificate_id)
       VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?)`,
      [donationId, donorId, hospitalId, unitsNum, donationDate, certificateId]
    );

    // If camp was associated, update camp collected_units
    if (campId) {
      await pool.execute(
        'UPDATE camps SET collected_units = collected_units + ? WHERE id = ?',
        [unitsNum, campId]
      );
    }

    // Touch hospital stock timestamp
    await pool.execute('UPDATE hospitals SET stock_updated_at = NOW() WHERE id = ?', [hospitalId]);

    await logAudit(
      'donations',
      donationId,
      'RECORD_DONATION',
      req.user.name || h.contact_person,
      req.user.role,
      `Recorded ${unitsNum} unit(s) of ${d.blood_group} from ${d.name}`
    );

    return res.status(201).json({
      id: donationId,
      donorId,
      donorName: d.name,
      group: d.blood_group,
      hospitalId,
      hospitalName: h.name,
      units: unitsNum,
      date: donationDate.toISOString(),
      certificateId,
    });
  } catch (err) {
    console.error('Record donation error:', err);
    return res.status(500).json({ message: 'Failed to record donation', error: err.message });
  }
});

/* ==========================================================================
   7. CAMPS & REGISTRATIONS
   ========================================================================== */

// GET /api/camps
app.get('/api/camps', async (req, res) => {
  try {
    const { city, from } = req.query;

    let sql = `SELECT c.*, h.name AS organizer_name,
                      COUNT(cr.id) AS registration_count
               FROM camps c
               LEFT JOIN hospitals h ON c.organizer_hospital_id = h.id
               LEFT JOIN camp_registrations cr ON c.id = cr.camp_id
               WHERE 1=1`;
    const params = [];

    if (city) {
      sql += ' AND c.city = ?';
      params.push(city);
    }
    if (from) {
      sql += ' AND c.date >= ?';
      params.push(new Date(from));
    }

    sql += ' GROUP BY c.id ORDER BY c.date ASC';

    const [rows] = await pool.execute(sql, params);

    const result = rows.map((c) => ({
      id: c.id,
      name: c.name,
      organizer: c.organizer_name || 'RaktSetu Blood Network',
      organizerHospitalId: c.organizer_hospital_id,
      city: c.city,
      venue: c.address,
      date: c.date,
      targetUnits: c.target_units,
      unitsCollected: c.collected_units,
      registrationCount: Number(c.registration_count || 0),
    }));

    return res.json(result);
  } catch (err) {
    console.error('Get camps error:', err);
    return res.status(500).json({ message: 'Failed to get camps', error: err.message });
  }
});

// GET /api/camps/:id
app.get('/api/camps/:id', async (req, res) => {
  try {
    const [camps] = await pool.execute('SELECT * FROM camps WHERE id = ?', [req.params.id]);
    if (!camps.length) return res.status(404).json({ message: 'Camp not found' });
    const c = camps[0];

    const [regs] = await pool.execute(
      `SELECT cr.donor_id AS id, d.name, d.blood_group AS \`group\`, cr.registered_at, cr.time_slot
       FROM camp_registrations cr
       JOIN donors d ON cr.donor_id = d.id
       WHERE cr.camp_id = ?`,
      [c.id]
    );

    return res.json({
      id: c.id,
      name: c.name,
      organizer: 'RaktSetu Community',
      city: c.city,
      venue: c.address,
      date: c.date,
      unitsCollected: c.collected_units,
      registrationCount: regs.length,
      registered: regs,
    });
  } catch (err) {
    console.error('Get camp error:', err);
    return res.status(500).json({ message: 'Failed to get camp details', error: err.message });
  }
});

// POST /api/camps
app.post('/api/camps', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, organizer, city, venue, date, unitsCollected } = req.body;
    if (!name || !city || !date) {
      return res.status(400).json({ message: 'Name, city, and date are required' });
    }

    const campId = `camp-${crypto.randomUUID().slice(0, 8)}`;
    await pool.execute(
      `INSERT INTO camps (id, name, city, date, address, collected_units, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [campId, name, city, new Date(date), venue || city, Number(unitsCollected || 0)]
    );

    await logAudit('camps', campId, 'CREATE_CAMP', req.user.name || 'Admin', 'admin', `Camp ${name} created`);

    return res.status(201).json({ id: campId, name, city, venue, date });
  } catch (err) {
    console.error('Create camp error:', err);
    return res.status(500).json({ message: 'Failed to create camp', error: err.message });
  }
});

// PUT /api/camps/:id
app.put('/api/camps/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, city, venue, date, unitsCollected } = req.body;
    const campId = req.params.id;

    const updates = [];
    const params = [];

    if (name) { updates.push('name = ?'); params.push(name); }
    if (city) { updates.push('city = ?'); params.push(city); }
    if (venue) { updates.push('address = ?'); params.push(venue); }
    if (date) { updates.push('date = ?'); params.push(new Date(date)); }
    if (unitsCollected !== undefined) { updates.push('collected_units = ?'); params.push(Number(unitsCollected)); }

    if (updates.length) {
      params.push(campId);
      await pool.execute(`UPDATE camps SET ${updates.join(', ')} WHERE id = ?`, params);
    }

    await logAudit('camps', campId, 'UPDATE_CAMP', req.user.name || 'Admin', 'admin', `Camp ${campId} updated`);

    return res.json({ ok: true });
  } catch (err) {
    console.error('Update camp error:', err);
    return res.status(500).json({ message: 'Failed to update camp', error: err.message });
  }
});

// DELETE /api/camps/:id
app.delete('/api/camps/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const campId = req.params.id;
    await pool.execute('DELETE FROM camps WHERE id = ?', [campId]);
    await logAudit('camps', campId, 'DELETE_CAMP', req.user.name || 'Admin', 'admin', `Camp ${campId} deleted`);
    return res.json({ ok: true });
  } catch (err) {
    console.error('Delete camp error:', err);
    return res.status(500).json({ message: 'Failed to delete camp', error: err.message });
  }
});

// POST /api/camps/:id/register
app.post('/api/camps/:id/register', verifyToken, async (req, res) => {
  try {
    const campId = req.params.id;
    const { donorId } = req.body;

    const [camps] = await pool.execute('SELECT * FROM camps WHERE id = ?', [campId]);
    if (!camps.length) return res.status(404).json({ message: 'Camp not found' });
    const camp = camps[0];

    if (new Date(camp.date) < new Date()) {
      return res.status(400).json({ message: 'This camp has already taken place' });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM camp_registrations WHERE camp_id = ? AND donor_id = ?',
      [campId, donorId]
    );
    if (existing.length) {
      return res.status(400).json({ message: 'You are already registered for this camp' });
    }

    await pool.execute(
      'INSERT INTO camp_registrations (camp_id, donor_id, registered_at) VALUES (?, ?, NOW())',
      [campId, donorId]
    );

    return res.json({ ok: true });
  } catch (err) {
    console.error('Register for camp error:', err);
    return res.status(500).json({ message: 'Failed to register for camp', error: err.message });
  }
});

/* ==========================================================================
   8. HOSPITALS
   ========================================================================== */

// GET /api/hospitals
app.get('/api/hospitals', async (req, res) => {
  try {
    const { status, city } = req.query;

    let sql = 'SELECT * FROM hospitals WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }
    if (city) {
      sql += ' AND city = ?';
      params.push(city);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.execute(sql, params);
    const result = rows.map((h) => ({
      id: h.id,
      name: h.name,
      city: h.city,
      address: h.address,
      status: h.status,
      license: h.license,
      phone: h.phone,
      email: h.email,
      contactPerson: h.contact_person,
      createdAt: h.created_at,
      stockUpdatedAt: h.stock_updated_at,
    }));

    return res.json(result);
  } catch (err) {
    console.error('Get hospitals error:', err);
    return res.status(500).json({ message: 'Failed to get hospitals', error: err.message });
  }
});

// PUT /api/hospitals/:id/status
app.put('/api/hospitals/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const hospitalId = req.params.id;
    const { status } = req.body;

    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid hospital status' });
    }

    await pool.execute('UPDATE hospitals SET status = ? WHERE id = ?', [status, hospitalId]);

    // If approved, initialize thresholds if not existing
    if (status === 'APPROVED') {
      for (const bg of BLOOD_GROUPS) {
        await pool.execute(
          `INSERT IGNORE INTO inventory_thresholds (hospital_id, blood_group, threshold)
           VALUES (?, ?, ?)`,
          [hospitalId, bg, DEFAULT_THRESHOLD]
        );
      }
    }

    await logAudit(
      'hospitals',
      hospitalId,
      status === 'APPROVED' ? 'APPROVE_HOSPITAL' : 'REJECT_HOSPITAL',
      req.user.name || 'Admin',
      'admin',
      `Hospital status set to ${status}`
    );

    return res.json({ ok: true, status });
  } catch (err) {
    console.error('Set hospital status error:', err);
    return res.status(500).json({ message: 'Failed to update hospital status', error: err.message });
  }
});

// POST /api/hospitals
app.post('/api/hospitals', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, license, city, address, phone, email, contactPerson } = req.body;

    const [existing] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(409).json({ message: 'A hospital with this email already exists' });
    }

    const hospitalId = `hosp-${crypto.randomUUID().slice(0, 8)}`;
    const passwordHash = await bcrypt.hash('hospital123', 10);

    const [roles] = await pool.execute("SELECT id FROM roles WHERE name = 'hospital'");
    const roleId = roles[0].id;

    await pool.execute(
      `INSERT INTO hospitals (id, name, city, address, status, license, phone, email, contact_person, created_at)
       VALUES (?, ?, ?, ?, 'APPROVED', ?, ?, ?, ?, NOW())`,
      [hospitalId, name, city, address || '', license, phone, email, contactPerson]
    );

    await pool.execute(
      `INSERT INTO users (username, email, phone, password_hash, role_id, hospital_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [email, email, phone, passwordHash, roleId, hospitalId]
    );

    for (const bg of BLOOD_GROUPS) {
      await pool.execute(
        `INSERT IGNORE INTO inventory_thresholds (hospital_id, blood_group, threshold)
         VALUES (?, ?, ?)`,
        [hospitalId, bg, DEFAULT_THRESHOLD]
      );
    }

    await logAudit('hospitals', hospitalId, 'ADD_HOSPITAL', req.user.name || 'Admin', 'admin', name);

    return res.status(201).json({ id: hospitalId });
  } catch (err) {
    console.error('Add hospital error:', err);
    return res.status(500).json({ message: 'Failed to add hospital', error: err.message });
  }
});

/* ==========================================================================
   9. TRANSFERS
   ========================================================================== */

// GET /api/transfers
app.get('/api/transfers', async (req, res) => {
  try {
    const { hospitalId } = req.query;

    let sql = `SELECT t.id, t.source_hospital_id AS fromHospitalId, h1.name AS fromName,
                      t.dest_hospital_id AS toHospitalId, h2.name AS toName,
                      u.blood_group AS \`group\`, 1 AS units, t.status, t.requested_at AS at, t.notes
               FROM transfers t
               LEFT JOIN hospitals h1 ON t.source_hospital_id = h1.id
               LEFT JOIN hospitals h2 ON t.dest_hospital_id = h2.id
               LEFT JOIN units u ON t.unit_id = u.id
               WHERE 1=1`;
    const params = [];

    if (hospitalId) {
      sql += ' AND (t.source_hospital_id = ? OR t.dest_hospital_id = ?)';
      params.push(hospitalId, hospitalId);
    }

    sql += ' ORDER BY t.requested_at DESC';

    const [rows] = await pool.execute(sql, params);
    return res.json(rows);
  } catch (err) {
    console.error('Get transfers error:', err);
    return res.status(500).json({ message: 'Failed to get transfers', error: err.message });
  }
});

// POST /api/transfers
app.post('/api/transfers', verifyToken, async (req, res) => {
  try {
    const { fromHospitalId, toHospitalId, group, units, notes } = req.body;
    const unitsNum = Number(units || 1);

    if (!fromHospitalId) return res.status(400).json({ message: 'Please choose a hospital to request stock from' });
    if (fromHospitalId === toHospitalId) return res.status(400).json({ message: 'You cannot request stock from your own hospital' });

    // Check available units at source hospital
    const [availableUnits] = await pool.execute(
      `SELECT id FROM units
       WHERE hospital_id = ? AND blood_group = ? AND status = 'AVAILABLE' AND expiry > NOW()
       LIMIT ?`,
      [fromHospitalId, group, unitsNum]
    );

    if (availableUnits.length < unitsNum) {
      return res.status(400).json({
        message: `Source hospital only has ${availableUnits.length} available unit(s) of ${group}`,
      });
    }

    const unitId = availableUnits[0].id;

    // Call stored procedure sp_interhospital_transfer or execute directly
    let transferId = `tf-${crypto.randomUUID().slice(0, 8)}`;
    try {
      await pool.execute('CALL sp_interhospital_transfer(?, ?, ?, ?, @p_success, @p_message)', [
        fromHospitalId,
        toHospitalId,
        unitId,
        notes || 'Stock request transfer',
      ]);
      const [[result]] = await pool.execute('SELECT @p_success AS success, @p_message AS message');
      if (!result.success) {
        throw new Error(result.message);
      }
    } catch (spErr) {
      console.warn('Stored procedure transfer fallback:', spErr.message);
      // Fallback direct transfer
      await pool.execute(
        `INSERT INTO transfers (id, source_hospital_id, dest_hospital_id, unit_id, status, requested_at, completed_at, notes)
         VALUES (?, ?, ?, ?, 'COMPLETED', NOW(), NOW(), ?)`,
        [transferId, fromHospitalId, toHospitalId, unitId, notes || 'Direct transfer']
      );
      await pool.execute('UPDATE units SET hospital_id = ? WHERE id = ?', [toHospitalId, unitId]);
    }

    await logAudit(
      'transfers',
      transferId,
      'TRANSFER_REQUEST',
      req.user.name || req.user.id,
      req.user.role,
      `${unitsNum} unit(s) of ${group} transferred`
    );

    return res.status(201).json({
      id: transferId,
      fromHospitalId,
      toHospitalId,
      group,
      units: unitsNum,
      status: 'COMPLETED',
      at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Create transfer error:', err);
    return res.status(500).json({ message: 'Failed to create transfer', error: err.message });
  }
});

/* ==========================================================================
   10. REPORTS & AUDIT LOGS
   ========================================================================== */

// GET /api/reports/monthly
app.get('/api/reports/monthly', async (req, res) => {
  try {
    const { from, to, hospitalId } = req.query;

    const f = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const t = to ? new Date(`${to}T23:59:59`) : new Date();

    // Query donations in date range
    let donSql = `SELECT d.units, dn.blood_group, d.donor_id, dn.name AS donor_name
                  FROM donations d
                  JOIN donors dn ON d.donor_id = dn.id
                  WHERE d.collected_at >= ? AND d.collected_at <= ?`;
    const donParams = [f, t];
    if (hospitalId) {
      donSql += ' AND d.hospital_id = ?';
      donParams.push(hospitalId);
    }
    const [donRows] = await pool.execute(donSql, donParams);

    // Query requests in date range
    let reqSql = 'SELECT status FROM requests WHERE created_at >= ? AND created_at <= ?';
    const reqParams = [f, t];
    if (hospitalId) {
      reqSql += ' AND hospital_id = ?';
      reqParams.push(hospitalId);
    }
    const [reqRows] = await pool.execute(reqSql, reqParams);

    // Aggregate by group
    const byGroup = BLOOD_GROUPS.map((g) => ({
      name: g,
      value: donRows.filter((x) => x.blood_group === g).reduce((s, x) => s + Number(x.units), 0),
    }));

    // Top donors
    const donorCounts = {};
    donRows.forEach((x) => {
      donorCounts[x.donor_id] = {
        id: x.donor_id,
        name: x.donor_name,
        group: x.blood_group,
        units: (donorCounts[x.donor_id]?.units || 0) + Number(x.units),
      };
    });

    const topDonors = Object.values(donorCounts)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    return res.json({
      from: f.toISOString(),
      to: t.toISOString(),
      totalDonations: donRows.length,
      totalUnits: donRows.reduce((s, x) => s + Number(x.units), 0),
      byGroup,
      fulfilled: reqRows.filter((r) => r.status === 'FULFILLED').length,
      pending: reqRows.filter((r) => r.status === 'OPEN' || r.status === 'PARTIAL').length,
      cancelled: reqRows.filter((r) => r.status === 'CANCELLED').length,
      totalRequests: reqRows.length,
      topDonors,
    });
  } catch (err) {
    console.error('Monthly report error:', err);
    return res.status(500).json({ message: 'Failed to generate report', error: err.message });
  }
});

// GET /api/audit
app.get('/api/audit', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { from, to, user } = req.query;

    let sql = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (from) {
      sql += ' AND created_at >= ?';
      params.push(new Date(from));
    }
    if (to) {
      sql += ' AND created_at <= ?';
      params.push(new Date(`${to}T23:59:59`));
    }
    if (user) {
      sql += ' AND (LOWER(performed_by) LIKE ? OR LOWER(role) LIKE ?)';
      params.push(`%${user.toLowerCase()}%`, `%${user.toLowerCase()}%`);
    }

    sql += ' ORDER BY created_at DESC LIMIT 100';

    const [rows] = await pool.execute(sql, params);
    const result = rows.map((a) => ({
      id: `AU${a.id}`,
      at: a.created_at,
      user: a.performed_by || 'System',
      role: a.role || 'system',
      action: a.action,
      entity: a.entity,
      detail: a.detail,
    }));

    return res.json(result);
  } catch (err) {
    console.error('Audit log error:', err);
    return res.status(500).json({ message: 'Failed to get audit log', error: err.message });
  }
});

// Serve static frontend build if present
app.use(express.static(path.join(__dirname, 'dist')));

// Root route
app.get('/', (req, res) => {
  const distHtml = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(distHtml)) {
    return res.sendFile(distHtml);
  }
  res.json({
    name: 'RaktSetu API Server',
    status: 'Running',
    frontend: 'http://localhost:5173',
    health: '/api/health',
    endpoints: [
      '/api/stats',
      '/api/donors',
      '/api/requests',
      '/api/inventory',
      '/api/camps',
      '/api/hospitals',
      '/api/transfers'
    ]
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    return res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// Start Express Server
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🩸 RaktSetu Full Backend API Server`);
    console.log(`📡 Listening on http://localhost:${PORT}`);
    console.log(`🚀 All 100% endpoints active & connected`);
    console.log(`====================================================`);
  });
}

export default app;

