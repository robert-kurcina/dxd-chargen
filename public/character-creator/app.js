import {
  calculateCharacterSheet,
  HISTORY_NOTE_KEYWORDS,
  parseEquipmentRows,
  parseHistoryNotes,
  serializeEquipmentRows,
  serializeHistoryNotes,
} from "./character-sheet.js";

(async () => {
  "use strict";

  const generatedOverrideFields = [
    "Hitpoints", "Bodypoints", "Recovery", "Endurance", "Resilience",
    "Resistance", "Cellburn", "Manapool",
  ];
  const field = (name, type = "text") => ({ name, type });
  const group = (name, fields, options = {}) => ({ name, fields, ...options });
  const attributes = ["CCA", "RCA", "REF", "INT", "KNO", "PRE", "POW", "STR", "FOR", "MOV", "SIZ", "ZED"];
  const frontGroups = [
    group("name", [field("Name", "area")]),
    group("details", [field("Details", "area")]),
    group("character-level", [], { stars: true }),
    group("attributes", [
      ...attributes.map((name) => field(name, name === "MOV" ? "derived" : "number")),
      ...attributes.map((name) => field(`${name}DM`, "derived")),
    ]),
    group("background", ["Profession", "Settlement", "Religion", "Personality", "Features"].map((name) => field(name, "area"))),
    group("history-notes", HISTORY_NOTE_KEYWORDS.map((name) => field(name, "history"))),
    group("performance", ["Hitpoints", "Bodypoints", "Recovery", "Endurance", "Resilience", "Resistance"].map((name) => field(name, "derived"))),
    group("concerns", ["Damage", "Injury", "Fatigue", "Weariness", "Stress", "Rads"].map((name) => field(name, "number"))),
    group("miscellaneous", [
      ...["WealthRank", "SocialRank", "ProfessionRank"].map((name) => field(name, "number")),
      ...["FavorDice", "Cellburn", "Manapool"].map((name) => field(name, "derived")),
    ]),
    group("combat", ["HastyActions", "MeleeAttack", "MeleeDefend", "RangeAttack", "RangeDefend", "MaxAdvantage"].map((name) => field(name, "derived"))),
    group("gm-notes", [field("GMNotes", "area")]),
  ];

  const universalIndexes = [
    "Walk", "Jog", "Run",
    "Lift", "Shoulder", "Carry",
    "Hurl", "Pitch", "Lob",
    "Up", "Down", "Broad",
  ];
  const universalScalarUnits = {
    ScalarWalk: "'", ScalarJog: "'", ScalarRun: "'",
    ScalarLift: "#", ScalarShoulder: "#", ScalarCarry: "#",
    ScalarHurl: "#", ScalarPitch: "#", ScalarLob: "#",
    ScalarUp: "'", ScalarDown: "'", ScalarBroad: "'",
  };
  const equipmentCategoryRank = { weapons: 0, armor: 1, equipment: 2 };
  const orderedEquipmentRows = (rows) => [...rows].sort((left, right) =>
    (equipmentCategoryRank[left.category] ?? 2) - (equipmentCategoryRank[right.category] ?? 2)
    || left.item.localeCompare(right.item, undefined, { sensitivity: "base", numeric: true }));
  const backGroups = [
    group("back-name", [field("BackName", "area")]),
    group("equipment", [], { equipmentRows: true }),
    group("back-notes", [field("BackNotes", "area")]),
    group("derived-scores", [field("Physicality", "derived"), field("GaspLimit", "derived"), field("SleepLimit", "derived")]),
    group("movement-extras", [field("ScalarAgility", "derived"), field("ScalarMphRun", "derived")]),
    group("universal-chart", [
      ...universalIndexes.map((name) => field(`Index${name}`, "derived")),
      ...universalIndexes.map((name) => field(`Scalar${name}`, "derived")),
    ]),
    group("biology", [field("Profile", "derived"), field("Stature", "number"), field("Build", "number")]),
    group("frame", [field("Frame", "derived"), field("adjustmentStature", "derived"), field("adjustmentBuild", "derived")]),
    group("weight-status", [field("WeightStatus", "derived")]),
  ];

  const clone = (value) => structuredClone(value);
  const equal = (left, right) => JSON.stringify(left) === JSON.stringify(right);
  const sessions = new Map();
  let characterDirectory = [];
  let currentSession;
  let currentSlug = "";
  let characterData = {};
  let sourceFieldNames = [];
  let state = {};
  let loadedState;
  let preEditState;
  let editStack = [];
  let editMode = false;
  let pendingChanges = false;

  function calculateState(currentState, sourceData) {
    const pml = Math.max(0, Math.min(12, Number(currentState.PML) || 0));
    const decals = Array.from({ length: pml }, () => ({ name: "star" }));
    const calculationSource = { ...currentState };
    generatedOverrideFields.forEach((fieldName) => {
      calculationSource[fieldName] = sourceData[fieldName] ?? "";
    });
    const calculated = calculateCharacterSheet(calculationSource, decals).values;
    Object.entries(universalScalarUnits).forEach(([fieldName, suffix]) => {
      const current = calculated[fieldName];
      if (current !== "" && current != null) calculated[fieldName] = `${current}${suffix}`;
    });
    return { ...currentState, ...calculated };
  }

  function calculate() {
    normalizeHistoryState(state);
    normalizeEquipmentState(state);
    state = calculateState(state, characterData);
  }

  function normalizeEquipmentState(currentState) {
    const metadata = new Map((currentState.EquipmentRows ?? []).map((row) => [row.item, {
      category: row.category,
      cultural: row.cultural,
    }]));
    const serialized = serializeEquipmentRows(currentState.EquipmentRows ?? []);
    currentState.EquipmentRows = orderedEquipmentRows(parseEquipmentRows(
      serialized.WeaponsArmorEquipment,
      serialized.WeaponsArmorEquipmentProperties,
    ).map((row) => ({ ...row, ...(metadata.get(row.item) ?? {}) })));
    Object.assign(currentState, serializeEquipmentRows(currentState.EquipmentRows));
  }

  function equipmentRowsFromSource(sourceData) {
    const categories = sourceData.EquipmentCategories && typeof sourceData.EquipmentCategories === "object"
      ? sourceData.EquipmentCategories
      : {};
    const cultures = sourceData.EquipmentCultures && typeof sourceData.EquipmentCultures === "object"
      ? sourceData.EquipmentCultures
      : {};
    return orderedEquipmentRows(parseEquipmentRows(
      sourceData.WeaponsArmorEquipment,
      sourceData.WeaponsArmorEquipmentProperties,
    ).map((row) => ({
      ...row,
      category: Object.hasOwn(equipmentCategoryRank, categories[row.item]) ? categories[row.item] : "equipment",
      cultural: cultures[row.item] ?? "",
    })));
  }

  function historyValues(sections) {
    return Object.fromEntries(HISTORY_NOTE_KEYWORDS.map((keyword) => [
      keyword,
      sections[keyword].join(", "),
    ]));
  }

  function historySectionsFromState(currentState) {
    const source = HISTORY_NOTE_KEYWORDS
      .map((keyword) => `${keyword}; ${currentState[keyword] ?? ""}`)
      .join("\n");
    return parseHistoryNotes(source);
  }

  function normalizeHistoryState(currentState) {
    const sections = historySectionsFromState(currentState);
    Object.assign(currentState, historyValues(sections));
    currentState.HistoryNotes = serializeHistoryNotes(sections);
  }

  function createSession(entry, sourceData) {
    const historySections = parseHistoryNotes(sourceData.HistoryNotes);
    const defaults = {
      ...sourceData,
      ...historyValues(historySections),
      HistoryNotes: serializeHistoryNotes(historySections),
      EquipmentRows: equipmentRowsFromSource(sourceData),
      Damage: 0, Injury: 0, Fatigue: 0, Weariness: 0, Stress: 0, Rads: 0,
    };
    const initialState = calculateState({ ...defaults, PML: Number(sourceData.PML ?? 0) }, sourceData);
    return {
      slug: entry.slug,
      name: entry.name,
      characterData: sourceData,
      sourceFieldNames: [...new Set([
        ...Object.keys(sourceData).filter((name) => name !== "CharacterLevel"),
        "PML",
      ])],
      state: initialState,
      loadedState: clone(initialState),
      preEditState: undefined,
      editStack: [],
      editMode: false,
      pendingChanges: false,
    };
  }

  async function loadSession(entry) {
    if (sessions.has(entry.slug)) return sessions.get(entry.slug);
    throw new Error(`Open ${entry.name} from the application Library and Sheet tabs.`);
  }

  function storeCurrentSession() {
    if (!currentSession) return;
    Object.assign(currentSession, {
      characterData, sourceFieldNames, state, loadedState, preEditState,
      editStack, editMode, pendingChanges,
    });
  }

  function useSession(session) {
    currentSession = session;
    currentSlug = session.slug;
    ({
      characterData, sourceFieldNames, state, loadedState, preEditState,
      editStack, editMode, pendingChanges,
    } = session);
  }

  function sessionStatus(slug) {
    if (slug === currentSlug) {
      if (pendingChanges) return "unsaved";
      if (editMode) return "editing";
      return "";
    }
    const session = sessions.get(slug);
    if (session?.pendingChanges) return "unsaved";
    if (session?.editMode) return "editing";
    return "";
  }

  function syncCharacterOptions() {
    document.querySelectorAll("#character-select option").forEach((option) => {
      const status = sessionStatus(option.value);
      option.textContent = `${option.dataset.name}${status ? ` - ${status}` : ""}`;
    });
  }

  function syncPortrait(entry) {
    const portrait = document.querySelector("#front .portrait");
    portrait.hidden = !entry.portrait;
    portrait.alt = entry.portrait ? `${entry.name} portrait` : "";
    if (entry.portrait) portrait.src = entry.portrait;
  }

  async function switchCharacter(slug) {
    if (!slug || slug === currentSlug) return;
    const selector = document.querySelector("#character-select");
    const priorSlug = currentSlug;
    const entry = characterDirectory.find((character) => character.slug === slug);
    if (!entry) return;
    storeCurrentSession();
    selector.disabled = true;
    try {
      useSession(await loadSession(entry));
      selector.value = slug;
      syncPortrait(entry);
      syncAllFields();
      syncActions();
    } catch (error) {
      selector.value = priorSlug;
      notify(String(error));
    } finally {
      selector.disabled = false;
      syncCharacterOptions();
    }
  }

  function renderGroups(groups, targetId) {
    const target = document.getElementById(targetId);
    target.replaceChildren();
    groups.forEach(({ name: groupName, fields, stars, equipmentRows, labeled }) => {
      const container = document.createElement("div");
      container.className = `field-group field-group-${groupName}`;
      container.dataset.region = groupName;
      fields.forEach(({ name, type }) => {
        const input = type === "area" || type === "history"
          ? document.createElement("textarea")
          : document.createElement("input");
        const derived = type === "derived" || name === "BackName";
        if (input.tagName === "INPUT") input.type = type === "number" ? "number" : "text";
        input.className = `field ${type === "number" || type === "derived" ? "numeric" : ""} ${derived ? "derived" : ""}`;
        input.dataset.field = name;
        input.value = state[name] ?? "";
        input.setAttribute("aria-label", name.replace(/([A-Z])/g, " $1").trim());
        input.dataset.type = type;
        input.dataset.derived = String(derived);
        input.readOnly = derived || !editMode;
        if (type === "number") {
          input.step = "1";
          input.inputMode = "numeric";
          if (["Damage", "Injury", "Fatigue", "Weariness", "Stress", "Rads", "WealthRank", "SocialRank", "ProfessionRank", "Stature", "Build"].includes(name)) input.min = "0";
        } else if (type === "area" || type === "history") {
          input.maxLength = 4000;
        }
        input.addEventListener("input", () => recordEdit(input));
        if (type === "history") {
          const historyField = document.createElement("div");
          const label = document.createElement("span");
          historyField.className = "history-field";
          historyField.dataset.keyword = name;
          label.className = "history-keyword";
          label.textContent = `${name};`;
          input.classList.add("history-value");
          historyField.append(label, input);
          if (name === "Skills" || name === "Traits") {
            const rich = document.createElement("div");
            rich.className = "history-rich";
            rich.dataset.richField = name;
            historyField.append(rich);
          }
          container.append(historyField);
        } else if (labeled) {
          const row = document.createElement("label");
          row.className = "derived-score";
          const caption = document.createElement("span");
          caption.textContent = ({ Physicality: "Physicality", GaspLimit: "Gasp Limit", SleepLimit: "Sleep Limit", ScalarAgility: "Agility", ScalarMphRun: "MPH" })[name] ?? name;
          row.append(caption, input);
          container.append(row);
        } else {
          container.append(input);
        }
      });
      if (stars) {
        const starContainer = document.createElement("div");
        starContainer.className = "pml-stars";
        starContainer.id = "pml-stars";
        starContainer.setAttribute("aria-hidden", "true");
        container.append(starContainer);
      }
      if (equipmentRows) renderEquipmentRows(container);
      target.append(container);
    });
  }

  function richEquipmentProperties(value, cultural) {
    const rich = document.createElement("div");
    rich.className = "equipment-properties-rich";
    const text = String(value ?? "");
    if (!cultural) {
      rich.textContent = text;
      return rich;
    }
    const weight = text.match(/\b\d+(?:\.\d+)?(?:[KMG])?#/i);
    const firstLineEnd = text.indexOf("\n");
    const insertAt = weight?.index != null
      ? weight.index + weight[0].length
      : firstLineEnd >= 0 ? firstLineEnd : text.length;
    rich.append(document.createTextNode(text.slice(0, insertAt)));
    const marker = document.createElement("span");
    marker.className = "equipment-cultural";
    marker.textContent = `${insertAt ? " " : ""}${cultural}`;
    rich.append(marker, document.createTextNode(text.slice(insertAt)));
    return rich;
  }

  function renderEquipmentRows(container) {
    container.replaceChildren();
    const rows = state.EquipmentRows ?? [];
    container.style.setProperty("--equipment-row-count", String(Math.max(1, rows.length)));
    rows.forEach((row, index) => {
      const rowElement = document.createElement("div");
      rowElement.className = "equipment-row";
      rowElement.dataset.index = String(index);
      ["item", "properties"].forEach((property) => {
        const input = document.createElement("textarea");
        input.className = `field equipment-${property}`;
        input.dataset.equipmentProperty = property;
        input.value = row[property] ?? "";
        input.readOnly = !editMode;
        input.maxLength = 4000;
        input.setAttribute("aria-label", `Equipment row ${index + 1} ${property}`);
        input.addEventListener("input", () => {
          recordEquipmentEdit(input);
          resizeEquipmentRows();
        });
        if (property === "properties") {
          const cell = document.createElement("div");
          cell.className = "equipment-properties-cell";
          input.classList.add("equipment-properties-editor");
          cell.append(input, richEquipmentProperties(input.value, row.cultural));
          rowElement.append(cell);
        } else {
          rowElement.append(input);
        }
      });
      container.append(rowElement);
    });
    resizeEquipmentRows();
  }

  function resizeEquipmentRows() {
    document.querySelectorAll("#back .equipment-row").forEach((row) => {
      const fields = [...row.querySelectorAll(".field, .equipment-properties-rich")];
      row.style.height = "auto";
      fields.forEach((input) => { input.style.height = "0px"; });
      const contentHeight = Math.max(...fields.map((input) => input.scrollHeight));
      fields.forEach((input) => { input.style.height = `${contentHeight}px`; });
    });
  }

  function recordEquipmentEdit(input) {
    if (!editMode || input.readOnly) return;
    const index = Number(input.closest(".equipment-row").dataset.index);
    const property = input.dataset.equipmentProperty;
    const previousValue = state.EquipmentRows[index][property] ?? "";
    const value = input.value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
    if (equal(previousValue, value)) return;
    editStack.push({ field: "EquipmentRows", index, property, previousValue, value });
    state.EquipmentRows[index][property] = value;
    syncModifiedFields();
    syncActions();
  }

  function readInputValue(input) {
    if (input.type !== "number") return input.value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
    return input.value === "" ? "" : Number(input.value);
  }

  function recordEdit(input) {
    if (!editMode || input.readOnly) return;
    const field = input.dataset.field;
    const previousValue = state[field] ?? "";
    const value = readInputValue(input);
    if (equal(previousValue, value)) return;
    editStack.push({ field, previousValue, value });
    state[field] = value;
    input.value = value;
    syncModifiedFields();
    syncActions();
  }

  function syncDerived() {
    document.querySelectorAll("[data-field]").forEach((input) => {
      if (input.readOnly || input.dataset.field === "BackName") input.value = state[input.dataset.field] ?? "";
    });
    document.querySelector("#pml-stars").replaceChildren(...Array.from({ length: state.PML }, () => {
      const image = new Image(); image.src = "/api/data-assets/decals/decal-star.png"; return image;
    }));
    const affinity = document.querySelector("#affinity-decal");
    const attributeOrder = ["CCA", "RCA", "REF", "INT", "KNO", "PRE", "POW", "STR", "FOR", "MOV", "SIZ", "ZED"];
    const affinityIndex = attributeOrder.indexOf(String(state.AffinityAttribute ?? "").toUpperCase());
    affinity.style.display = affinityIndex < 0 ? "none" : "block";
    if (affinityIndex >= 0) affinity.style.left = `${5.7 + affinityIndex * 8.5 + 3.975}%`;
    for (const name of ["Skills", "Traits"]) {
      const input = document.querySelector(`[data-field="${name}"]`);
      const rich = document.querySelector(`[data-rich-field="${name}"]`);
      const terms = state[`${name}Terms`];
      if (!rich || !Array.isArray(terms)) continue;
      input.classList.add("rich-hidden");
      rich.replaceChildren(...terms.flatMap((term, index) => {
        const span = document.createElement("span");
        span.textContent = String(term.text ?? "").replace(/\s*\}\s*$/, "");
        if (term.unresolved) span.className = "unresolved-specialization";
        return index ? [document.createTextNode(", "), span] : [span];
      }));
    }
  }

  function syncAllFields() {
    document.querySelectorAll("[data-field]").forEach((input) => {
      input.value = state[input.dataset.field] ?? "";
      input.readOnly = input.dataset.derived === "true" || !editMode;
    });
    document.querySelector("#pml").value = state.PML ?? 0;
    document.querySelector("#pml").disabled = !editMode;
    renderEquipmentRows(document.querySelector("#back .field-group-equipment"));
    syncDerived();
    syncModifiedFields();
  }

  function syncModifiedFields() {
    document.querySelectorAll("[data-field]").forEach((input) => {
      const changed = preEditState && !equal(state[input.dataset.field] ?? "", preEditState[input.dataset.field] ?? "");
      input.classList.toggle("modified", Boolean(changed));
    });
    document.querySelector("#pml").classList.toggle("modified", Boolean(preEditState && state.PML !== preEditState.PML));
    document.querySelectorAll("[data-equipment-property]").forEach((input) => {
      const index = Number(input.closest(".equipment-row").dataset.index);
      const property = input.dataset.equipmentProperty;
      const changed = preEditState && !equal(
        state.EquipmentRows?.[index]?.[property] ?? "",
        preEditState.EquipmentRows?.[index]?.[property] ?? "",
      );
      input.classList.toggle("modified", Boolean(changed));
    });
  }

  function syncActions() {
    document.body.classList.toggle("editing", editMode);
    document.querySelector("#edit").hidden = pendingChanges;
    document.querySelector("#edit").textContent = editMode ? "Cancel" : "Edit";
    document.querySelector("#undo").hidden = !editMode || editStack.length === 0;
    document.querySelector("#update").hidden = !editMode;
    document.querySelector("#save").hidden = !pendingChanges;
    document.querySelector("#revert").hidden = !pendingChanges;
    syncCharacterOptions();
  }

  function buildSavePayload() {
    const payload = Object.fromEntries(sourceFieldNames.map((field) => {
      if (generatedOverrideFields.includes(field) && (characterData[field] === "" || characterData[field] == null)) return [field, ""];
      return [field, state[field] ?? ""];
    }));
    payload.HistoryNotes = serializeHistoryNotes(historySectionsFromState(state));
    Object.assign(payload, serializeEquipmentRows(state.EquipmentRows ?? []));
    return payload;
  }

  function notify(message) {
    const status = document.querySelector("#status"); status.textContent = message; status.classList.add("show");
    window.setTimeout(() => status.classList.remove("show"), 1600);
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load ${source}`));
      image.src = source;
    });
  }

  function wrappedLines(context, value, maxWidth) {
    return String(value ?? "").split("\n").flatMap((paragraph) => {
      if (!paragraph || context.measureText(paragraph).width <= maxWidth) return [paragraph];
      const lines = [];
      let line = "";
      paragraph.split(/\s+/).forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (line && context.measureText(candidate).width > maxWidth) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      lines.push(line);
      return lines;
    });
  }

  function drawMultilineText(context, value, rect, style, verticallyCentered = false) {
    const fontSize = Number.parseFloat(style.fontSize) || 12;
    const lineHeight = Number.parseFloat(style.lineHeight) || fontSize * 1.12;
    const paddingLeft = Number.parseFloat(style.paddingLeft) || 0;
    const paddingRight = Number.parseFloat(style.paddingRight) || 0;
    const paddingTop = Number.parseFloat(style.paddingTop) || 0;
    context.save();
    context.beginPath();
    context.rect(rect.x, rect.y, rect.width, rect.height);
    context.clip();
    context.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
    context.fillStyle = style.color;
    context.textBaseline = "top";
    context.textAlign = style.textAlign === "center" ? "center" : "left";
    const lines = wrappedLines(context, value, rect.width - paddingLeft - paddingRight);
    const x = style.textAlign === "center" ? rect.x + rect.width / 2 : rect.x + paddingLeft;
    const y = verticallyCentered && lines.length === 1
      ? rect.y + Math.max(0, (rect.height - lineHeight) / 2)
      : rect.y + paddingTop;
    lines.forEach((line, index) => context.fillText(line, x, y + index * lineHeight));
    context.restore();
  }

  function drawCoverImage(context, image, rect) {
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const rectRatio = rect.width / rect.height;
    const sourceWidth = imageRatio > rectRatio ? image.naturalHeight * rectRatio : image.naturalWidth;
    const sourceHeight = imageRatio > rectRatio ? image.naturalHeight : image.naturalWidth / rectRatio;
    const sourceX = (image.naturalWidth - sourceWidth) / 2;
    const sourceY = (image.naturalHeight - sourceHeight) / 2;
    context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, rect.x, rect.y, rect.width, rect.height);
  }

  async function renderSheetPage(page) {
    const width = 1200;
    const height = 1575;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    const pageRect = page.getBoundingClientRect();
    const scaleX = width / pageRect.width;
    const scaleY = height / pageRect.height;
    const sheetArt = page.querySelector(".sheet-art");
    context.drawImage(await loadImage(sheetArt.src), 0, 0, width, height);

    const portrait = page.querySelector(".portrait:not([hidden])");
    if (portrait?.src) {
      const rect = portrait.getBoundingClientRect();
      const exportRect = {
        x: (rect.x - pageRect.x) * scaleX,
        y: (rect.y - pageRect.y) * scaleY,
        width: rect.width * scaleX,
        height: rect.height * scaleY,
      };
      drawCoverImage(context, await loadImage(portrait.src), exportRect);
      context.save();
      context.strokeStyle = getComputedStyle(portrait).borderColor;
      context.lineWidth = Number.parseFloat(getComputedStyle(portrait).borderWidth) * scaleX;
      context.strokeRect(exportRect.x, exportRect.y, exportRect.width, exportRect.height);
      context.restore();
    }

    for (const star of page.querySelectorAll(".pml-stars img")) {
      const rect = star.getBoundingClientRect();
      context.drawImage(
        await loadImage(star.src),
        (rect.x - pageRect.x) * scaleX,
        (rect.y - pageRect.y) * scaleY,
        rect.width * scaleX,
        rect.height * scaleY,
      );
    }

    const textElements = page.querySelectorAll(".history-keyword, .field, .equipment-properties-rich");
    textElements.forEach((element) => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const style = getComputedStyle(element);
      drawMultilineText(context, element.value ?? element.textContent, {
        x: (rect.x - pageRect.x) * scaleX,
        y: (rect.y - pageRect.y) * scaleY,
        width: rect.width * scaleX,
        height: rect.height * scaleY,
      }, {
        color: style.color,
        fontFamily: style.fontFamily,
        fontSize: `${Number.parseFloat(style.fontSize) * scaleX}px`,
        fontWeight: style.fontWeight,
        lineHeight: `${Number.parseFloat(style.lineHeight) * scaleY}px`,
        paddingLeft: `${Number.parseFloat(style.paddingLeft) * scaleX}px`,
        paddingRight: `${Number.parseFloat(style.paddingRight) * scaleX}px`,
        paddingTop: `${Number.parseFloat(style.paddingTop) * scaleY}px`,
        textAlign: style.textAlign,
      }, element.tagName === "INPUT");
    });
    return canvas;
  }

  function dataUrlBytes(dataUrl) {
    const binary = atob(dataUrl.split(",")[1]);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  }

  function createPdf(pageImages) {
    const encoder = new TextEncoder();
    const objects = new Map();
    const pageWidth = 576;
    const pageHeight = 756;
    objects.set(1, encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"));
    objects.set(2, encoder.encode("<< /Type /Pages /Kids [3 0 R 6 0 R] /Count 2 >>"));
    pageImages.forEach((image, index) => {
      const pageObject = index === 0 ? 3 : 6;
      const imageObject = pageObject + 1;
      const contentObject = pageObject + 2;
      const imageBytes = dataUrlBytes(image);
      const commands = encoder.encode(`q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Sheet Do\nQ`);
      objects.set(pageObject, encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Sheet ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`));
      objects.set(imageObject, { header: encoder.encode(`<< /Type /XObject /Subtype /Image /Width 1200 /Height 1575 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`), body: imageBytes });
      objects.set(contentObject, { header: encoder.encode(`<< /Length ${commands.length} >>\nstream\n`), body: commands });
    });
    const chunks = [encoder.encode("%PDF-1.4\n")];
    const offsets = [0];
    let length = chunks[0].length;
    for (let number = 1; number <= 8; number += 1) {
      offsets[number] = length;
      const value = objects.get(number);
      const start = encoder.encode(`${number} 0 obj\n`);
      const end = encoder.encode(value.body ? "\nendstream\nendobj\n" : "\nendobj\n");
      const parts = value.body ? [start, value.header, value.body, end] : [start, value, end];
      chunks.push(...parts);
      length += parts.reduce((sum, part) => sum + part.length, 0);
    }
    const xrefOffset = length;
    const xref = [`xref\n0 9\n0000000000 65535 f \n`, ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)].join("");
    chunks.push(encoder.encode(`${xref}trailer\n<< /Size 9 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
    return new Blob(chunks, { type: "application/pdf" });
  }

  async function exportPdf() {
    const button = document.querySelector("#export-pdf");
    const pages = [...document.querySelectorAll(".sheet-page")];
    const originalPages = pages.map((page) => ({ hidden: page.hidden, active: page.classList.contains("active") }));
    button.disabled = true;
    button.textContent = "Exporting...";
    document.body.classList.add("pdf-exporting");
    pages.forEach((page) => { page.hidden = false; page.classList.add("active"); });
    try {
      resizeEquipmentRows();
      await document.fonts.ready;
      const canvases = [];
      for (const page of pages) canvases.push(await renderSheetPage(page));
      const pdf = createPdf(canvases.map((canvas) => canvas.toDataURL("image/jpeg", .95)));
      const link = document.createElement("a");
      link.href = URL.createObjectURL(pdf);
      link.download = `${currentSlug || "character"}-character-sheet.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      notify("PDF exported at 150 DPI");
    } catch (error) {
      notify(`PDF export failed: ${String(error)}`);
    } finally {
      pages.forEach((page, index) => { page.hidden = originalPages[index].hidden; page.classList.toggle("active", originalPages[index].active); });
      document.body.classList.remove("pdf-exporting");
      button.disabled = false;
      button.textContent = "Export PDF";
    }
  }

  function activateSheetPage(tab, focus = false) {
    document.querySelectorAll(".tab").forEach((item) => {
      item.classList.toggle("active", item === tab);
      item.setAttribute("aria-selected", item === tab);
      item.tabIndex = item === tab ? 0 : -1;
    });
    document.querySelectorAll(".sheet-page").forEach((page) => { page.classList.toggle("active", page.id === tab.dataset.page); page.hidden = page.id !== tab.dataset.page; });
    if (tab.dataset.page === "back") resizeEquipmentRows();
    if (focus) tab.focus();
  }
  const sheetTabs = [...document.querySelectorAll(".tab")];
  sheetTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activateSheetPage(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? sheetTabs.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + sheetTabs.length) % sheetTabs.length;
      activateSheetPage(sheetTabs[nextIndex], true);
    });
  });

  let sheetZoom = 1;
  const setSheetZoom = (value) => {
    sheetZoom = Math.max(.5, Math.min(2, Math.round(value * 10) / 10));
    document.documentElement.style.setProperty("--sheet-zoom", String(sheetZoom));
    document.querySelector("#zoom-value").value = `${Math.round(sheetZoom * 100)}%`;
  };
  document.querySelector("#zoom-out").addEventListener("click", () => setSheetZoom(sheetZoom - .1));
  document.querySelector("#zoom-in").addEventListener("click", () => setSheetZoom(sheetZoom + .1));
  document.querySelector("#fit-width").addEventListener("click", () => setSheetZoom(1));
  document.querySelector("#fit-page").addEventListener("click", () => {
    const toolbarHeight = document.querySelector(".toolbar").getBoundingClientRect().height;
    const baseWidth = Math.min(960, Math.max(1, window.innerWidth - 10));
    const baseHeight = baseWidth * 21 / 16;
    setSheetZoom(Math.min(1, Math.max(.5, (window.innerHeight - toolbarHeight - 36) / baseHeight)));
  });
  window.addEventListener("resize", resizeEquipmentRows);
  document.querySelector("#character-select").addEventListener("change", (event) => {
    switchCharacter(event.currentTarget.value);
  });
  document.querySelector("#pml").addEventListener("input", (event) => {
    if (!editMode) return;
    const previousValue = state.PML;
    const value = Math.max(0, Math.min(12, Number(event.currentTarget.value) || 0));
    if (previousValue === value) return;
    editStack.push({ field: "PML", previousValue, value });
    state.PML = value;
    syncModifiedFields();
    syncActions();
  });

  document.querySelector("#edit").addEventListener("click", () => {
    if (editMode) {
      state = clone(preEditState);
      editMode = false;
      editStack = [];
      preEditState = undefined;
      syncAllFields();
      syncActions();
      notify("Edits cancelled");
      return;
    }
    preEditState = clone(state);
    editStack = [];
    editMode = true;
    syncAllFields();
    syncActions();
  });

  document.querySelector("#undo").addEventListener("click", () => {
    const edit = editStack.pop();
    if (!edit) return;
    if (edit.field === "EquipmentRows") {
      state.EquipmentRows[edit.index][edit.property] = edit.previousValue;
    } else {
      state[edit.field] = edit.previousValue;
    }
    syncAllFields();
    syncActions();
  });

  document.querySelector("#update").addEventListener("click", () => {
    const invalid = [...document.querySelectorAll(".field:not([readonly])")].find((input) => !input.checkValidity());
    if (invalid) {
      invalid.reportValidity();
      return;
    }
    calculate();
    editMode = false;
    pendingChanges = !equal(state, preEditState);
    editStack = [];
    syncAllFields();
    syncActions();
    notify(pendingChanges ? "Calculations updated" : "No changes");
    if (!pendingChanges) preEditState = undefined;
  });

  document.querySelector("#save").addEventListener("click", async () => {
    notify("Save characters from the Forge tab.");
  });

  document.querySelector("#revert").addEventListener("click", () => {
    state = clone(preEditState || loadedState);
    pendingChanges = false;
    preEditState = undefined;
    storeCurrentSession();
    syncAllFields();
    syncActions();
    notify("Changes reverted");
  });

  document.querySelector("#download").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `${currentSlug || "character"}.json`; link.click(); URL.revokeObjectURL(link.href); notify("Character downloaded");
  });
  document.querySelector("#export-pdf").addEventListener("click", exportPdf);

  const embedded = new URLSearchParams(window.location.search).has("embed");
  if (embedded) {
    document.body.classList.add("embedded");
    renderGroups(frontGroups, "front-fields");
    renderGroups(backGroups, "back-fields");
    window.addEventListener("message", (event) => {
      if (event.data?.type !== "dxd-character-sheet") return;
      const payload = event.data.payload ?? {};
      const entry = { slug: payload.Slug || "character", name: payload.Name || "Character", portrait: payload.Portrait || "" };
      useSession(createSession(entry, payload));
      syncPortrait(entry);
      syncAllFields();
      syncActions();
    });
    window.parent.postMessage({ type: "dxd-character-sheet-ready" }, "*");
    return;
  }

  document.body.innerHTML = '<p class="load-error">Open a character from the application Sheet tab.</p>';
})();
