<script>
  import { onMount, onDestroy } from 'svelte';
  import { Replayer, EventType, pack, mirror } from 'rrweb';
  import { quintOut } from 'svelte/easing';
  import { scale } from 'svelte/transition';
  import { TransporterEvents } from '@syncit/transporter/es/base';
  import {
    MirrorBuffer,
    CustomEventTags,
    RemoteControlActions,
    formatBytes,
    onMirror,
    isIgnoredOnRmoteControl,
    createAppService,
    createAppControlService,
  } from '@syncit/core';
  import Panel from './components/Panel.svelte';
  import LineChart from './components/LineChart.svelte';
  import Icon from './components/Icon.svelte';
  import { t } from './locales';

  let uid = '';

  export let createTransporter;
  export let bufferMs;

  let transporter;
  let login;

  let playerDom;
  let replayer;
  const buffer = new MirrorBuffer({
    bufferMs,
    onChunk({ data }) {
      if (
        !controlCurrent.matches('controlling') ||
        !isIgnoredOnRmoteControl(data)
      ) {
        replayer.addEvent(data);
      }
    },
  });
  let latencies = [];
  let sizes = [];

  const service = createAppService(() => {
    replayer.pause();
    playerDom.innerHTML = '';
    buffer.reset();
    latencies = [];
    sizes = [];
  });
  let current = service.state;

  let controlService;
  let controlCurrent;

  let open = false;

  function init() {
    transporter = createTransporter({
      role: 'app',
      uid,
    });

    transporter.on(TransporterEvents.SourceReady, () => {
      service.send('SOURCE_READY');
      replayer = new Replayer([], {
        root: playerDom,
        loadTimeout: 100,
        liveMode: true,
        insertStyleRules: ['.syncit-embed { display: none !important }'],
        showWarning: true,
        showDebug: true,
      });

      controlService = createAppControlService({
        transporter,
        replayer,
      });
      controlCurrent = controlService.state;

      controlService.start();
      controlService.subscribe(state => {
        controlCurrent = state;
      });

      transporter.sendStart();
    });

    transporter.on(TransporterEvents.SendRecord, data => {
      const { id, data: event, t } = data.payload;
      if (!current.matches('connected')) {
        replayer.startLive(event.timestamp - buffer.bufferMs);
        service.send('FIRST_RECORD');
      }
      if (event.type === EventType.Custom) {
        switch (event.data.tag) {
          case CustomEventTags.Ping:
            latencies = latencies.concat({ x: t, y: Date.now() - t });
            break;
          case CustomEventTags.MouseSize:
            mouseSize = `syncit-mouse-s${event.data.payload.level}`;
            break;
          case CustomEventTags.AcceptRemoteControl:
            controlService.send({
              type: 'ACCEPTED',
              payload: { replayer },
            });
            break;
          case CustomEventTags.StopRemoteControl:
            controlService.send('STOP_CONTROL');
            break;
          default:
            break;
        }
      }
      Promise.resolve().then(() => collectSize(t, JSON.stringify(event)));
      buffer.addWithCheck({ id, data: event });
      transporter.ackRecord(id);
    });
    transporter.on(TransporterEvents.Stop, () => {
      service.send('STOP');
    });

    login = (async () => {
      await transporter.login();
      await transporter.sendMirrorReady();
    })();
  }

  function reset() {
    service.send('RESET');
    login = undefined;
    uid = '';
  }

  function normalizePoints(points) {
    if (points.length > 20) {
      points = points.slice(points.length - 20, points.length);
    } else {
      points = new Array(20 - points.length)
        .fill()
        .map((_, idx) => ({
          x: points[0] ? points[0].x - 1000 * (21 - points.length - idx) : 0,
          y: 0,
        }))
        .concat(points);
    }
    return points;
  }
  $: _latencies = normalizePoints(latencies);
  $: _sizes = normalizePoints(sizes);
  $: {
    if (latencies.length > 20) {
      latencies = latencies.slice(latencies.length - 20, latencies.length);
    }
    if (sizes.length > 20) {
      sizes = sizes.slice(sizes.length - 20, sizes.length);
    }
  }
  $: lastSize = formatBytes(_sizes[_sizes.length - 1].y);
  function getSizeOfString(str) {
    return encodeURI(str).split(/%(?:u[0-9A-F]{2})?[0-9A-F]{2}|./).length - 1;
  }
  function collectSize(timestamp, str) {
    if (sizes.length === 0) {
      sizes.push({ x: Date.now(), y: 0 });
    }
    const lastSize = sizes[sizes.length - 1];
    const size = getSizeOfString(str);
    if (timestamp - lastSize.x < 1000) {
      lastSize.y += size;
    } else {
      sizes.push({ x: Date.now(), y: size });
    }
    sizes = sizes;
  }

  let mouseSize = 'syncit-mouse-s2';

  onMount(() => {
    service.start();
    service.subscribe(state => {
      current = state;
    });
  });
  onDestroy(() => {
    service.stop();
    controlService.stop();
  });
</script>

<div class="syncit-app {mouseSize}">
  <div bind:this="{playerDom}"></div>
  {#if current.matches('idle')}
  <!---->
  {#if !login}
  <div class="syncit-center">
    <div class="syncit-load-text syncit-hint align-center">
      <label>
        remote UID:
        <input
          type="text"
          bind:value="{uid}"
          on:keydown="{e => e.code === 'Enter' && uid && init()}"
        />
      </label>
      <button class="syncit-btn" on:click="{init}" disabled="{!uid}">
        {t('app.connect')}
      </button>
    </div>
  </div>
  {:else}
  <!---->
  {#await login}
  <div class="syncit-load-text syncit-center">{t('app.initializing')}...</div>
  {:then}
  <!---->
  {:catch error}
  <div class="syncit-error syncit-center">{error.message}</div>
  {/await}
  <!---->
  {/if}
  <!---->
  {/if}
  <!---->
  {#if current.matches('waiting_first_record')}
  <div class="syncit-load-text syncit-center">{t('app.ready')}</div>
  {:else if current.matches('connected')}
  <div class="syncit-app-control">
    {#if open}
    <div
      transition:scale="{{duration: 500, opacity: 0.5, easing: quintOut}}"
      style="transform-origin: right bottom;"
    >
      <Panel>
        <div class="syncit-metric">
          <div class="syncit-chart-title">
            {t('app.latency')}
            <span style="color: #41efc5;">
              {_latencies.length ? _latencies[_latencies.length - 1].y : '-'} ms
            </span>
          </div>
          <div class="syncit-metric-line">
            <LineChart points="{_latencies}"></LineChart>
          </div>
        </div>
        <div class="syncit-metric">
          <div class="syncit-chart-title">
            {t('app.bandwidth')}
            <span style="color: #8c83ed;">
              {lastSize.value} {lastSize.unit}
            </span>
          </div>
          <div class="syncit-metric-line">
            <LineChart points="{_sizes}" color="#8C83ED"></LineChart>
          </div>
        </div>
        <div>
          <p>{t('app.remoteControl')}</p>
          {#if controlCurrent.matches('not_control')}
          <button
            class="syncit-btn ordinary"
            on:click="{() => controlService.send('REQUEST')}"
          >
            {t('app.requestToControl')}
          </button>
          {:else if controlCurrent.matches('requested')}
          <button class="syncit-btn ordinary" disabled>
            {t('app.requested')}
          </button>
          {:else if controlCurrent.matches('controlling')}
          <button
            class="syncit-btn ordinary"
            on:click="{() => controlService.send('STOP_CONTROL')}"
          >
            {t('app.stopControl')}
          </button>
          {/if}
        </div>
      </Panel>
    </div>
    {/if}
    <!---->
    <button class="syncit-toggle syncit-btn" on:click="{() => open = !open}">
      <Icon name="{open ? 'close' : 'team'}"></Icon>
    </button>
  </div>
  {:else if current.matches('stopped')}
  <div class="syncit-center">
    <div class="syncit-load-text syncit-hint">
      <div>{t('app.aborted')}</div>
      <button
        class="syncit-btn"
        on:click="{reset}"
        style="display: block; margin: 0.5em auto;"
      >
        {t('app.reset')}
      </button>
    </div>
  </div>
  {/if}
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
  }
  :global(iframe) {
    border: none;
  }
  :global(p) {
    margin-top: 0;
    margin-bottom: 8px;
  }
  :global(.replayer-wrapper) {
    position: relative;
  }
  :global(.replayer-mouse) {
    position: absolute;
    width: 20px;
    height: 20px;
    transition: 0.05s linear;
    background-size: contain;
    background-position: center center;
    background-repeat: no-repeat;
    background-image: url('data:image/svg+xml;base64,PHN2ZyBoZWlnaHQ9JzMwMHB4JyB3aWR0aD0nMzAwcHgnICBmaWxsPSIjMDAwMDAwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGRhdGEtbmFtZT0iTGF5ZXIgMSIgdmlld0JveD0iMCAwIDUwIDUwIiB4PSIwcHgiIHk9IjBweCI+PHRpdGxlPkRlc2lnbl90bnA8L3RpdGxlPjxwYXRoIGQ9Ik00OC43MSw0Mi45MUwzNC4wOCwyOC4yOSw0NC4zMywxOEExLDEsMCwwLDAsNDQsMTYuMzlMMi4zNSwxLjA2QTEsMSwwLDAsMCwxLjA2LDIuMzVMMTYuMzksNDRhMSwxLDAsMCwwLDEuNjUuMzZMMjguMjksMzQuMDgsNDIuOTEsNDguNzFhMSwxLDAsMCwwLDEuNDEsMGw0LjM4LTQuMzhBMSwxLDAsMCwwLDQ4LjcxLDQyLjkxWm0tNS4wOSwzLjY3TDI5LDMyYTEsMSwwLDAsMC0xLjQxLDBsLTkuODUsOS44NUwzLjY5LDMuNjlsMzguMTIsMTRMMzIsMjcuNThBMSwxLDAsMCwwLDMyLDI5TDQ2LjU5LDQzLjYyWiI+PC9wYXRoPjwvc3ZnPg==');
  }
  .syncit-mouse-s1 :global(.replayer-mouse) {
    width: 10px;
    height: 10px;
  }
  .syncit-mouse-s2 :global(.replayer-mouse) {
    width: 20px;
    height: 20px;
  }
  .syncit-mouse-s3 :global(.replayer-mouse) {
    width: 30px;
    height: 30px;
  }
  :global(.replayer-mouse::after) {
    content: '';
    display: inline-block;
    width: 20px;
    height: 20px;
    border-radius: 10px;
    background: #e75a3a;
    transform: translate(-10px, -10px);
    opacity: 0.3;
  }
  :global(.replayer-mouse.active::after) {
    animation: click 0.2s ease-in-out 1;
  }

  @keyframes click {
    0% {
      opacity: 0.3;
      width: 20px;
      height: 20px;
      border-radius: 10px;
      transform: translate(-10px, -10px);
    }
    50% {
      opacity: 0.5;
      width: 10px;
      height: 10px;
      border-radius: 5px;
      transform: translate(-5px, -5px);
    }
  }

  .syncit-app {
    width: 100%;
    height: 100%;
  }

  button {
    outline: none;
  }
  .syncit-btn:hover {
    background: #3399ff;
  }

  .syncit-btn,
  .syncit-btn:active {
    cursor: pointer;
    background: #0078f0;
    border: 1px solid rgba(62, 70, 82, 0.18);
    box-shadow: 0px 1px 2px rgba(184, 192, 204, 0.6);
    color: #fff;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 14px;
    line-height: 22px;
    margin-bottom: 0.5em;
  }

  .syncit-btn.ordinary {
    background: #fff;
    color: #3e4652;
    border: 1px solid rgba(129, 138, 153, 0.6);
  }
  .syncit-btn.ordinary:hover {
    background: #f5f7fa;
  }
  .syncit-btn.ordinary:active {
    background: #dfe4eb;
  }

  .syncit-btn:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }

  .syncit-center {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }

  .syncit-load-text {
    font-size: 14px;
    line-height: 22px;
    color: #3e4652;
  }

  .syncit-load-text h3 {
    margin: 8px 0;
  }

  .syncit-error {
    color: #e75a3a;
  }

  .syncit-hint {
    background: rgba(245, 247, 250);
    border-radius: 4px;
    padding: 8px;
    min-width: 150px;
  }

  .syncit-toggle,
  .syncit-toggle:active {
    width: 40px;
    height: 40px;
    line-height: 40px;
    border-radius: 20px;
    padding: 0;
    align-self: flex-end;
  }

  .syncit-app-control {
    position: absolute;
    right: 1em;
    bottom: 1em;
    display: flex;
    flex-direction: column;
  }

  .syncit-metric {
    display: flex;
    align-items: center;
    margin-bottom: 8px;
  }

  .syncit-chart-title {
    font-size: 13px;
    line-height: 20px;
    color: #3e4652;
    width: 100px;
    margin-right: 8px;
  }

  .syncit-metric-line {
    flex: 1;
  }

  .align-center {
    text-align: center;
  }
</style>
