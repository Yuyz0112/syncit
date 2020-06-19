# Guide

**Currently, Syncit is at an early development stage. During this stage, API could be changed frequently.**

## Quick Start

Using Syncit needs `@syncit/ui` and `@syncit/transporter`:

```
npm i @syncit/ui @syncit/transporter
```

Import Syncit and use the LocalStorageTransporter：

```js
import syncit from '@syncit/ui';
import '@syncit/ui/dist/style.css';
import { LocalStorageTransporter } from '@syncit/transporter';
```

Initialize Syncit at the source:

```js
new syncit.Embed({
  target: document.body,
  props: {
    createTransporter({ role, uid }) {
      return new LocalStorageTransporter({
        role,
        uid,
      });
    },
  },
});
```

Initialize Syncit at the target:

```js
new syncit.App({
  target: document.body,
  props: {
    createTransporter({ role, uid }) {
      return new LocalStorageTransporter({
        role,
        uid,
      });
    },
  },
});
```

Use other transporters:

```js
new syncit.App({
  target: document.body,
  props: {
    createTransporter({ role, uid }) {
      return new PeerjsTransporter({
        role,
        uid,
        peerHost: 'localhost',
        peerPort: 9000,
        peerPath: '/myapp',
      });
    },
  },
});
```

The transporters supported by Syncit：

| name                    | options                             | description                                                                                                  |
| ----------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| LocalStorageTransporter | role,uid                            | Implemented with local-storage, good for testing and demo.                                                   |
| PeerjsTransporter       | role,uid,peerHost,peerPort,peerPath | A wrapper of [Peerjs](https://github.com/peers/peerjs), need to set up a Peerjs-server.                      |
| AgoraRtmTransporter     | role,uid,agoraAppId                 | A wrapper of [Agora RTM](https://www.agora.io/en/real-time-messaging/) service，need register for an app id. |
