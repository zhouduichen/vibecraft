import type { TemplateManifest } from './types';
import { LEDGER_MANIFEST } from './ledger';

const MANIFEST_REGISTRY: Record<string, TemplateManifest> = {
  ledger: LEDGER_MANIFEST,
};

export function getManifest(templateId: string): TemplateManifest | null {
  return MANIFEST_REGISTRY[templateId] ?? null;
}

export function getAllManifests(): TemplateManifest[] {
  return Object.values(MANIFEST_REGISTRY);
}

export type { TemplateManifest, EditableSlot, DataField, Suggestion, DesignBound } from './types';
