// initVR
import * as THREE from '../js/three.module.js';
import {VRButton} from '../js/webxr/VRButton.js';
import {OrbitControls} from '../js/controls/OrbitControls.js';
import {OculusHandModel} from '../js/webxr/OculusHandModel.js';
import {XRControllerModelFactory} from '../js/webxr/XRControllerModelFactory.js';
import {df} from './core.js';
import {onTriggerDown, onTriggerUp, getIntersectionsRing} from './gamepad.js';
import {OculusHandPointerModel} from "../js/webxr/OculusHandPointerModel.js";

var container;
var camera, scene, renderer, leftRayCaster, rightRayCaster;
var canon = new THREE.Object3D();
canon.name = 'canon'
var lightType = 0;
// initVR -- controls
var controls, leftController, leftControllerGrip, rightController, rightControllerGrip, leftHand, rightHand;
var leftObject = null;
var rightObject = null;

// Design Mode
var DesignScene, DesignCamera;

const createGrid = (size, divisions, position, rotation, grids, scene) => {
    const gridHelper = new THREE.GridHelper(size, divisions);
    gridHelper.position.copy(position);
    gridHelper.rotation.set(rotation.x, rotation.y, rotation.z);
    // gridHelper.visible = false;
    scene.add(gridHelper);
    grids.push(gridHelper);
};


df.dfRender = {
    vrScene: function () {
        let newScene = new THREE.Scene();
        // 背景: 深蓝色
        // newScene.background = new THREE.Color(0x0000e0);
        newScene.background = new THREE.Color(0xffffff);
        // newScene.background = new THREE.Color(0x888888);
        // 创建一个半球光源 HemisphereLight(skyColor, groundColor)
        const hemisphereLight = new THREE.HemisphereLight(0x74B9FF, 0x2C3E50);
        newScene.add(hemisphereLight);
        // 创建网格背景
        const size = 20;
        const divisions = 20;
        // const gridHelper = new THREE.GridHelper(size, divisions);
        // newScene.add(gridHelper);
        let grids = []
        // 添加各个方向的网格
        // createGrid(size, divisions, new THREE.Vector3(0, 0, 0), new THREE.Euler(0, 0, 0), grids, newScene);
        // createGrid(size, divisions, new THREE.Vector3(0, size, 0), new THREE.Euler(0, 0, 0), grids, newScene);
        // createGrid(size, divisions, new THREE.Vector3(size / 2, size / 2, 0), new THREE.Euler(0, 0, Math.PI / 2), grids, newScene);
        // createGrid(size, divisions, new THREE.Vector3(-size / 2, size / 2, 0), new THREE.Euler(0, 0, -Math.PI / 2), grids, newScene);
        // createGrid(size, divisions, new THREE.Vector3(0, size / 2, size / 2), new THREE.Euler(-Math.PI / 2, 0, 0), grids, newScene);
        // createGrid(size, divisions, new THREE.Vector3(0, size / 2, -size / 2), new THREE.Euler(Math.PI / 2, 0, 0), grids, newScene);
        return newScene;
    },
    vrCamera: function () {
        // 创建透视相机，参数分别是：视场角，宽高比，近剪裁面距离，远剪裁面距离
        let newCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50000);
        // 设置相机初始位置
        // newCamera.position.set(0, 1.6, 300);
        newCamera.position.set(0, 1.6, 3);
        return newCamera;
    },
    nonVrControls: function (cameras, divs) {
        return new OrbitControls(cameras, divs);
    },
    addLightsByType: function (lightType) {
        if (lightType === 0) {
            let light = new THREE.DirectionalLight(0xF8D5A3, 1.2);
            // let light = new THREE.DirectionalLight(0xFFFFFF, 1.2);
            light.position.copy(camera.position);
            camera.add(light);
        }
    },
    initSceneGroup: function () {
        // df.GROUP.init
        for (let idx in df.GROUP_INDEX) {
            let gName = df.GROUP_INDEX[idx];
            df.GROUP[gName] = new THREE.Group();
            df.GROUP[gName].danfeng = 1
            df.GROUP[gName].name = gName;
            if (gName === 'menu') {
                camera.add(df.GROUP[gName]);
            } else {
                scene.add(df.GROUP[gName]);
            }
        }
    },
    initRender: function () {
        let renderer = new THREE.WebGLRenderer({
            antialias: true,
            gammaOutput: true
        });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true;
        container.appendChild(renderer.domElement);
        renderer.xr.enabled = true;
        return renderer;
    },
    createController: function (renderer, camera, num) {
        let controller = renderer.xr.getController(num);
        camera.add(controller);
        return controller;
    },
    createControllerGrip: function (renderer, camera, modelFactory, num) {
        let controllerGrip = renderer.xr.getControllerGrip(num);
        controllerGrip.add(modelFactory.createControllerModel(controllerGrip));
        camera.add(controllerGrip);
        return controllerGrip;
    },
    createControllerLine: function () {
        let geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));
        let material = new THREE.LineBasicMaterial({
            color: 0x000000,
            vertexColors: true,
            linewidth: 1,
            toneMapped: false
            // blending: THREE.AdditiveBlending
        });
        let line = new THREE.Line(geometry, material);
        line.name = 'line';
        line.scale.z = 5;

        line.visible = true;
        return line;
    },
    createHandController: function (renderer, camera, num) {
        let hand = renderer.xr.getHand(num);
        let handModel = new OculusHandModel(hand);
        hand.add(handModel);
        camera.add(hand);
        return hand;
    },
    initVR: function () {
        // 创建一个模块
        container = document.createElement('div');
        document.body.appendChild(container);
        // Scene
        scene = this.vrScene();
        // Camera
        camera = this.vrCamera();
        // 移动 Camera
        canon.add(camera);
        scene.add(canon);
        // 在 web 页面中旋转移动 pdb
        controls = this.nonVrControls(camera, container);
        controls.target.set(0, 1.6, 0);
        controls.update();
        // 初始化 scene group;
        this.initSceneGroup();
        this.addLightsByType(lightType);
        // init VR render
        renderer = this.initRender();
        renderer.extensions.get('ANGLE_instanced_arrays');
        renderer.extensions.get('OES_element_index_uint');

        // renderer.setPixelRatio(window.devicePixelRatio * 0.5); // 降低像素比率
        // renderer.shadowMap.enabled = false;

        const sessionInit = {
            requiredFeatures: ['hand-tracking']
        };

        document.body.appendChild(VRButton.createButton(renderer, sessionInit));
        // document.body.appendChild(VRButton.createButton(renderer));
        // 监听 vr
        let isImmersive = false;
        renderer.xr.addEventListener('sessionstart', () => {
            // df.scale = 0.1;
            // df.scale = 0.005;
            let list = []
            for (let argumentsKey in df.pdbText) {
                for (let index in df.GROUP[argumentsKey]) {
                    for (let i in df.GROUP[argumentsKey][index]) {
                        let aaa = df.GROUP[argumentsKey][index][i];
                        list.push(aaa);
                        aaa.scale.set(df.scale, df.scale, df.scale);
                        if (aaa.surface) {
                            let bbb = aaa.surface;
                            bbb.scale.set(df.scale, df.scale, df.scale);
                        }
                    }
                }
            }
            df.tool.vrCameraCenter(canon, camera, list);

            isImmersive = true;
        });
        renderer.xr.addEventListener('sessionend', () => {
            isImmersive = false;
        });

        // xr
        leftController = this.createController(renderer, canon, 1);
        rightController = this.createController(renderer, canon, 0);
        leftRayCaster = new THREE.Raycaster();
        leftRayCaster.camera = camera;
        rightRayCaster = new THREE.Raycaster();
        rightRayCaster.camera = camera;

        // Hand
        leftHand = this.createHandController(renderer, canon, 1);
        rightHand = this.createHandController(renderer, canon, 0);

        let controllerModelFactory = new XRControllerModelFactory();
        leftControllerGrip = this.createControllerGrip(renderer, canon, controllerModelFactory, 1);
        rightControllerGrip = this.createControllerGrip(renderer, canon, controllerModelFactory, 0);
        const leftControllerPointer = new OculusHandPointerModel(leftHand, leftController);
        const rightControllerPointer = new OculusHandPointerModel(rightHand, rightController);
        leftHand.add(leftControllerPointer);
        rightHand.add(rightControllerPointer);

        // 射线
        let leftLine = this.createControllerLine();
        let rightLine = this.createControllerLine();
        leftController.add(leftLine);
        rightController.add(rightLine);

        leftController.addEventListener('selectstart', function (event) {
            let leftTempMatrix = new THREE.Matrix4();
            // df.tool.initPDBView(df.SelectedPDBId);
            const inputSources = renderer.xr.getSession().inputSources;
            if (inputSources && inputSources[0]) {
                if (inputSources[0].hand && (inputSources[0].handedness === 'left')) {
                    onTriggerDown(event, leftRayCaster, leftTempMatrix, leftControllerPointer.pointerObject);
                } else if (inputSources[0].gamepad) {
                    onTriggerDown(event, leftRayCaster, leftTempMatrix, event.target);
                }
            }
            // df.tool.vrCameraCenter(canon, df.GROUP['1cbs']['main']['a'].children[10]);
        });
        rightController.addEventListener('selectstart', function (event) {
            let rightTempMatrix = new THREE.Matrix4();
            const inputSources = renderer.xr.getSession().inputSources;
            if (inputSources && inputSources[1] && (inputSources[1].handedness === 'right')) {
                if (inputSources[1].hand) {
                    // leftLine.visible = false;
                    // rightLine.visible = false;
                    onTriggerDown(event, rightRayCaster, rightTempMatrix, rightControllerPointer.pointerObject);
                } else if (inputSources[1].gamepad) {
                    // leftLine.visible = true;
                    // rightLine.visible = true;
                    onTriggerDown(event, rightRayCaster, rightTempMatrix, event.target);
                }
            }
        });
        leftController.addEventListener('selectend', function (event) {
            onTriggerUp(event);
        });
        rightController.addEventListener('selectend', function (event) {
            onTriggerUp(event);
        });
        window.addEventListener('resize', onWindowResize, false);

        // Desgin Mode
        // Scene
        DesignScene = this.vrScene();
        // Camera
        DesignCamera = this.vrCamera();
        df.render = renderer;


        // camera.updateProjectionMatrix();
        function animate() {
            // 选中 residue 并拖拽
            if (df.selection === df.select_residue) {
                if (df.SELECTED_RESIDUE.type === df.MeshType) {
                    if (df.config.mainMode === df.CARTOON_SSE) {

                        // 根据 select residue 获取 residue信息
                        let meshInfo = df.SELECTED_RESIDUE.userData.presentAtom
                        let meshId = meshInfo.id;
                        let meshPos = new THREE.Vector3(meshInfo.pos.x, meshInfo.pos.y, meshInfo.pos.z);
                        let molId = meshInfo.pdbId;
                        let controller_mesh = df.SELECTED_RESIDUE.matrixWorld;
                        // if (df.SELECTED_RESIDUE.controller) {
                        //     controller_mesh = df.SELECTED_RESIDUE.controller
                        // }
                        meshPos.applyMatrix4(controller_mesh);
                        let x = meshPos.x / ((df.scale));
                        let y = meshPos.y / ((df.scale));
                        let z = meshPos.z / ((df.scale));

                        // console.log("xyz", x, y, z)
                        // 修改 df.PathList 对应坐标
                        for (let k in df.PathList[0]) {
                            if (df.PathList[0][k][0] === meshId) {
                                df.PathList[0][k][1][0] = parseFloat(x.toFixed(3));
                                df.PathList[0][k][1][1] = parseFloat(y.toFixed(3));
                                df.PathList[0][k][1][2] = parseFloat(z.toFixed(3));
                            }
                        }
                        // let posDIct = {'matrixWorld': df.SELECTED_RESIDUE.matrixWorld}
                        let posDIct = {}
                        posDIct = df.tool.getResidueNewPos(df.SELECTED_RESIDUE, posDIct)
                        df.dfRender.changePDBData(posDIct);
                        df.tool.changeFrame(molId, meshId);
                        df.dfRender.clear(0);
                        // 重新生成 residue 结构
                        // df.painter.showAllResidues(df.config.mainMode, df.SelectedPDBId);
                        df.controller.drawGeometry(df.config.mainMode, df.SelectedPDBId);
                        for (let i in df.GROUP[df.SelectedPDBId]['main']) {
                            let aaa = df.GROUP[df.SelectedPDBId]['main'][i];
                            aaa.scale.set(df.scale, df.scale, df.scale);
                            // df.tool.vrCameraCenter(camera, aaa.children[10]);
                        }
                    }
                }
            }
            // raycaster
            if (isImmersive) {
                const xrSession = renderer.xr.getSession();
                if (!leftObject) {
                    leftObject = leftController;
                }
                if (!rightObject) {
                    rightObject = rightController;
                }
                xrSession.addEventListener('inputsourceschange', (event) => {
                    xrSession.inputSources.forEach((inputSource) => {
                        console.log("inputSource", inputSource)
                        if (inputSource.hand) {
                            switch (inputSource.handedness) {
                                case 'left':
                                    leftObject = leftControllerPointer.pointerObject
                                    break
                                // case 'right':
                                //     rightObject = rightControllerPointer.pointerObject
                                //     break
                            }
                        } else if (inputSource.gamepad) {
                            switch (inputSource.handedness) {
                                case 'left':
                                    leftObject = leftController
                                    break
                                // case 'right':
                                //     rightObject = rightController
                                //     break
                            }
                        }
                    });
                });
                let leftTempMatrix = new THREE.Matrix4();
                let leftintersect = getIntersectionsRing(leftObject, leftRayCaster, leftTempMatrix);
                let rightTempMatrix = new THREE.Matrix4();
                let rightintersect = getIntersectionsRing(rightObject, rightRayCaster, rightTempMatrix);
                if (leftintersect) {
                    let obj = leftintersect.object;
                    if (obj.userData && obj.userData.presentAtom) {
                        let tsAtom = obj.userData.presentAtom;
                        let index = obj.parent.children.indexOf(obj)
                        if (index) {
                            let text = tsAtom.pdbId + '/' + tsAtom.chainName + '/' + tsAtom.resId + '/' + tsAtom.resName + '/' + tsAtom.name + '/' + index
                            df.lfpt.position.copy(leftintersect.point)
                            df.lfpt.position.z = leftintersect.point.z - 0.01
                            df.drawer.updateText(text, df.lfpt)
                        }
                    }
                    // 将Sprite移动到交点处
                    df.leftRing.position.copy(leftintersect.point);
                    const distance = camera.position.distanceTo(leftintersect.point);
                    // 计算比例因子，保持大小不变
                    const scaleFactor = distance / df.ringDistance;
                    df.leftRing.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    df.leftRing.visible = true;
                } else {
                    df.leftRing.visible = false;
                }
                if (rightintersect) {
                    let obj = rightintersect.object;
                    if (obj.userData && obj.userData.presentAtom) {
                        let tsAtom = obj.userData.presentAtom;
                        let index = obj.parent.children.indexOf(obj)
                        let text = tsAtom.pdbId + '/' + tsAtom.chainName + '/' + tsAtom.resId + '/' + tsAtom.resName + '/' + tsAtom.name + '/' + index
                        df.lfpt.position.copy(rightintersect.point)
                        df.lfpt.position.z = rightintersect.point.z - 0.01
                        df.drawer.updateText(text, df.lfpt)
                    }
                    // const intersect = rightintersect[0];
                    // 将Sprite移动到交点处
                    df.rightRing.position.copy(rightintersect.point);
                    const distance = camera.position.distanceTo(rightintersect.point);

                    // 计算比例因子，保持大小不变
                    const scaleFactor = distance / df.ringDistance;
                    df.rightRing.scale.set(scaleFactor, scaleFactor, scaleFactor);
                    df.rightRing.visible = true;
                } else {
                    df.rightRing.visible = false;
                }
            }


            // 1) 检测手柄按键
            const session = renderer.xr.getSession();
            if (session) {
                for (const source of session.inputSources) {
                    if (source.gamepad) {
                        const gp = source.gamepad;
                        // 以 buttons[3] 为例，检测从松开到按下的那一刻
                        const btn = gp.buttons[1];
                        if (btn.pressed && !btn._prev) {
                            // 底部按键被一次按下
                            togglePause();
                        }
                        btn._prev = btn.pressed;
                    }
                }
            }

            // 1) 拿到摄像机世界坐标
            // 获得摄像机世界坐标
            const camPos = new THREE.Vector3();
            camera.getWorldPosition(camPos);

            df.numberedSpheres.forEach(item => {
                const {mesh, sprite, radius} = item;
                // 1) 计算球心世界坐标
                const center = new THREE.Vector3();
                mesh.getWorldPosition(center);
                // 2) 朝向摄像机的方向
                const dir = new THREE.Vector3().subVectors(camPos, center).normalize();
                // 3) 在球表面稍外侧的世界坐标
                const worldPos = center.clone().addScaledVector(dir, radius + 0.01);
                // 4) 把 worldPos 转成精灵父对象（group）本地坐标
                sprite.parent.worldToLocal(worldPos);
                // 5) 赋值给 sprite.position
                sprite.position.copy(worldPos);
                // THREE.Sprite 会自动面向摄像机
            });

            camera.updateProjectionMatrix();
            renderer.render(scene, camera);
        }

        controls.update();
        renderer.setAnimationLoop(animate);

        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        }
    },
    // todo
    clear: function (mode, pdbId) {
        THREE.Cache.clear();
        switch (mode) {
            case 0:
                for (let modeKey in df.GROUP[df.SelectedPDBId]) {
                    df.tool.clearGroupIndex(df.GROUP[df.SelectedPDBId][modeKey]);
                }
                break;
            case 1:
                df.tool.clearGroupIndex(df.GROUP_HET);
                break;
        }
    },
    changePDBData: function (resDict) {
        let key = Object.keys(resDict)
        if (!key || key.length === 0) {
            return ''
        }
        let pdbId = key[0].split("_")[0];
        let PDBFormat = "";
        if (df.pdbText[pdbId].length > 0) {
            const text = df.pdbText[pdbId].split('\n');
            for (let i = 0; i < text.length; i++) {
                let line = text[i];
                let line_atom = w3m_sub(line, 0, 6).toLowerCase();
                switch (line_atom) {
                    case 'atom':
                        const residue_id = w3m_sub(line, 23, 27);
                        const atom_name = w3m_sub(line, 13, 16).toLowerCase();
                        const atom_chain = w3m_sub(line, 22) || 'x';
                        let keys = pdbId + "_" + atom_chain + "_" + residue_id + "_" + atom_name;
                        if (resDict.hasOwnProperty(keys)) {
                            const b_x = (resDict[keys].x / df.scale).toFixed(3);
                            const b_y = (resDict[keys].y / df.scale).toFixed(3);
                            const b_z = (resDict[keys].z / df.scale).toFixed(3);
                            line = line.replace(w3m_sub(line, 31, 38).padStart(8, ' '), b_x.padStart(8, ' '));
                            line = line.replace(w3m_sub(line, 39, 46).padStart(8, ' '), b_y.padStart(8, ' '));
                            line = line.replace(w3m_sub(line, 47, 54).padStart(8, ' '), b_z.padStart(8, ' '));
                        }
                        PDBFormat = PDBFormat + line + "\n";
                        break;
                    case 'hetatm':
                        PDBFormat = PDBFormat + line + "\n";
                        break;
                    default:
                        PDBFormat = PDBFormat + line + "\n";
                        break;
                }
            }
        }
        df.pdbText[pdbId] = PDBFormat;
        return PDBFormat;
    }
}

function togglePause() {
    if (!df.isPaused) {
        // 由“运行”=>“暂停”
        df.isPaused = true;
        // 创建一个新的 Promise，等到 resume() 才 resolve
        const p = new Promise(res => {
            df._resumeResolve = res;
        });
        return p; // 可选：让调用者拿到这个 Promise
    } else {
        // 由“暂停”=>“运行”
        df.isPaused = false;
        if (df._resumeResolve) {
            df._resumeResolve();     // 解除 loadAllPDBs 中的 await
            df._resumeResolve = null;
        }
    }
}

window.df = df;

export {
    container,
    camera,
    scene,
    renderer,
    leftRayCaster,
    rightRayCaster,
    canon,
    controls,
    leftController,
    leftControllerGrip,
    rightController,
    rightControllerGrip,
    leftHand,
    rightHand,
    DesignScene,
    DesignCamera
}
