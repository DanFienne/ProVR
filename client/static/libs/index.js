import * as THREE from '../js/three.module.js';
import {OBJLoader} from '../js/loaders/OBJLoader.js';
import {df} from './core.js';
import {w3m} from "./web3D/w3m.js";
import {camera, canon, scene} from "./render.js";
import {createMenuButton} from "./menu.js";


(function clearCacheOnFirstLoad() {
    if (!localStorage.getItem('threejs_cache_cleared')) {
        // 1. 清理 localStorage 和 sessionStorage
        localStorage.clear();
        sessionStorage.clear();

        // 2. 清理 IndexedDB
        if (window.indexedDB && indexedDB.databases) {
            indexedDB.databases().then(dbs => {
                dbs.forEach(db => {
                    indexedDB.deleteDatabase(db.name);
                });
            });
        }

        // 3. 清理 Service Worker 缓存
        if ('caches' in window) {
            caches.keys().then(function (names) {
                for (let name of names) {
                    caches.delete(name);
                }
            });
        }

        // 4. 注销 Service Worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function (registrations) {
                for (let registration of registrations) {
                    registration.unregister();
                }
            });
        }

        // 标记已清理
        localStorage.setItem('threejs_cache_cleared', '1');
    }
})();


// hide submenu
function switchMenu(obj) {
    if (document.getElementById) {
        let el = document.getElementById(obj);
        let ar = document.getElementById("SideToolbar").getElementsByTagName("span");
        if (el.style.display !== "block") {
            for (let i = 0; i < ar.length; i++) {
                if (ar[i].className === "subMenu")
                    ar[i].style.display = "none";
            }
            el.style.display = "block";
        } else {
            el.style.display = "none";
        }
    }
}

df.controller.init();
df.leftRing = df.drawer.Ring();
df.rightRing = df.drawer.Ring();


// 初始化menu菜单
let menuOpen = false;
// df.drawer.createMenuButton();

// for (let i in df.menuList) {
//     let pos = new THREE.Vector3(0, -1, -4);
//     let height = -i * (df.textMenuHeight + df.letterSpacing);
//     pos.y = -1 + height;
//     let label = df.MAIN_MENU;
//     let mesh = df.drawer.createTextButton(df.menuList[i], pos, label);
// }

df.GROUP['menu'].visible = df.showMenu;
createMenuButton();

df.lfpt = df.drawer.createSprite('point')
// df.scoreValue = df.drawer.createSprite('score')
df.drawer.updateText('1', df.lfpt)
// df.drawer.updateText('1', df.scoreValue)


const loader = new OBJLoader();


// load config


// df.loader.load('4eu2', 'name', function () {
//     df.controller.drawGeometry(df.config.mainMode, '4eu2');
//     // df.painter.showSurface('aaaa', 'A', 1);
//     df.SelectedPDBId = '4eu2';
//     for (let index in df.GROUP['4eu2']) {
//         for (let i in df.GROUP['4eu2'][index]) {
//             let aaa = df.GROUP['4eu2'][index][i];
//             df.tool.addIndex(aaa);
//         }
//     }
// });
//
//

//


// df.loader.load('fab1', 'name', function () {
//     df.controller.drawGeometry(df.config.mainMode, 'fab1');
//     df.controller.drawGeometry(df.config.hetMode, 'fab1');
// });
// df.loader.load('fab2', 'name', function () {
//     df.controller.drawGeometry(df.config.mainMode, 'fab2');
//     df.controller.drawGeometry(df.config.hetMode, 'fab2');
// });
// df.loader.load('fab3', 'name', function () {
//     df.controller.drawGeometry(df.config.mainMode, 'fab3');
//     df.controller.drawGeometry(df.config.hetMode, 'fab3');
// });
//
// df.loader.load('fab4', 'name', function () {
//     df.controller.drawGeometry(df.config.mainMode, 'fab4');
//     // df.controller.drawGeometry(df.config.hetMode, 'par5');
//     loader.load(
//         'static/css/model.obj',
//         (object) => {
//             df.GROUP['fab4']['main'].A.add(object);
//             console.log('pos', object.position)
//             const worldBox = new THREE.Box3().setFromObject(object);
//             const worldBox1 = new THREE.Box3().setFromObject(df.GROUP['fab4']['main'].A.children[0]);
//             const sourceWorldCenter1 = new THREE.Vector3();
//             worldBox.getCenter(sourceWorldCenter1);
//             const sourceWorldCenter2 = new THREE.Vector3();
//             worldBox1.getCenter(sourceWorldCenter2);
//             console.log('cen1', sourceWorldCenter1, "cen2", sourceWorldCenter2)
//             const pos1 = sourceWorldCenter2.sub(sourceWorldCenter1)
//             object.position.copy(pos1);
//             object.updateWorldMatrix(true, true);
//             console.log(object.position)
//             // object.scale.set(0.02, 0.02, 0.02);
//         },
//         (xhr) => {
//             console.log((xhr.loaded / xhr.total * 100) + '% loaded');
//         },
//         (error) => {
//             console.error(error);
//         }
//     );
//
// });


// 假设 df 是全局对象，包含 loader, controller, config 等
// 每个 PDB 的几何体将存储在一个对象中
// pdbObjects = {};

df.pdbObjects = [];
for (let i = 100; i >= 1; i--) {
    df.pdbObjects.push('f' + i.toString().padStart(3, '0'));
}


// loadAllPDBs();

// 依次显示每个结构


// df.loader.load('4oqw', 'name', function () {
//     df.controller.drawGeometry(df.config.mainMode, '4oqw');
// df.controller.drawGeometry(df.config.hetMode, '4ulh');
// });
// df.loader.load('4ulb', 'name', function () {
//     df.controller.drawGeometry(df.config.mainMode, '4ulb');
//     // df.controller.drawGeometry(df.config.hetMode, '4ulh');
// });
// df.loader.load('tes2', 'name', function () {
//     df.controller.drawGeometry(df.config.mainMode, 'tes2');
//     df.controller.drawGeometry(df.config.hetMode, 'tes2');
// });


//
// function normalizeGroup(group) {
//     // 计算 Group 的边界盒
//     const groupBox = new THREE.Box3().setFromObject(group);
//
//     // 获取边界盒的中心点和大小
//     const center = new THREE.Vector3();
//     const size = new THREE.Vector3();
//     groupBox.getCenter(center); // 获取边界中心点
//     groupBox.getSize(size); // 获取边界大小
//
//     // 将 Group 的原点移动到边界中心点
//     group.children.forEach((child) => {
//         child.position.sub(center); // 调整每个子对象的位置
//     });
//
//     // 重置 Group 的位置到边界的中心点
//     group.position.add(center);
//
//     console.log("Normalized Group:");
//     console.log("Center:", center);
//     console.log("Size:", size);
// }
//
//
// df.loader.load('para', 'name', function () {
//     df.controller.drawGeometry(df.config.mainMode, 'para');
//     df.controller.drawGeometry(df.config.hetMode, 'para');
//
//     function arrangeGroupsInRow(groups, targetSize, spacing = 1) {
//         const positions = [];
//         let currentX = 0;
//         let sc1 = 0;
//
//         groups.forEach((per) => {
//             // Compute the bounding box for the group
//
//             let dicts = per.main
//             console.log(dicts)
//
//             const group = new THREE.Group();
//             for (const groupIdx in dicts) {
//                 let originalGroup = dicts[groupIdx];
//                 originalGroup.children.forEach((child) => {
//                     if (child instanceof THREE.Mesh) {
//                         const clonedMesh = child.clone(); // 复制 Mesh
//                         group.add(clonedMesh); // 添加到新 Group
//                     }
//                 });
//             }
//
//             if (dicts.name !== 'gly1_main_A') {
//                 // normalizeGroup(group)
//                 const groupBox = new THREE.Box3().setFromObject(group);
//
//                 // 获取边界盒的中心点和大小
//                 const center = new THREE.Vector3();
//                 const centerSize = new THREE.Vector3();
//                 groupBox.getCenter(center); // 获取边界中心点
//                 groupBox.getSize(centerSize); // 获取边界大小
//
//                 for (const groupIdx in dicts) {
//                     let originalGroup = dicts[groupIdx];
//                     originalGroup.children.forEach((child) => {
//                         child.position.sub(center); // 调整每个子对象的位置
//                     });
//                     originalGroup.position.add(center);
//                 }
//             }
//
//
//             const box = new THREE.Box3().setFromObject(group);
//             const size = new THREE.Vector3();
//             box.getSize(size); // Get the size of the group
//             const maxDimension = Math.max(size.x, size.y, size.z);
//             const scale = targetSize / maxDimension;
//
//
//             // Scale the group to match the target size
//
//             group.scale.set(scale, scale, scale);
//
//             // Recompute bounding box after scaling
//             const scaledBox = new THREE.Box3().setFromObject(group);
//             const scaledSize = new THREE.Vector3();
//             scaledBox.getSize(scaledSize);
//             group.position.set(currentX + scaledSize.x / 2, 0, 0);
//             // Position the group
//
//             // Align to the center horizontally
//             for (const groupIdx in dicts) {
//                 let originalGroup = dicts[groupIdx];
//                 originalGroup.scale.set(scale, scale, scale);
//                 originalGroup.position.set(currentX + scaledSize.x / 2, 0, 0);
//             }
//             sc1 = scaledSize
//             positions.push(group.position.clone());
//             currentX += sc1.x + spacing;
//         });
//         return positions;
//     }
//
//     // Create some example groups
//     const groups = [];
//     groups.push(df.GROUP['4jr1'], df.GROUP['para'], df.GROUP['shet'], df.GROUP['tur1'], df.GROUP['she2'], df.GROUP['tur2'],
//         df.GROUP['4eul'], df.GROUP['hel1'], df.GROUP['gly1'])
//
//     // Arrange the groups into a row
//     const targetSize = 0.1; // Target size for each group
//     const spacing = 0.01; // Spacing between groups
//     arrangeGroupsInRow(groups, targetSize, spacing);
// });


// Helper function to resize and align groups
function createStepIndicator(camera) {
    // 1) 离屏 Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');

    // 2) Three.js 纹理
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;

    // 3) 精灵材质
    const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false
    });

    // 4) 精灵 & 大小 & 位置
    const sprite = new THREE.Sprite(material);
    // 物理尺寸：宽 0.8m，高 0.3m
    sprite.scale.set(0.8, 0.3, 1);
    // 左上方、稍微往前
    sprite.position.set(-0.8, 0.8, -2);

    camera.add(sprite);

    // 5) 返回更新函数
    return function updateStepText(step) {
        // 当 step == 100 时隐藏精灵
        if (step === 100) {
            sprite.visible = false;
            return;
        } else {
            sprite.visible = true;
        }

        const text = step;
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 文本样式
        const fontSize = 96;
        ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
        ctx.textBaseline = 'middle';

        // 测量文字宽度
        const metrics = ctx.measureText(text);
        const textWidth = metrics.width;

        // 背景矩形参数
        const paddingX = 20;
        const paddingY = 10;
        const rectX = 10;
        const rectY = (canvas.height - fontSize) / 2 - paddingY;
        const rectW = textWidth + paddingX * 2;
        const rectH = fontSize + paddingY * 2;

        // 画白底
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(rectX, rectY, rectW, rectH);

        // 画黑框
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#000000';
        ctx.strokeRect(rectX, rectY, rectW, rectH);

        // 画文字（黑色填充）
        ctx.fillStyle = '#000000';
        ctx.fillText(text, rectX + paddingX, canvas.height / 2);

        // 通知更新纹理
        texture.needsUpdate = true;
    };
}


// —————————————— 使用示例 ——————————————

// 假设这里是你的全局 VR 相机
// let camera = df.config.vrCamera 或者你自己持有的 camera 实例
df.updateStepText = createStepIndicator(camera);