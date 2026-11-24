import { runLocalFedProxTraining, LocalFLTrainRequest } from './trainer';

self.onmessage = (event: MessageEvent<LocalFLTrainRequest>) => {
  try {
    const result = runLocalFedProxTraining(event.data);
    self.postMessage({ ok: true, result });
  } catch (err: any) {
    self.postMessage({ ok: false, error: err?.message || 'Worker FL training error' });
  }
};
