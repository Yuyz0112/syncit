export enum TransporterEvents {
  SourceReady,
  MirrorReady,
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

  sendSourceReady(): Promise<void>;
  sendMirrorReady(): Promise<void>;
  sendRecord(data: T): Promise<void>;
  ackRecord(id: number): Promise<void>;
  sendStop(): Promise<void>;
  sendRemoteControl(payload: unknown): Promise<void>;
  on(event: TransporterEvents, hanlder: TransporterEventHandler): void;
}
