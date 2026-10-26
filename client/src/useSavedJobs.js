import { useContext } from "react";
import { SavedJobsContext } from "./saved-jobs-context";

export function useSavedJobs() {
  const context = useContext(SavedJobsContext);
  if (!context) throw new Error("useSavedJobs must be used inside SavedJobsProvider");
  return context;
}
