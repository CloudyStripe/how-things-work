import type { ContentSources } from '@/engine/content/schema';
import { glossary } from './glossary/terms';
import { moduleMap } from './map';
import { emFundamentals } from './modules/em-fundamentals/module';

/** All content, as the engine loads it. */
export const content: ContentSources = {
  moduleMap,
  glossary,
  modules: [emFundamentals],
};
