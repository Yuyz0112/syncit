<script>
  import Konva from 'konva';
  import { onMount } from 'svelte';
  import { record } from 'rrweb';
  import { CustomEventTags } from '@syncit/core';

  export let role = 'master';

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
      this.mode = 'brush';
    }

    startLine() {
      this.isPainting = true;
      const pos = this.stage.getPointerPosition();
      this.lastLine = new Konva.Line({
        stroke: '#df4b26',
        strokeWidth: this.mode === 'brush' ? 5 : 10,
        globalCompositeOperation:
          this.mode === 'brush' ? 'source-over' : 'destination-out',
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

  onMount(() => {
    canvas = new Canvas(ref.getBoundingClientRect());

    if (role === 'master') {
      canvas.stage.on('mousedown touchstart', function (e) {
        canvas.startLine();
      });

      canvas.stage.on('mouseup touchend', function () {
        canvas.endLine();
      });

      canvas.stage.on('mousemove touchmove', function () {
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
</style>

<div id="syncit-canvas" bind:this={ref} />
