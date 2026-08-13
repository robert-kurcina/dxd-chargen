'use client';

import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { StaticData } from '@/data';
import type { CharacterDraft } from '@/lib/character-draft';
import { projectCharacterSheet, type CharacterSheetData } from '@/lib/character-sheet-projection';

function sheetPayload(draft: CharacterDraft, sheet: CharacterSheetData) {
  const value = (group: Array<{ name: string; value: number | string }>, name: string) => group.find((item) => item.name === name)?.value ?? 0;
  const allInventory = [...draft.utilities.weapons, ...draft.utilities.armor, ...draft.utilities.equipment];
  // Legacy sheets have a curated back-page item table distinct from the broader
  // equipment list in History & Notes. Preserve that exact rendition when present.
  const inventory = (allInventory.some((item) => item.sheetProperties) ? allInventory.filter((item) => item.sheetProperties) : allInventory)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
  const equipmentProperties = inventory.map((item) => item.sheetProperties || [item.quantity > 1 ? `Qty ${item.quantity}` : '', `${item.unitPriceGp} gp`, `${item.unitWeight}#`].filter(Boolean).join('; '));
  return {
    Slug: (sheet.name || 'character').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    Portrait: draft.utilities.portraitDataUrl,
    Name: [sheet.name, sheet.properName ? `[${sheet.properName}]` : ''].filter(Boolean).join('\n'),
    Details: [sheet.details.environ, sheet.details.species, sheet.details.bio, sheet.details.physique].filter(Boolean).join('\n'),
    PML: sheet.pml,
    ...Object.fromEntries(sheet.attributes.flatMap((attribute) => [[attribute.name, attribute.value], [`${attribute.name}DM`, attribute.modifier]])),
    Profession: sheet.background.profession.join('\n'),
    Settlement: sheet.background.settlement.join('\n'),
    Religion: sheet.background.religion.join('\n'),
    Personality: sheet.background.personality,
    Features: sheet.background.notableFeatures.join(', '),
    HistoryNotes: [
      `Equipment; ${sheet.history.equipment}`,
      `Weapons; ${sheet.history.weapons}`,
      `Armor; ${sheet.history.armor}`,
      `Magic Items; ${sheet.history.magicItems}`,
      `Spells; ${sheet.history.spells ?? ''}`,
      `Skills; ${sheet.history.skills}`,
      `Languages; ${sheet.history.languages}`,
    ].join('\n'),
    WeaponsArmorEquipment: inventory.map((item) => item.name).join('\n\n'),
    WeaponsArmorEquipmentProperties: equipmentProperties.join('\n\n'),
    BackNotes: [draft.utilities.notes, draft.utilities.backstory].filter(Boolean).join('\n\n'),
    BackName: sheet.name,
    Hitpoints: value(sheet.performance, 'Hitpoints'),
    Bodypoints: value(sheet.performance, 'Bodypoints'),
    Recovery: value(sheet.performance, 'Recovery Rate'),
    Endurance: value(sheet.performance, 'Endurance'),
    Resilience: value(sheet.performance, 'Resilience'),
    Resistance: value(sheet.performance, 'Resistance'),
    WealthRank: value(sheet.miscellaneous, 'Wealth Rank'),
    SocialRank: value(sheet.miscellaneous, 'Social Rank'),
    ProfessionRank: value(sheet.miscellaneous, 'Trade Rank'),
    FavorDice: value(sheet.miscellaneous, 'Favor Dice'),
    Cellburn: value(sheet.miscellaneous, 'Cellburn Limit'),
    Manapool: value(sheet.miscellaneous, 'Manapool'),
    HastyActions: value(sheet.combat, 'Actions'),
    MeleeAttack: value(sheet.combat, 'Melee Attack'),
    MeleeDefend: value(sheet.combat, 'Melee Defend'),
    RangeAttack: value(sheet.combat, 'Range Attack'),
    RangeDefend: value(sheet.combat, 'Range Defend'),
    MaxAdvantage: value(sheet.combat, 'Max Advantage'),
    Profile: draft.properties.profile ?? 0,
    Stature: draft.properties.stature ?? 0,
    Build: draft.properties.build ?? 0,
  };
}

export default function ExpandedCharacterSheet({ draft, data }: { draft: CharacterDraft; data: StaticData }) {
  const iframe = useRef<HTMLIFrameElement>(null);
  const sheet = useMemo(() => projectCharacterSheet(draft, data), [draft, data]);
  const payload = useMemo(() => sheetPayload(draft, sheet), [draft, sheet]);
  const send = useCallback(() => iframe.current?.contentWindow?.postMessage({ type: 'dxd-character-sheet', payload }, window.location.origin), [payload]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.source === iframe.current?.contentWindow && event.data?.type === 'dxd-character-sheet-ready') send();
    };
    window.addEventListener('message', receive);
    send();
    return () => window.removeEventListener('message', receive);
  }, [send]);
  return <iframe ref={iframe} title="Sarna Len character sheet" src="/character-creator/index.html?embed=1" onLoad={send} sandbox="allow-scripts allow-same-origin allow-downloads" className="h-[1500px] w-full rounded-lg border bg-white" />;
}
