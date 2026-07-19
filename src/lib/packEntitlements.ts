/**
 * Exam-prep pack access — the promo-immune gate for the paid product line.
 *
 * A paid pack unlocks when the user OWNS it (a one-time purchase recorded server-side
 * in `packEntitlements/{uid}`) OR holds an active paid plan (Pro/School, or the Exam
 * Season Pass, which grants plan `pro`). Ownership is permanent and survives a plan
 * lapse.
 *
 * Deliberately built on the PURE `isActive` predicate — never `uiPlan`/`uiIsPro`/
 * `useFeature` — so the app-wide `FREE_FOR_EVERYONE` promo cannot silently open a
 * paid pack. This mirrors how the chat surface gates on the pure `hasFeature`.
 */
import { isActive, type Entitlement } from './entitlements';
import { PACKS_GATED, type Pack } from './prepCatalog';
import { useAccount } from './account';

/**
 * Whether the user may use `pack`. Free packs (and everything when the gate is off)
 * are always open; a paid pack needs ownership or an active plan.
 */
export function hasPackAccess(
  pack: Pack,
  ent: Entitlement | null | undefined,
  ownedPackIds: readonly string[],
  now?: Date,
): boolean {
  if (!PACKS_GATED || pack.access === 'free') return true;
  return ownedPackIds.includes(pack.id) || isActive(ent, now);
}

/**
 * Whether a paid pack is unlocked specifically because the user BOUGHT it (as opposed
 * to it being included with an active plan). Drives the "Owned ✓" vs "Included in Pro"
 * badge on the storefront.
 */
export function ownsPack(pack: Pack, ownedPackIds: readonly string[]): boolean {
  return ownedPackIds.includes(pack.id);
}

/** Reactive access check for the signed-in user, reading the account store. */
export function usePackAccess(pack: Pack): boolean {
  const { entitlement, ownedPacks } = useAccount();
  return hasPackAccess(pack, entitlement, ownedPacks);
}
