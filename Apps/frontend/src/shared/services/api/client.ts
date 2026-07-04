/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

export type RegisterDto = object;

export type LoginDto = object;

export type RefreshDto = object;

export type CreateGoalDto = object;

export type UpdateGoalDto = object;

export type CompleteGoalDto = object;

export type CreateRoadmapDto = object;

export type UpdateRoadmapDto = object;

export type VersionGuardedDto = object;

export type CreateLearningSessionDto = object;

export type TransitionSessionDto = object;

export type RecordEvidenceDto = object;

export type ToggleSessionTaskDto = object;

export type SaveSessionNotesDto = object;

export type SubmitReflectionDto = object;

export type CreateAssessmentDto = object;

export type RunAssessmentDto = object;

export type GenerateRecommendationsDto = object;

export type RejectRecommendationDto = object;

export type AiExecuteDto = object;

export type RunMigrationDto = object;

export type ValidateMigrationDto = object;

export type RollbackMigrationDto = object;

import type {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  HeadersDefaults,
  ResponseType,
} from "axios";
import axios from "axios";

export type QueryParamsType = Record<string | number, any>;

export interface FullRequestParams extends Omit<
  AxiosRequestConfig,
  "data" | "params" | "url" | "responseType"
> {
  /** set parameter to `true` for call `securityWorker` for this request */
  secure?: boolean;
  /** request path */
  path: string;
  /** content type of request body */
  type?: ContentType;
  /** query params */
  query?: QueryParamsType;
  /** format of response (i.e. response.json() -> format: "json") */
  format?: ResponseType;
  /** request body */
  body?: unknown;
}

export type RequestParams = Omit<FullRequestParams, "body" | "method" | "query" | "path">;

export interface ApiConfig<SecurityDataType = unknown> extends Omit<
  AxiosRequestConfig,
  "data" | "cancelToken"
> {
  securityWorker?: (
    securityData: SecurityDataType | null,
  ) => Promise<AxiosRequestConfig | void> | AxiosRequestConfig | void;
  secure?: boolean;
  format?: ResponseType;
}

export enum ContentType {
  Json = "application/json",
  JsonApi = "application/vnd.api+json",
  FormData = "multipart/form-data",
  UrlEncoded = "application/x-www-form-urlencoded",
  Text = "text/plain",
}

export class HttpClient<SecurityDataType = unknown> {
  public instance: AxiosInstance;
  private securityData: SecurityDataType | null = null;
  private securityWorker?: ApiConfig<SecurityDataType>["securityWorker"];
  private secure?: boolean;
  private format?: ResponseType;

  constructor({
    securityWorker,
    secure,
    format,
    ...axiosConfig
  }: ApiConfig<SecurityDataType> = {}) {
    this.instance = axios.create({
      ...axiosConfig,
      baseURL: axiosConfig.baseURL || "",
    });
    this.secure = secure;
    this.format = format;
    this.securityWorker = securityWorker;
  }

  public setSecurityData = (data: SecurityDataType | null) => {
    this.securityData = data;
  };

  protected mergeRequestParams(
    params1: AxiosRequestConfig,
    params2?: AxiosRequestConfig,
  ): AxiosRequestConfig {
    const method = params1.method || (params2 && params2.method);

    return {
      ...this.instance.defaults,
      ...params1,
      ...(params2 || {}),
      headers: {
        ...((method &&
          this.instance.defaults.headers[method.toLowerCase() as keyof HeadersDefaults]) ||
          {}),
        ...(params1.headers || {}),
        ...((params2 && params2.headers) || {}),
      },
    };
  }

  protected stringifyFormItem(formItem: unknown) {
    if (typeof formItem === "object" && formItem !== null) {
      return JSON.stringify(formItem);
    } else {
      return `${formItem}`;
    }
  }

  protected createFormData(input: Record<string, unknown>): FormData {
    if (input instanceof FormData) {
      return input;
    }
    return Object.keys(input || {}).reduce((formData, key) => {
      const property = input[key];
      const propertyContent: any[] = property instanceof Array ? property : [property];

      for (const formItem of propertyContent) {
        const isFileType = formItem instanceof Blob || formItem instanceof File;
        formData.append(key, isFileType ? formItem : this.stringifyFormItem(formItem));
      }

      return formData;
    }, new FormData());
  }

  public request = async <T = any, _E = any>({
    secure,
    path,
    type,
    query,
    format,
    body,
    ...params
  }: FullRequestParams): Promise<AxiosResponse<T>> => {
    const secureParams =
      ((typeof secure === "boolean" ? secure : this.secure) &&
        this.securityWorker &&
        (await this.securityWorker(this.securityData))) ||
      {};
    const requestParams = this.mergeRequestParams(params, secureParams);
    const responseFormat = format || this.format || undefined;

    if (type === ContentType.FormData && body && body !== null && typeof body === "object") {
      body = this.createFormData(body as Record<string, unknown>);
    }

    if (type === ContentType.Text && body && body !== null && typeof body !== "string") {
      body = JSON.stringify(body);
    }

    return this.instance.request({
      ...requestParams,
      headers: {
        ...(requestParams.headers || {}),
        ...(type ? { "Content-Type": type } : {}),
      },
      params: query,
      responseType: responseFormat,
      data: body,
      url: path,
    });
  };
}

/**
 * @title AI Mentor OS - API
 * @version 1.0
 * @contact
 *
 * Modular adaptive learning engine REST API
 */
export class Api<SecurityDataType extends unknown> extends HttpClient<SecurityDataType> {
  metrics = {
    /**
     * No description
     *
     * @name MetricsControllerGetMetrics
     * @request GET:/metrics
     */
    metricsControllerGetMetrics: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/metrics`,
        method: "GET",
        ...params,
      }),
  };
  health = {
    /**
     * No description
     *
     * @name HealthControllerLiveness
     * @request GET:/health
     */
    healthControllerLiveness: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/health`,
        method: "GET",
        ...params,
      }),
  };
  readiness = {
    /**
     * No description
     *
     * @name HealthControllerReadiness
     * @request GET:/readiness
     */
    healthControllerReadiness: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/readiness`,
        method: "GET",
        ...params,
      }),
  };
  auth = {
    /**
     * No description
     *
     * @name AuthControllerRegister
     * @request POST:/auth/register
     */
    authControllerRegister: (data: RegisterDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/auth/register`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name AuthControllerLogin
     * @request POST:/auth/login
     */
    authControllerLogin: (data: LoginDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/auth/login`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name AuthControllerRefresh
     * @request POST:/auth/refresh
     */
    authControllerRefresh: (data: RefreshDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/auth/refresh`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name AuthControllerLogout
     * @request POST:/auth/logout
     */
    authControllerLogout: (data: RefreshDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/auth/logout`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),
  };
  goal = {
    /**
     * No description
     *
     * @name GoalControllerCreate
     * @request POST:/goal
     */
    goalControllerCreate: (data: CreateGoalDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/goal`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name GoalControllerFindAll
     * @request GET:/goal
     */
    goalControllerFindAll: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/goal`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @name GoalControllerFindOne
     * @request GET:/goal/{id}
     */
    goalControllerFindOne: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/goal/${id}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @name GoalControllerUpdate
     * @request PUT:/goal/{id}
     */
    goalControllerUpdate: (id: string, data: UpdateGoalDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/goal/${id}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name GoalControllerArchive
     * @request DELETE:/goal/{id}
     */
    goalControllerArchive: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/goal/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @name GoalControllerComplete
     * @request POST:/goal/{id}/complete
     */
    goalControllerComplete: (id: string, data: CompleteGoalDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/goal/${id}/complete`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),
  };
  roadmap = {
    /**
     * No description
     *
     * @name RoadmapControllerCreate
     * @request POST:/roadmap
     */
    roadmapControllerCreate: (data: CreateRoadmapDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/roadmap`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name RoadmapControllerFindAll
     * @request GET:/roadmap
     */
    roadmapControllerFindAll: (
      query: {
        learnerId: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/roadmap`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @name RoadmapControllerFindOne
     * @request GET:/roadmap/{id}
     */
    roadmapControllerFindOne: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/roadmap/${id}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @name RoadmapControllerUpdate
     * @request PUT:/roadmap/{id}
     */
    roadmapControllerUpdate: (id: string, data: UpdateRoadmapDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/roadmap/${id}`,
        method: "PUT",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name RoadmapControllerArchive
     * @request DELETE:/roadmap/{id}
     */
    roadmapControllerArchive: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/roadmap/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @name RoadmapControllerProgress
     * @request GET:/roadmap/{id}/progress
     */
    roadmapControllerProgress: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/roadmap/${id}/progress`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @name RoadmapControllerHistory
     * @request GET:/roadmap/{id}/history
     */
    roadmapControllerHistory: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/roadmap/${id}/history`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @name RoadmapControllerPublish
     * @request POST:/roadmap/{id}/publish
     */
    roadmapControllerPublish: (id: string, data: VersionGuardedDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/roadmap/${id}/publish`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name RoadmapControllerCompleteTask
     * @request POST:/roadmap/{id}/tasks/{taskId}/complete
     */
    roadmapControllerCompleteTask: (
      id: string,
      taskId: string,
      data: VersionGuardedDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/roadmap/${id}/tasks/${taskId}/complete`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name RoadmapControllerRegenerate
     * @request POST:/roadmap/{id}/regenerate
     */
    roadmapControllerRegenerate: (
      id: string,
      data: VersionGuardedDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/roadmap/${id}/regenerate`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),
  };
  learningSessions = {
    /**
     * No description
     *
     * @name LearningSessionControllerCreate
     * @request POST:/learning-sessions
     */
    learningSessionControllerCreate: (data: CreateLearningSessionDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/learning-sessions`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name LearningSessionControllerFindAll
     * @request GET:/learning-sessions
     */
    learningSessionControllerFindAll: (
      query: {
        learnerId: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/learning-sessions`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @name LearningSessionControllerStart
     * @request POST:/learning-sessions/{id}/start
     */
    learningSessionControllerStart: (
      id: string,
      data: TransitionSessionDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/learning-sessions/${id}/start`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name LearningSessionControllerPause
     * @request POST:/learning-sessions/{id}/pause
     */
    learningSessionControllerPause: (
      id: string,
      data: TransitionSessionDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/learning-sessions/${id}/pause`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name LearningSessionControllerResume
     * @request POST:/learning-sessions/{id}/resume
     */
    learningSessionControllerResume: (
      id: string,
      data: TransitionSessionDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/learning-sessions/${id}/resume`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name LearningSessionControllerComplete
     * @request POST:/learning-sessions/{id}/complete
     */
    learningSessionControllerComplete: (
      id: string,
      data: TransitionSessionDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/learning-sessions/${id}/complete`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name LearningSessionControllerCancel
     * @request POST:/learning-sessions/{id}/cancel
     */
    learningSessionControllerCancel: (
      id: string,
      data: TransitionSessionDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/learning-sessions/${id}/cancel`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name LearningSessionControllerRecordEvidence
     * @request POST:/learning-sessions/{id}/evidence
     */
    learningSessionControllerRecordEvidence: (
      id: string,
      data: RecordEvidenceDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/learning-sessions/${id}/evidence`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name LearningSessionControllerToggleTask
     * @request PATCH:/learning-sessions/{id}/tasks/{taskId}
     */
    learningSessionControllerToggleTask: (
      id: string,
      taskId: string,
      data: ToggleSessionTaskDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/learning-sessions/${id}/tasks/${taskId}`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name LearningSessionControllerSaveNotes
     * @request PATCH:/learning-sessions/{id}/notes
     */
    learningSessionControllerSaveNotes: (
      id: string,
      data: SaveSessionNotesDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/learning-sessions/${id}/notes`,
        method: "PATCH",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name LearningSessionControllerSubmitReflection
     * @request POST:/learning-sessions/{id}/reflection
     */
    learningSessionControllerSubmitReflection: (
      id: string,
      data: SubmitReflectionDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/learning-sessions/${id}/reflection`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name LearningSessionControllerGetEvidenceHistory
     * @request GET:/learning-sessions/{id}/evidence
     */
    learningSessionControllerGetEvidenceHistory: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/learning-sessions/${id}/evidence`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @name LearningSessionControllerFindOne
     * @request GET:/learning-sessions/{id}
     */
    learningSessionControllerFindOne: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/learning-sessions/${id}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @name LearningSessionControllerGetAnalytics
     * @request GET:/learning-sessions/{id}/analytics
     */
    learningSessionControllerGetAnalytics: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/learning-sessions/${id}/analytics`,
        method: "GET",
        ...params,
      }),
  };
  assessment = {
    /**
     * No description
     *
     * @name AssessmentControllerCreate
     * @request POST:/assessment
     */
    assessmentControllerCreate: (data: CreateAssessmentDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/assessment`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name AssessmentControllerFindAll
     * @request GET:/assessment
     */
    assessmentControllerFindAll: (
      query: {
        learnerId: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/assessment`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @name AssessmentControllerRun
     * @request POST:/assessment/run
     */
    assessmentControllerRun: (data: RunAssessmentDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/assessment/run`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name AssessmentControllerFindOne
     * @request GET:/assessment/{id}
     */
    assessmentControllerFindOne: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/assessment/${id}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @name AssessmentControllerProfile
     * @request GET:/assessment/{id}/profile
     */
    assessmentControllerProfile: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/assessment/${id}/profile`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @name AssessmentControllerGaps
     * @request GET:/assessment/{id}/gaps
     */
    assessmentControllerGaps: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/assessment/${id}/gaps`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @name AssessmentControllerApprove
     * @request POST:/assessment/{id}/approve
     */
    assessmentControllerApprove: (
      id: string,
      data: VersionGuardedDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/assessment/${id}/approve`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name AssessmentControllerArchive
     * @request POST:/assessment/{id}/archive
     */
    assessmentControllerArchive: (
      id: string,
      data: VersionGuardedDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/assessment/${id}/archive`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),
  };
  recommendation = {
    /**
     * No description
     *
     * @name RecommendationControllerGenerate
     * @request POST:/recommendation/generate
     */
    recommendationControllerGenerate: (
      data: GenerateRecommendationsDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/recommendation/generate`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name RecommendationControllerStrategies
     * @request GET:/recommendation/strategies
     */
    recommendationControllerStrategies: (params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/recommendation/strategies`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @name RecommendationControllerFindAll
     * @request GET:/recommendation
     */
    recommendationControllerFindAll: (
      query: {
        learnerId: string;
      },
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/recommendation`,
        method: "GET",
        query: query,
        ...params,
      }),

    /**
     * No description
     *
     * @name RecommendationControllerFindOne
     * @request GET:/recommendation/{id}
     */
    recommendationControllerFindOne: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/recommendation/${id}`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @name RecommendationControllerArchive
     * @request DELETE:/recommendation/{id}
     */
    recommendationControllerArchive: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/recommendation/${id}`,
        method: "DELETE",
        ...params,
      }),

    /**
     * No description
     *
     * @name RecommendationControllerHistory
     * @request GET:/recommendation/{id}/history
     */
    recommendationControllerHistory: (id: string, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/recommendation/${id}/history`,
        method: "GET",
        ...params,
      }),

    /**
     * No description
     *
     * @name RecommendationControllerApprove
     * @request POST:/recommendation/{id}/approve
     */
    recommendationControllerApprove: (
      id: string,
      data: VersionGuardedDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/recommendation/${id}/approve`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name RecommendationControllerReject
     * @request POST:/recommendation/{id}/reject
     */
    recommendationControllerReject: (
      id: string,
      data: RejectRecommendationDto,
      params: RequestParams = {},
    ) =>
      this.request<void, any>({
        path: `/recommendation/${id}/reject`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),
  };
  ai = {
    /**
     * No description
     *
     * @name AiRuntimeControllerExecute
     * @request POST:/ai/execute
     */
    aiRuntimeControllerExecute: (data: AiExecuteDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/ai/execute`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),
  };
  migration = {
    /**
     * No description
     *
     * @name MigrationControllerRun
     * @request POST:/migration/run
     */
    migrationControllerRun: (data: RunMigrationDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/migration/run`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name MigrationControllerValidate
     * @request POST:/migration/validate
     */
    migrationControllerValidate: (data: ValidateMigrationDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/migration/validate`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),

    /**
     * No description
     *
     * @name MigrationControllerRollback
     * @request POST:/migration/rollback
     */
    migrationControllerRollback: (data: RollbackMigrationDto, params: RequestParams = {}) =>
      this.request<void, any>({
        path: `/migration/rollback`,
        method: "POST",
        body: data,
        type: ContentType.Json,
        ...params,
      }),
  };
}
