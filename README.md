# Syncit

<p align="center">
  <img width="100px" height="100px" src="https://user-images.githubusercontent.com/13651389/79969148-a9c57280-84c3-11ea-9063-cb8066a12c66.png">
</p>

基于 Web 的像素级、低流量屏幕共享，以及神奇的远程控制

[Demo 视频](http://lab.myriptide.com/syncit-demo/syncit.mp4)

## 什么是 Syncit

### 远程屏幕共享

**像素级同步、低时延、超低流量。**

将 Web 视图的变化与交互行为转换为序列化的快照和 op-log，由源端传输至对端后重放。对端始终处于沙盒中，避免安全问题。

### 隐私保护

**灵活遮挡内容，而不是位置。**

视图中的每个部分都是结构化的 DOM，不仅精确屏蔽视图，同时屏蔽对应区域内的交互事件。

### 反向远程控制

**就像 Teamviewer for the Web，但无需安装客户端。**

采集对端的交互事件后在源端进行重放，并且控制权无法从当前 Web 页面逃逸，带来更好的安全性。

## Syncit 可以做什么

### 远程客服

为你的 Web 应用接入 Syncit，用户遇到问题时客服人员可以远程给予帮助。

### 弱网环境下的 Web 分享

向各种网络环境下的各类终端分享你的内容，“画质”不降级。

### 更多

Syncit 适用于所有 Web 场景，随着 Web 应用不断进化，它的适用场景会不断变多。

## Syncit 的设计

### 直播模式

简单来说，Syncit 的基础是将 Web 视图序列化成了一个文本格式的快照，再将可能对 Web 视图产生变化的各类操作都记录成了 op-log。只需要重建快照，再一次重放 op-log 中的操作，就可以实现 Web 视图的精确回放。其中涉及到的[录制](https://github.com/rrweb-io/rrweb/blob/master/docs/observer.zh_CN.md)、[序列化](https://github.com/rrweb-io/rrweb/blob/master/docs/serialization.zh_CN.md)、[回放](https://github.com/rrweb-io/rrweb/blob/master/docs/replay.zh_CN.md)、[沙盒](https://github.com/rrweb-io/rrweb/blob/master/docs/sandbox.zh_CN.md)等细节可以查看更详细的设计文档。

进一步地，要实现直播的效果，Syncit 还包含了 encoder, buffer, transporter 等组件，示意图如下：

<p align="center">
  <img src="https://user-images.githubusercontent.com/13651389/79969241-ca8dc800-84c3-11ea-9090-82e239382d8b.png">
</p>

每一个组件都是可插拔的，例如：

- 可以实现 encoder/decoder，对传输的数据进行加密、压缩等操作。（比赛版本中因为 Agora 实时消息 SDK 中包含了 deflate 压缩，所以没有启用额外的 encoder）
- 可以实现 buffer，对传输中的数据进行缓存，当出现网络异常或时序错乱时可以进行重试和排序。（比赛版本中的 buffer 是一个内存中非持久化的实现）
- 可以实现 transporter，通过暴露标准的接口让数据在源端和对端之间通信。（比赛版本使用了 Agora 实时消息 SDK 封装 transporter，代码中也包含了一个基于 localStorage 模拟的 transporter 用于快速测试）

由于传输的数据中 op-log 的部分对顺序非常敏感，所以 buffer 中的重试和排序是非常重要的实现，可以保障屏幕共享的稳定性。

buffer 对于用户侧的感受是一个 1 秒（可控）的延迟，这就意味着只要传输的数据时延不超过 1 秒，buffer 都可以将其缓冲为观看无延迟的状态。

### 控制模式

控制模式在直播模式的基础上实现。在直播模式时我们已经通过重建快照在对端构建了一个沙盒视图，当开启控制模式后，我们会开始监听对端用户在沙盒中的交互，再传输至源端进行实施。

在源端和对端会持续的维护一个完全同步的 DOM 映射，这样可以将每个交互记录为一个序列化的数据进行传输。

#### 举个例子

> 假设源端页面是一个按钮，点击后 alert 一条消息

1. 在对端重建快照，出现一个同样的按钮，但该按钮在沙盒中，点击后并不会触发 alert。
2. 监听对端沙盒中的交互事件，对端用户点击沙盒中的按钮后，收集到点击事件和点击对象。
3. 将点击事件和点击对象传输至源端，通过程序触发对应的点击事件。
4. 源端 alert 一条消息。
5. 源端最新的视图变化继续同步至对端

示意图如下：

<p align="center">
  <img src="https://user-images.githubusercontent.com/13651389/79991359-d2aa2f80-84e4-11ea-8611-40751b1c7800.png">
</p>
