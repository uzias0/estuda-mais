import { requireSessionActor } from "@/server/auth/session";
import { getSimulation } from "@/modules/simulation/server/services/simulation.service";
import { SimulationLauncher } from "@/components/SimulationLauncher";
import { EmptyState } from "@/components/EmptyState";

export default async function SimulationPage({
  params,
}: PageProps<"/dashboard/simulados/[simulationId]">) {
  const { simulationId } = await params;
  const actor = await requireSessionActor();

  let simulation: Awaited<ReturnType<typeof getSimulation>>;
  try {
    simulation = await getSimulation(actor, simulationId);
  } catch {
    return (
      <div className="page-container">
        <EmptyState title="Este simulado não está disponível." />
      </div>
    );
  }

  return (
    <div className="page-container">
      <SimulationLauncher
        simulationId={simulationId}
        title={simulation.title}
        questionCount={simulation.questions.length}
      />
    </div>
  );
}
