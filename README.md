# Voxel Mountain · 体素山水（Three.js）

一个可直接运行的 3D 体素（Voxel）风格自然景观：山脉 + 瀑布 + 穿云效果，风格类似 Minecraft 方块拼接。

## 运行方式

需要 Node.js ≥ 18（推荐 20+）。

```bash
npm install     # 安装依赖（three + vite）
npm run dev     # 启动开发服务器
```

打开浏览器访问终端中显示的地址（默认 <http://localhost:5173>），页面打开即进入场景并自动环绕展示全貌。

```bash
npm run build   # 产出静态文件到 dist/
npm run preview # 本地预览构建产物
```

## 交互

- 鼠标拖拽：旋转视角
- 滚轮：缩放
- 默认自动缓慢环绕山体；右上角显示实时 FPS

## 场景说明

- **山体**：程序化高度图（主峰 + 4 座次峰 + fbm 起伏），InstancedMesh 渲染体素块，含雪线、陡坡岩壁、海岸沙滩过渡
- **瀑布**：沿主峰正面最陡下降路径自动寻路并凿出溪谷，水方块沿路径循环流动，山脚有跌水潭与流向海岸的溪流
- **穿云**：山腰一圈半透明体素云环绕漂移，主峰与较高的次峰穿出云层；云与山体存在真实的前后遮挡（深度测试）
- **环境**：低角度暖色黄昏定向光 + 实时阴影、渐变天穹、雾、周边水面；山脚分布体素树木与灌木

## 性能

地形/树木约 3-4 万个体素实例合批为单次 DrawCall，水流单独一个 InstancedMesh 每帧更新约数百实例，云约 150 实例。普通核显即可稳定 60fps。

## 项目结构

```
index.html         页面与 HUD
src/main.js        渲染器 / 天空 / 灯光 / 相机 / 主循环
src/world.js       世界生成：高度图、瀑布寻路、水潭与溪流凿刻
src/terrain.js     地形体素实例生成（含树木、灌木）
src/waterfall.js   瀑布流动画 + 静态水体
src/clouds.js      云层环带与漂移动画
src/voxel.js       体素实例合批工具
src/noise.js       种子化 value-noise / fbm
src/palette.js     体素配色
```
