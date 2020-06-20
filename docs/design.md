# The design of Syncit

In this documentation, we will call the user who shares the screen as 'the source', and the user who watches the screen sharing as 'the target'.

## Screen Sharing

The fundamental function of Syncit's screen sharing is to serialize the view of a web page into a snapshot at the source, continuously observe the mutations that can change the view and put them into an op-log.

The source will transfer the snapshot and op-log to the target. The target simply rebuilds the snapshot and 'casts' the mutations in the op-log, which will make the view at the target side look the same as the source side.

Some further details about [observe](https://github.com/rrweb-io/rrweb/blob/master/docs/observer.md), [serialize](https://github.com/rrweb-io/rrweb/blob/master/docs/serialization.md)、[replay](https://github.com/rrweb-io/rrweb/blob/master/docs/replay.md) and [sandbox](https://github.com/rrweb-io/rrweb/blob/master/docs/sandbox.md) can be found in rrweb's design docs.

Further more, Syncit implements the buffer and transporter components to support the live screen sharing. The architect is shown below:

<p align="center">
  <img src="https://user-images.githubusercontent.com/13651389/79969241-ca8dc800-84c3-11ea-9090-82e239382d8b.png">
</p>

### The Buffer Component

Data transfering via a network is an asynchronous process. If we try to consume the received data at the target side as soon as possible, the replay may look laggy.

So we need the buffer component to cache data, which results in a delay(like 1 second) at the target side.

For example, if we collect the following events at the source:

```
// the number after @ is the physical timestamp we observe the event

event_1 @0
event_2 @20
event_3 @96
```

And the target receives the events:

```
// the number after + is the time of transportation

event_1 @20 (+20)
event_3 @130 (+34)
event_2 @138 (+118) <-- the time of transportation cause a wrong order
```

The buffer component will delay the events:

```
// the number after @ is a physical timestamp we cast the event

event_1 @1000
event_2 @1020
event_3 @1096
```

Although the time of transportation of events is different and sometimes may cause a wrong order, the buffer component can re-order the events and schedule them with the right time interval, which guarantees the replay's correctness.

The buffer component also checks whether there are some missing chunks in the op-log. If so, it will require the missing chunks to be sent again.

### The Transporter Component

Syncit abstracts data layer between the source and the target as a generic transporter component. The transporter component only defines the interface, and can be implemented in any way.

For example, we have already implemented several transporter components in Syncit:

- The local-storage transporter, which is good for testing and demo。
- The [Peerjs](https://github.com/peers/peerjs) transporter。
- The [Agora RTM](https://www.agora.io/en/real-time-messaging/) transporter。

## Remote Control

The remote control is implemented on the base of screen sharing. During screen sharing, we've already rebuilt the snapshot at the target as a sandboxed view. When remote control is enabled, Syncit will listen to the interactions at the target side and transfer them to the source.

Syncit maintains a DOM map between the source and the target, so we can simply transfer a serializable data like `{ action: 'click', id: 1 }` to the source, and it will know which DOM element was clicked.

### An Example

> For example, the source page has a button, which will alert a message when clicked

1. Rebuild the snapshot at the target which will also have a button. But the button is inside a sandboxed view, so clicking it will not alert a message.
2. Listen to the button's click events.
3. When the button is clicked, send the event and button id to the source. The source will trigger a click event on the button programmatically.
4. Alert a message at the source.
5. The source syncs the latest mutations to the target.

A sketch for this process is shown below:

<p align="center">
  <img src="https://user-images.githubusercontent.com/13651389/79991359-d2aa2f80-84e4-11ea-8611-40751b1c7800.png">
</p>
