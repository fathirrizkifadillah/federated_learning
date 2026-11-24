export { runLocalFedProxTraining } from './trainer';
export type {
  SharedGlobalWeights,
  LocalTrainingSignal,
  LocalFLTrainRequest,
  LocalFLTrainResult,
} from './trainer';

export { fetchGlobalFLModel, maybeRunBrowserFLRound } from './orchestrator';
export type { GlobalFLModelResponse, FLRoundExecutionResult } from './orchestrator';
