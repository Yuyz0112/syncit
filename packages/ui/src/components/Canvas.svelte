<script>
  import Konva from 'konva';
  import { onMount } from 'svelte';
  import { record } from 'rrweb';
  import { CustomEventTags } from '@syncit/core';

  export let role = 'master';
  export let mode;
  $: lineMode = ['brush', 'eraser'].includes(mode);
  export let stroke;
  export let strokeWidth;

  class Canvas {
    constructor({ width, height }) {
      this.stage = new Konva.Stage({
        container: 'syncit-canvas',
        width,
        height,
      });

      this.layer = new Konva.Layer();
      this.stage.add(this.layer);

      this.isPainting = false;
    }

    startLine() {
      this.isPainting = true;
      const pos = this.stage.getPointerPosition();
      this.lastLine = new Konva.Line({
        stroke,
        strokeWidth,
        globalCompositeOperation:
          mode === 'brush' ? 'source-over' : 'destination-out',
        points: pos ? [pos.x, pos.y] : [0, 0],
      });
      this.layer.add(this.lastLine);

      if (role === 'master') {
        record.addCustomEvent(CustomEventTags.StartLine);
      }
    }

    endLine() {
      this.isPainting = false;

      if (role === 'master') {
        record.addCustomEvent(CustomEventTags.EndLine);
      }
    }

    draw() {
      if (!this.isPainting) {
        return;
      }

      const pos = this.stage.getPointerPosition();
      const newPoints = this.lastLine.points().concat([pos.x, pos.y]);
      this.drawPoints(newPoints);

      if (role === 'master') {
        record.addCustomEvent(CustomEventTags.DrawLine, { points: newPoints });
      }
    }

    drawPoints(points) {
      this.lastLine.points(points);
      this.layer.batchDraw();
    }
  }

  let canvas;
  let ref;

  export function startLine() {
    canvas.startLine();
  }
  export function endLine() {
    canvas.endLine();
  }
  export function setPoints(points) {
    canvas.drawPoints(points);
  }

  export function highlight(left, top) {
    let highlightEl = document.createElement('div');
    Object.assign(highlightEl.style, {
      position: 'absolute',
      left: `${left}px`,
      top: `${top}px`,
      background: stroke,
      width: `${2 * strokeWidth}px`,
      height: `${2 * strokeWidth}px`,
      borderRadius: `${strokeWidth}px`,
      animation: 'syncit-highlight 1000ms ease-out',
    });
    ref.appendChild(highlightEl);
    setTimeout(() => {
      if (ref.contains(highlightEl)) {
        ref.removeChild(highlightEl);
      }
    }, 1000);

    if (role === 'master') {
      record.addCustomEvent(CustomEventTags.Highlight, { left, top });
    }
  }

  onMount(() => {
    canvas = new Canvas(ref.getBoundingClientRect());

    if (role === 'master') {
      canvas.stage.on('mousedown touchstart', function (e) {
        if (lineMode) {
          canvas.startLine();
          return;
        }
        if (mode === 'highlight') {
          highlight(e.evt.clientX - strokeWidth, e.evt.clientY - strokeWidth);
        }
      });

      canvas.stage.on('mouseup touchend', function () {
        if (!lineMode) {
          return;
        }
        canvas.endLine();
      });

      canvas.stage.on('mousemove touchmove', function () {
        if (!lineMode) {
          return;
        }
        canvas.draw();
      });
    }
  });
</script>

<style>
  #syncit-canvas {
    position: fixed;
    left: 0;
    top: 0;
    right: 0;
    bottom: 0;
  }

  @keyframes -global-syncit-highlight {
    0% {
      transform: scale(1);
      opacity: 0.5;
    }
    75% {
      transform: scale(1.5);
      opacity: 1;
    }
    100% {
      transform: scale(1);
      opacity: 0.5;
    }
  }
</style>

<div id="syncit-canvas" bind:this={ref} />
