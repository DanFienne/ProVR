import * as THREE from '../js/three.module.js';
import {OBJLoader} from '../js/loaders/OBJLoader.js';
import {df} from './core.js';
import {w3m} from "./web3D/w3m.js";
import {camera, canon, scene} from "./render.js";
import {createMenuButton} from "./menu.js";


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
df.drawer.createMenuButton();

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
df.scoreValue = df.drawer.createSprite('score')
df.drawer.updateText('1', df.lfpt)
df.drawer.updateText('1', df.scoreValue)


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
for (let i = 500; i >= 1; i--) {
  df.pdbObjects.push('f' + i.toString().padStart(3, '0'));
}


// loadAllPDBs();

// 依次显示每个结构


// df.loader.load('4ulh', 'name', function () {
//     df.controller.drawGeometry(df.config.mainMode, '4ulh');
//     // df.controller.drawGeometry(df.config.hetMode, '4ulh');
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
