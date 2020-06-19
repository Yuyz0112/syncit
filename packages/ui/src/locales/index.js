import { locale as zhCN } from './zhCN';
import { locale as enUS } from './enUS';

const fallbackLanguage = enUS;
let currentLanguage = fallbackLanguage;

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

export const setCurrentLanguage = lng => {
  switch (lng) {
    case 'zh-CN':
      currentLanguage = zhCN;
      break;
    case 'en-US':
      currentLanguage = enUS;
      break;
    default:
      break;
  }
};
