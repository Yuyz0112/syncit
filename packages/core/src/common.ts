import { utils, EventType, IncrementalSource } from 'rrweb';
import { INode } from 'rrweb-snapshot';
import {
  listenerHandler,
  inputValue,
  eventWithTime,
  Mirror,
} from 'rrweb/typings/types';

export type ValueWithUnit = {
  value: number;
  unit: string;
};

export function formatBytes(bytes: number, decimals = 0): ValueWithUnit {
  if (!bytes) {
    return {
      value: 0,
      unit: 'B/s',
    };
  }
  const k = 1024;
  const units = ['B/s', 'KiB/s', 'MiB/s'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return {
    value: parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)),
    unit: units[i],
  };
}

export type MirrorPayload =
  | {
      action: RemoteControlActions.Click;
      id: number;
    }
  | {
      action: RemoteControlActions.Scroll;
      id: number;
      x: number;
      y: number;
    }
  | {
      action: RemoteControlActions.Input;
      id: number;
      text: inputValue['text'];
      isChecked: inputValue['isChecked'];
    };

export const enum RemoteControlActions {
  Request,
  Stop,
  Click,
  Scroll,
  Input,
}
const INPUT_TAGS = ['INPUT', 'TEXTAREA', 'SELECT'];
const lastInputValueMap: WeakMap<EventTarget, inputValue> = new WeakMap();
export function onMirror(
  iframe: HTMLIFrameElement,
  cb: (payload: MirrorPayload) => void
): listenerHandler {
  const iframeWindow = iframe.contentWindow;
  if (!iframeWindow) {
    throw new Error('iframe is not loaded');
  }
  const iframeDoc = iframeWindow.document;
  const handlers: listenerHandler[] = [];

  const clickCb = (evt: Event) => {
    const target = evt.target as INode;
    if (!target.__sn) {
      return;
    }
    cb({
      action: RemoteControlActions.Click,
      id: target.__sn.id,
    });
  };
  handlers.push(utils.on('click', clickCb, iframeWindow));
  const scrollCb = (evt: Event) => {
    const target = evt.target as INode;
    if (!target.__sn) {
      return;
    }
    const { id } = target.__sn;
    if ((target as unknown) === iframeDoc) {
      const scrollEl = iframeDoc.scrollingElement || iframeDoc.documentElement;
      cb({
        action: RemoteControlActions.Scroll,
        id,
        x: scrollEl.scrollLeft,
        y: scrollEl.scrollTop,
      });
    } else {
      const {
        scrollLeft: x,
        scrollTop: y,
      } = (target as unknown) as HTMLElement;
      cb({
        action: RemoteControlActions.Scroll,
        id,
        x,
        y,
      });
    }
  };
  handlers.push(utils.on('scroll', scrollCb, iframeWindow));

  function eventHandler(event: Event) {
    const target = event.target as HTMLInputElement | null;
    if (!target || !target.tagName || INPUT_TAGS.indexOf(target.tagName) < 0) {
      return;
    }
    const type = target.type;
    const text = target.value;
    let isChecked = false;
    if (type === 'radio' || type === 'checkbox') {
      isChecked = target.checked;
    }
    cbWithDedup(target, { text, isChecked });
    const name = target.name;
    if (type === 'radio' && name && isChecked) {
      document
        .querySelectorAll(`input[type="radio"][name="${name}"]`)
        .forEach(el => {
          if (el !== target) {
            cbWithDedup(el as HTMLInputElement, {
              text: (el as HTMLInputElement).value,
              isChecked: !isChecked,
            });
          }
        });
    }
  }
  function cbWithDedup(target: HTMLInputElement, v: inputValue) {
    const lastInputValue = lastInputValueMap.get(target);
    if (
      !lastInputValue ||
      lastInputValue.text !== v.text ||
      lastInputValue.isChecked !== v.isChecked
    ) {
      lastInputValueMap.set(target, v);
      const id = ((target as unknown) as INode).__sn.id;
      cb({
        action: RemoteControlActions.Input,
        id,
        ...v,
      });
    }
  }
  ['input', 'change'].forEach(eventName =>
    handlers.push(utils.on(eventName, eventHandler, iframeDoc))
  );
  const propertyDescriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value'
  );
  const hookProperties = [
    [HTMLInputElement.prototype, 'value'],
    [HTMLInputElement.prototype, 'checked'],
    [HTMLSelectElement.prototype, 'value'],
    [HTMLTextAreaElement.prototype, 'value'],
  ] as const;
  if (propertyDescriptor && propertyDescriptor.set) {
    handlers.push(
      ...hookProperties.map(p =>
        utils.hookSetter(
          p[0],
          p[1],
          {
            set() {
              // mock to a normal event
              eventHandler({ target: this } as Event);
            },
          },
          undefined,
          iframeWindow as Window & typeof globalThis
        )
      )
    );
  }
  return () => {
    handlers.forEach(h => h());
  };
}

export function isIgnoredOnRmoteControl(event: eventWithTime): boolean {
  switch (true) {
    case event.type === EventType.IncrementalSnapshot &&
      event.data.source === IncrementalSource.MouseInteraction:
    case event.type === EventType.IncrementalSnapshot &&
      event.data.source === IncrementalSource.Scroll:
    case event.type === EventType.IncrementalSnapshot &&
      event.data.source === IncrementalSource.Input:
      return true;
    default:
      return false;
  }
}

export function applyMirrorAction(
  mirror: Mirror,
  payload: MirrorPayload
): void {
  switch (payload.action) {
    case RemoteControlActions.Click: {
      const { id } = payload;
      const node = mirror.getNode(id);
      if (!node) {
        return;
      }
      ((node as unknown) as HTMLElement).click();
      break;
    }
    case RemoteControlActions.Scroll: {
      const { id, x, y } = payload;
      const node = (mirror.getNode(id) as unknown) as HTMLElement;
      if (!node) {
        return;
      }
      if ((node as unknown) === document) {
        window.scrollTo({
          top: y,
          left: x,
          behavior: 'smooth',
        });
      } else {
        node.scrollTop = y;
        node.scrollLeft = x;
      }
      break;
    }
    case RemoteControlActions.Input: {
      const { id, isChecked, text } = payload;
      const node = (mirror.getNode(id) as unknown) as HTMLInputElement;
      if (!node) {
        return;
      }
      node.checked = isChecked;
      node.value = text;
      break;
    }
    default:
      break;
  }
}

export const enum CustomEventTags {
  Ping = 'Ping',
  AcceptRemoteControl = 'AcceptRemoteControl',
  StopRemoteControl = 'StopRemoteControl',
  MouseSize = 'MouseSize',
  StartPaint = 'StartPaint',
  StartLine = 'StartLine',
  DrawLine = 'DrawLine',
  EndLine = 'EndLine',
  EndPaint = 'EndPaint',
}

export type DataPoint = {
  x: number;
  y: number;
};
