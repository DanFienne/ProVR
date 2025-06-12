import {df} from './core.js';
import * as THREE from '../js/three.module.js';
import {renderer,camera,scene} from './render.js';

let isRequestInProgress = false;
let vrRing = null;

// VR 环的自转函数（使用 window.requestAnimationFrame，XR 下也会走）
function animateRing() {
    if (!vrRing) return;
    vrRing.rotation.y += 0.1;
    window.requestAnimationFrame(animateRing);
}

// 显示 VR 环
function showVRRing() {
    if (!renderer.xr.isPresenting || vrRing) return;

    // 1. 创建一个小环
    const geom = new THREE.TorusGeometry(0.2, 0.02, 16, 100);
    const mat = new THREE.MeshBasicMaterial({color: 0x00ff00});
    vrRing = new THREE.Mesh(geom, mat);

    // 2. 放到相机前方 1m
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    vrRing.position.copy(camera.position).add(dir.multiplyScalar(1));
    vrRing.quaternion.copy(camera.quaternion);

    // 3. 加到场景，启动自转
    scene.add(vrRing);
    animateRing();
}

// 隐藏并销毁 VR 环
function hideVRRing() {
    if (!vrRing) return;
    scene.remove(vrRing);
    vrRing.geometry.dispose();
    vrRing.material.dispose();
    vrRing = null;
}

// DOM 层的 loading 遮罩（可选）
function showDOMOverlay() {
    const o = document.getElementById('loading-overlay');
    if (o) o.style.display = 'flex';
}

function hideDOMOverlay() {
    const o = document.getElementById('loading-overlay');
    if (o) o.style.display = 'none';
}

function showWaitingAnimation() {
    showDOMOverlay();
    showVRRing();
}

function hideWaitingAnimation() {
    hideDOMOverlay();
    hideVRRing();
}

df.api = {
    apiRequest(url, data, callback) {
        if (isRequestInProgress) return Promise.resolve();
        isRequestInProgress = true;

        showWaitingAnimation();

        return fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: data,
        })
            .then(res => res.json())
            .then(json => {
                if (typeof callback === 'function') callback(json);
                return json;
            })
            .catch(err => console.error(err))
            .finally(() => {
                isRequestInProgress = false;
                hideWaitingAnimation();
            });
    }
};
// df.api = {
//     apiRequest: function (url, data, func) {
//         if (isRequestInProgress) return;
//         isRequestInProgress = true;
//
//         showWaitingAnimation();
//         return fetch(url, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json',
//             },
//             body: data,
//         }).then(response => {
//             return response.json();
//         }).then(responseData => {
//             if (typeof func === 'function') {
//                 func(responseData);
//                 isRequestInProgress = false;
//             }
//             return responseData;
//         }).catch(error => {
//             isRequestInProgress = false;
//             console.error('Docking fetch Error:', error);
//         }).finally(() => {
//             isRequestInProgress = false;
//             hideWaitingAnimation(); // 隐藏加载动画
//         });
//     },
//
// }