import { useCallback, useEffect, useState } from "react";
import { fetchSavedJobs, saveJob, unsaveJob } from "./api/savedJobs";
import { SavedJobsContext } from "./saved-jobs-context";
import { useAuth } from "./auth-context";

export function SavedJobsProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const [savedJobs, setSavedJobs] = useState([]);
  const [loading, setLoading] = useState(false);

  const refreshSavedJobs = useCallback(async () => {
    if (!user || user.role !== "job-seeker") {
      setSavedJobs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setSavedJobs(await fetchSavedJobs());
    } catch {
      setSavedJobs([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (authLoading) return undefined;
    const timer = window.setTimeout(refreshSavedJobs, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, refreshSavedJobs]);

  async function toggleSavedJob(job) {
    if (!user || user.role !== "job-seeker") throw new Error("Log in with a job seeker account to save jobs.");
    const existing = savedJobs.find((item) => String(item.job?.id || item.job?._id) === String(job.id));
    if (existing) {
      await unsaveJob(job.id);
      setSavedJobs((current) => current.filter((item) => String(item.job?.id || item.job?._id) !== String(job.id)));
      return false;
    }
    const saved = await saveJob(job.id);
    setSavedJobs((current) => current.some((item) => String(item.job?.id || item.job?._id) === String(job.id)) ? current : [saved, ...current]);
    return true;
  }

  return <SavedJobsContext.Provider value={{ savedJobs, loading, toggleSavedJob, refreshSavedJobs }}>{children}</SavedJobsContext.Provider>;
}
