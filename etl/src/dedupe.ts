// Conservative dedupe (US3, etl-pipeline.md Stage 4).
// Pure function: same input -> same decisions (Dd5, no randomness).
//
// Rules:
//  Dd1 merge ONLY on name + address/phone evidence: same normalized name AND
//      (same phone_normalized OR same normalized address key).
//  Dd2 name-only clusters are NEVER auto-merged: they are held for human
//      review (decision 'held_ambiguous') and each license keeps its own
//      business row (dedupe_status 'ambiguous_held').
//  Dd3 every cluster of >= 2 candidate licenses gets a dedupe_decisions row
//      with a rationale naming the evidence matched or missing. A cluster
//      whose members carry CONFLICTING evidence (different non-null phones
//      or different non-null addresses) is 'rejected_no_merge' — the
//      evidence says "different businesses", not just "unknown".
//  Dd6 cross-run matching by license identity happens in the loader (SQL);
//      this module decides the business for NEW licenses only.
//
// Business grouping key: business_name_normalized, falling back to the
// normalized holder name when the business name is NULL (the holder-name
// fallback for businesses.name is a LOAD-time rule; the fallback is
// recorded in audit_logs by the loader, L11).

import {
  normalizeAddressKey,
  normalizeName,
  type NormalizedRecord,
} from "./normalize.ts";

export interface BusinessAssignment {
  businessKey: string;
  dedupeStatus: "single" | "merged" | "ambiguous_held";
  // True when businesses.name must fall back to the holder name at load time.
  nameFallback: boolean;
}

export interface DedupeDecision {
  businessKey: string | null; // set only when decision === 'merged'
  clusterKey: string;
  decision: "merged" | "held_ambiguous" | "rejected_no_merge";
  licenseIndexes: number[];
  rationale: string;
}

export interface DedupeResult {
  assignments: BusinessAssignment[];
  decisions: DedupeDecision[];
}

interface BusinessDraft {
  addressKey: string | null;
  businessKey: string;
  dedupeStatus: "single" | "merged" | "ambiguous_held";
  displayName: string;
  firstIndex: number;
  nameFallback: boolean;
  normalizedName: string;
  phone: string | null;
  phoneNormalized: string | null;
}

function businessFields(
  record: NormalizedRecord,
): {
  addressKey: string | null;
  displayName: string;
  nameFallback: boolean;
  normalizedName: string;
} {
  const normalizedName =
    record.business_name_normalized ??
    normalizeName(record.holder?.full_name ?? null);
  const displayName =
    record.business_name ?? record.holder?.full_name ?? "UNKNOWN BUSINESS";
  return {
    addressKey: normalizeAddressKey(record.address),
    displayName,
    nameFallback: record.business_name === null,
    normalizedName: normalizedName ?? "unknown business",
  };
}

// Two records share merge evidence when they have the same non-null phone
// or the same non-null normalized address key.
function sharesEvidence(
  a: { addressKey: string | null; phoneNormalized: string | null },
  b: { addressKey: string | null; phoneNormalized: string | null },
): string | null {
  if (
    a.phoneNormalized !== null &&
    a.phoneNormalized === b.phoneNormalized
  ) {
    return `same phone ${a.phoneNormalized}`;
  }
  if (a.addressKey !== null && a.addressKey === b.addressKey) {
    return "same address (line1 + city + ZIP)";
  }
  return null;
}

// Two records carry conflicting evidence when both have a phone and the
// phones differ, or both have an address key and the keys differ.
function conflicts(
  a: { addressKey: string | null; phoneNormalized: string | null },
  b: { addressKey: string | null; phoneNormalized: string | null },
): string | null {
  if (
    a.phoneNormalized !== null &&
    b.phoneNormalized !== null &&
    a.phoneNormalized !== b.phoneNormalized
  ) {
    return "different phones";
  }
  if (
    a.addressKey !== null &&
    b.addressKey !== null &&
    a.addressKey !== b.addressKey
  ) {
    return "different addresses";
  }
  return null;
}

export function dedupe(records: NormalizedRecord[]): DedupeResult {
  const assignments: BusinessAssignment[] = records.map(() => ({
    businessKey: "",
    dedupeStatus: "single" as const,
    nameFallback: false,
  }));
  const decisions: DedupeDecision[] = [];
  // Group record indexes by normalized name.
  const clusters = new Map<string, number[]>();
  records.forEach((record, index) => {
    const key = businessFields(record).normalizedName;
    const list = clusters.get(key) ?? [];
    list.push(index);
    clusters.set(key, list);
  });
  let businessCounter = 0;
  const nextBusinessKey = (): string => {
    businessCounter += 1;
    return `bk-${String(businessCounter).padStart(6, "0")}`;
  };
  // Build one BusinessDraft per record first (display fields come from the
  // first record of each merged group, enriched with any non-null contact
  // fields found in the group).
  const drafts = new Map<number, BusinessDraft>();
  const makeDraft = (index: number): BusinessDraft => {
    const fields = businessFields(records[index]);
    return {
      addressKey: fields.addressKey,
      businessKey: nextBusinessKey(),
      dedupeStatus: "single",
      displayName: fields.displayName,
      firstIndex: index,
      nameFallback: fields.nameFallback,
      normalizedName: fields.normalizedName,
      phone: records[index].phone,
      phoneNormalized: records[index].phone_normalized,
    };
  };
  for (const [clusterKey, indexes] of clusters) {
    if (indexes.length === 1) {
      const draft = makeDraft(indexes[0]);
      drafts.set(indexes[0], draft);
      continue;
    }
    // Cluster of >= 2: partition into merge-groups by shared evidence
    // (union-find over "shares evidence").
    const parent = new Map<number, number>();
    const find = (x: number): number => {
      let p = parent.get(x) ?? x;
      while ((parent.get(p) ?? p) !== p) p = parent.get(p) ?? p;
      return p;
    };
    const union = (a: number, b: number): void => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    };
    for (const idx of indexes) parent.set(idx, idx);
    for (let i = 0; i < indexes.length; i++) {
      for (let j = i + 1; j < indexes.length; j++) {
        const a = records[indexes[i]];
        const b = records[indexes[j]];
        if (
          sharesEvidence(
            { addressKey: normalizeAddressKey(a.address), phoneNormalized: a.phone_normalized },
            { addressKey: normalizeAddressKey(b.address), phoneNormalized: b.phone_normalized },
          ) !== null
        ) {
          union(indexes[i], indexes[j]);
        }
      }
    }
    const groups = new Map<number, number[]>();
    for (const idx of indexes) {
      const root = find(idx);
      const list = groups.get(root) ?? [];
      list.push(idx);
      groups.set(root, list);
    }
    if (groups.size === 1) {
      // Whole cluster merges into one business.
      const group = indexes;
      const evidence = sharesEvidence(
        { addressKey: normalizeAddressKey(records[group[0]].address), phoneNormalized: records[group[0]].phone_normalized },
        { addressKey: normalizeAddressKey(records[group[1]].address), phoneNormalized: records[group[1]].phone_normalized },
      ) ?? "shared name + evidence";
      const draft = makeDraft(group[0]);
      draft.dedupeStatus = "merged";
      // Enrich contact fields from any group member that has them.
      for (const idx of group) {
        const r = records[idx];
        if (draft.phone === null && r.phone !== null) {
          draft.phone = r.phone;
          draft.phoneNormalized = r.phone_normalized;
        }
        if (draft.addressKey === null) {
          draft.addressKey = normalizeAddressKey(r.address);
        }
      }
      for (const idx of group) drafts.set(idx, draft);
      decisions.push({
        businessKey: draft.businessKey,
        clusterKey,
        decision: "merged",
        licenseIndexes: [...group].sort((a, b) => a - b),
        rationale: `merged ${group.length} licenses on ${evidence}`,
      });
    } else {
      // Cluster splits into >= 2 groups: merge what the evidence supports
      // (each group of >= 2 sharing phone/address becomes ONE business,
      // with its own 'merged' decision), and hold the rest — every
      // remaining member keeps its own business row with status
      // 'ambiguous_held' — with one cluster-level decision explaining the
      // split. Nothing is auto-merged on name alone (Dd2).
      const mergedGroups = [...groups.values()].filter((g) => g.length >= 2);
      for (const group of mergedGroups) {
        const evidence =
          sharesEvidence(
            { addressKey: normalizeAddressKey(records[group[0]].address), phoneNormalized: records[group[0]].phone_normalized },
            { addressKey: normalizeAddressKey(records[group[1]].address), phoneNormalized: records[group[1]].phone_normalized },
          ) ?? "shared name + evidence";
        const draft = makeDraft(group[0]);
        draft.dedupeStatus = "merged";
        for (const idx of group) {
          const r = records[idx];
          if (draft.phone === null && r.phone !== null) {
            draft.phone = r.phone;
            draft.phoneNormalized = r.phone_normalized;
          }
          if (draft.addressKey === null) {
            draft.addressKey = normalizeAddressKey(r.address);
          }
        }
        for (const idx of group) drafts.set(idx, draft);
        decisions.push({
          businessKey: draft.businessKey,
          clusterKey,
          decision: "merged",
          licenseIndexes: [...group].sort((a, b) => a - b),
          rationale: `merged ${group.length} licenses on ${evidence} (cluster splits into ${groups.size} groups)`,
        });
      }
      // Decide held_ambiguous vs rejected_no_merge from the evidence.
      let conflictFound: string | null = null;
      for (let i = 0; i < indexes.length && conflictFound === null; i++) {
        for (let j = i + 1; j < indexes.length; j++) {
          const a = records[indexes[i]];
          const b = records[indexes[j]];
          const cf = conflicts(
            { addressKey: normalizeAddressKey(a.address), phoneNormalized: a.phone_normalized },
            { addressKey: normalizeAddressKey(b.address), phoneNormalized: b.phone_normalized },
          );
          if (cf !== null) conflictFound = cf;
        }
      }
      const decision: "held_ambiguous" | "rejected_no_merge" =
        conflictFound !== null ? "rejected_no_merge" : "held_ambiguous";
      const singletonCount = [...groups.values()].filter((g) => g.length === 1).length;
      const rationale =
        decision === "rejected_no_merge"
          ? `not merged: same name but ${conflictFound} — evidence says different businesses (${groups.size} groups, ${mergedGroups.length} merged on evidence, ${singletonCount} held)`
          : `not merged: same name only for ${singletonCount} license(s) — no shared phone or address evidence — held for human review (cluster splits into ${groups.size} groups, ${mergedGroups.length} merged on evidence)`;
      for (const group of groups.values()) {
        if (group.length >= 2) continue; // already merged above
        for (const idx of group) {
          const draft = makeDraft(idx);
          draft.dedupeStatus = "ambiguous_held";
          drafts.set(idx, draft);
        }
      }
      decisions.push({
        businessKey: null,
        clusterKey,
        decision,
        licenseIndexes: [...indexes].sort((a, b) => a - b),
        rationale,
      });
    }
  }
  records.forEach((record, index) => {
    const draft = drafts.get(index);
    if (!draft) throw new Error(`dedupe: no draft for record ${index}`);
    const fields = businessFields(record);
    assignments[index] = {
      businessKey: draft.businessKey,
      dedupeStatus: draft.dedupeStatus,
      nameFallback: fields.nameFallback,
    };
  });
  return { assignments, decisions };
}

// The business rows the loader must create/update for this run, derived
// from the dedupe result. One row per distinct businessKey.
export interface BusinessRow {
  address: NormalizedRecord["address"];
  businessKey: string;
  dedupeStatus: "single" | "merged" | "ambiguous_held";
  displayName: string;
  nameFallback: boolean;
  normalizedName: string;
  phone: string | null;
  phoneNormalized: string | null;
}

export function businessRows(
  records: NormalizedRecord[],
  result: DedupeResult,
): BusinessRow[] {
  const byKey = new Map<string, BusinessRow>();
  records.forEach((record, index) => {
    const assignment = result.assignments[index];
    const existing = byKey.get(assignment.businessKey);
    if (existing) {
      // Enrich: fill contact fields the first member lacked.
      if (existing.phone === null && record.phone !== null) {
        existing.phone = record.phone;
        existing.phoneNormalized = record.phone_normalized;
      }
      if (existing.address === null || existing.address.line1 === null) {
        if (record.address !== null && record.address.line1 !== null) {
          existing.address = record.address;
        }
      }
      return;
    }
    const fields = businessFields(record);
    byKey.set(assignment.businessKey, {
      address: record.address,
      businessKey: assignment.businessKey,
      dedupeStatus: assignment.dedupeStatus,
      displayName: fields.displayName,
      nameFallback: fields.nameFallback,
      normalizedName: fields.normalizedName,
      phone: record.phone,
      phoneNormalized: record.phone_normalized,
    });
  });
  return [...byKey.values()].sort((a, b) =>
    a.businessKey < b.businessKey ? -1 : 1,
  );
}
