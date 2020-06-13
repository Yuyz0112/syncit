import { createMachine, interpret, assign } from '@xstate/fsm';
import { Replayer, record } from 'rrweb';
import { listenerHandler, eventWithTime } from 'rrweb/typings/types';
import { Transporter } from '@syncit/transporter/lib/base';
import { SourceBuffer, MirrorBuffer, Chunk } from './buffer';
import {
  DataPoint,
  onMirror,
  RemoteControlActions,
  CustomEventTags,
} from './common';

type AppContext = {
  replayer: Replayer;
  playerDom: HTMLElement;
  buffer: MirrorBuffer<unknown>;
  latencies: DataPoint[];
  sizes: DataPoint[];
};

const appMachine = createMachine<AppContext>(
  {
    initial: 'idle',
    states: {
      idle: {
        on: {
          SOURCE_READY: {
            target: 'source_ready',
          },
        },
      },
      source_ready: {
        on: {
          CONNECT: {
            target: 'waiting_first_record',
          },
        },
      },
      waiting_first_record: {
        on: {
          FIRST_RECORD: {
            target: 'connected',
          },
        },
      },
      connected: {
        on: {
          STOP: {
            target: 'stopped',
            actions: ['stop'],
          },
        },
      },
      stopped: {
        on: {
          RESET: 'idle',
        },
      },
    },
  },
  {
    actions: {
      stop: assign(context => {
        const { replayer, playerDom, buffer } = context;
        replayer.pause();
        playerDom.innerHTML = '';
        buffer.reset();
        return {
          ...context,
          latencies: [],
          sizes: [],
        };
      }),
    },
  }
);

type AppControlContext = {
  transporter: Transporter<any>;
  stopControl: listenerHandler | null;
  replayer: Replayer;
};

const appControlMachine = createMachine<AppControlContext>(
  {
    initial: 'not_control',
    states: {
      not_control: {
        on: {
          REQUEST: {
            target: 'requested',
            actions: ['request'],
          },
        },
      },
      requested: {
        on: {
          ACCEPTED: {
            target: 'controlling',
            actions: ['accepted'],
          },
        },
      },
      controlling: {
        on: {
          STOP_CONTROL: {
            target: 'not_control',
            actions: ['stopControl'],
          },
        },
      },
    },
  },
  {
    actions: {
      request(context) {
        context.transporter.sendRemoteControl({
          action: RemoteControlActions.Request,
        });
      },
      accepted: assign(context => {
        const { replayer, transporter } = context;
        replayer.enableInteract();
        return {
          stopControl: onMirror(replayer.iframe, payload => {
            transporter.sendRemoteControl(payload);
          }),
        };
      }),
      stopControl(context) {
        const { transporter, replayer, stopControl } = context;
        transporter.sendRemoteControl({
          action: RemoteControlActions.Stop,
        });
        replayer.disableInteract();
        if (stopControl) {
          stopControl();
        }
      },
    },
  }
);

type EmbedContext = {
  transporter: Transporter<Chunk<eventWithTime>>;
  record: typeof record;
  stopRecordFn: listenerHandler | null;
  buffer: SourceBuffer<eventWithTime>;
};

const embedMachine = createMachine<EmbedContext>(
  {
    initial: 'idle',
    states: {
      idle: {
        on: {
          START: {
            target: 'ready',
            actions: ['start'],
          },
        },
      },
      ready: {
        on: {
          CONNECT: {
            target: 'connected',
            actions: ['connect'],
          },
        },
      },
      connected: {
        on: {
          STOP: {
            target: 'idle',
            actions: ['stop'],
          },
        },
      },
    },
  },
  {
    actions: {
      start(context) {
        context.transporter.sendSourceReady();
      },
      connect: assign(context => {
        const { record, buffer, transporter } = context;
        const stopRecord = record({
          emit(event) {
            const id = buffer.add(event);
            transporter.sendRecord(buffer.buffer[id]);
          },
          inlineStylesheet: false,
        });
        const timer = setInterval(() => {
          record.addCustomEvent(CustomEventTags.Ping, undefined);
        }, 1000);
        return {
          stopRecordFn: () => {
            stopRecord?.();
            clearInterval(timer);
          },
        };
      }),
      stop(context) {
        const { stopRecordFn, transporter, buffer } = context;
        stopRecordFn?.();
        transporter.sendStop();
        buffer.reset();
      },
    },
  }
);

type EmbedControlContext = {
  record: typeof record;
};

const controlMachine = createMachine<EmbedControlContext>(
  {
    initial: 'not_control',
    states: {
      not_control: {
        on: {
          REQUEST: {
            target: 'requesting',
          },
        },
      },
      requesting: {
        on: {
          ACCEPT: {
            target: 'controlled',
            actions: ['accept'],
          },
        },
      },
      controlled: {
        on: {
          STOP: {
            target: 'not_control',
          },
        },
      },
    },
  },
  {
    actions: {
      accept(context) {
        context.record.addCustomEvent(
          CustomEventTags.AcceptRemoteControl,
          undefined
        );
      },
    },
  }
);
