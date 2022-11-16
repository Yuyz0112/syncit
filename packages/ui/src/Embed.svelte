<script>
import {
    record,
    mirror
} from 'rrweb';
import {
    onMount,
    onDestroy
} from 'svelte';
import {
    TransporterEvents
} from '@syncit/transporter/es/base';
import {
    applyMirrorAction,
    SourceBuffer,
    createEmbedService,
    createEmbedControlService,
    RemoteControlActions,
} from '@syncit/core';
import {
    customAlphabet
} from 'nanoid';
import {
    t,
    setCurrentLanguage
} from './locales';

export let createTransporter;
export let lang;

const nanoid = customAlphabet('1234567890abcdef', 10);
let uid = nanoid(8);
const transporter = createTransporter({
    uid,
    role: 'embed',
});
export let controls;
let ref;
$: ref && document.body.appendChild(ref);

const buffer = new SourceBuffer({
    onTimeout(record) {
        transporter.sendRecord(record);
    },
});

let selecting = false;
let mask;
$: mask && document.body.appendChild(mask);
let blockElSet = new Set();

const service = createEmbedService({
    transporter,
    record,
    stopRecordFn: null,
    buffer,
});
let current = service.state;
const controlService = createEmbedControlService({
    record,
});
let controlCurrent = controlService.state;

const highlight = target => {
    const {
        x,
        y,
        width,
        height
    } = target.getBoundingClientRect();
    Object.assign(mask.style, {
        left: `${x}px`,
        top: `${y}px`,
        width: `${width}px`,
        height: `${height}px`,
        display: 'inherit',
    });
};
const removeHighlight = () => {
    Object.assign(mask.style, {
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        display: 'none',
    });
};

const over = event => {
    if (
        event.target &&
        ref !== event.target &&
        !ref.contains(event.target) &&
        event.target !== document.body
    ) {
        highlight(event.target);
    }
};
const click = event => {
    if (!selecting || ref.contains(event.target)) {
        return;
    }
    event.target.classList.add('rr-block');
    blockElSet = blockElSet.add(event.target);
    cancelSelect();
};
const cancelSelect = () => {
    selecting = false;
    removeHighlight();
    window.removeEventListener('mousemove', over, {
        capture: true
    });
    window.removeEventListener('click', click, {
        capture: true
    });
};

onMount(() => {
    if (lang) {
        setCurrentLanguage(lang);
    }

    service.start();
    service.subscribe(state => {
        current = state;
        controls({
            current
        })
    });
    controlService.start();
    controlService.subscribe(state => {
        controlCurrent = state;
        controls({
            controlCurrent,
            controlService,
            service
        })
    });

    transporter.on(TransporterEvents.MirrorReady, () => {
        transporter.sendSourceReady();
    });
    transporter.on(TransporterEvents.Start, () => {
        service.send('CONNECT');
    });
    transporter.on(TransporterEvents.AckRecord, ({
        payload
    }) => {
        buffer.delete(payload);
    });
    transporter.on(TransporterEvents.RemoteControl, ({
        payload
    }) => {
        switch (payload.action) {
            case RemoteControlActions.Request:
                controlService.send('REQUEST');
                break;
            case RemoteControlActions.Stop:
                controlService.send('STOP');
                break;
            default:
                applyMirrorAction(mirror, payload);
                break;
        }
    });
});
onDestroy(() => {
    service.stop();
    controlService.stop();
});
</script>
