# 使用指南

**目前 Syncit 还处于早期开发阶段，使用方式可能随时发生变化。**

## 快速开始

使用 Syncit 需要安装 `@syncit/ui` 和 `@syncit/transporter`：

```
npm i @syncit/ui @syncit/transporter
```

引入 Syncit，使用 local storage transporter 作为传输层：

```js
import syncit from '@syncit/ui';
import '@syncit/ui/dist/style.css';
import { LocalStorageTransporter } from '@syncit/transporter';
```

在源端初始化 Syncit：

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

在对端初始化 Syncit：

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

使用不同的 transporter：

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

Syncit 目前支持的 transporter 如下：

| 名称                    | 参数                                | 描述                                                                                    |
| ----------------------- | ----------------------------------- | --------------------------------------------------------------------------------------- |
| LocalStorageTransporter | role,uid                            | 基于 local-storage 实现，用于测试或演示。                                               |
| PeerjsTransporter       | role,uid,peerHost,peerPort,peerPath | 基于 [Peerjs](https://github.com/peers/peerjs) 实现，需自行搭建 Peerjs-server           |
| AgoraRtmTransporter     | role,uid,agoraAppId                 | 基于 [Agora RTM](https://www.agora.io/en/real-time-messaging/) 服务实现，需注册应用账号 |
