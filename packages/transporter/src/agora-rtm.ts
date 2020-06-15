/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import AgoraRTM from 'agora-rtm-sdk';
import {
  Transporter,
  TransporterEvents,
  TransporterEventHandler,
} from './base';

export type AgoraRtmTransporterOptions = {
  agora_app_id: string;
  uid: string;
  role: 'embed' | 'app';
};

export class AgoraRtmTransporter<T> implements Transporter<T> {
  handlers: Record<TransporterEvents, Array<TransporterEventHandler>> = {
    [TransporterEvents.SourceReady]: [],
    [TransporterEvents.MirrorReady]: [],
    [TransporterEvents.Start]: [],
    [TransporterEvents.SendRecord]: [],
    [TransporterEvents.AckRecord]: [],
    [TransporterEvents.Stop]: [],
    [TransporterEvents.RemoteControl]: [],
  };

  client: ReturnType<typeof AgoraRTM.createInstance>;
  uid: string;
  role: AgoraRtmTransporterOptions['role'];

  constructor(options: AgoraRtmTransporterOptions) {
    const { agora_app_id, uid, role } = options;
    this.client = AgoraRTM.createInstance(agora_app_id, {
      logFilter: AgoraRTM.LOG_FILTER_ERROR,
    });
    this.uid = uid;
    this.role = role;

    const fragmentPool: Record<string, string[]> = {};
    this.client.on('MessageFromPeer', (message, peerId) => {
      if (![this.embedUid, this.appUid].includes(peerId) || !message.text) {
        return;
      }
      let data!: { event: TransporterEvents; payload?: unknown };
      try {
        data = JSON.parse(message.text);
        this.handlers[data.event].map(h =>
          h({
            event: data.event,
            payload: data.payload,
          })
        );
      } catch (_) {
        const matchedArr = message.text.match(/(\d+)\/(\d+)\/(\d+)_(.+)?/);
        if (!matchedArr) {
          return;
        }
        const [, current, total, id, raw] = matchedArr;
        if (!fragmentPool[id]) {
          fragmentPool[id] = [];
        }
        fragmentPool[id][parseInt(current, 10)] = raw;
        let complete = true;
        let concatRaw = '';
        // check whether every idx in the array was filled
        for (let i = 1; i <= parseInt(total, 10); i++) {
          if (typeof fragmentPool[id][i] !== 'string') {
            complete = false;
          } else {
            concatRaw += fragmentPool[id][i];
          }
        }
        if (complete) {
          data = JSON.parse(concatRaw);
          this.handlers[data.event].map(h =>
            h({
              event: data.event,
              payload: data.payload,
            })
          );
        }
      }
    });
  }

  get embedUid() {
    return `${this.uid}-embed`;
  }

  get appUid() {
    return `${this.uid}-app`;
  }

  async login(): Promise<boolean> {
    // return;
    let retry = 5;
    let loginResult;
    let loginError;
    while (retry > 0 || loginResult) {
      retry--;
      try {
        loginResult = await this.client.login({
          uid: `${this.uid}-${this.role}`,
        });
        break;
      } catch (error) {
        loginError = error;
      }
    }
    return !loginError;
  }

  async sendSourceReady() {
    await this.client.sendMessageToPeer(
      {
        text: JSON.stringify({ event: TransporterEvents.SourceReady }),
      },
      this.appUid
    );
  }

  async sendMirrorReady() {
    await this.client.sendMessageToPeer(
      {
        text: JSON.stringify({ event: TransporterEvents.MirrorReady }),
      },
      this.embedUid
    );
  }

  async sendStart() {
    await this.client.sendMessageToPeer(
      {
        text: JSON.stringify({ event: TransporterEvents.Start }),
      },
      this.embedUid
    );
  }

  async sendRecord(record: unknown) {
    const texts =
      JSON.stringify({
        event: TransporterEvents.SendRecord,
        payload: record,
      }).match(/(.|[\r\n]){1,31000}/g) || [];
    await Promise.all(
      texts.map((text, idx) =>
        this.client.sendMessageToPeer(
          {
            text: `${idx + 1}/${texts.length}/${
              (record as { id: number }).id
            }_${text}`,
          },
          this.appUid
        )
      )
    );
  }

  async ackRecord(id: number) {
    await this.client.sendMessageToPeer(
      {
        text: JSON.stringify({
          event: TransporterEvents.AckRecord,
          payload: id,
        }),
      },
      this.embedUid
    );
  }

  async sendStop() {
    await this.client.sendMessageToPeer(
      {
        text: JSON.stringify({ event: TransporterEvents.Stop }),
      },
      this.appUid
    );
  }

  async sendRemoteControl(payload: unknown) {
    await this.client.sendMessageToPeer(
      {
        text: JSON.stringify({
          event: TransporterEvents.RemoteControl,
          payload,
        }),
      },
      this.embedUid
    );
  }

  on(event: TransporterEvents, handler: TransporterEventHandler) {
    this.handlers[event].push(handler);
  }
}
