import { MedocsProvider } from "@/state/MedocsProvider";
import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <MedocsProvider>
      <Dashboard />
    </MedocsProvider>
  );
}
