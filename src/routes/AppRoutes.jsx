import { Routes, Route } from 'react-router-dom';
import {
  LayoutDashboard, User, Inbox, History, Award, CalendarDays, FilePlus2, ListChecks, Package, HeartPulse, Truck, BarChart3,
  Building2, Users, Siren, ScrollText,
} from 'lucide-react';
import PublicLayout from '../layouts/PublicLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import ProtectedRoute from './ProtectedRoute';
import Home from '../pages/Home';
import FindBlood from '../pages/FindBlood';
import Camps from '../pages/Camps';
import Stock from '../pages/Stock';
import About from '../pages/About';
import Login from '../pages/Login';
import RegisterDonor from '../pages/RegisterDonor';
import RegisterHospital from '../pages/RegisterHospital';
import Emergency from '../pages/Emergency';
import NotFound from '../pages/NotFound';
import { DonorOverview, DonorProfile, DonorRequests, DonorHistory, DonorBadges, DonorCamps } from '../pages/donor/DonorPages';
import { HospitalOverview, CreateRequest, MyRequests, RequestDetail, Inventory, RecordDonation, Transfers, HospitalReports } from '../pages/hospital/HospitalPages';
import { AdminDashboard, AdminHospitals, AdminDonors, AdminRequests, AdminCamps, AdminReports, AdminAudit } from '../pages/admin/AdminPages';

const donorNav = [
  { to: '/donor', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/donor/profile', label: 'My Profile', icon: User },
  { to: '/donor/requests', label: 'Requests', icon: Inbox },
  { to: '/donor/history', label: 'History', icon: History },
  { to: '/donor/badges', label: 'Badges', icon: Award },
  { to: '/donor/camps', label: 'Camps', icon: CalendarDays },
];
const hospitalNav = [
  { to: '/hospital', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/hospital/create', label: 'Create Request', icon: FilePlus2 },
  { to: '/hospital/requests', label: 'My Requests', icon: ListChecks },
  { to: '/hospital/inventory', label: 'Inventory', icon: Package },
  { to: '/hospital/record', label: 'Record Donation', icon: HeartPulse },
  { to: '/hospital/transfers', label: 'Transfers', icon: Truck },
  { to: '/hospital/reports', label: 'Reports', icon: BarChart3 },
];
const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/hospitals', label: 'Hospitals', icon: Building2 },
  { to: '/admin/donors', label: 'Donors', icon: Users },
  { to: '/admin/requests', label: 'Requests', icon: Siren },
  { to: '/admin/camps', label: 'Camps', icon: CalendarDays },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/audit', label: 'Audit Log', icon: ScrollText },
];

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="find-blood" element={<FindBlood />} />
        <Route path="camps" element={<Camps />} />
        <Route path="stock" element={<Stock />} />
        <Route path="about" element={<About />} />
        <Route path="login" element={<Login />} />
        <Route path="register/donor" element={<RegisterDonor />} />
        <Route path="register/hospital" element={<RegisterHospital />} />
        <Route path="emergency" element={<Emergency />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      <Route path="donor" element={<ProtectedRoute role="donor" />}>
        <Route element={<DashboardLayout nav={donorNav} title="Donor" />}>
          <Route index element={<DonorOverview />} />
          <Route path="profile" element={<DonorProfile />} />
          <Route path="requests" element={<DonorRequests />} />
          <Route path="history" element={<DonorHistory />} />
          <Route path="badges" element={<DonorBadges />} />
          <Route path="camps" element={<DonorCamps />} />
        </Route>
      </Route>

      <Route path="hospital" element={<ProtectedRoute role="hospital" />}>
        <Route element={<DashboardLayout nav={hospitalNav} title="Hospital" />}>
          <Route index element={<HospitalOverview />} />
          <Route path="create" element={<CreateRequest />} />
          <Route path="requests" element={<MyRequests />} />
          <Route path="requests/:id" element={<RequestDetail />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="record" element={<RecordDonation />} />
          <Route path="transfers" element={<Transfers />} />
          <Route path="reports" element={<HospitalReports />} />
        </Route>
      </Route>

      <Route path="admin" element={<ProtectedRoute role="admin" />}>
        <Route element={<DashboardLayout nav={adminNav} title="Admin" />}>
          <Route index element={<AdminDashboard />} />
          <Route path="hospitals" element={<AdminHospitals />} />
          <Route path="donors" element={<AdminDonors />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="camps" element={<AdminCamps />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="audit" element={<AdminAudit />} />
        </Route>
      </Route>
    </Routes>
  );
}
