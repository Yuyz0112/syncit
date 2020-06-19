const zhCN = {
  lng: 'zh-CN',
  data: {
    app: {
      connect: '建立连接',
      initializing: '初始化中',
      ready: '等待连接中',
      latency: '时延',
      bandwidth: '带宽',
      remoteControl: '远程控制',
      requestToControl: '申请控制',
      requested: '已申请',
      stopControl: '停止控制',
      aborted: '连接已被断开',
      reset: '重新准备',
    },
    embed: {
      initializing: '初始化中',
      cancel: '取消',
      selectBlockArea: '选择屏蔽区域',
      area: '区域',
      enableShare: '启用 Syncit 分享',
      ready: '已启用，等待连接中',
      mouseSize: '镜像鼠标尺寸',
      small: '小',
      medium: '中',
      large: '大',
      remoteControl: '远程控制：',
      disabled: '未启用',
      requesting: '申请中',
      enabled: '已启用',
      accept: '允许远程控制',
      abortControl: '终止远程控制',
      abort: '停止分享',
      copied: '已复制',
    },
  },
};

const enUS = {
  lng: 'en-US',
  data: {
    app: {
      connect: 'Connect',
      initializing: 'Initializing',
      ready: 'Connecting',
      latency: 'Latency',
      bandwidth: 'Bandwidth',
      remoteControl: 'Remote Control',
      requestToControl: 'Request Remote Control',
      requested: 'Remote Control Requested',
      stopControl: 'Stop Remote Control',
      aborted: 'Disconnected',
      reset: 'Re-enable Syncit',
    },
    embed: {
      initializing: 'Initializing',
      cancel: 'Cancel',
      selectBlockArea: 'Select Blocked Area',
      area: 'Area',
      enableShare: 'Enable Syncit',
      ready: 'Waiting To Connect',
      mouseSize: 'Mouse Size',
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      remoteControl: 'Remote Control:',
      disabled: 'Disabled',
      requesting: 'Requesting',
      enabled: 'Enabled',
      accept: 'Accept Remote Control',
      abortControl: 'Abort Remote Control',
      abort: 'Abort',
      copied: 'Copied',
    },
  },
};

let currentLanguage = zhCN;
const fallbackLanguage = enUS;

const findPartsForData = (data, parts) => {
  for (var i = 0; i < parts.length; ++i) {
    const part = parts[i];
    if (data[part] === undefined) {
      return undefined;
    }
    data = data[part];
  }
  if (typeof data !== 'string') {
    return undefined;
  }
  return data;
};

export const t = (path, replacement) => {
  const parts = path.split('.');
  let translation =
    findPartsForData(currentLanguage.data, parts) ||
    findPartsForData(fallbackLanguage.data, parts);
  if (translation === undefined) {
    throw new Error(`Can't find translation for ${path}`);
  }

  if (replacement) {
    for (var key in replacement) {
      translation = translation.replace(`{{${key}}}`, replacement[key]);
    }
  }
  return translation;
};
