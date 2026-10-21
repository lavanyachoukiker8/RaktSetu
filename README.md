# RaktSetu 🩸 (blood bridge)

Blood Donor & Emergency Request Matcher: React 18 + Vite + Tailwind. Hospitals raise urgent requests, the system matches compatible and eligible donors in the same city, donors respond, donations are recorded and stock is tracked.

The whole UI uses a **red-only palette** (Tailwind theme replaces every other hue). Status and urgency are always shown with intensity **plus an icon and a text label**.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build
```

No backend needed: with `VITE_API_URL` empty, every call runs against realistic seeded mock data (`src/mock/`). Mock data is saved in `localStorage` so your changes survive a refresh. To reset: clear site data for the page.

## Demo logins

| Role | Username | Password | Notes |
|---|---|---|---|
| Donor | `donor` | `donor123` | Aarav Patel, Surat, O+. Eligible, 4 donations (Bronze, next: Silver), has incoming requests |
| Donor (cooldown) | `donor2` | `donor123` | Priya Shah, Surat, A+. Shows "Eligible again in 23 days" |
| Hospital | `hospital` | `hospital123` | Lifeline Multispeciality Hospital, Surat. Has low-stock B+ and expiring units |
| Admin | `admin` | `admin123` | Approve the pending hospital (Andheri Hope), view charts and audit log |

Every other seeded donor logs in with their phone number and `donor123`. The login page has a "fill demo credentials" button.

### Good demo flow
1. **Public:** Home → Find Blood → Stock → Camps.
2. **Emergency:** click "Emergency Request" → raise a CRITICAL request in Surat (matching donors are auto-notified).
3. **Donor:** log in as `donor` → Incoming Requests → Accept (phone is revealed only now).
4. **Hospital:** log in as `hospital` → My Requests → open a request → Notify donors → Fulfill from inventory. Then Record Donation for `donor2` to see the *"Donor donated within last 90 days"* error toast.
5. **Admin:** log in as `admin` → approve the pending hospital, check charts, audit log.

## Connect a real backend

Copy `.env.example` to `.env` and set `VITE_API_URL=http://localhost:8080`. Endpoints used (see `src/api/index.js`):

```
POST /api/auth/login | /api/donors/register | /api/hospitals/register
GET  /api/donors/:id/eligibility | PUT /api/donors/:id/availability
GET  /api/requests?status=OPEN | POST /api/requests | GET /api/requests/:id
GET  /api/requests/:id/matches | POST /api/requests/:id/notify | /fulfill
POST /api/donations | GET /api/inventory | GET/POST /api/camps
GET  /api/reports/monthly | /api/stats | /api/audit
```

Errors shaped `{ "message": "..." }` are shown in a toast. If the server is unreachable (no HTTP response), the call falls back to mock data. Extra endpoints the UI uses beyond the contract (donor requests/respond, hospitals, transfers, thresholds, camp registration) are also defined in `src/api/index.js`.

## Structure

```
src/
  api/         Axios client + API functions (mock fallback)
  mock/        seed.js (data) + mockApi.js (in-browser backend)
  context/     AuthContext (role + token in localStorage)
  routes/      AppRoutes, ProtectedRoute
  layouts/     PublicLayout, DashboardLayout
  components/  Navbar, Sidebar, DataTable, Modal, Chips, Forms, Cards, Widgets, StarterChart ...
  hooks/       useFetch, useCountUp
  pages/       public pages + donor/ hospital/ admin/ dashboards
  utils/       constants, helpers, notify
```
