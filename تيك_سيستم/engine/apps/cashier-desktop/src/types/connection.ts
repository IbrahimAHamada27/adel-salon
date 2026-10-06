export type ConnectionState =
  | 'ONLINE'
  | 'OFFLINE_WITH_DATA'
  | 'OFFLINE_NO_DATA'
  | 'UPDATING'
  | 'ERROR';

export interface ConnectivityStatus {
  is_online: boolean;
  server_reachable: boolean;
  server_time?: string | null;
  latency_ms?: number | null;
  message: string;
}
