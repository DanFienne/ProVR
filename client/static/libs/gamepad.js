// var raster = new THREE.Raycaster();
import {df} from './core.js';
import {camera, canon, scene} from './render.js';
import * as THREE from '../js/three.module.js';

// var tempMatrix = new THREE.Matrix4();

function objectTransform(object, controller, tempMatrix) {
    df.SelectedPDBId = object.type === "Group" && object.pdbId
        ? object.pdbId
        : object?.userData?.presentAtom?.pdbId ?? df.SelectedPDBId;
    switch (df.selection) {
        case df.drag_residues:
            df.tool.colorIntersectObjectRed(object, 1);
            controller.attach(object);
            break;
        default:
            df.tool.colorIntersectObjectRed(object, 1);
            if (!object.onselected) {
                object.onselected = true
                if (object.type === df.MeshType) {
                    if (df.config.mainMode === df.BALL_AND_ROD) {
                        controller.attach(object);
                    } else {
                        df.SELECTED_RESIDUE = object;
                        df.SELECTED_RESIDUE.visible = false
                        df.SELECTED_RESIDUE_POS = new THREE.Vector3();
                        df.SELECTED_RESIDUE.controller = controller;
                        // object.getWorldPosition(df.SELECTED_RESIDUE_POS);
                        controller.attach(object);
                    }
                } else {
                    object.matrix.premultiply(tempMatrix);
                    object.matrix.decompose(object.position, object.quaternion, object.scale);
                    object.controller = controller;
                    controller.add(object);
                }
            }
            break;
        case df.select_region:
            // start
            if (df.scubaResScope.length === 0) {
                // get start residue
                df.scubaResScope.push(object);
            } else if (df.scubaResScope.length === 1) {
                // end
                df.scubaResScope.push(object);
                df.scubaScope.push([df.scubaResScope[0], df.scubaResScope[1]]);
                // change color
                let mesh1Name = df.scubaResScope[0].name;
                let mesh2Name = df.scubaResScope[1].name;
                let pdbId = object.userData.presentAtom.pdbId;
                let pdbType = object.userData.presentAtom.typeName;
                let chain = object.userData.presentAtom.chainName;
                let meshGroup = df.GROUP[pdbId][pdbType][chain].children;
                if (meshGroup.length > 0) {
                    for (let ids in meshGroup) {
                        let ms = meshGroup[ids];
                        if ((parseInt(ms.name) >= parseInt(mesh1Name)) && (parseInt(ms.name) <= parseInt(mesh2Name))) {
                            df.tool.colorIntersectObjectRed(ms, 1);
                        }
                    }
                }
                df.scubaResScope = [];
            }
            break;
    }
}

function objectDeTrans(controller) {
    let obj = '';
    for (let i = controller.children.length - 1; i >= 0; i--) {
        let child = controller.children[i];
        child.onselected = false;
        switch (child.type) {
            case df.GroupType:
                child.matrix.premultiply(controller.matrixWorld);
                child.matrix.decompose(child.position, child.quaternion, child.scale);
                df.tool.colorIntersectObjectRed(child, 0);
                scene.add(child);
                if (child.name !== "surface") {
                    let posDict = df.tool.forAllAtom(child);
                    df.dfRender.changePDBData(posDict);
                }
                break;
            case df.MeshType:
                obj = child;
                df.tool.colorIntersectObjectRed(child, 0);
                child.group.attach(child);
                break;
        }
    }
    if (df.isScore) {
        let url = window.location.href + 'score';
        let data1 = {
            'receptor': df.pdbText[df.ALIGN_RECEPTOR],
            'ligand': df.pdbText[df.ALIGN_LIGAND]
        };

        let data = JSON.stringify(data1);
        df.api.apiRequest(url, data, (response) => {
            if (df.ScoreTemp !== response["score"]) {
                let score_str = "得分: " + response["score"].toString() + "分！"
                df.drawer.updateText(score_str, df.GROUP["score"].children[0]);
                df.ScoreTemp = response["score"];
            }
        });
    }
    // if ((df.config.mainMode === df.BALL_AND_ROD) && (obj.type === df.MeshType)) {
    //     let posDict = df.tool.forAllAtom(obj.group);
    //     df.dfRender.changePDBData(posDict);
    // }
}

function onTriggerDown(event, raster, tempMatrix, objects) {
    let controller = event.target;

    // open menu
    let menuList = getIntersections(objects, raster, tempMatrix, true);
    let menuObject = menuList[0]
    if (menuObject.length > 0) {
        df.showMenu = !df.showMenu;
        df.GROUP['menu'].visible = df.showMenu;
        // df.GROUP['menu'].lookAt(camera.position)
        return;
    }
    // 操作 Menu 模块
    if (df.showMenu) {
        let menuList = getIntersections(objects, raster, tempMatrix);
        if (menuList) {
            let menuObject = menuList[1]
            dealWithMenu(menuObject);
        }
    } else {
        if (df.selection === df.select_residues) {
            let interList = getIntersections(objects, raster, tempMatrix);
        }
        if (df.selection === df.drag_residues) {
            for (let per in df.SELECT_RESIDUE_MESH) {
                df.SelectedPDBId = df.SELECT_RESIDUE_MESH[per];
                let controllerTempMatrix = tempMatrix
                controllerTempMatrix.copy(controller.matrixWorld).invert();
                objectTransform(df.SELECT_RESIDUE_MESH[per], controller, controllerTempMatrix);
            }
        } else {
            // 拖拽蛋白功能
            let interList = getIntersections(objects, raster, tempMatrix);
            let intersections = interList[0];
            let controllerTempMatrix = interList[1];
            if (intersections && intersections.length <= 0) {
                return;
            }
            controllerTempMatrix.copy(controller.matrixWorld).invert();
            // 说明：intersections = [group, group, group...]
            for (let per in intersections) {
                objectTransform(intersections[per], controller, controllerTempMatrix);
            }
        }
    }
}


function onTriggerUp(event) {
    let controller = event.target;
    switch (df.selection) {
        case df.select_chain:
            objectDeTrans(controller);
            break;
        case df.select_all:
            objectDeTrans(controller);
            break;
        case df.select_main:
            objectDeTrans(controller);
            break;
        case df.select_multi_chain:
            objectDeTrans(controller);
            break;
        case df.select_residue:
            objectDeTrans(controller);
            df.SELECTED_RESIDUE = '';
            df.SELECTED_RESIDUE_POS = new THREE.Vector3();
            break;
        case df.drag_residues:
            objectDeTrans(controller);
            break;
    }
}


function rayCasterIntersect(raster) {
    for (let i = 0; i < df.pdbId.length; i++) {
        let pdbId = df.pdbId[i];
        for (let index in df.pdbInfoList) {
            let name = df.pdbInfoList[index];
            for (let chain in df.GROUP[pdbId][name]) {
                if (!df.GROUP[pdbId][name][chain].visible) continue;
                let objects = df.GROUP[pdbId][name][chain].children;
                let intersected = raster.intersectObjects(objects, true);
                if (intersected.length > 0) {
                    let selectedObject = intersected[0].object;
                    let selectInfo = selectedObject.userData.presentAtom;
                    let selectedPDBId = selectInfo.pdbId;
                    let selectedType = selectInfo.typeName;
                    let selectedChain = selectInfo.chainName;
                    // df.tool.colorIntersectObjectRed(
                    //     df.GROUP[selectedPDBId][selectedType][selectedChain],
                    //     1);
                    return intersected;
                }
            }
        }
    }
    return [];
}


function getIntersectionsRing(controller, raster, tempMatrix) {
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    let selected = raster.intersectObjects(scene.children, true);
    if (selected.length > 0) {
        for (let j in selected) {
            let obj = selected[j].object
            if (obj.danfeng) {
                if (df.tool.isVisible(obj)) {
                    return selected[j];
                }
            }
        }
    }
}


function getIntersections(controller, raster, tempMatrix, onMenuButton = false) {
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);
    let inters = [];
    // 打开 menu 菜单
    if (onMenuButton) {
        let selected = raster.intersectObjects(camera.children);
        for (let i = 0; i < selected.length; i++) {
            if (selected[i] && selected[i].object.name === 'menu-button') {
                inters.push(selected[i]);
                return [inters, tempMatrix];
            }
        }
        return [inters, tempMatrix];
    }
    if (df.showMenu) {
        let selected = raster.intersectObjects(df.GROUP['menu'].children, true);
        if (selected && selected[0]) {
            let selectedObject = selected[0].object;
            for (let key in selected) {
                if (selected[key].object.visible) {
                    selectedObject = selected[key].object;
                }
            }
            let name = selectedObject.name;
            return [name, selectedObject];
        }
    } else {
        let selected = rayCasterIntersect(raster);
        if (selected.length <= 0) return [inters, tempMatrix];
        let selectedObject = selected[0].object;
        let selectedPoint = selected[0].point;
        const localPoint = selectedObject.worldToLocal(selectedPoint.clone());

        let selectInfo = selectedObject.userData.presentAtom;
        let selectedPDBId = selectInfo.pdbId;
        let selectedType = selectInfo.typeName;
        let selectedChain = selectInfo.chainName;
        switch (df.selection) {
            case df.select_all:
                for (let num = 0; num < df.pdbId.length; num++) {
                    let pdbId = df.pdbId[num];
                    for (let index in df.pdbInfoList) {
                        let name = df.pdbInfoList[index];
                        for (let chain in df.GROUP[pdbId][name]) {
                            let objects = df.GROUP[pdbId][name][chain];
                            if (objects.length === 0) continue;
                            inters.push(objects);
                            if (objects.surface) {
                                inters.push(objects.surface);
                            }
                        }
                    }
                }
                break;
            case df.select_main:
                for (let index in df.pdbInfoList) {
                    let name = df.pdbInfoList[index];
                    for (let chain in df.GROUP[selectedPDBId][name]) {
                        let objects = df.GROUP[selectedPDBId][name][chain];
                        if (objects.length === 0) continue;
                        inters.push(objects);
                        if (objects.surface) {
                            inters.push(objects.surface);
                        }
                    }
                }
                break;
            case df.select_chain:
                if (df.tool.isDictEmpty(df.GROUP[selectedPDBId][selectedType])) return;
                let objects = df.GROUP[selectedPDBId][selectedType][selectedChain];
                objects.group = objects.parent;
                inters.push(objects);
                if (objects.surface) {
                    inters.push(objects.surface);
                }
                break;
            case df.select_multi_chain:
                if (df.tool.isDictEmpty(df.GROUP[selectedPDBId][selectedType])) return;
                if (selectedChain === "C" || selectedChain === "D") {
                    let select_obj_h = df.GROUP[selectedPDBId][selectedType]["C"];
                    let select_obj_l = df.GROUP[selectedPDBId][selectedType]["D"];
                    select_obj_h.group = select_obj_h.parent;
                    select_obj_l.group = select_obj_l.parent;
                    inters.push(select_obj_h);
                    inters.push(select_obj_l);
                } else {
                    let select_obj = df.GROUP[selectedPDBId][selectedType][selectedChain];
                    select_obj.group = select_obj.parent;
                    inters.push(select_obj);
                }
                break;
            case df.select_residue:
                switch (df.config.mainMode) {
                    case df.BALL_AND_ROD:
                        df.GROUP[selectedPDBId][selectedType][selectedChain].children.sort((a, b) => a.userData.idx - b.userData.idx);
                        let objects = getChildrenByName(df.GROUP[selectedPDBId][selectedType][selectedChain], selectedObject);
                        let obj_min = 999999;
                        let obj_max = 0;
                        for (var a = 0; a < objects.length; a++) {
                            let index = objects[a].parent.children.indexOf(objects[a])
                            objects[a].group = objects[a].parent;
                            if (index >= obj_max) {
                                obj_max = index
                            }
                            if (index <= obj_min) {
                                obj_min = index
                            }
                            inters.push(objects[a]);
                            if (a === objects.length - 1) {
                                let min = objects[a].parent.children[obj_min + 1];
                                let max = objects[a].parent.children[obj_max + 1];
                                if (min) {
                                    if (min.userData.presentAtom.resId !== objects[a].userData.presentAtom.resId) {
                                        min.group = objects[a].parent;
                                        inters.push(min);
                                    }
                                }
                                if (max) {
                                    if (max.geometry.type === 'CylinderGeometry') {
                                        max.group = objects[a].parent;
                                        inters.push(max);
                                    }

                                }
                            }
                        }
                        console.log(inters)
                        break
                    case df.CARTOON_SSE:
                        if (selectedObject.userData.repType === "tube") {
                            let objects = getChildrenByName(df.GROUP[selectedPDBId][selectedType][selectedChain], selectedObject.name);
                            for (var a = 0; a < objects.length; a++) {
                                // 更改坐标
                                // objects[a].group = df.GROUP[selectedPDBId][selectedType][selectedChain];
                                objects[a].group = objects[a].parent;
                                inters.push(objects[a]);
                            }
                        }
                        break
                }
                break;
            case df.select_region:
                if (df.tool.isDictEmpty(df.GROUP[selectedPDBId][selectedType])) return;
                let region_object = selected[0].object;
                inters.push(region_object);
                break;
            case df.select_residues:
                if (df.tool.isDictEmpty(df.GROUP[selectedPDBId][selectedType])) return;
                let residue = selected[0].object;
                df.SELECT_RESIDUE_MESH.push(residue);
                break;
        }
        return [inters, tempMatrix];
    }
}

function getChildrenByName(group, mesh) {
    let result = [];
    for (let i = 0, l = group.children.length; i < l; i++) {
        if (df.config.mainMode === df.CARTOON_SSE) {
            let child = group.children[i];
            if (child.name === mesh.name) {
                result.push(child);
            }
        } else if (df.config.mainMode === df.BALL_AND_ROD) {
            let child = group.children[i];
            if (child.userData.presentAtom.resId === mesh.userData.presentAtom.resId) {
                result.push(child);
            }
        }

    }
    return result;
}


function dealWithMenu(object) {
    // if click main-menu
    if (object.title && object.title === df.MAIN_MENU) {
        // get content

        // show sub-menu
        // 1. sub-menu trd-menu visible false
        // 2. show sub-menu
    }
    df.DFBUTTONS.forEach(button => {
        if (button.mesh === object) {
            // 执行按钮的 onSelect 方法
            button.onSelect();
        }
    });
}


function scubaCommit() {
    if (df.scubaScope.length > 0) {
        // url
        let url = "";
        let data = JSON.stringify(df.scubaScope);
        let response = df.api.apiRequest(url, data, false);
        if (typeof response === 'string') {
            // todo
        }
    }
}


export {onTriggerDown, onTriggerUp, getIntersectionsRing}
