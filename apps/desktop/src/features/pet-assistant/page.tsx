import React, { useEffect, useRef, useState } from "react";
import { Button, PageHeader } from "@memo/ui";
import { PetSprite } from "../../components/pet-sprite";
import { PetPackError, readPetPack, type ImportedPetPack } from "../../lib/codex-pet";
import {
  BUNDLED_PETS,
  DEFAULT_PET,
  loadDesktopPetSelection,
  loadImportedDesktopPets,
  saveDesktopPetSelection,
  saveImportedDesktopPet,
  updateDesktopPetWindow,
} from "../../lib/desktop-pet-catalog";
import {
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

export default function PetAssistantPage() {
  const { t } = useI18n();
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title={t("nav.petAssistant")} subtitle={t("nav.petAssistantDescription")} />
      {supportsDesktopPet() ? <PetSettings /> : <p className="text-sm text-muted">{t("desktopPet.platformUnsupported")}</p>}
    </div>
  );
}

function PetSettings() {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [behavior, setBehavior] = useState<DesktopPetBehaviorPreferences>({ lookEnabled: false, walkEnabled: false });
  const [selected, setSelected] = useState(DEFAULT_PET.manifest.id);
  const [imported, setImported] = useState<Pick<ImportedPetPack, "manifest" | "thumbnail">[]>([]);
  const [busy, setBusy] = useState(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    void Promise.all([desktopPetEnabled(), loadDesktopPetSelection(), loadImportedDesktopPets(), loadDesktopPetBehavior()]).then(([value, petId, packs, preferences]) => {
      if (!active) return;
      setEnabled(value);
      setSelected([...BUNDLED_PETS, ...packs].some((pet) => pet.manifest.id === petId) ? petId : DEFAULT_PET.manifest.id);
      setImported(packs);
      setBehavior(preferences);
    }).catch(() => {
      if (active) setErrorKey("desktopPet.settingsError");
    });
    return () => { active = false; };
  }, []);

  async function run(action: () => Promise<void>) {
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

  async function select(petId: string) {
    await saveDesktopPetSelection(petId);
    setSelected(petId);
  }

  function importFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    event.currentTarget.value = "";
    if (!files.length) return;
    void run(async () => {
      const pack = await readPetPack(files);
      await saveImportedDesktopPet(pack);
      setImported(await loadImportedDesktopPets());
      await select(pack.manifest.id);
    });
  }

  const options = [
    ...BUNDLED_PETS.map((pet) => {
      const key = `desktopPet.pet.${pet.manifest.id}`;
      const label = t(key);
      return { id: pet.manifest.id, label: label === key ? pet.manifest.displayName : label, pet };
    }),
    ...imported.map((pack) => ({ id: pack.manifest.id, label: pack.manifest.displayName, thumbnail: pack.thumbnail })),
  ];

  return (
    <div className="mt-4">
      <label className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
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
              if (next) await updateDesktopPetWindow(selected);
              await setDesktopPetEnabled(next);
            });
          }}
        />
        {t("desktopPet.setting")}
      </label>
      <p id="desktop-pet-setting-hint" className="mt-1 text-sm text-muted">{t("desktopPet.settingHint")}</p>

      <fieldset className="mt-5 space-y-2" disabled={busy || enabled === null}>
        <legend className="text-sm font-medium text-foreground">{t("desktopPet.interaction")}</legend>
        {(["lookEnabled", "walkEnabled"] as const).map((key) => (
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

      <fieldset className="mt-5" disabled={busy || enabled === null}>
        <legend className="text-sm font-medium text-foreground">{t("desktopPet.choose")}</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {options.map((option) => (
            <label
              key={option.id}
              className={`flex min-w-0 cursor-pointer items-center gap-2 rounded-md border py-1.5 pe-2 text-sm focus-within:ring-2 focus-within:ring-focus-ring ${selected === option.id ? "border-accent bg-active font-semibold" : "border-control-border bg-surface hover:bg-surface-strong"}`}
            >
              <input className="sr-only" type="radio" name="desktop-pet-type" checked={selected === option.id} onChange={() => void run(() => select(option.id))} />
              <span className="grid h-11 w-11 shrink-0 place-items-center" aria-hidden="true">
                {"pet" in option ? <PetSprite pet={option.pet} /> : <img className="h-full [image-rendering:pixelated]" src={option.thumbnail} alt="" />}
              </span>
              <span className="min-w-0 truncate text-foreground" title={option.label}>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input type="file" ref={fileInput} hidden multiple accept=".json,.png,.webp" onChange={importFiles} />
        <Button variant="secondary" size="sm" disabled={busy || enabled === null} aria-describedby="desktop-pet-import-hint" onClick={() => fileInput.current?.click()}>
          {t("desktopPet.import")}
        </Button>
        <Button variant="ghost" size="sm" disabled={busy || enabled !== true} onClick={() => void run(() => showDesktopPetReminder({
          kind: "preview", title: t("desktopPet.previewTitle"), body: t("desktopPet.previewBody"),
        }))}>
          {t("desktopPet.preview")}
        </Button>
      </div>
      <p id="desktop-pet-import-hint" className="mt-1.5 text-xs text-muted">{t("desktopPet.importHint")}</p>
      {errorKey ? <p role="alert" className="mt-2 text-sm text-danger">{t(errorKey)}</p> : null}
    </div>
  );
}
