<script>
  import { scaleLinear } from "d3-scale";

  export let width = 200;
  export let height = 100;
  export let color = "#41EFC5";
  export let points = [];

  $: minX = points[0] ? points[0].x : 0;
  $: maxX = points[points.length - 1] ? points[points.length - 1].x : 0;
  $: minY = Math.min.apply(null, ys);
  $: maxY = Math.max.apply(null, ys);

  $: xScale = scaleLinear().domain([minX, maxX]).range([0, width]);

  $: ys = points.map((p) => p.y);
  $: yScale = scaleLinear().domain([minY, maxY]).range([height, 0]);

  $: path = `M${points.map((p) => `${xScale(p.x)},${yScale(p.y)}`).join("L")}`;
</script>

<div
  class="syncit-chart"
  bind:clientWidth="{width}"
  bind:clientHeight="{height}"
>
  <svg>
    <path class="path-line" d="{path}" stroke="{color}"></path>
  </svg>
</div>

<style>
  .syncit-chart {
    width: 100%;
    height: 30px;
  }

  svg {
    position: relative;
    width: 100%;
    height: 100%;
  }

  .path-line {
    fill: none;
    stroke-linejoin: round;
    stroke-linecap: round;
    stroke-width: 2;
    transition: all 0.3s ease-in;
    opacity: 0.7;
  }
</style>
