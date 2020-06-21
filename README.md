<p align="center">
  <img width="100px" height="100px" src="https://user-images.githubusercontent.com/13651389/79969148-a9c57280-84c3-11ea-9063-cb8066a12c66.png">
</p>

# Syncit

[中文文档](./README.zh_CN.md)

> I have joined Github Sponsors and highly appreciate your sponsorship.

Syncit, which refers to 'sync it', is a privacy-first co-browsing tool. It provides pixel-perfect, low-latency, low-bandwidth screen sharing, and remote control.

**Currently, Syncit is at an early development stage. During this stage, API could be changed frequently.**

For better improvement, feature requests and bug reports are welcomed.

[Demo video](http://temp.myriptide.com/syncit.mp4)

[A talk about Syncit (in Chinese)](https://www.bilibili.com/video/BV1iZ4y1H7ov/)

## Guide

[**📚 Read Syncit guide here. 📚**](./guide.md)

## Internal Design

Syncit uses [rrweb](https://github.com/rrweb-io/rrweb) under the hood to record mutations in the browser, implement screen sharing and remote control over it.

Please refer to the [design doc](./docs/design.md) for further details.
