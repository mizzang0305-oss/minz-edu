export type TiledDiagnostic = { code: string; path: string; message: string };

type JsonRecord = Record<string, unknown>;
const isRecord = (value: unknown): value is JsonRecord => typeof value === "object" && value !== null && !Array.isArray(value);
const asArray = (value: unknown) => Array.isArray(value) ? value : [];
const REQUIRED_TILE_SIZE = 32;
const TILED_GID_MASK = 0x0fffffff;

type TilesetRange = { firstGid: number; lastGid: number };

function propertyValue(properties: unknown, name: string) {
  const property = asArray(properties).find((item) => isRecord(item) && item.name === name);
  return isRecord(property) ? property.value : undefined;
}

export function validateTiledMap(input: unknown): TiledDiagnostic[] {
  const errors: TiledDiagnostic[] = [];
  const add = (code: string, path: string, message: string) => errors.push({ code, path, message });
  if (!isRecord(input)) return [{ code: "TILED_ROOT_INVALID", path: "$", message: "Tiled map root must be an object." }];

  if (input.type !== "map") add("TILED_ROOT_INVALID", "$.type", "type must be map.");
  if (input.orientation !== "orthogonal") add("ORIENTATION_UNSUPPORTED", "$.orientation", "Only orthogonal maps are supported.");
  if (input.infinite !== false) add("INFINITE_MAP_UNSUPPORTED", "$.infinite", "Infinite or chunked maps are not supported.");
  if (input.renderorder !== "right-down") add("RENDERORDER_UNSUPPORTED", "$.renderorder", "renderorder must be right-down.");

  const dimensions = ["width", "height", "tilewidth", "tileheight"] as const;
  dimensions.forEach((key) => {
    const value = input[key];
    if (!Number.isInteger(value) || Number(value) <= 0) add("DIMENSION_INVALID", `$.${key}`, `${key} must be a positive integer.`);
  });
  if (input.tilewidth !== REQUIRED_TILE_SIZE || input.tileheight !== REQUIRED_TILE_SIZE) {
    add("TILE_SIZE_UNSUPPORTED", "$.tilewidth", `Runtime maps must use ${REQUIRED_TILE_SIZE}x${REQUIRED_TILE_SIZE} tiles.`);
  }
  const width = Number(input.width);
  const height = Number(input.height);
  const worldWidth = width * Number(input.tilewidth);
  const worldHeight = height * Number(input.tileheight);

  ["schemaVersion", "mapId", "stageId", "title"].forEach((name) => {
    if (propertyValue(input.properties, name) === undefined) add("MAP_PROPERTY_MISSING", `$.properties.${name}`, `${name} is required.`);
  });
  const tilesets = asArray(input.tilesets);
  const tilesetRanges: TilesetRange[] = [];
  if (tilesets.length === 0) add("TILESET_MISSING", "$.tilesets", "At least one external or embedded tileset is required.");
  tilesets.forEach((tileset, index) => {
    const source = isRecord(tileset) ? tileset.source : undefined;
    if (typeof source === "string") {
      if (source.includes("..") || source.startsWith("/") || /^[a-z]+:/i.test(source)) add("TILESET_SOURCE_UNSAFE", `$.tilesets[${index}].source`, "Use a safe project-relative TSJ path.");
      return;
    }
    if (!isRecord(tileset) || typeof tileset.name !== "string" || typeof tileset.image !== "string" || !tileset.image.startsWith("/game-assets/") || tileset.image.includes("..")) {
      add("TILESET_EMBEDDED_INVALID", `$.tilesets[${index}]`, "Embed a named tileset with a safe /game-assets image path.");
      return;
    }

    const firstGid = Number(tileset.firstgid);
    const tileWidth = Number(tileset.tilewidth);
    const tileHeight = Number(tileset.tileheight);
    const tileCount = Number(tileset.tilecount);
    const columns = Number(tileset.columns);
    const imageWidth = Number(tileset.imagewidth);
    const imageHeight = Number(tileset.imageheight);
    const margin = Number(tileset.margin ?? 0);
    const spacing = Number(tileset.spacing ?? 0);
    const numericValues = [firstGid, tileWidth, tileHeight, tileCount, columns, imageWidth, imageHeight, margin, spacing];
    if (numericValues.some((value) => !Number.isInteger(value)) || firstGid < 1 || tileCount < 1 || columns < 1 || imageWidth < 1 || imageHeight < 1 || margin < 0 || spacing < 0) {
      add("TILESET_GRID_INVALID", `$.tilesets[${index}]`, "Tileset grid metadata must contain positive integer dimensions and counts.");
      return;
    }
    if (tileWidth !== REQUIRED_TILE_SIZE || tileHeight !== REQUIRED_TILE_SIZE) {
      add("TILESET_TILE_SIZE_MISMATCH", `$.tilesets[${index}]`, `Tileset tiles must be ${REQUIRED_TILE_SIZE}x${REQUIRED_TILE_SIZE}.`);
    }

    const horizontalStep = tileWidth + spacing;
    const verticalStep = tileHeight + spacing;
    const usableWidth = imageWidth - margin * 2 + spacing;
    const usableHeight = imageHeight - margin * 2 + spacing;
    const rows = usableHeight / verticalStep;
    const derivedColumns = usableWidth / horizontalStep;
    if (
      usableWidth <= 0 ||
      usableHeight <= 0 ||
      !Number.isInteger(derivedColumns) ||
      !Number.isInteger(rows) ||
      derivedColumns !== columns ||
      tileCount !== columns * rows
    ) {
      add("TILESET_GRID_INVALID", `$.tilesets[${index}]`, "Tileset image dimensions, columns and tilecount must form an exact tile grid.");
    }
    tilesetRanges.push({ firstGid, lastGid: firstGid + tileCount - 1 });
  });

  const layers = asArray(input.layers).filter(isRecord);
  const requiredLayers = {
    ground: "tilelayer",
    paths: "tilelayer",
    water: "tilelayer",
    decor: "tilelayer",
    collision: "objectgroup",
    entities: "objectgroup",
    zones: "objectgroup",
  } as const;
  Object.entries(requiredLayers).forEach(([name, type]) => {
    const matches = layers.filter((layer) => layer.name === name);
    if (matches.length === 0) add("LAYER_MISSING", `$.layers.${name}`, `${name} layer is required.`);
    if (matches.length > 1) add("LAYER_DUPLICATE", `$.layers.${name}`, `${name} layer must be unique.`);
    if (matches[0] && matches[0].type !== type) add("LAYER_TYPE_INVALID", `$.layers.${name}.type`, `${name} must be ${type}.`);
  });
  layers.filter((layer) => layer.type === "tilelayer").forEach((layer) => {
    if (!Array.isArray(layer.data) || layer.data.length !== width * height) add("TILE_DATA_SIZE_MISMATCH", `$.layers.${String(layer.name)}.data`, "Tile data length must match map dimensions.");
    if (!Array.isArray(layer.data)) return;
    const invalidIndex = layer.data.findIndex((value) => !Number.isInteger(value) || Number(value) < 0 || Number(value) > 0xffffffff);
    if (invalidIndex >= 0) {
      add("TILE_GID_INVALID", `$.layers.${String(layer.name)}.data[${invalidIndex}]`, "Tile GIDs must be unsigned 32-bit integers.");
      return;
    }
    if (tilesetRanges.length === 0) return;
    const outOfRangeIndex = layer.data.findIndex((value) => {
      const gid = (Number(value) >>> 0) & TILED_GID_MASK;
      return gid !== 0 && !tilesetRanges.some((range) => gid >= range.firstGid && gid <= range.lastGid);
    });
    if (outOfRangeIndex >= 0) {
      add("TILE_GID_OUT_OF_RANGE", `$.layers.${String(layer.name)}.data[${outOfRangeIndex}]`, "Tile GID must resolve to a declared tileset range.");
    }
  });

  const objectLayers = layers.filter((layer) => layer.type === "objectgroup");
  const objects = objectLayers.flatMap((layer) => asArray(layer.objects).filter(isRecord));
  const ids = objects.map((object) => object.name).filter((name): name is string => typeof name === "string" && name.length > 0);
  if (objects.some((object) => typeof object.name !== "string" || !object.name)) add("OBJECT_NAME_MISSING", "$.layers[*].objects[*].name", "Every object needs a stable name.");
  if (new Set(ids).size !== ids.length) add("OBJECT_ID_DUPLICATE", "$.layers[*].objects[*].name", "Object names must be unique.");
  const objectClass = (object: JsonRecord) => object.class ?? object.type;
  const allowedClasses = new Set(["obstacle", "player_spawn", "portal", "boss", "chest", "collectible", "npc", "bridge", "secret_area", "battle_safe_area"]);
  objects.forEach((object, index) => {
    const kind = objectClass(object);
    if (!allowedClasses.has(String(kind))) add("OBJECT_CLASS_UNKNOWN", `$.objects[${index}].class`, `Unsupported object class: ${String(kind)}`);
    const x = Number(object.x);
    const y = Number(object.y);
    const objectWidth = Number(object.width ?? 0);
    const objectHeight = Number(object.height ?? 0);
    if (x < 0 || y < 0 || x + objectWidth > worldWidth || y + objectHeight > worldHeight) add("OUT_OF_BOUNDS", `$.objects[${index}]`, "Object must stay inside map bounds.");
    const pointClass = kind === "player_spawn" || kind === "portal" || kind === "boss" || kind === "chest" || kind === "collectible" || kind === "npc";
    if (pointClass && object.point !== true) add("OBJECT_SHAPE_INVALID", `$.objects[${index}].point`, `${String(kind)} must be a point object.`);
    if (!pointClass && (objectWidth <= 0 || objectHeight <= 0 || object.ellipse === true || object.polygon !== undefined || object.gid !== undefined)) add("OBJECT_SHAPE_INVALID", `$.objects[${index}]`, `${String(kind)} must be a rectangle object.`);
  });
  const counts = (kind: string) => objects.filter((object) => objectClass(object) === kind).length;
  [["player_spawn", 1], ["portal", 1], ["boss", 1], ["bridge", 1], ["secret_area", 1], ["battle_safe_area", 1]].forEach(([kind, expected]) => {
    if (counts(String(kind)) !== expected) add("ENTITY_COUNT_INVALID", `$.objects.${String(kind)}`, `${String(kind)} must appear exactly once.`);
  });
  if (counts("collectible") < 1) add("ENTITY_COUNT_INVALID", "$.objects.collectible", "At least one collectible is required.");
  if (counts("npc") < 1) add("ENTITY_COUNT_INVALID", "$.objects.npc", "At least one NPC is required.");

  return errors.sort((a, b) => a.path.localeCompare(b.path) || a.code.localeCompare(b.code));
}
