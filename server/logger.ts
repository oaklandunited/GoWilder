export type LogSeverity = 'DEBUG' | 'INFO' | 'WARNING' | 'ERROR';

export function logJson(
  severity: LogSeverity,
  message: string,
  fields?: Record<string, unknown>,
): void {
  const entry = {
    severity,
    message,
    timestamp: new Date().toISOString(),
    ...fields,
  };
  const line = JSON.stringify(entry);
  if (severity === 'ERROR') {
    console.error(line);
  } else {
    console.log(line);
  }
}
