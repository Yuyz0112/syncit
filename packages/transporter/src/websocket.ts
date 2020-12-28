/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import {
  Transporter,
  TransporterEvents,
  TransporterEventHandler,
} from './base';

export class WebSocketTransporter<T> implements Transporter<T> {
  handlers: Record<TransporterEvents, Array<TransporterEventHandler>> = {
    [TransporterEvents.SourceReady]: [],
    [TransporterEvents.MirrorReady]: [],
    [TransporterEvents.Start]: [],
    [TransporterEvents.SendRecord]: [],
    [TransporterEvents.AckRecord]: [],
    [TransporterEvents.Stop]: [],
    [TransporterEvents.RemoteControl]: [],
  };

  ws: WebSocket;

  constructor(options: { url: string }) {
    const { url } = options;
    this.ws = new WebSocket(url);
    this.ws.onmessage = event => {
      const message = JSON.parse(event.data);
      this.handlers[message.event as TransporterEvents].map(h =>
        h({
          event: message.event,
          payload: message.payload,
        })
      );
    };
  }

  login() {
    return Promise.resolve(true);
  }

  setItem(params: { event: TransporterEvents; payload?: unknown }) {
    if (this.ws.readyState !== 1) {
      return setTimeout(() => {
        this.setItem(params);
      }, 50);
    }
    this.ws.send(JSON.stringify(params));
    // jest could not listen to storage event in JSDOM, not a big deal at here.
    if (process.env.NODE_ENV === 'test') {
      this.handlers[params.event].map(h => h(params));
    }
  }

  sendSourceReady() {
    this.setItem({
      event: TransporterEvents.SourceReady,
    });
    return Promise.resolve();
  }

  sendMirrorReady() {
    this.setItem({
      event: TransporterEvents.MirrorReady,
    });
    return Promise.resolve();
  }

  sendStart() {
    this.setItem({
      event: TransporterEvents.Start,
    });
    return Promise.resolve();
  }

  sendRecord(record: unknown) {
    this.setItem({
      event: TransporterEvents.SendRecord,
      payload: record,
    });
    return Promise.resolve();
  }

  ackRecord(id: number) {
    this.setItem({
      event: TransporterEvents.AckRecord,
      payload: id,
    });
    return Promise.resolve();
  }

  sendStop() {
    this.setItem({
      event: TransporterEvents.Stop,
    });
    return Promise.resolve();
  }

  sendRemoteControl(payload: unknown) {
    this.setItem({
      event: TransporterEvents.RemoteControl,
      payload,
    });
    return Promise.resolve();
  }

  on(event: TransporterEvents, handler: TransporterEventHandler) {
    this.handlers[event].push(handler);
  }
}
