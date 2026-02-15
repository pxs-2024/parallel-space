/**
 * catalog.spaces.ts
 *
 * 按空间划分的家庭物品推荐 catalog
 * 面向普通家庭生活（非应急）
 */

export type SpaceType =
  | "ENTRYWAY"
  | "LIVING_ROOM"
  | "KITCHEN"
  | "DINING"
  | "BEDROOM"
  | "BATHROOM"
  | "WORKSPACE"
  | "MEDICAL"
  | "TOOLS"
  | "CLEANING"
  | "STORAGE"
  | "DIGITAL";

export type Priority = "P0" | "P1" | "P2";

export type SpaceCatalogItem = {
  key: string;
  name: string;
  recommendedQty: number;
  unit?: string;
  priority: Priority;
};

export type SpaceCatalog = {
  spaceType: SpaceType;
  displayName: string;
  items: SpaceCatalogItem[];
};

export const SPACE_CATALOG: SpaceCatalog[] = [

  //
  // ENTRYWAY
  //
  {
    spaceType: "ENTRYWAY",
    displayName: "入口",
    items: [
      { key: "KEYS", name: "钥匙", recommendedQty: 1, priority: "P0" },
      { key: "SPARE_KEYS", name: "备用钥匙", recommendedQty: 1, priority: "P0" },
      { key: "SHOES", name: "鞋", recommendedQty: 2, priority: "P0" },
      { key: "UMBRELLA", name: "雨伞", recommendedQty: 1, priority: "P1" },
      { key: "MASK", name: "口罩", recommendedQty: 5, priority: "P1" },
      { key: "BAG", name: "包", recommendedQty: 1, priority: "P1" },
    ],
  },

  //
  // LIVING ROOM
  //
  {
    spaceType: "LIVING_ROOM",
    displayName: "客厅",
    items: [
      { key: "SOFA", name: "沙发", recommendedQty: 1, priority: "P0" },
      { key: "TABLE", name: "茶几", recommendedQty: 1, priority: "P0" },
      { key: "TV", name: "电视", recommendedQty: 1, priority: "P1" },
      { key: "LIGHT", name: "灯", recommendedQty: 1, priority: "P0" },
      { key: "POWER_STRIP", name: "插线板", recommendedQty: 2, priority: "P0" },
      { key: "CHARGER", name: "充电器", recommendedQty: 2, priority: "P0" },
      { key: "BLANKET", name: "毯子", recommendedQty: 1, priority: "P2" },
    ],
  },

  //
  // KITCHEN
  //
  {
    spaceType: "KITCHEN",
    displayName: "厨房",
    items: [
      { key: "FRIDGE", name: "冰箱", recommendedQty: 1, priority: "P0" },
      { key: "RICE", name: "米", recommendedQty: 1, unit: "kg", priority: "P0" },
      { key: "COOKING_OIL", name: "食用油", recommendedQty: 1, priority: "P0" },
      { key: "PAN", name: "锅", recommendedQty: 1, priority: "P0" },
      { key: "KNIFE", name: "刀", recommendedQty: 1, priority: "P0" },
      { key: "CUTTING_BOARD", name: "砧板", recommendedQty: 1, priority: "P0" },
      { key: "BOWL", name: "碗", recommendedQty: 3, priority: "P0" },
      { key: "CUP", name: "杯子", recommendedQty: 3, priority: "P0" },
      { key: "UTENSILS", name: "餐具", recommendedQty: 3, priority: "P0" },
    ],
  },

  //
  // BEDROOM
  //
  {
    spaceType: "BEDROOM",
    displayName: "卧室",
    items: [
      { key: "BED", name: "床", recommendedQty: 1, priority: "P0" },
      { key: "PILLOW", name: "枕头", recommendedQty: 2, priority: "P0" },
      { key: "BLANKET", name: "被子", recommendedQty: 1, priority: "P0" },
      { key: "CLOTHES", name: "衣服", recommendedQty: 5, priority: "P0" },
      { key: "WARDROBE", name: "衣柜", recommendedQty: 1, priority: "P1" },
      { key: "LAMP", name: "台灯", recommendedQty: 1, priority: "P1" },
      { key: "CHARGER", name: "充电器", recommendedQty: 1, priority: "P0" },
    ],
  },

  //
  // BATHROOM
  //
  {
    spaceType: "BATHROOM",
    displayName: "卫生间",
    items: [
      { key: "TOOTHBRUSH", name: "牙刷", recommendedQty: 2, priority: "P0" },
      { key: "TOOTHPASTE", name: "牙膏", recommendedQty: 1, priority: "P0" },
      { key: "SOAP", name: "肥皂", recommendedQty: 1, priority: "P0" },
      { key: "SHAMPOO", name: "洗发水", recommendedQty: 1, priority: "P0" },
      { key: "TOWEL", name: "毛巾", recommendedQty: 2, priority: "P0" },
      { key: "TOILET_PAPER", name: "卫生纸", recommendedQty: 3, priority: "P0" },
    ],
  },

  //
  // WORKSPACE
  //
  {
    spaceType: "WORKSPACE",
    displayName: "工作区",
    items: [
      { key: "COMPUTER", name: "电脑", recommendedQty: 1, priority: "P0" },
      { key: "KEYBOARD", name: "键盘", recommendedQty: 1, priority: "P0" },
      { key: "MOUSE", name: "鼠标", recommendedQty: 1, priority: "P0" },
      { key: "CHARGER", name: "充电器", recommendedQty: 1, priority: "P0" },
      { key: "NOTEBOOK", name: "笔记本", recommendedQty: 1, priority: "P1" },
    ],
  },

  //
  // MEDICAL
  //
  {
    spaceType: "MEDICAL",
    displayName: "医疗区",
    items: [
      { key: "THERMOMETER", name: "体温计", recommendedQty: 1, priority: "P0" },
      { key: "MEDICINE", name: "常用药", recommendedQty: 1, priority: "P0" },
      { key: "BANDAGE", name: "创可贴", recommendedQty: 1, priority: "P0" },
      { key: "DISINFECTANT", name: "消毒用品", recommendedQty: 1, priority: "P0" },
    ],
  },

  //
  // TOOLS
  //
  {
    spaceType: "TOOLS",
    displayName: "工具区",
    items: [
      { key: "SCREWDRIVER", name: "螺丝刀", recommendedQty: 1, priority: "P0" },
      { key: "SCISSORS", name: "剪刀", recommendedQty: 1, priority: "P0" },
      { key: "FLASHLIGHT", name: "手电筒", recommendedQty: 1, priority: "P1" },
      { key: "BATTERY", name: "电池", recommendedQty: 2, priority: "P1" },
    ],
  },

  //
  // CLEANING
  //
  {
    spaceType: "CLEANING",
    displayName: "清洁区",
    items: [
      { key: "BROOM", name: "扫帚", recommendedQty: 1, priority: "P0" },
      { key: "MOP", name: "拖把", recommendedQty: 1, priority: "P0" },
      { key: "CLEANER", name: "清洁剂", recommendedQty: 1, priority: "P0" },
    ],
  },

  //
  // DIGITAL
  //
  {
    spaceType: "DIGITAL",
    displayName: "数码区",
    items: [
      { key: "PHONE", name: "手机", recommendedQty: 1, priority: "P0" },
      { key: "CHARGER", name: "充电器", recommendedQty: 2, priority: "P0" },
      { key: "POWER_BANK", name: "充电宝", recommendedQty: 1, priority: "P0" },
      { key: "ROUTER", name: "路由器", recommendedQty: 1, priority: "P0" },
    ],
  },

];
