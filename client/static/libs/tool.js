/**
 * tools for Protein
 */
import * as THREE from '../js/three.module.js';
import {w3m} from "./web3D/w3m.js";
import {df} from './core.js';
import {camera, canon, renderer, scene} from "./render.js";

df.tool = {
    // color
    colorIntersectObjectRed: function (obj, value) {
        if (obj.type === "Group") {
            obj.traverse(function (child) {
                if (child.isMesh) {
                    df.tool.colorIntersectObjectRed(child, value);
                }
            });
        } else if (obj.material) {
            if (typeof (obj.material) === "object" && obj.material.emissive) {
                obj.material.emissive.b = value;
            } else if (obj.material.length !== undefined && obj.material.length >= 0 && obj.material[0].emissive !== undefined) {
                obj.material[0].emissive.b = value;
            }
        }
    },
    getMainAtom: function (pdbId, id) {
        let atom = w3m.mol[pdbId].atom.main[id];
        if (atom !== undefined) {
            return this.getAtomById(pdbId, atom, 'main');
        } else {
            return undefined;
        }
    },
    getAtomById: function (pdbId, atom, structure) {
        // 从pdb文件中获取属性
        let danFeng = this;
        let atomID = atom[1];
        let atomName = atom[2];
        let residueName = atom[3];
        let chainName = atom[4];
        let residueID = atom[5];
        let xyz = atom[6];
        let b_factor = atom[7];
        let coe = atom[8];
        let atomType = atom[9];
        let radius = w3m.geometry["radius"][atomType];
        let pos = new THREE.Vector3(xyz[0], xyz[1], xyz[2]);
        // Center of the geometry
        let pos_centered = new THREE.Vector3(
            xyz[0],
            xyz[1],
            xyz[2]);
        let color = danFeng.getColorByIndex(pdbId, atomID, structure);

        return {
            id: atomID,
            name: atomName,
            resName: residueName,
            chainName: chainName,
            resId: residueID,
            pos: pos,
            posCentered: pos_centered,
            bFactor: b_factor,
            coe: coe,
            type: atomType,
            radius: radius,
            color: color,
            pdbId: pdbId,
            typeName: structure,
        };
    },
    isDictEmpty: function (dict) {
        return Object.keys(dict).length === 0;
    },
    getFirstAtomIdByChain: function (pdbId, chainName) {
        let first_resid = Object.keys(w3m.mol[pdbId].rep[chainName])[0];
        return this.getFirstAtomByResidueId(pdbId, first_resid, chainName)[0];
    },
    getFirstAtomByResidueId: function (pdbId, residueId, chainName) {
        let atoms = w3m.mol[pdbId].atom.main;
        let atom = [];
        for (let atomId in atoms) {
            if (atoms[atomId][4] === chainName) {
                let p_residueId = atoms[atomId][5];
                if (residueId === p_residueId) {
                    atom = atoms[atomId];
                    break;
                }
            }
        }
        return atom;
    },
    getColorByIndex: function (pdbId, id, structure) {
        let rId = w3m.mol[pdbId].color[structure][id];
        if (rId) {
            let C_color = w3m.rgb[rId][0];
            let N_color = w3m.rgb[rId][1];
            let O_color = w3m.rgb[rId][2];
            return new THREE.Color(C_color, N_color, O_color);
        } else {
            return new THREE.Color("#ccc");
        }
    },
    savePDB: function (text, filename) {
        let blob = new Blob([text], {
            type: 'text/plain;charset=UTF-8'
        });
        let link = document.createElement('a');
        link.style.display = 'none';
        document.body.appendChild(link);

        link.href = URL.createObjectURL(blob);
        link.download = filename || 'ydf.pdb'
        link.click();
    },
    getHetAtom: function (molId, id) {
        let atom = w3m.mol[molId].atom.het[id];
        if (atom !== undefined) {
            return this.getAtomById(molId, atom, 'het');
        } else {
            return this.getMainAtom(molId, id);
        }
    },
    getHetAtomOnly: function (molId, id) {
        let atom = w3m.mol[molId].atom.het[id];
        if (atom !== undefined) {
            return this.getAtomById(molId, atom, 'het');
        }
    },

    // clear tools
    clearMesh: function (mesh) {
        if (mesh.geometry) {
            mesh.geometry.dispose();
        }
        if (mesh.material && mesh.material.dispose) {
            mesh.material.dispose();
        }
        mesh = null;
        return undefined;
    },
    clearChainIndex: function (group) {
        if (group.children !== undefined && group.children.length > 0) {
            let child = group.children;
            for (let i = child.length - 1; i >= 0; i--) {
                if (child[i] instanceof THREE.Mesh) {
                    this.clearMesh(child[i]);
                }
            }
            group.children = [];
        }
    },
    clearGroupIndex: function (group) {
        if (group !== undefined) {
            for (let chainId in group) {
                let chain = group[chainId];
                this.clearChainIndex(chain);
            }
        }
    },
    midPoint: function (point1, point2) {
        return new THREE.Vector3((point1.x + point2.x) / 2, (point1.y + point2.y) / 2, (point1.z + point2.z) / 2);
    },
    showSegmentHolder: function (show, callback) {
        let segmentHolder = document.getElementById("segmentHolder");
        if (show) {
            segmentHolder.style.display = "table";
            segmentHolder.innerHTML = "<div class=\"holderClass\"> Just a moment, please. </div>";
        } else {
            segmentHolder.style.display = "none";
        }
        if (typeof callback === 'function') {
            callback();
        }
    },
    atomCaId: function (atom) {
        if (atom.caid) {
            return atom.caid;
        } else {
            return atom.id;
        }
    },
    vrCameraZoom: function () {

    },
    vrCameraCenter: function (canon, camera, list) {
        let totalBox;
        if (Array.isArray(list)) {
            if (list.length === 0) return;
            // object.position.copy(camera.position);
            totalBox = new THREE.Box3().setFromObject(list[0]);
            //
            for (let i = 1; i < list.length; i++) {
                const box = new THREE.Box3().setFromObject(list[i]);
                totalBox.union(box);
            }
        } else {
            totalBox = new THREE.Box3().setFromObject(list);

        }
        let center = totalBox.getCenter(new THREE.Vector3());
        // console.log(center)
        // distance
        let distance = 0.5;
        let cameraPosition = new THREE.Vector3(center.x - camera.position.x, center.y - camera.position.y, center.z - camera.position.z + distance);
        // canon.position.set(cameraPosition.x - camera.position.x, cameraPosition.y - camera.position.y, cameraPosition.z - camera.position.z + distance)
        df.tool.smoothMoveObject(canon.position, cameraPosition, canon);
        // canon.lookAt(camera);
    },

    // vrCameraCenter: function (canon, camera, list) {
    //     // 1. 构造一个数组，方便统一处理
    //     const objects = Array.isArray(list) ? list : [list];
    //     if (objects.length === 0) return;
    //
    //     // 2. 计算合并包围盒
    //     const totalBox = new THREE.Box3().setFromObject(objects[0]);
    //     for (let i = 1; i < objects.length; i++) {
    //         totalBox.union(new THREE.Box3().setFromObject(objects[i]));
    //     }
    //
    //     // 3. 拿到包围盒中心（局部坐标系）
    //     const centerLocal = totalBox.getCenter(new THREE.Vector3());
    //
    //     // 4. 把这个局部中心点转换到世界坐标
    //     //    （这里假设所有 objects 都在同一个父节点下；如果不是，请先统一到一个空 Group）
    //     const root = objects[0].parent;
    //     const centerWorld = root.localToWorld(centerLocal.clone());
    //
    //     // 5. 获取 Rig（canon）的世界位置
    //     const rigWorldPos = new THREE.Vector3();
    //     canon.getWorldPosition(rigWorldPos);
    //
    //     // 6. 计算世界空间下的偏移向量
    //     //    deltaWorld = rigWorldPos - centerWorld
    //     const deltaWorld = rigWorldPos.clone().sub(centerWorld);
    //
    //     // 7. 把这个偏移从“世界”转换到 canon.parent 的本地坐标系
    //     //    （因为我们要修改 canon.position，它是相对于 parent 的局部坐标）
    //     const parentInv = new THREE.Matrix4().copy(canon.parent.matrixWorld).invert();
    //     const deltaLocal = deltaWorld.clone().applyMatrix4(parentInv);
    //
    //     // 8. 直接平移 canon
    //     canon.position.add(deltaLocal);
    //     canon.lookAt(camera)
    //     // canon.position.y = canon.position.y - 1.5
    //
    //     // （可选）如果你有平滑移动函数，可以替换上面这一行：
    //     df.tool.smoothMoveObject(canon.position, canon.position.clone().add(deltaLocal), canon);
    // },

    smoothMoveObject: function (stPos, edPos, object) {
        let duration = 1000;
        let startTime = performance.now();

        function animate(time) {
            const elapsedTime = time - startTime;
            const fraction = elapsedTime / (duration * 2);
            // 计算新位置
            object.position.lerpVectors(stPos, edPos, fraction);
            if (fraction < 1) {
                renderer.xr.getSession().requestAnimationFrame(animate);
            }
        }

        // 启动动画循环
        renderer.xr.getSession().requestAnimationFrame(animate);
    },
    initPDBView: function (pdbId) {
        for (let key in df.GROUP[pdbId]['main']) {
            let group = df.GROUP[pdbId]['main'][key];
            df.tool.vrCameraCenter(canon, camera, group);
        }

    },
    designAPI: function (path, pdbId, pdb_data) {
        fetch(path, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                "pdbId": pdbId,
                "pdbData": pdb_data
            })
        })
            .then(response => response.json())
            .then(data => {
                let designData = data["result"];
                let blob = new Blob([designData], {type: 'text/plain;charset=UTF-8'});
                let url = URL.createObjectURL(blob);
                let link = document.createElement('a');
                link.href = url;
                link.download = pdbId + '.fasta'; // 下载的文件名，可以根据需要进行修改
                link.click();
            })
            .catch(error => console.log("Design Error:", error));
    },
    handleButtonSelection: function (button, lastSelectedButton) {
        if (lastSelectedButton.length === button.length) {
            lastSelectedButton.hideAllSubButtons();
        } else if (lastSelectedButton.length > button.length) {
            df.tool.handleButtonSelection(button, lastSelectedButton.parentButton);
        }
    },
    changeFrame: function (mol_id, atm_id) {
        let paths = df.PathList[mol_id];
        for (let index in paths) {
            let path = paths[index];
            let n = w3m.config.smooth_segment % 2 ?
                w3m.config.smooth_segment + 1 : w3m.config.smooth_segment;
            let k = w3m.config.smooth_curvature;
            let len = path.length;
            let atom = w3m.tool.getMainAtomById(mol_id, atm_id);
            // df.cat = []
            w3m.mol[mol_id].residueData[atom.chainname][atom.resid].path = []
            w3m.mol[mol_id].residueData[atom.chainname][atom.resid].binormals = []
            w3m.mol[mol_id].residueData[atom.chainname][atom.resid].normals = []
            w3m.mol[mol_id].residueData[atom.chainname][atom.resid].tangents = []
            if (path[0][0] === atm_id) {
                path[0][3] = math.polysum([k, -k / 4], [vec3.point(path[0][1], path[1][1]), vec3.point(path[0][1], path[2][1])]);
                let tan = vec3.unit(path[0][3]);
                let binormal = vec3.unit(vec3.cross(tan, path[0][4]));
                let normal = vec3.cross(binormal, tan);
                path[0][4] = vec3.cross(binormal, tan);
            }
            for (let i = 1; i < len; i++) {
                if ((path[i][0] === atm_id) ||
                    (i + 1 < len && path[i + 1][0] === atm_id) ||
                    (i - 1 >= 0 && path[i - 1][0] === atm_id) ||
                    (i - 2 >= 0 && path[i - 2][0] === atm_id)) {
                    if (i + 1 < len && path[i + 1][0] === atm_id) {
                        let atom1 = w3m.tool.getMainAtomById(mol_id, path[i][0]);
                        w3m.mol[mol_id].residueData[atom1.chainname][atom1.resid].path = []
                        w3m.mol[mol_id].residueData[atom1.chainname][atom1.resid].binormals = []
                        w3m.mol[mol_id].residueData[atom1.chainname][atom1.resid].normals = []
                        w3m.mol[mol_id].residueData[atom1.chainname][atom1.resid].tangents = []
                    }
                    if (i - 1 >= 0 && path[i - 1][0] === atm_id) {
                        let atom1 = w3m.tool.getMainAtomById(mol_id, path[i][0]);
                        w3m.mol[mol_id].residueData[atom1.chainname][atom1.resid].path = []
                        w3m.mol[mol_id].residueData[atom1.chainname][atom1.resid].binormals = []
                        w3m.mol[mol_id].residueData[atom1.chainname][atom1.resid].normals = []
                        w3m.mol[mol_id].residueData[atom1.chainname][atom1.resid].tangents = []
                    }
                    if (i === len - 1) {
                        // 最后一个residue
                        path[i][3] = math.polysum([k, -k / 4], [vec3.point(path[i - 1][1], path[i][1]), vec3.point(path[i - 2][1], path[i][1])]);
                    } else {
                        path[i][3] = vec3.scalar(k, vec3.point(path[i - 1][1], path[i + 1][1]));
                    }
                    // curve
                    let curve = math.hermiteFit(n, path[i - 1][1], path[i][1], path[i - 1][3], path[i][3]);
                    let id = path[i - 1][0];
                    let color = path[i - 1][2];
                    let turnover = path[i - 1][6];
                    let tan = vec3.unit(path[i][3]);
                    let binormal = vec3.unit(vec3.cross(tan, path[i][4]));
                    path[i][4] = vec3.cross(binormal, tan);
                    for (let ii = 1; ii <= n; ii++) {
                        let t = ii / n;
                        let xyz = curve[ii][0];
                        let tan = vec3.unit(curve[ii][1]);
                        let normal_tmp = vec3.step(t, path[i - 1][4], path[i][4]);
                        let binormal = vec3.unit(vec3.cross(tan, normal_tmp));
                        let normal = vec3.cross(binormal, tan);
                        if (ii === n / 2) {
                            id = path[i][0]; // switch id, color, turnover
                            color = path[i][2];
                            turnover = path[i][6];
                        }
                        atom = w3m.tool.getMainAtomById(mol_id, id);
                        if (atom) {
                            if (w3m.mol[mol_id].residueData[atom.chainname][atom.resid].path.length === (w3m.config.smooth_segment + 1)) {
                                continue;
                            }
                            w3m.mol[mol_id].residueData[atom.chainname][atom.resid].path.push(new THREE.Vector3(xyz[0], xyz[1], xyz[2]));
                            w3m.mol[mol_id].residueData[atom.chainname][atom.resid].binormals.push(new THREE.Vector3(binormal[0], binormal[1], binormal[2]));
                            w3m.mol[mol_id].residueData[atom.chainname][atom.resid].normals.push(new THREE.Vector3(normal[0], normal[1], normal[2]));
                            w3m.mol[mol_id].residueData[atom.chainname][atom.resid].tangents.push(new THREE.Vector3(tan[0], tan[1], tan[2]));
                        }
                    }
                }
            }
        }
    },
    alignMeshes: function (mesh1, mesh2) {
        // 更新mesh1的世界矩阵以确保其矩阵是最新的
        mesh1.updateMatrixWorld(true);
        // 获取mesh1的世界矩阵
        var matrix1 = mesh1.matrixWorld;
        // 设置mesh2的变换矩阵为mesh1的世界矩阵
        mesh2.applyMatrix4(matrix1);
        // 如果你只想应用旋转、平移和缩放，可以分别获取这些变换并应用到mesh2上
        mesh2.position.copy(mesh1.position);
        mesh2.quaternion.copy(mesh1.quaternion);
        mesh2.scale.copy(mesh1.scale);
        // 确保更新mesh2的世界矩阵
        mesh2.updateMatrixWorld(true);
    },
    getResidueNewPos: function (mesh, posDict) {
        try {
            const ob_residue = mesh.userData.presentAtom;
            let resId = ob_residue.resId;
            let chain = ob_residue.chainName;
            let pdbId = ob_residue.pdbId;
            let atomName = ob_residue.name;
            mesh.parent.updateMatrixWorld(true);
            switch (df.config.mainMode) {
                case df.CARTOON_SSE:
                    for (let dt in df.PDBPOS[pdbId]) {
                        let dt_split = dt.split("_")
                        if ((dt_split[0] === chain) && (dt_split[1] === resId)) {
                            let pos = df.PDBPOS[pdbId][dt];
                            let newVec = new THREE.Vector3(pos[0], pos[1], pos[2]);
                            newVec.applyMatrix4(mesh.matrixWorld);
                            let newkeys = pdbId + "_" + chain + "_" + resId + "_" + dt_split[2];
                            posDict[newkeys] = newVec;
                        }
                    }
                    break
                case df.BALL_AND_ROD:
                    let dt = chain + "_" + resId + "_" + atomName;
                    // let pos = df.PDBPOS[pdbId][dt];
                    let newkeys = pdbId + "_" + chain + "_" + resId + "_" + atomName;
                    // let newVec = new THREE.Vector3(pos[0], pos[1], pos[2]);
                    // newVec.applyMatrix4(mesh.matrixWorld);
                    const worldBox = new THREE.Box3().setFromObject(mesh);
                    console.log(mesh)
                    const pos = new THREE.Vector3();
                    worldBox.getCenter(pos);
                    console.log(pos)
                    let newVec = new THREE.Vector3(pos.x / mesh.scale.x, pos.y / mesh.scale.y, pos.z / mesh.scale.z);
                    console.log(newVec)
                    posDict[newkeys] = newVec;
                    break
            }
            return posDict
        } catch (e) {
            console.log("Error tool.js 365:", e)
        }
    },
    forAllAtom: function (child) {
        let keys = []
        let posDIct = {}
        for (let j = 0; j < child.children.length; j++) {
            let mesh = child.children[j];
            let key = mesh.userData.presentAtom.pdbId + mesh.userData.presentAtom.chainName + mesh.userData.presentAtom.resId + mesh.userData.presentAtom.name;
            if (keys.includes(key)) {
            } else {
                switch (df.config.mainMode) {
                    case df.CARTOON_SSE:
                        if (mesh.geometry.type === "SphereGeometry") {
                            continue;
                        }
                        df.tool.getResidueNewPos(mesh, posDIct);
                        keys.push(key);
                        break
                    case df.BALL_AND_ROD:
                        if (mesh.geometry.type === "SphereGeometry") {
                            df.tool.getResidueNewPos(mesh, posDIct);
                            keys.push(key);
                        }
                        break
                }
            }
        }
        return posDIct;
    },
    isVisible: function (object) {
        if (!object.visible) {
            return false;
        }
        if (object.parent) {
            return df.tool.isVisible(object.parent); // 递归检查父级
        }
        return true;
    },
    addIndex: function (group) {
        let addIndex = 0;
        group.children.forEach(child => {
            child.userData.idx = addIndex;
            addIndex++;
        });
    },
    // clear: function (mode, pdbId) {
    //     THREE.Cache.clear();
    //     switch (mode) {
    //         case 0:
    //             for (let modeKey in df.GROUP[df.SelectedPDBId]) {
    //                 df.tool.clearGroupIndex(df.GROUP[df.SelectedPDBId][modeKey]);
    //             }
    //             break;
    //         case 1:
    //             df.tool.clearGroupIndex(df.GROUP_HET);
    //             break;
    //     }
    // },
    clearTools: function (mode) {
        // 1. 全局缓存：避免重复创建纹理/材质
        df.textSpriteCache = new Map();
// 2. 存储所有需要更新的球体 + 对应精灵
        df.numberedSpheres = [];
        THREE.Cache.clear();
        switch (mode) {
            case 2:
                // clear all group data
                for (let idx in df.pdbId) {
                    let pdbId = df.pdbId[idx];
                    delete df.w3m.mol[pdbId];
                    for (let modeKey in df.GROUP[pdbId]) {
                        df.tool.clearGroupIndex(df.GROUP[pdbId][modeKey]);
                    }
                    delete df.GROUP[pdbId];
                    delete df.PDBPOS[pdbId];
                }
                df.tool.initTools();
                break;
            case 3:
                let pdbId = df.SelectedPDBId;
                delete df.w3m.mol[pdbId];
                for (let modeKey in df.GROUP[pdbId]) {
                    df.tool.clearGroupIndex(df.GROUP[pdbId][modeKey]);
                }
                delete df.GROUP[pdbId];
                delete df.PDBPOS[pdbId];
                df.pdbId = df.pdbId.filter(item => item !== pdbId);
                delete df.pdbText[pdbId];
                delete df.pdbContent[pdbId];
                break;
        }
    },
    clearToolsId: function (id) {
        THREE.Cache.clear();
        let pdbId = id;
        delete df.w3m.mol[pdbId];
        for (let modeKey in df.GROUP[pdbId]) {
            df.tool.clearGroupIndex(df.GROUP[pdbId][modeKey]);
        }
        delete df.GROUP[pdbId];
        delete df.PDBPOS[pdbId];
        df.pdbId = df.pdbId.filter(item => item !== pdbId);
        delete df.pdbText[pdbId];
        delete df.pdbContent[pdbId];
    },
    initTools: function () {
        df.PathList = {};
        df.SelectedPDBId = null;
        df.pdbId = [];
        df.pdbText = {}
        df.pdbContent = {}
    },

}