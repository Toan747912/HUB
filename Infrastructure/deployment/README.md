# Infrastructure / deployment

Deployment target: Docker Compose Production (`docker-compose.production.yml`
at the repo root). See the repo-root docs for the full picture (WP-03):

- `DeploymentArchitecture.md` — topology, startup order, future-ready notes (Kubernetes/Nomad/Cloud Run)
- `DeploymentRunbook.md` — how to run a deploy, incident handling, recovery
- `DeploymentVerificationChecklist.md` — pre/post-deploy checks and drill evidence
- `RollbackProcedure.md` — automatic/manual rollback
- `DeploymentAutomationReport.md` — summary of what was built and verified

Automation scripts live in `../scripts/`. `deployments.log` (gitignored) is
this directory's append-only record of every deploy/rollback attempt.
