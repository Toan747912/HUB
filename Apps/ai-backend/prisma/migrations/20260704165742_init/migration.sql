-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 0,
    "versions" JSONB NOT NULL DEFAULT '[]',
    "constraints" JSONB NOT NULL DEFAULT '[]',
    "milestones" JSONB NOT NULL DEFAULT '[]',
    "progress" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmaps" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 0,
    "phases" JSONB NOT NULL DEFAULT '[]',
    "revisions" JSONB NOT NULL DEFAULT '[]',
    "progress" JSONB NOT NULL,
    "estimatedDurationDays" INTEGER NOT NULL DEFAULT 0,
    "complexity" TEXT NOT NULL,
    "plannerVersion" TEXT NOT NULL,
    "goalSnapshot" JSONB NOT NULL,
    "invalidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 0,
    "latestResult" JSONB,
    "history" JSONB NOT NULL DEFAULT '[]',
    "invalidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 0,
    "engineVersion" TEXT NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]',
    "learningStrategies" JSONB NOT NULL DEFAULT '[]',
    "reviewSchedules" JSONB NOT NULL DEFAULT '[]',
    "priorityDecisions" JSONB NOT NULL DEFAULT '[]',
    "history" JSONB NOT NULL DEFAULT '[]',
    "invalidatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_sessions" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "roadmapId" TEXT NOT NULL,
    "assessmentId" TEXT,
    "learnerId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL DEFAULT 0,
    "activities" JSONB NOT NULL DEFAULT '[]',
    "tasks" JSONB NOT NULL DEFAULT '[]',
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "progress" JSONB NOT NULL,
    "timers" JSONB NOT NULL DEFAULT '[]',
    "history" JSONB NOT NULL DEFAULT '[]',
    "reflection" JSONB,
    "notes" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "parentSkillId" TEXT,
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "roles" JSONB NOT NULL DEFAULT '["STUDENT"]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "replacedByTokenId" TEXT,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "api_keys" (
    "id" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "permissions" JSONB NOT NULL DEFAULT '[]',

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_events" (
    "id" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "userId" TEXT,
    "operation" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateType" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "traceId" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "causationId" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_memory_records" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB,
    "expiresAt" TIMESTAMP(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "tags" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_memory_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_instances" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "currentStep" TEXT,
    "completedSteps" JSONB NOT NULL DEFAULT '[]',
    "failedSteps" JSONB NOT NULL DEFAULT '[]',
    "traceId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_messages" (
    "id" TEXT NOT NULL,
    "traceId" TEXT NOT NULL,
    "workflowId" TEXT,
    "senderAgentId" TEXT NOT NULL,
    "receiverAgentId" TEXT NOT NULL,
    "messageType" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coordination_plans" (
    "id" TEXT NOT NULL,
    "agents" JSONB NOT NULL DEFAULT '[]',
    "executionOrder" JSONB NOT NULL DEFAULT '[]',
    "sharedMemoryScopes" JSONB NOT NULL DEFAULT '[]',
    "executionPolicy" TEXT NOT NULL,
    "dependencies" JSONB NOT NULL DEFAULT '{}',
    "expectedOutputs" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coordination_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_records" (
    "id" TEXT NOT NULL,
    "experience" JSONB NOT NULL,
    "patternIds" JSONB NOT NULL DEFAULT '[]',
    "knowledgeItemIds" JSONB NOT NULL DEFAULT '[]',
    "recommendationIds" JSONB NOT NULL DEFAULT '[]',
    "feedback" JSONB NOT NULL,
    "workflowId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "learning_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "execution_patterns" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '{}',
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "execution_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_items" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_learning_recommendations" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "basedOnKnowledgeItemIds" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_learning_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "goals_learnerId_status_idx" ON "goals"("learnerId", "status");

-- CreateIndex
CREATE INDEX "roadmaps_learnerId_status_idx" ON "roadmaps"("learnerId", "status");

-- CreateIndex
CREATE INDEX "roadmaps_goalId_idx" ON "roadmaps"("goalId");

-- CreateIndex
CREATE INDEX "assessments_learnerId_status_idx" ON "assessments"("learnerId", "status");

-- CreateIndex
CREATE INDEX "assessments_roadmapId_idx" ON "assessments"("roadmapId");

-- CreateIndex
CREATE INDEX "recommendations_learnerId_status_idx" ON "recommendations"("learnerId", "status");

-- CreateIndex
CREATE INDEX "recommendations_roadmapId_idx" ON "recommendations"("roadmapId");

-- CreateIndex
CREATE INDEX "learning_sessions_goalId_idx" ON "learning_sessions"("goalId");

-- CreateIndex
CREATE INDEX "learning_sessions_roadmapId_idx" ON "learning_sessions"("roadmapId");

-- CreateIndex
CREATE INDEX "learning_sessions_learnerId_status_idx" ON "learning_sessions"("learnerId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "skills_skillId_key" ON "skills"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "skills_normalizedName_key" ON "skills"("normalizedName");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_familyId_idx" ON "refresh_tokens"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");

-- CreateIndex
CREATE INDEX "audit_events_traceId_idx" ON "audit_events"("traceId");

-- CreateIndex
CREATE INDEX "audit_events_operation_idx" ON "audit_events"("operation");

-- CreateIndex
CREATE INDEX "audit_events_resource_timestamp_idx" ON "audit_events"("resource", "timestamp" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "outbox_events_eventId_key" ON "outbox_events"("eventId");

-- CreateIndex
CREATE INDEX "outbox_events_aggregateId_idx" ON "outbox_events"("aggregateId");

-- CreateIndex
CREATE INDEX "outbox_events_status_occurredAt_idx" ON "outbox_events"("status", "occurredAt");

-- CreateIndex
CREATE INDEX "agent_memory_records_scope_idx" ON "agent_memory_records"("scope");

-- CreateIndex
CREATE INDEX "agent_memory_records_expiresAt_idx" ON "agent_memory_records"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "agent_memory_records_scope_scopeId_key_key" ON "agent_memory_records"("scope", "scopeId", "key");

-- CreateIndex
CREATE INDEX "agent_instances_status_idx" ON "agent_instances"("status");

-- CreateIndex
CREATE INDEX "agent_instances_agentId_idx" ON "agent_instances"("agentId");

-- CreateIndex
CREATE INDEX "agent_instances_traceId_idx" ON "agent_instances"("traceId");

-- CreateIndex
CREATE INDEX "agent_messages_status_idx" ON "agent_messages"("status");

-- CreateIndex
CREATE INDEX "agent_messages_traceId_idx" ON "agent_messages"("traceId");

-- CreateIndex
CREATE INDEX "agent_messages_receiverAgentId_idx" ON "agent_messages"("receiverAgentId");

-- CreateIndex
CREATE INDEX "agent_messages_workflowId_idx" ON "agent_messages"("workflowId");

-- CreateIndex
CREATE INDEX "coordination_plans_createdAt_idx" ON "coordination_plans"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "learning_records_workflowId_createdAt_idx" ON "learning_records"("workflowId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "learning_records_createdAt_idx" ON "learning_records"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "execution_patterns_category_idx" ON "execution_patterns"("category");

-- CreateIndex
CREATE INDEX "execution_patterns_detectedAt_idx" ON "execution_patterns"("detectedAt" DESC);

-- CreateIndex
CREATE INDEX "knowledge_items_type_idx" ON "knowledge_items"("type");

-- CreateIndex
CREATE INDEX "knowledge_items_confidence_idx" ON "knowledge_items"("confidence" DESC);

-- CreateIndex
CREATE INDEX "agent_learning_recommendations_category_idx" ON "agent_learning_recommendations"("category");

-- CreateIndex
CREATE INDEX "agent_learning_recommendations_confidence_idx" ON "agent_learning_recommendations"("confidence" DESC);
