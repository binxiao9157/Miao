# Desktop Pet Material System

## 目标

桌宠素材包以 `pet.json + spritesheet.webp` 为最小单元。运行时通过 `/api/desktop/pets` 发现素材，通过 `/desktop-pet-assets/pets/{id}/pet.json` 加载 manifest，再按动作帧段播放。

## 素材包结构

```text
public/
  desktop-pets/
    pets/
      orange-tabby-natural-pet/
        pet.json
        spritesheet.webp
```

服务端默认读取仓库内 `public/desktop-pets/pets`。如需临时验证外部素材目录，可通过 `MIAO_DESKTOP_PETS_DIR=/path/to/pets` 覆盖。

## pet.json 关键字段

```json
{
  "id": "orange-tabby-natural-pet",
  "displayName": "Orange Tabby",
  "description": "A natural side-view orange tabby cat.",
  "spritesheetPath": "spritesheet.webp",
  "columns": 8,
  "rows": 9,
  "frameWidth": 192,
  "frameHeight": 208,
  "fps": 10,
  "scale": 1,
  "animations": {
    "idle": { "frames": [0, 1, 2, 3, 4, 5], "fps": 8, "loop": true },
    "tail": { "frames": [8, 9, 10], "fps": 10, "loop": true, "next": "idle" },
    "rubbing": { "frames": [24, 25, 26], "fps": 10, "loop": true, "next": "idle" },
    "blink": { "frames": [40, 41, 42], "fps": 8, "loop": true, "next": "idle" }
  }
}
```

## 运行校验

```bash
npm run desktop:pets:validate
```

校验会检查：

- `pet.json` 是否存在。
- `spritesheet.webp` 是否存在。
- 图片尺寸是否等于 `columns * frameWidth` 和 `rows * frameHeight`。
- `idle / tail / rubbing / blink` 是否都有帧段。
- 动作帧是否越界或指向透明空帧。

## 运行预览

```bash
MIAO_DESKTOP_DEV_URL='http://localhost:3000/desktop-pet?spritePet=orange-tabby-natural-pet' npm run desktop:dev
```

也可以在桌宠设置面板的“桌宠素材”下拉中切换素材；选择“业务猫咪”会回到当前生成猫咪的桌宠模式。
