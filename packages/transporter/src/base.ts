export enum TransporterEvents {
  SourceReady,
  MirrorReady,
  Start,
  SendRecord,
  AckRecord,
  Stop,
  RemoteControl,
}

export type TransporterEventHandler = (params: {
  event: TransporterEvents;
  payload?: unknown;
}) => void;

export interface Transporter<T> {
  handlers: Record<TransporterEvents, Array<TransporterEventHandler>>;

  login(): Promise<boolean>;
  sendSourceReady(): Promise<void>;
  sendMirrorReady(): Promise<void>;
  sendStart(): Promise<void>;
  sendRecord(data: T): Promise<void>;
  ackRecord(id: number): Promise<void>;
  sendStop(): Promise<void>;
  sendRemoteControl(payload: unknown): Promise<void>;
  on(event: TransporterEvents, handler: TransporterEventHandler): void;
}
