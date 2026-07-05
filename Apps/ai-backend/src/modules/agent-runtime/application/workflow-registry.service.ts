import { Injectable } from '@nestjs/common';
import { RuntimeWorkflowDefinition } from '../domain/runtime.types';

@Injectable()
export class WorkflowRegistryService {
  private readonly workflows = new Map<string, RuntimeWorkflowDefinition>();

  register(workflow: RuntimeWorkflowDefinition): void {
    this.workflows.set(workflow.workflowId, workflow);
  }

  get(workflowId: string): RuntimeWorkflowDefinition | undefined {
    return this.workflows.get(workflowId);
  }
}
