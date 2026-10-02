export const workerPayload = (workerId: string) => `tempo:worker:v1:${workerId}`;
export const parseWorkerPayload = (value: string): string | null => {
  const [app, kind, version, ...rest] = value.split(':');
  const id = rest.join(':');
  return app === 'tempo' && kind === 'worker' && version === 'v1' && id ? id : null;
};
