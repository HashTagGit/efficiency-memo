import React, { useEffect, useRef, useState } from "react";
import { Button, PageHeader } from "@memo/ui";
import { PetSprite, type PetPose } from "../../components/pet-sprite";
import {
  PetPackError,
  readPetPack,
  type CodexPetSingleManifest,
  type ImportedPetBundle,
  type ImportedPetCollection,
} from "../../lib/codex-pet";
import {
  BUNDLED_COLLECTIONS,
  BUNDLED_PETS,
  DEFAULT_PET,
  loadDesktopPetSelection,
  loadDesktopPetSprite,
  loadImportedDesktopPets,
  normalizeDesktopPetSelection,
  saveDesktopPetSelection,
  saveImportedDesktopPet,
  updateDesktopPetWindow,
  type DesktopPetCollection,
  type DesktopPetSelection,
  type DesktopPetSprite,
  type DesktopPetVariant,
  type ImportedDesktopCollection,
  type ImportedDesktopEntry,
  type ImportedDesktopPet,
} from "../../lib/desktop-pet-catalog";
import {
  DEFAULT_DESKTOP_PET_BEHAVIOR,
  DESKTOP_PET_BUBBLE_STYLES,
  desktopPetEnabled,
  loadDesktopPetBehavior,
  saveDesktopPetBehavior,
  type DesktopPetBehaviorPreferences,
  saveDesktopPetEnabled,
  setDesktopPetEnabled,
  showDesktopPetReminder,
  supportsDesktopPet,
} from "../../lib/desktop-reminders";
import { useI18n } from "../../lib/i18n";

const previewPoses = ["idle", "greeting", "working", "walk-left", "walk-right"] as const satisfies readonly PetPose[];

function isImportedCollection(bundle: ImportedPetBundle): bundle is ImportedPetCollection {
  return "variants" in bundle;
}

function isImportedDesktopCollection(entry: ImportedDesktopEntry): entry is ImportedDesktopCollection {
  return entry.kind === "collection";
}

function isImportedDesktopPet(entry: ImportedDesktopEntry): entry is ImportedDesktopPet {
  return entry.kind === "pet";
}

function PetActionPreview({ petId, variantId, name }: DesktopPetSelection & { name: string }) {
  const { t } = useI18n();
  const [pet, setPet] = useState<DesktopPetSprite | null>(null);
  const [failed, setFailed] = useState(false);
  const [pose, setPose] = useState<(typeof previewPoses)[number]>("idle");

  useEffect(() => {
    let active = true;
    void loadDesktopPetSprite(petId, variantId).then((next) => {
      if (!active) return;
      if (next.manifest.id === petId) setPet(next);
      else setFailed(true);
    }).catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [petId, variantId]);

  return (
    <fieldset className="mt-4 rounded-md border border-border bg-surface p-3">
      <legend className="px-1 text-sm font-medium text-foreground">{t("desktopPet.current")}</legend>
      <div className="flex flex-wrap items-center gap-3">
        <div className="grid h-20 w-20 shrink-0 place-items-center rounded-md bg-background">
          {pet ? <PetSprite key={pose} pet={pet} animated pose={pose} repeat /> : null}
        </div>
        <div className="min-w-0 flex-1">
          <p className="mb-2 break-words text-sm font-semibold text-foreground" aria-live="polite">{name}</p>
          {pet ? (
            <div className="flex flex-wrap gap-2" role="group" aria-label={t("desktopPet.motionPreview")}>
              {previewPoses.map((action) => (
                <Button key={action} size="sm" variant={pose === action ? "primary" : "ghost"}
                  aria-pressed={pose === action} onClick={() => setPose(action)}>
                  {t(`desktopPet.pose.${action}`)}
                </Button>
              ))}
            </div>
          ) : <p role="status" className="text-sm text-muted">{t(failed ? "desktopPet.motionPreviewError" : "app.loading")}</p>}
        </div>
      </div>
    </fieldset>
  );
}

export default function PetAssistantPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("nav.petAssistant")} subtitle={t("nav.petAssistantDescription")} />
      {supportsDesktopPet() ? <PetSettings /> : <p className="text-sm text-muted">{t("desktopPet.platformUnsupported")}</p>}
    </div>
  );
}

interface SingleOption {
  id: string;
  label: string;
  description?: string;
  pet?: DesktopPetSprite;
  thumbnail?: string;
}

interface CollectionOption {
  id: string;
  label: string;
  description: string;
  variants: SingleOption[];
}

const optionGrid = "grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3";

function PetOption({ option, checked, onSelect }: {
  option: SingleOption;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-md border py-1.5 pe-2 text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus-ring ${checked ? "border-accent bg-active font-semibold" : "border-control-border bg-surface hover:bg-surface-strong"}`}
    >
      <input className="sr-only" type="radio" name="desktop-pet-selection" checked={checked} onChange={onSelect} />
      <span className="grid h-11 w-11 shrink-0 place-items-center" aria-hidden="true">
        {option.pet ? <PetSprite pet={option.pet} /> : <img className="h-full [image-rendering:pixelated]" src={option.thumbnail} alt="" />}
      </span>
      <span className="min-w-0 break-words text-foreground" title={option.description || option.label}>{option.label}</span>
    </label>
  );
}

function petLabel(t: (key: string) => string, manifest: Pick<CodexPetSingleManifest, "id" | "displayName">): string {
  const key = `desktopPet.pet.${manifest.id}`;
  const label = t(key);
  return label === key ? manifest.displayName : label;
}

function variantLabel(t: (key: string) => string, petId: string, variant: Pick<DesktopPetVariant, "id" | "displayName">): string {
  const key = `desktopPet.pet.${petId}.variant.${variant.id}`;
  const label = t(key);
  return label === key ? variant.displayName : label;
}

function collectionOptions(t: (key: string) => string, imported: ImportedDesktopEntry[]) {
  const bundled: CollectionOption[] = BUNDLED_COLLECTIONS.map((collection: DesktopPetCollection) => ({
    id: collection.manifest.id,
    label: petLabel(t, collection.manifest),
    description: t(`desktopPet.pet.${collection.manifest.id}.description`),
    variants: collection.variants.map((variant) => ({
      id: variant.id,
      label: variantLabel(t, collection.manifest.id, variant),
      description: t(`desktopPet.pet.${collection.manifest.id}.variant.${variant.id}.description`),
      pet: { manifest: variant.manifest, atlas: variant.atlas, sleepingFrame: variant.sleepingFrame },
    })),
  }));
  const downloaded: CollectionOption[] = imported.filter(isImportedDesktopCollection).map((collection) => ({
    id: collection.id,
    label: collection.displayName,
    description: collection.description,
    variants: collection.variants.map((variant) => ({
      id: variant.id,
      label: variant.displayName,
      description: variant.description,
      thumbnail: variant.thumbnail,
    })),
  }));
  return { bundled, downloaded };
}

function PetSettings() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [behavior, setBehavior] = useState<DesktopPetBehaviorPreferences>(DEFAULT_DESKTOP_PET_BEHAVIOR);
  const [selected, setSelected] = useState<DesktopPetSelection>({ petId: DEFAULT_PET.manifest.id, variantId: null });
  const [imported, setImported] = useState<ImportedDesktopEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const fileInput = useRef<HTMLInputElement>(null);
  const library = useRef<HTMLFieldSetElement>(null);
  const pendingOptionFocus = useRef<"selection" | "import" | null>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([desktopPetEnabled(), loadDesktopPetSelection(), loadImportedDesktopPets(), loadDesktopPetBehavior()]).then(([value, selection, packs, preferences]) => {
      if (!active) return;
      setEnabled(value);
      const normalized = normalizeDesktopPetSelection(selection, packs);
      setSelected(normalized);
      if (normalized.variantId) setExpanded(new Set([normalized.petId]));
      setImported(packs);
      setBehavior(preferences);
    }).catch(() => {
      if (active) setErrorKey("desktopPet.settingsError");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (busy || !pendingOptionFocus.current) return;
    const shouldReveal = pendingOptionFocus.current === "import";
    pendingOptionFocus.current = null;
    const option = library.current?.querySelector<HTMLInputElement>("input:checked");
    option?.focus({ preventScroll: true });
    if (shouldReveal) option?.labels?.[0]?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [busy]);

  async function run(action: () => Promise<unknown>) {
    setErrorKey(null);
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setErrorKey(error instanceof PetPackError ? `desktopPet.importError.${error.reason}` : "desktopPet.settingsError");
    } finally {
      setBusy(false);
    }
  }

  async function select(petId: string, variantId: string | null) {
    await saveDesktopPetSelection(petId, variantId);
    setSelected({ petId, variantId });
  }

  function importFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;
    void run(async () => {
      const pack = await readPetPack(files);
      await saveImportedDesktopPet(pack);
      setImported(await loadImportedDesktopPets());
      if (isImportedCollection(pack)) await select(pack.manifest.id, pack.manifest.defaultVariant);
      else await select(pack.manifest.id, null);
      setExpanded((previous) => new Set([...previous, pack.manifest.id]));
      pendingOptionFocus.current = "import";
    });
  }

  const collections = collectionOptions(t, imported);
  const singles = BUNDLED_PETS.map((pet) => ({ id: pet.manifest.id, label: petLabel(t, pet.manifest), pet }));
  const importedSingles = imported.filter(isImportedDesktopPet).map((entry) => ({
    id: entry.id, label: entry.manifest.displayName, description: entry.manifest.description, thumbnail: entry.thumbnail,
  }));
  const activeCollection = [...collections.bundled, ...collections.downloaded].find((entry) => entry.id === selected.petId);
  const activeForm = activeCollection?.variants.find((entry) => entry.id === selected.variantId);
  const currentName = activeCollection && activeForm
    ? t("desktopPet.currentForm", { collection: activeCollection.label, form: activeForm.label })
    : [...singles, ...importedSingles].find((entry) => entry.id === selected.petId)?.label ?? "";

  function choose(petId: string, variantId: string | null) {
    pendingOptionFocus.current = "selection";
    void run(() => select(petId, variantId));
  }

  function renderSingle(option: SingleOption) {
    return <PetOption key={option.id} option={option} checked={selected.petId === option.id && selected.variantId === null}
      onSelect={() => choose(option.id, null)} />;
  }

  function renderCollection(collection: CollectionOption) {
    const open = expanded.has(collection.id);
    const contentId = `desktop-pet-collection-${collection.id}`;
    return (
      <section key={collection.id} className="rounded-md border border-border">
        <h3>
          <button type="button" className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-start text-sm font-medium text-foreground hover:bg-surface-strong focus-visible:outline-2 focus-visible:outline-focus-ring"
            aria-expanded={open} aria-controls={contentId} onClick={() => setExpanded((previous) => {
              const next = new Set(previous);
              if (next.has(collection.id)) next.delete(collection.id);
              else next.add(collection.id);
              return next;
            })}>
            <span className="min-w-0 break-words">{collection.label}</span>
            <svg aria-hidden="true" viewBox="0 0 16 16" className={`size-4 shrink-0 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.5"><path d="m4 6 4 4 4-4" /></svg>
          </button>
        </h3>
        <div id={contentId} hidden={!open} className="px-3 pb-3">
          {collection.description && <p className="mb-2 text-xs text-muted">{collection.description}</p>}
          <div className={optionGrid}>
            {collection.variants.map((option) => (
              <PetOption key={option.id} option={option} checked={selected.petId === collection.id && selected.variantId === option.id}
                onSelect={() => choose(collection.id, option.id)} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="mt-4">
      {enabled !== null && <PetActionPreview key={`${selected.petId}:${selected.variantId ?? ""}`} {...selected} name={currentName} />}
      <label className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-foreground">
        <input
          type="checkbox"
          className="size-4 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          checked={enabled === true}
          disabled={enabled === null || busy}
          aria-describedby="desktop-pet-setting-hint"
          onChange={(event) => {
            const next = event.currentTarget.checked;
            void run(async () => {
              await saveDesktopPetEnabled(next);
              setEnabled(next);
              if (next) await updateDesktopPetWindow(selected.petId, selected.variantId);
              await setDesktopPetEnabled(next);
            });
          }}
        />
        {t("desktopPet.setting")}
      </label>
      <p id="desktop-pet-setting-hint" className="mt-1 text-sm text-muted">{t("desktopPet.settingHint")}</p>

      <fieldset className="mt-5 space-y-2" disabled={busy || enabled === null}>
        <legend className="text-sm font-medium text-foreground">{t("desktopPet.interaction")}</legend>
        {(["lookEnabled", "walkEnabled", "miniEnabled"] as const).map((key) => (
          <div key={key}>
            <label className="inline-flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                className="size-4 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
                checked={behavior[key]}
                aria-describedby={`desktop-pet-${key}-hint`}
                onChange={(event) => {
                  const next = { ...behavior, [key]: event.currentTarget.checked };
                  void run(async () => { await saveDesktopPetBehavior(next); setBehavior(next); });
                }}
              />
              {t(`desktopPet.${key}`)}
            </label>
            <p className="mt-0.5 text-xs text-muted" id={`desktop-pet-${key}-hint`}>{t(`desktopPet.${key}Hint`)}</p>
          </div>
        ))}
      </fieldset>

      <label className="mt-5 grid w-fit gap-1.5 text-sm font-medium text-foreground">
        {t("desktopPet.bubbleStyle")}
        <select
          className="rounded-md border border-control-border bg-surface px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-focus-ring"
          value={behavior.bubbleStyle}
          disabled={busy || enabled === null}
          onChange={(event) => {
            const bubbleStyle = DESKTOP_PET_BUBBLE_STYLES.find((style) => style === event.currentTarget.value);
            if (!bubbleStyle) return;
            const next = { ...behavior, bubbleStyle };
            void run(async () => { await saveDesktopPetBehavior(next); setBehavior(next); });
          }}
        >
          {DESKTOP_PET_BUBBLE_STYLES.map((style) => (
            <option key={style} value={style}>{t(`desktopPet.bubbleStyle.${style}`)}</option>
          ))}
        </select>
      </label>

      <fieldset ref={library} className="mt-5 space-y-3" disabled={busy || enabled === null}>
        <legend className="text-sm font-semibold text-foreground">{t("desktopPet.library")}</legend>
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-foreground">{t("desktopPet.builtIn")}</h2>
          <div className={optionGrid}>{singles.map(renderSingle)}</div>
          {collections.bundled.map(renderCollection)}
        </section>
        {imported.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-medium text-foreground">{t("desktopPet.imported")}</h2>
            {importedSingles.length > 0 && <div className={optionGrid}>{importedSingles.map(renderSingle)}</div>}
            {collections.downloaded.map(renderCollection)}
          </section>
        )}
      </fieldset>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input type="file" ref={fileInput} hidden multiple accept=".zip,.json,.png,.webp" onChange={importFiles} />
        <Button variant="secondary" size="sm" disabled={busy || enabled === null} aria-describedby="desktop-pet-import-hint" onClick={() => fileInput.current?.click()}>
          {t("desktopPet.import")}
        </Button>
        <Button variant="ghost" size="sm" disabled={busy || enabled !== true} onClick={() => void run(() => setDesktopPetEnabled(true, true))}>
          {t("desktopPet.recoverWindow")}
        </Button>
        {(["preview", "preview-break"] as const).map((kind) => (
          <Button key={kind} variant="ghost" size="sm" disabled={busy || enabled !== true} onClick={() => void run(() => showDesktopPetReminder({
            kind, title: t("desktopPet.previewTitle"), body: t("desktopPet.previewBody"),
          }))}>
            {t(kind === "preview" ? "desktopPet.preview" : "desktopPet.previewBreak")}
          </Button>
        ))}
      </div>
      <p id="desktop-pet-import-hint" className="mt-1.5 text-xs text-muted">{t("desktopPet.importHint")}</p>
      {errorKey ? <p role="alert" className="mt-2 text-sm text-danger">{t(errorKey)}</p> : null}
    </div>
  );
}
