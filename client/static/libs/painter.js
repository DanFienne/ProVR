import {df} from './core.js';
import {w3m} from "./web3D/w3m.js";
import * as THREE from '../js/three.module.js';
import {Group} from "../js/three.module.js";
import {mergeGeometries} from "../js/utils/BufferGeometryUtils.js";

df.painter = {
    showHet: function (type, pdbId) {
        switch (type) {
            case df.HET_LINE:
                this.showHetLine(pdbId);
                break;
            case df.HET_STICK:
                this.showHetStick(pdbId);
                break;
            case df.HET_BALL_ROD:
                this.showHetBallRod(pdbId);
                break;
        }
    },
    showHetLine: function (molId) {
        this.showWater(molId);
    },
    showWater: function (molId) {
        let w = df.config.water_sphere_w;
        if (df.isShowWater) {
            // H2O
            for (let i in w3m.mol[molId].single) {
                let atom = df.tool.getHetAtom(molId, i);
                if (atom.resName === "hoh") {
                    df.drawer.drawSphere(
                        molId,
                        'water',
                        atom.chainName,
                        atom.posCentered,
                        atom.color,
                        0.1 * atom.radius,
                        atom,
                        w);
                }
            }
        } else if (!df.isShowWater) {
            df.tool.clearGroupIndex(df.GROUP[molId]['water']);
        }
    },
    showHetWithoutConnect: function (molId, radius, w, history) {
        for (let i in w3m.mol[molId].atom.het) {
            let HetAtom = df.tool.getHetAtomOnly(molId, i);
            if (HetAtom) {
                if (history[HetAtom.id] === undefined) {
                    let hetAtomRadius = radius + 0.001
                    let types = 'water'
                    if (HetAtom.resName !== 'hoh') {
                        hetAtomRadius = 1
                        w = 16
                        types = 'het'
                    }
                    df.drawer.drawSphere(
                        molId,
                        types,
                        HetAtom.chainName,
                        HetAtom.posCentered,
                        HetAtom.color,
                        hetAtomRadius,
                        HetAtom,
                        w);
                    history[HetAtom.id] = 1;
                }
            }
        }
    },
    showHetStick: function (molId) {
        let w = df.config.stick_sphere_w;
        let radius = 0.2;
        let history = {};
        if (Object.keys(w3m.mol[molId].connect).length === 0) {
            this.showHetWithoutConnect(molId, radius, w, history);
        } else {
            for (let i in w3m.mol[molId].connect) {
                for (let j in w3m.mol[molId].connect[i]) {
                    let [startAtom, endAtom] = this.showHetAtomInfo(molId, i, j);
                    // 存在 Ca1,Ca2 这种情况，忽略 Ca2，会导致 atom 为空
                    if (startAtom && endAtom) {
                        if (history[startAtom.id] === undefined) {
                            df.drawer.drawSphere(
                                molId,
                                'het',
                                startAtom.chainName,
                                startAtom.posCentered,
                                startAtom.color,
                                radius + 0.001,
                                startAtom,
                                w);
                            history[startAtom.id] = 1;
                        }
                        if (history[endAtom.id] === undefined) {
                            df.drawer.drawSphere(
                                molId,
                                'het',
                                endAtom.chainName,
                                endAtom.posCentered,
                                endAtom.color,
                                radius + 0.001,
                                endAtom,
                                w);
                            history[endAtom.id] = 1;
                        }
                        let midPoint = df.tool.midPoint(startAtom.posCentered, endAtom.posCentered);
                        df.drawer.drawStick(molId, 'het', startAtom.chainName, startAtom.posCentered, midPoint, radius, startAtom.color, startAtom);
                        df.drawer.drawStick(molId, 'het', endAtom.chainName, midPoint, endAtom.posCentered, radius, endAtom.color, endAtom);
                    }
                }
            }
        }
    },
    showHetBallRod: function (molId) {
        let w = df.config.stick_sphere_w;
        let radius = 0.12;
        let history = {};
        if (Object.keys(w3m.mol[molId].connect).length === 0) {
            this.showHetWithoutConnect(molId, radius, w, history);
        } else {
            for (let i in w3m.mol[molId].connect) {
                for (let j in w3m.mol[molId].connect[i]) {
                    let [startAtom, endAtom] = this.showHetAtomInfo(molId, i, j);
                    if (startAtom && endAtom) {
                        if (history[startAtom.id] === undefined) {
                            df.drawer.drawSphere(
                                molId,
                                'het',
                                startAtom.chainName,
                                startAtom.posCentered,
                                startAtom.color,
                                startAtom.radius * 0.2,
                                startAtom,
                                w);
                            history[startAtom.id] = 1;
                        }
                        if (history[endAtom.id] === undefined) {
                            df.drawer.drawSphere(
                                molId,
                                'het',
                                endAtom.chainName,
                                endAtom.posCentered,
                                endAtom.color,
                                endAtom.radius * 0.2,
                                endAtom,
                                w);
                            history[endAtom.id] = 1;
                        }
                        let midPoint = df.tool.midPoint(startAtom.posCentered, endAtom.posCentered);
                        df.drawer.drawStick(molId, 'het', startAtom.chainName, startAtom.posCentered, midPoint, radius, startAtom.color, startAtom);
                        df.drawer.drawStick(molId, 'het', endAtom.chainName, midPoint, endAtom.posCentered, radius, endAtom.color, endAtom);
                    }
                }
            }
        }
    },
    showHetAtomInfo: function (molId, i, j) {
        let startAtom = df.tool.getHetAtom(molId, i);
        if (startAtom === undefined) {
            startAtom = df.tool.getMainAtom(molId, i);
        }
        let endAtom = df.tool.getHetAtom(molId, w3m.mol[molId].connect[i][j]);
        if (endAtom === undefined) {
            endAtom = df.tool.getMainAtom(molId, i);
        }
        if (endAtom) {
            endAtom.caid = endAtom.id;
        }
        return [startAtom, endAtom];
    },
    showAllResidues: function (type, pdbId) {
        if (type === df.config.surface) {
            df.painter.showSurface(pdbId, 'a', 1, w3m.mol[pdbId].atom.main.length, true);
        } else {
            let residueData = w3m.mol[pdbId].residueData;

            for (let chain in residueData) {
                for (let resId in residueData[chain]) {
                    df.painter.showResidue(pdbId, chain, resId, type);
                }
            }
        }
    },
    showResidue: function (pdbId, chainId, resId, type) {
        switch (type) {
            case df.BALL_AND_ROD:
                df.painter.showBallRodByResidue(pdbId, chainId, resId);
                break;
            case df.CARTOON_SSE:
                df.painter.showCartoonSSEByResidue(pdbId, chainId, resId);
                break;
            case df.CARTOON_SSE:
                df.painter.showCartoonSSEByResidue(pdbId, chainId, resId);
                break;
        }
    },
    // show Ball & Rod
    drawSphereByResidue: function (pdbId, type, atom, radius, x, w) {
        df.drawer.drawSphere(
            pdbId,
            type,
            atom.chainName,
            atom.posCentered,
            atom.color,
            x * atom.radius,
            atom,
            w);
        df.GROUP[pdbId][type][atom.chainName].children[df.GROUP[pdbId][type][atom.chainName].children.length - 1].visible = true;
    },
    // showBallRodByResidue: function (pdbId, chainId, resId) {
    //     let w = df.config.stick_sphere_w;
    //     let radius = df.config.ball_rod_radius;
    //     let residue = w3m.mol[pdbId].residueData[chainId][resId];
    //     let lines = residue.lines;
    //     // 防止重复绘制
    //     let history = {};
    //     for (let i = 0; i < lines.length; i++) {
    //         let ids = lines[i];
    //         let startAtom = df.tool.getMainAtom(pdbId, ids[0]);
    //         let endAtom = df.tool.getMainAtom(pdbId, ids[1]);
    //         if (!startAtom.caid) {
    //             startAtom.caid = residue.caid;
    //             endAtom.caid = residue.caid;
    //         }
    //         if (history[startAtom.id] === undefined) {
    //             this.drawSphereByResidue(pdbId, 'main', startAtom, radius, 0.2, w);
    //             history[startAtom.id] = 1;
    //         }
    //         if (history[endAtom.id] === undefined) {
    //             this.drawSphereByResidue(pdbId, 'main', endAtom, radius, 0.2, w);
    //             history[endAtom.id] = 1;
    //         }
    //         let midPoint = df.tool.midPoint(startAtom.posCentered, endAtom.posCentered);
    //         let distance = startAtom.posCentered.distanceTo(endAtom.posCentered);
    //         if (distance < 3) {
    //             df.drawer.drawStick(pdbId, 'main', startAtom.chainName, startAtom.posCentered, midPoint, radius, startAtom.color, startAtom);
    //             df.GROUP[pdbId]['main'][startAtom.chainName].children[df.GROUP[pdbId]['main'][startAtom.chainName].children.length - 1].visible = true;
    //             df.drawer.drawStick(pdbId, 'main', endAtom.chainName, midPoint, endAtom.posCentered, radius, endAtom.color, endAtom);
    //             df.GROUP[pdbId]['main'][endAtom.chainName].children[df.GROUP[pdbId]['main'][endAtom.chainName].children.length - 1].visible = true;
    //         }
    //     }
    // },


    showBallRodByResidue: function (pdbId, chainId, resId) {
        // const w = df.config.stick_sphere_w;
        const radius = df.config.ball_rod_radius;
        const stickRes = df.config.stick_radius;
        const mergeOn = false

        // 目标组
        const group = df.GROUP[pdbId]['main'][chainId];
        // 先清空旧子对象
        // group.clear();

        if (!mergeOn) {
            let w = df.config.stick_sphere_w;
            let radius = df.config.ball_rod_radius;
            let residue = w3m.mol[pdbId].residueData[chainId][resId];
            let lines = residue.lines;
            // 防止重复绘制
            let history = {};
            for (let i = 0; i < lines.length; i++) {
                let ids = lines[i];
                let startAtom = df.tool.getMainAtom(pdbId, ids[0]);
                let endAtom = df.tool.getMainAtom(pdbId, ids[1]);
                if (!startAtom.caid) {
                    startAtom.caid = residue.caid;
                    endAtom.caid = residue.caid;
                }
                if (history[startAtom.id] === undefined) {
                    this.drawSphereByResidue(pdbId, 'main', startAtom, radius, 0.2, w);
                    history[startAtom.id] = 1;
                }
                if (history[endAtom.id] === undefined) {
                    this.drawSphereByResidue(pdbId, 'main', endAtom, radius, 0.2, w);
                    history[endAtom.id] = 1;
                }
                let midPoint = df.tool.midPoint(startAtom.posCentered, endAtom.posCentered);
                let distance = startAtom.posCentered.distanceTo(endAtom.posCentered);
                if (distance < 3) {
                    df.drawer.drawStick(pdbId, 'main', startAtom.chainName, startAtom.posCentered, midPoint, radius, startAtom.color, startAtom);
                    df.GROUP[pdbId]['main'][startAtom.chainName].children[df.GROUP[pdbId]['main'][startAtom.chainName].children.length - 1].visible = true;
                    df.drawer.drawStick(pdbId, 'main', endAtom.chainName, midPoint, endAtom.posCentered, radius, endAtom.color, endAtom);
                    df.GROUP[pdbId]['main'][endAtom.chainName].children[df.GROUP[pdbId]['main'][endAtom.chainName].children.length - 1].visible = true;
                }
            }
            return;
        }

// 配置参数
        const w = df.config.stick_sphere_w;    // 球体分段数
        const stickRadial = df.config.stick_radius;      // 圆柱径向分段数
        const rodRadius = df.config.ball_rod_radius;   // 圆柱半径（与 drawStick 保持一致）
        const sphereScale = 0.2;                         // drawSphereByResidue 中的 x 缩放因子

        // 按颜色分组存几何体
        const sphereGroups = new Map();  // colorHex -> [SphereGeometry, …]
        const stickGroups = new Map();  // colorHex -> [CylinderGeometry, …]

        function pushGeom(map, colorHex, geom) {
            if (!map.has(colorHex)) map.set(colorHex, []);
            map.get(colorHex).push(geom);
        }

        // 矩阵 & 向量复用
        const tmpMat4 = new THREE.Matrix4();
        const up = new THREE.Vector3(0, 1, 0);

        // 合并工具（项目中如有 mergeGeometries 也可以替换）
        // const BufferGeometryUtils = THREE.BufferGeometryUtils || {
        //     mergeBufferGeometries: mergeGeometries
        // };

        // 取出这一残基的连线数据
        const residue = w3m.mol[pdbId].residueData[chainId][resId];
        const lines = residue.lines;
        const history = {};  // 防止重复画同一个球

        for (let i = 0; i < lines.length; i++) {
            const [i0, i1] = lines[i];
            const a0 = df.tool.getMainAtom(pdbId, i0);
            const a1 = df.tool.getMainAtom(pdbId, i1);

            // —— 球体 ——
            [a0, a1].forEach(atom => {
                if (!history[atom.id]) {
                    const hex = new THREE.Color(atom.color).getHexString();
                    const r = atom.radius * sphereScale;
                    const sph = new THREE.SphereGeometry(r, w, w);
                    // 平移到 atom 位置
                    sph.applyMatrix4(
                        tmpMat4.makeTranslation(
                            atom.posCentered.x,
                            atom.posCentered.y,
                            atom.posCentered.z
                        )
                    );
                    pushGeom(sphereGroups, hex, sph);
                    history[atom.id] = true;
                }
            });

            // —— 棍体 ——
            // 方向向量 & 长度
            const dir = new THREE.Vector3().subVectors(a1.posCentered, a0.posCentered);
            const len = dir.length();
            if (len < 3) {
                // 在原点沿 Y 轴建一根高度为 len 的圆柱，中心在原点
                const cyl = new THREE.CylinderGeometry(
                    rodRadius,     // 顶面半径
                    rodRadius,     // 底面半径
                    len,           // 高度
                    stickRadial,   // 径向分段
                    1,             // 高度分段
                    false
                );
                // 1) 用四元数把 Y 轴对齐到 dir
                const quat = new THREE.Quaternion()
                    .setFromUnitVectors(up, dir.clone().normalize());
                cyl.applyQuaternion(quat);

                // 2) 移到两点中点
                const mid = new THREE.Vector3()
                    .addVectors(a0.posCentered, a1.posCentered)
                    .multiplyScalar(0.5);
                cyl.applyMatrix4(
                    tmpMat4.makeTranslation(mid.x, mid.y, mid.z)
                );

                const hex = new THREE.Color(a0.color).getHexString();
                pushGeom(stickGroups, hex, cyl);
            }
        }

        // —— 合并并生成 Mesh ——
        // 球体
        sphereGroups.forEach((geoms, hex) => {
            if (!geoms.length) return;
            const merged = mergeGeometries(geoms, false);
            const mat = new THREE.MeshLambertMaterial({
                bumpScale: 1,
                color: parseInt(hex, 16),
                specular: new THREE.Color(0x000000),
                reflectivity: 0,
                shininess: 0
            });
            const mesh = new THREE.Mesh(merged, mat);
            mesh.name = `merged-spheres-${hex}`;
            group.add(mesh);
        });

        // 棍体
        stickGroups.forEach((geoms, hex) => {
            if (!geoms.length) return;
            const merged = mergeGeometries(geoms, false);
            const mat = new THREE.MeshLambertMaterial({
                color: parseInt(hex, 16)
            });
            const mesh = new THREE.Mesh(merged, mat);
            mesh.name = `merged-sticks-${hex}`;
            group.add(mesh);
        });
    },

    // show Cartoon
    showTubeByResidue: function (pdbId, chainId, resId, residue, type) {
        let path = residue.path;
        if (path.length === 0) return;
        let w = df.config.stick_sphere_w;
        let residueKeys = Object.keys(w3m.mol[pdbId].residueData[chainId]).sort(customCompare);
        let resInd = findResidueIdIndex(residueKeys, resId);
        let radius = df.config.tube_radius;
        let caAtom = df.tool.getMainAtom(pdbId, residue.caid);
        let preResidue = w3m.mol[pdbId].residueData[chainId][residueKeys[resInd - 1]];

        switch (type) {
            case 'FOOT':
                path = path.slice((path.length / 2) - 1, path.length);
                break;
            case 'HEAD':
                path = path.slice(0, path.length / 2 + 1);
                if (preResidue !== undefined && residueKeys[resInd - 1] !== undefined) {
                    if (customCompare(residueKeys[resInd - 1], resId) === -1) {
                        path = [preResidue.path[preResidue.path.length - 1]].concat(path);
                    }
                }
                break;
            case 'BODY':
                let w = df.config.stick_sphere_w;
                if (w3m.mol[pdbId].residueData[chainId][residueKeys[resInd - 1]] === undefined) {
                    df.drawer.drawSphere(pdbId, 'main', caAtom.chainName, path[0], caAtom.color, radius, caAtom, w);
                    df.GROUP[pdbId]['main'][caAtom.chainName].children[df.GROUP[pdbId]['main'][caAtom.chainName].children.length - 1].visible = true;
                }
                if (preResidue !== undefined && residueKeys[resInd - 1] !== undefined) {
                    if (customCompare(residueKeys[resInd - 1], resId) === -1) {
                        path = [preResidue.path[preResidue.path.length - 1]].concat(path);
                    }
                }
                break;
        }
        if (path.length > 0) {
            df.drawer.drawTube(
                path, radius, caAtom.color, caAtom, pdbId, 'main', caAtom.chainName
            );
            df.GROUP[pdbId]['main'][caAtom.chainName].children[df.GROUP[pdbId]['main'][caAtom.chainName].children.length - 1].visible = true;
        }
        if (type === 'BODY') {
            if (w3m.mol[pdbId].residueData[chainId][residueKeys[resInd + 1]] === undefined && (path.length - 1) > 0) {
                df.drawer.drawSphere(pdbId, 'main', caAtom.chainName, path[path.length - 1], caAtom.color, radius, caAtom, w);
                df.GROUP[pdbId]['main'][caAtom.chainName].children[df.GROUP[pdbId]['main'][caAtom.chainName].children.length - 1].visible = true;
            }
        }
    },
    showRibbonEllipseDrawFunc: function (pdbId, residue, path, cubeData) {
        let radius = df.config.ellipse_radius;
        let caAtom = df.tool.getMainAtom(pdbId, residue.caid);
        let caId = 0;
        caId = df.tool.atomCaId(caAtom);
        if (path.length > 0) {
            df.drawer.drawEllipse(
                path,
                radius,
                caAtom.color,
                cubeData,
                pdbId,
                'main',
                caAtom.chainName,
                caId,
                cubeData.tangents.length - 1);
            df.GROUP[pdbId]['main'][caAtom.chainName].children[df.GROUP[pdbId]['main'][caAtom.chainName].children.length - 1].visible = true;
        }
        return undefined;
    },
    showRibbonEllipseByResidueFOOT: function (pdbId, residue) {
        if (residue.path.length === 0) return;
        let path = residue.path.slice(
            (residue.path.length / 2) - 1, residue.path.length);
        let cubeData = {};
        cubeData.tangents = residue.tangents.slice((residue.tangents.length / 2) - 1, residue.tangents.length);
        cubeData.normals = residue.normals.slice((residue.normals.length / 2) - 1, residue.normals.length);
        cubeData.binormals = residue.binormals.slice((residue.binormals.length / 2) - 1, residue.binormals.length);
        this.showRibbonEllipseDrawFunc(pdbId, residue, path, cubeData);
    },
    showRibbonEllipseByResidue: function (pdbId, chainId, resId, residue, type) {
        let cubeData = {};
        let path = residue.path;
        if (path.length === 0) return;
        switch (type) {
            case 'BODY':
                cubeData.tangents = residue.tangents;
                cubeData.normals = residue.normals;
                cubeData.binormals = residue.binormals;
                break;
            case 'HEAD':
                path = path.slice(0, path.length / 2);
                cubeData.tangents = residue.tangents.slice(0, residue.tangents.length / 2);
                cubeData.normals = residue.normals.slice(0, residue.normals.length / 2);
                cubeData.binormals = residue.binormals.slice(0, residue.binormals.length / 2);
                break;
        }
        let residueKeys = Object.keys(w3m.mol[pdbId].residueData[chainId]).sort(customCompare);
        let resInd = findResidueIdIndex(residueKeys, resId);
        let preResidue = w3m.mol[pdbId].residueData[chainId][residueKeys[resInd - 1]];
        if (preResidue !== undefined && residueKeys[resInd - 1] !== undefined) {
            if (customCompare(residueKeys[resInd - 1], resId) === -1) {
                path = [preResidue.path[preResidue.path.length - 1]].concat(path);
                cubeData.tangents = [preResidue.tangents[preResidue.tangents.length - 1]].concat(cubeData.tangents);
                cubeData.normals = [preResidue.normals[preResidue.normals.length - 1]].concat(cubeData.normals);
                cubeData.binormals = [preResidue.binormals[preResidue.binormals.length - 1]].concat(cubeData.binormals);
            }
        }
        this.showRibbonEllipseDrawFunc(pdbId, residue, path, cubeData);
    },
    showRibbonArrow: function (pdbId, chainId, resId, residue) {
        let arrow = residue.arrow;
        if (arrow.length === 0) return;
        let residueKeys = Object.keys(w3m.mol[pdbId].residueData[chainId]).sort(customCompare);
        let resInd = findResidueIdIndex(residueKeys, resId);
        let preResidue = w3m.mol[pdbId].residueData[chainId][residueKeys[resInd - 1]];
        if (preResidue !== undefined && preResidue.arrow !== undefined && preResidue.arrow.length > 0) {
            if (customCompare(residueKeys[resInd - 1], resId) === -1) {
                arrow = [preResidue.arrow[preResidue.arrow.length - 1]].concat(arrow);
                arrow = [preResidue.arrow[preResidue.arrow.length - 2]].concat(arrow);
                arrow = [preResidue.arrow[preResidue.arrow.length - 3]].concat(arrow);
                arrow = [preResidue.arrow[preResidue.arrow.length - 4]].concat(arrow);
            }
        }
        let caAtom = df.tool.getMainAtom(pdbId, residue.caid);
        df.drawer.drawArrowByPaths(pdbId, 'main', caAtom.chainName, arrow, caAtom.color, residue.caid);
        df.GROUP[pdbId]['main'][caAtom.chainName].children[df.GROUP[pdbId]['main'][caAtom.chainName].children.length - 1].visible = true;
    },
    showCartoonSSEByResidue: function (pdbId, chainId, resId) {
        let residue = w3m.mol[pdbId].residueData[chainId][resId];
        switch (residue.sse) {
            case w3m.HELIX_HEAD:
                this.showTubeByResidue(pdbId, chainId, resId, residue, 'HEAD');
                this.showRibbonEllipseByResidueFOOT(pdbId, residue);
                break;
            case w3m.HELIX_BODY:
                this.showRibbonEllipseByResidue(pdbId, chainId, resId, residue, 'BODY');
                break;
            case w3m.HELIX_FOOT:
                this.showRibbonEllipseByResidue(pdbId, chainId, resId, residue, 'HEAD');
                this.showTubeByResidue(pdbId, chainId, resId, residue, 'FOOT');
                break;
            case w3m.SHEET_HEAD: //loop-->tube
                this.showTubeByResidue(pdbId, chainId, resId, residue, 'HEAD');
                this.showRibbonArrow(pdbId, chainId, resId, residue);
                break;
            case w3m.SHEET_BODY:
                this.showRibbonArrow(pdbId, chainId, resId, residue);
                break;
            case w3m.SHEET_FOOT:
                this.showRibbonArrow(pdbId, chainId, resId, residue);
                this.showTubeByResidue(pdbId, chainId, resId, residue, 'FOOT');
                break;
            case w3m.LOOP_HEAD: //sheet-->arrow
                this.showTubeByResidue(pdbId, chainId, resId, residue, 'BODY');
                break;
            case w3m.LOOP_BODY: //loop-->tube
                this.showTubeByResidue(pdbId, chainId, resId, residue, 'BODY');
                break;
            case w3m.LOOP_FOOT: //loop-->tube
                this.showTubeByResidue(pdbId, chainId, resId, residue, 'BODY');
                break;
        }
    },
    showSurface: function (pdbId,
                           chain = false,
                           startId = 1,
                           endId = false,
                           isSelected = true,
    ) {
        let mainAtom = w3m.mol[pdbId].atom.main;
        let atoms = {};
        let limit = w3m.global.limit;

        for (let i in mainAtom) {
            if (chain && mainAtom[i][4] !== chain) {
                continue;
            }
            let index = parseInt(i);
            if (index < startId) continue;
            if (endId) {
                if (index > endId) break;
            }
            let atom = df.tool.getMainAtom(pdbId, i);
            if ([65, 66, 67].includes(parseInt(atom.resid))) {
                continue
            }
            let xyz = atom.posCentered;
            let color;
            if (isSelected) {
                color = atom.color;
            } else {
                color = new THREE.Color(0xff00ff);
            }
            atoms[atom.id] = {
                coord: xyz,
                name: atom.name,
                serial: atom.id,
                elem: atom.type,
                resn: atom.resName,
                resi: atom.resid,
                color: color
            };
        }
        let ps = ProteinSurface({
            min: {
                x: limit.x[0],
                y: limit.y[0],
                z: limit.z[0]
            },
            max: {
                x: limit.x[1],
                y: limit.y[1],
                z: limit.z[1]
            },
            atoms: atoms,
            type: df.SURFACE_TYPE,
        });

        let geometry = new THREE.BufferGeometry();
        let vertices = [];
        let colors = [];
        ps.verts.forEach((v) => {
            vertices.push(v.x, v.y, v.z);
            let color = atoms[v.atomid].color;
            colors.push(color.r, color.g, color.b);
        });

        let faces = [];
        ps.faces.forEach((f) => {
            faces.push(f.a, f.b, f.c);
        });

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setIndex(faces);
        geometry.computeVertexNormals();

        let material = new THREE.MeshPhongMaterial({
            vertexColors: true,
            wireframe: df.SURFACE_WIREFRAME,
            opacity: df.SURFACE_OPACITY,
            transparent: true,
            specular: 0x888888,
            shininess: 250
        });

        let mesh = new THREE.Mesh(geometry, material);
        df.tool.alignMeshes(df.GROUP[pdbId]['main'][chain], mesh);
        df.GROUP[pdbId]['main'][chain].surface.add(mesh);
        df.GROUP[pdbId]['main'][chain].surface.visible = true;
        df.SURFACE_STORE[pdbId + '_' + chain] = mesh;
    },
    showMenu: function () {
        let first_number = 0
        let row = 0
        // show menu
        for (let i in df.menuList) {
            let menu_dict = df.menuList[i];
            for (let firstKey in menu_dict) {
                // 1st Menu
                let mesh_1 = df.drawer.createTextButton(firstKey);
                let height = -first_number * (df.textMenuHeight + df.letterSpacing);
                mesh_1.position.y = -1 + height;
                first_number += 1;
                if (menu_dict[firstKey] && menu_dict[firstKey].length > 0) {
                    let second_number = 0;
                    row = 1
                    for (let j in height) {

                    }
                    for (let secondKey in menu_dict[firstKey]) {
                        let menu_dict_2 = menu_dict[firstKey][secondKey];
                        let mesh_2 = df.drawer.createTextButton(secondKey);
                        let height_2 = -second_number * (df.textMenuHeight + df.letterSpacing);
                        let width = df.textMenuWidth * 2
                        second_number += 1;
                        mesh_2.position.y = -1 + height_2;
                        mesh_2.position.x = width;
                        if (menu_dict[secondKey] && menu_dict[secondKey].length > 0) {
                            row = 2
                            for (let thirdKey in menu_dict[secondKey]) {
                                let mesh_3 = df.drawer.createTextButton(thirdKey);
                            }
                        }
                    }
                }
            }
        }
    },
    constructMenu: function () {
        // 1.构建 menu
        let mainGroup = new Group();
        let subGroup = new Group();
        // let trdGroup = new Group();
        //
        let number = 0;
        for (let i in df.menu_content) {
            let pos = new THREE.Vector3(0, -1, -4);
            let height = -number * (df.textMenuHeight + df.letterSpacing);
            pos.y = -1 + height;
            number += 1;
            let label = df.MAIN_MENU;
            let mesh = df.drawer.createTextButton(i, pos, label);
            mainGroup.add(mesh);
            let subList = df.menu_content[i];
            if (subList.length > 0) {
                df.painter.createSubMenu(1, subList, df.SUB_MENU, subGroup);
            }
        }
        df.GROUP["menu"].add(mainGroup);
        df.GROUP["menu"].add(subGroup);
    },
    createSubMenu: function (x,
                             subList,
                             subLabel,
                             subGroup) {
        let number = 0;
        // 判断 subList 类型
        for (let j in subList) {
            let subPos = new THREE.Vector3(x, -1, -4);
            if (Array.isArray(subList)) {
                let subHeight = -j * (df.textMenuHeight + df.letterSpacing);
                subPos.y = -1 + subHeight;
            } else {
                let subHeight = -number * (df.textMenuHeight + df.letterSpacing);
                subPos.y = -1 + subHeight;
                number += 1;
            }
            let subMesh = df.drawer.createTextButton(subList[j], subPos, subLabel);
            subGroup.add(subMesh);
        }
    },
    refreshGeometryByMode: function (type) {
        if (type < df.HET) {
            df.dfRender.clear(0);
            df.controller.drawGeometry(type, df.SelectedPDBId);
            df.controller.drawGeometry(df.config.hetMode, df.SelectedPDBId);
        } else {
            df.dfRender.clear(1);
            df.controller.drawGeometry(type, df.SelectedPDBId);
        }
    },
    refreshSurface: function (opacity) {
        df.SURFACE_OPACITY = opacity;
        if (df.SURFACE_STORE.length > 0) {
            for (let index in df.SURFACE_STORE) {
                if (df.SURFACE_STORE[index] instanceof THREE.Mesh) {
                    let mesh = df.SURFACE_STORE[index];
                    if (mesh.material !== undefined) {
                        mesh.material.opacity = opacity;
                    }
                }
            }
        } else {
            for (const opacityKey in df.GROUP[df.SelectedPDBId]['main']) {
                df.painter.showSurface(df.SelectedPDBId, opacityKey, 1);
            }
        }
    }

}