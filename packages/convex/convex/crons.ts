import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.daily(
	"cleanup_agent_runs",
	{ hourUTC: 3, minuteUTC: 0 },
	internal.agents.agentRuns.cleanupOldRuns,
	{},
);

export default crons;
