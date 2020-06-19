# Syncit 的设计

我们将共享屏幕的一方称为“源端”，将观看共享屏幕、发起远程控制的一方称为“对端”。

## 屏幕共享

简单来说，Syncit 的基础是在源端将 Web 视图序列化成了一个文本格式的快照，再将可能对 Web 视图产生变化的各类操作都记录成了 op-log。

源端将快照和 op-log 的数据传输至对端，对端只需要重建快照，再依次重放 op-log 中的操作，就可以实现 Web 视图的精确回放。

其中涉及到的[录制](https://github.com/rrweb-io/rrweb/blob/master/docs/observer.zh_CN.md)、[序列化](https://github.com/rrweb-io/rrweb/blob/master/docs/serialization.zh_CN.md)、[回放](https://github.com/rrweb-io/rrweb/blob/master/docs/replay.zh_CN.md)、[沙盒](https://github.com/rrweb-io/rrweb/blob/master/docs/sandbox.zh_CN.md)等细节可以查看更详细的设计文档。

进一步地，要实现直播的效果，Syncit 还实现了 buffer, transporter 等组件，示意图如下：

<p align="center">
  <img src="https://user-images.githubusercontent.com/13651389/79969241-ca8dc800-84c3-11ea-9090-82e239382d8b.png">
</p>

### 缓冲区

网络的传输是异步的，如果我们在对端一收到数据时就进行回放，可能会因为网络传输的耗时导致回放看起来卡顿。

所以我们需要实现一个缓冲区，让对端的画面始终比源端延迟一定的时长（例如 1 秒）。

举个例子，我们在源端收集到以下事件：

```
// @ 后为物理时间戳

event_1 @0
event_2 @20
event_3 @96
```

在对端收到这些事件的时间为：

```
// + 后为传输时间

event_1 @20 (+20)
event_3 @130 (+34)
event_2 @138 (+118) <-- 因为传输时间导致顺序错误
```

缓冲区的作用是让所有事件都在缓冲时间之后被重放：

```
// @ 后为重放的物理时间戳

event_1 @1000
event_2 @1020
event_3 @1096
```

可以看到虽然源端接收到事件的延迟长短不一，甚至导致顺序错误，但是缓冲区内都可以将其重新排序，并且按照源端采集到的时间间隔依次重放，保证回放画面的正确性。

同时缓冲区还会检查是否有缺失的 op-log，如果缺失会向源端发出请求，要求再次发送缺失的数据。

### 传输层

源端和对端之间需要进行通信，在 Syncit 中这部分被抽象为一个通用的传输层。Syncit 规定了一个传输层需要实现哪些语义，但并不限制传输层的具体实现方式。

例如我们目前在 Syncit 中内置了以下几种传输层实现：

- 基于 local-storage 的实现，用于 Demo 和测试。
- 基于 [Peerjs](https://github.com/peers/peerjs) 的实现。
- 基于 [Agora RTM](https://www.agora.io/en/real-time-messaging/) 的实现。

使用时只需要将所需的传输层提供给 Syncit 即可。

## 远程控制

远程控制在屏幕共享的基础之上实现。在屏幕共享时我们已经通过重建快照在对端构建了一个沙盒视图，当开启远程控制后，我们会开始监听对端用户在沙盒中的交互，再传输至源端进行实施。

在源端和对端会持续地维护一个完全同步的 DOM 映射，这样可以将每个交互记录为一个序列化的数据进行传输。

### 举个例子

> 假设源端页面是一个按钮，点击后 alert 一条消息

1. 在对端重建快照，出现一个同样的按钮，但该按钮在沙盒中，点击后并不会触发 alert。
2. 监听对端沙盒中的交互事件，对端用户点击沙盒中的按钮后，收集到点击事件和点击对象。
3. 将点击事件和点击对象传输至源端，通过程序触发对应的点击事件。
4. 源端 alert 一条消息。
5. 源端最新的视图变化继续同步至对端。

示意图如下：

<p align="center">
  <img src="https://user-images.githubusercontent.com/13651389/79991359-d2aa2f80-84e4-11ea-8611-40751b1c7800.png">
</p>
