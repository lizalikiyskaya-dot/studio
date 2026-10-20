import assert from "node:assert/strict";
import test from "node:test";
import { BIBLE_THEMES, appendCheckLine, entriesFill, entryLabel, entryOnSetting, grapesFill, nextThemeCue, storedSettingKey, toggleCheckLine, type GrapesBag } from "./worldBible";

const emptyGrapes = {
  grapesGeography: "",
  grapesReligion: "",
  grapesAchievements: "",
  grapesPolitics: "",
  grapesEconomy: "",
  grapesSocial: "",
} satisfies GrapesBag;

test("сначала шесть букв GRAPES, потом записи, лор подписан мифами", () => {
  assert.deepEqual(
    BIBLE_THEMES.slice(0, 6).map((theme) => theme.badge),
    ["G", "R", "A", "P", "E", "S"],
  );
  assert.equal(BIBLE_THEMES[0].label, "География");
  assert.equal(BIBLE_THEMES[5].label, "Соц. структура");
  assert.deepEqual(
    BIBLE_THEMES.slice(6).map((theme) => theme.label),
    ["Места", "Фракции", "Мифы и легенды", "Технологии", "Магия", "История", "Существа", "Языки"],
  );
  assert.equal(entryLabel("LORE"), "Мифы и легенды");
  assert.equal(BIBLE_THEMES.find((theme) => theme.category === "LORE")?.hints[0], "Какую легенду знает каждый ребёнок?");
});

test("полоска: пустой текст, запись без текста, полный текст", () => {
  assert.equal(grapesFill("  "), "empty");
  assert.equal(grapesFill("степь"), "full");
  assert.equal(entriesFill([]), "empty");
  assert.equal(entriesFill([""]), "partial");
  assert.equal(entriesFill(["шесты", ""]), "partial");
  assert.equal(entriesFill(["шесты"]), "full");
});

test("пункт заметки переключается в markdown и не портит обычный текст", () => {
  assert.equal(toggleCheckLine("- [ ] север\nстепь", 0), "- [x] север\nстепь");
  assert.equal(toggleCheckLine("- [x] север", 0), "- [ ] север");
  assert.equal(toggleCheckLine("просто текст", 0), "просто текст");
  assert.equal(appendCheckLine("степь"), "степь\n- [ ] ");
  assert.equal(appendCheckLine(""), "- [ ] ");
});

test("пустой ключ записи остаётся на первой таблице GRAPES", () => {
  assert.equal(storedSettingKey("primary"), "");
  assert.equal(storedSettingKey(""), "");
  assert.equal(storedSettingKey("zoru"), "zoru");
  assert.equal(entryOnSetting("", "primary"), true);
  assert.equal(entryOnSetting(null, "primary"), true);
  assert.equal(entryOnSetting(undefined, "primary"), true);
  assert.equal(entryOnSetting("primary", "primary"), true);
  assert.equal(entryOnSetting("zoru", "primary"), false);
  assert.equal(entryOnSetting("zoru", "zoru"), true);
  assert.equal(entryOnSetting("", "zoru"), false);
});

test("дальше указывает на первую пустую тему и не трогает чужие записи", () => {
  assert.equal(nextThemeCue(emptyGrapes, [], true), "География пусто");
  const grapes = { ...emptyGrapes, grapesGeography: "степь", grapesReligion: "небо", grapesAchievements: "узлы", grapesPolitics: "сторожа", grapesEconomy: "вода", grapesSocial: "семьи" };
  assert.equal(
    nextThemeCue(grapes, [{ category: "LOCATIONS", body: "" }], true),
    "у темы «Места» есть запись без текста",
  );
  assert.equal(
    nextThemeCue(grapes, [{ category: "LOCATIONS", body: "шесты" }, { category: "CREATURES", body: "" }], true),
    "Фракции пусто",
  );
});
