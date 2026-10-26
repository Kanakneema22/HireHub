import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import BrowseJobs from "./pages/BrowseJobs";
import JobDetails from "./pages/JobDetails";
import MyApplications from "./pages/MyApplications";
import SavedJobs from "./pages/SavedJobs";
import EmployerDashboard from "./pages/EmployerDashboard";
import JobEditor from "./pages/JobEditor";
import JobApplicants from "./pages/JobApplicants";
import ProfilePage from "./pages/ProfilePage";
import AuthPage from "./pages/AuthPage";
import NotFound from "./pages/NotFound";
import CompanyDirectory from "./pages/CompanyDirectory";
import { AuthProvider } from "./AuthContext";
import { SavedJobsProvider } from "./SavedJobsContext";

export default function App() {
  return (
    <AuthProvider>
      <SavedJobsProvider>
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/jobs" element={<BrowseJobs />} />
          <Route path="/companies" element={<CompanyDirectory />} />
          <Route path="/jobs/:id" element={<JobDetails />} />
          <Route path="/applications" element={<MyApplications />} />
          <Route path="/saved-jobs" element={<SavedJobs />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/dashboard" element={<EmployerDashboard />} />
          <Route path="/employer/jobs/new" element={<JobEditor />} />
          <Route path="/employer/jobs/:id/edit" element={<JobEditor />} />
          <Route path="/employer/jobs/:id/applications" element={<JobApplicants />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
        <Footer />
      </SavedJobsProvider>
    </AuthProvider>
  );
}
