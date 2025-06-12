import * as THREE from '../js/three.module.js';
import {df} from "./core.js";
import {w3m} from "./web3D/w3m.js";
import {camera, canon} from "./render.js";


class ButtonFactory {
    createButton(type, options) {
        let button;
        switch (type) {
            case df.DEFBUTTON:
                button = new DefaultButton(options);
                df.DFBUTTONS.push(button);
                break;
        }
        return button;
    }
}


class Button {
    constructor(options) {
        this.text = options.text;
        this.position = new THREE.Vector3(options.position.x, options.position.y, options.position.z);
        this.action = options.action || null;
        this.label = options.label;
        this.length = options.length;
        this.position.x = (this.length - 1) * df.lineSpacing + options.position.x;
        this.params = options.params || null;
        this.subMenu = options.subMenu || null;
        this.lastButton = options.lastButton || null;
        this.parentButton = options.parentButton || null;
        this.updateSubMenu = options.updateSubMenu || null;
        this.mesh = df.drawer.createTextButton(
            this.text, this.position, this.label, this.length
        );
    }

    hideAllSubButtons() {
        if (this.subMenu) {
            this.subMenu.buttons.forEach(button => {
                button.mesh.visible = false;
                button.hideAllSubButtons(); // 递归隐藏所有子按钮
            });
        }
    }

    onSelect() {
        df.tool.handleButtonSelection(this, df.LASTSELECTEDBUTTON);
        if (this.updateSubMenu) {
            this.updateSubMenu();
        }
        if (this.subMenu) {
            this.subMenu.toggleVisibility();
        } else if (typeof this.action === 'function') {
            if (this.params) {
                this.action(this.params);
            } else {
                this.action();
            }
        }
        if (this.lastButton) {
            this.parentButton.hideAllSubButtons();
        }
        df.LASTSELECTEDBUTTON = this;
    }
}

class DefaultButton extends Button {
    constructor(options) {
        super(options);
    }
}

class SubMenu {
    constructor(options) {
        this.buttons = options.buttons || [];
        this.visible = false;
        this.parent = options.parent || null;
        this.createSubMenu();
    }

    createSubMenu() {
        this.buttons.forEach((button, index) => {
            button.mesh.position.set(button.mesh.position.x, button.mesh.position.y + (-index * (df.textMenuHeight + df.letterSpacing)), button.mesh.position.z);
            button.mesh.visible = this.visible;
            button.parentButton = this.parent;
        });
    }

    toggleVisibility() {
        this.visible = !this.visible;
        this.buttons.forEach(button => {
            button.mesh.visible = this.visible;
        });
    }

    addButton(button) {
        this.buttons.push(button);
        button.mesh.visible = this.visible;
    }
}

let buttonFactory = new ButtonFactory();

function submitAPI(data, url, ligand) {
    data = JSON.stringify(data);
    df.api.apiRequest(url, data, (response) => {
        df.pdbText[ligand] = response['rotation'];
        df.loader.loadFromString(ligand, response['rotation'], function () {
            df.controller.drawGeometry(df.config.mainMode, ligand);
            df.SelectedPDBId = ligand;
        });
    });
}


function submitAlign(data, url, ligand) {
    data = JSON.stringify(data);
    df.SelectedPDBId = ligand;
    THREE.Cache.clear();
    df.dfRender.clear(0);
    delete df.w3m.mol[ligand];
    df.api.apiRequest(url, data, (response) => {
        console.log(ligand)
        console.log(response['rotation'])
        df.loader.loadFromString(ligand, response['rotation'], function () {
            df.controller.drawGeometry(df.config.mainMode, ligand);
            df.SelectedPDBId = ligand;
            for (let i in df.GROUP[ligand]['main']) {
                let aaa = df.GROUP[ligand]['main'][i];
                aaa.scale.set(df.scale, df.scale, df.scale);
            }
        });
    });
}

async function waitIfPaused() {
    if (df.isPaused) {
        await new Promise(resume => {
            // 挂到同一个 _resumeResolve 上
            const old = df._resumeResolve;
            df._resumeResolve = () => {
                if (old) old();
                resume();
            };
        });
    }
}


async function loadAllPDBs() {
    let previousGroup = null;
    let previousPDBId = null;
    let step = 0;  // diffusion 过程的 timestep 计数器

    for (const param of df.pdbObjects) {
        await waitIfPaused();


        // 加载当前 PDB 并显示
        await new Promise((resolve) => {
            df.loader.load(param, 'name', function () {
                Promise.all([
                    df.controller.drawGeometry(df.config.mainMode, param),
                    // df.controller.drawGeometry(df.config.hetMode, param)
                ]).then(() => {
                    df.SelectedPDBId = param;
                    // 更新并显示当前步数
                    step += 1;
                    df.updateStepText(step);

                    const group = df.GROUP[df.SelectedPDBId];
                    // 遍历并缩放所有对象，并设置为可见
                    let list = [];
                    for (let index in group) {
                        for (let i in group[index]) {
                            let obj = group[index][i];
                            list.push(obj);
                            obj.scale.set(df.scale, df.scale, df.scale);
                            obj.visible = true;
                            if (obj.surface) {
                                obj.surface.scale.set(df.scale, df.scale, df.scale);
                                obj.surface.visible = true;
                            }
                        }
                    }
                    if (param === df.pdbObjects[0]) {
                        df.tool.vrCameraCenter(canon, camera, list);
                    }
                    // 清理上一个 group
                    if (previousGroup && previousPDBId) {
                        df.tool.clearToolsId(previousPDBId);
                    }
                    previousGroup = group;
                    previousPDBId = param;

                    // 等待一点时间再加载下一个
                    setTimeout(resolve, 50);
                });
            });
        });
    }

    // （可选）最后一个 group 若也要清理，就在这里调用 disposeGroup
}

//
// async function loadAllPDBs() {
//     let previousGroup = null;
//     let previousPDBId = null;
//     for (const param of df.pdbObjects) {
//         await waitIfPaused();
//         // 加载当前 PDB 并显示
//         await new Promise((resolve) => {
//             df.loader.load(param, 'name', function () {
//                 Promise.all([
//                     df.controller.drawGeometry(df.config.mainMode, param),
//                     // df.controller.drawGeometry(df.config.hetMode, param)
//                 ]).then(() => {
//                     df.SelectedPDBId = param;
//
//                     const group = df.GROUP[df.SelectedPDBId];
//                     // 遍历并缩放所有对象，并设置为可见
//                     let list = []
//                     for (let index in group) {
//                         for (let i in group[index]) {
//                             let obj = group[index][i];
//                             list.push(obj);
//                             obj.scale.set(df.scale, df.scale, df.scale);
//                             obj.visible = true;
//                             if (obj.surface) {
//                                 obj.surface.scale.set(df.scale, df.scale, df.scale);
//                                 obj.surface.visible = true;
//                             }
//                         }
//                     }
//                     if (param === df.pdbObjects[0]) {
//                         df.tool.vrCameraCenter(canon, camera, list);
//                     }
//                     // 更新当前 group 为 previous
//                     if (previousGroup && previousPDBId) {
//                         df.tool.clearToolsId(previousPDBId)
//                     }
//                     previousGroup = group;
//                     previousPDBId = param;
//
//                     // 等待几秒再加载下一个
//                     setTimeout(() => {
//                         resolve();
//                     }, 20); // 显示 3 秒
//
//                 });
//             });
//         });
//     }
//     // 最后一个 group 不删除（可选）
//     // 如果你想最后一个也删除，加上：
//     // if (previousGroup && previousPDBId) {
//     //     disposeGroup(previousGroup);
//     //     delete df.GROUP[previousPDBId];
//     // }
// }
//

df.actionManager = {
    diffuse: function () {
        df.actionManager.closeMenu();
        df.config.mainMode = df.BALL_AND_ROD;
        df.w3m.config.color_mode_main = 607;
        df.scale = 0.5;

        // let url = window.location.href + 'diffuse';
        // let data = {
        //     'pdb_string': df.pdbText['4ulh'],
        // };
        //
        // // submitAlign(data, url, df.ALIGN_LIGAND);
        // data = JSON.stringify(data);
        // df.tool.clearTools(2);
        // delete df.w3m.mol['4ulh'];
        // df.api.apiRequest(url, data, (response) => {
        //     loadAllPDBs();
        // });
        loadAllPDBs();
    },
    closeMenu: function () {
        df.showMenu = false;
        df.GROUP['menu'].visible = df.showMenu;
    },
    hide: function (group) {
        group.visible = false;
        df.actionManager.closeMenu();
    },
    // drag Action
    zoomAction: function () {
        df.tool.initPDBView(df.SelectedPDBId);
        df.actionManager.closeMenu();
    },
    dragAction: function (select_type) {
        // 切换为 drag mode
        if (select_type === df.select_residues) {
            df.SELECT_RESIDUE_MESH = [];
        }
        df.selection = select_type;
        df.actionManager.closeMenu();
    },
    // docking action
    dockingSubmitAction: function () {
        // 提交到 docking api
        df.actionManager.closeMenu();
        let url = df.dockingDict[df.SELECTED_DOCKING];
        let data = {
            'receptor': df.pdbText[df.ALIGN_RECEPTOR],
            'ligand': df.pdbText[df.ALIGN_LIGAND]
        };
        submitAPI(data, url);
    },
    dockingToolsAction: function (param) {
        df.SELECTED_DOCKING = param;
    },
    dockingReceptorAction: function (param) {
        df.DOCKING_RECEPTOR = param;
    },
    dockingLigandAction: function (param) {
        df.DOCKING_LIGAND = param;
    },
    // align
    alignSubmitAction: function () {
        // 提交到 docking api
        df.actionManager.closeMenu();
        let url = df.ALIGN_TOOLS[df.SELECTED_ALIGN];
        let data = {
            'receptor': df.pdbText[df.ALIGN_RECEPTOR],
            'ligand': df.pdbText[df.ALIGN_LIGAND]
        };
        submitAlign(data, url, df.ALIGN_LIGAND);
    },
    alignToolsAction: function (param) {
        df.SELECTED_ALIGN = param;
    },
    alignReceptorAction: function (param) {
        df.ALIGN_RECEPTOR = param;
    },
    alignLigandAction: function (param) {
        df.ALIGN_LIGAND = param;
    },
    energyAction: function (param) {
        df.SELECTED_ENERGY = param;
    },
    // structure
    structureAction: function (type) {
        if (type !== df.HIDE) {
            df.config.mainMode = type;
            df.painter.refreshGeometryByMode(type);
        } else {
            for (let child in df.GROUP[df.SelectedPDBId].children) {
                let group = df.GROUP[df.SelectedPDBId].children[child]
                group.visible = false;
            }
        }
        df.actionManager.closeMenu();
    },
    // ligand
    ligandAction: function (type) {
        if (type !== df.HIDE) {
            df.config.hetMode = type;
            df.painter.refreshGeometryByMode(type);
        } else {
            for (let child in df.GROUP[df.SelectedPDBId]) {
                let group = df.GROUP[df.SelectedPDBId][child]
                if (child !== 'main') {
                    group.visible = false;
                }
            }
        }
        df.actionManager.closeMenu();
    },
    // surface
    surfaceHideAction: function () {
    },
    surfaceAction: function (type) {
        df.painter.refreshSurface(type);
        df.actionManager.closeMenu();
    },
    designSelectAction: function () {
        df.actionManager.closeMenu();
        df.selection = df.select_region;

        // df.actionManager.closeMenu();
    },
    designToolAction: function (param) {
        df.SELECTED_DESIGN = param;
    },
    designSubmitAction: function () {
        df.actionManager.closeMenu();
        // 请求design接口
        let url = df.DESIGN_TOOLS[df.SELECTED_DESIGN];
        let data = df.pdbText[df.SelectedPDBId];
        df.api.apiRequest(url, data, df.loader.load('pred', 'name', function () {
            df.controller.drawGeometry(df.config.mainMode, 'pred');
        }));

        df.SelectedPDBId = "pred";
    },
    // color action
    colorAction: function (param) {
        w3m.config.color_mode_main = Number(param);
        w3m.tool.updateMolColorMap(df.SelectedPDBId);
        df.dfRender.clear(0);
        df.controller.drawGeometry(df.config.mainMode, df.SelectedPDBId);
        df.actionManager.closeMenu();
    },
    // Export pdb
    exportPDBAction: function (param) {
        let text = df.pdbText[param]
        df.tool.savePDB(text, param + '.pdb');
    },

    loadFileAction: function (param) {
        // df.tool.clearTools(2);
        df.isScore = false;
        df.loader.load(param, 'name', function () {
            Promise.all([
                df.controller.drawGeometry(df.config.mainMode, param),
                df.controller.drawGeometry(df.config.hetMode, param)
            ]).then(() => {
                df.SelectedPDBId = param;
                df.scale = 0.012;
                let list = []
                for (let index in df.GROUP[df.SelectedPDBId]) {
                    for (let i in df.GROUP[df.SelectedPDBId][index]) {
                        console.log(index)
                        let aaa = df.GROUP[df.SelectedPDBId][index][i];
                        list.push(aaa);
                        console.log(i)
                        aaa.scale.set(df.scale, df.scale, df.scale);
                        if (aaa.surface) {
                            let bbb = aaa.surface;
                            bbb.scale.set(df.scale, df.scale, df.scale);
                        }

                    }
                } // 等两个绘制都完成后执行
                df.tool.vrCameraCenter(canon, camera, list);
            })
        });
        df.actionManager.closeMenu();
    },
    // clear
    clearPDBAction: function () {
        df.tool.clearTools(2);
        df.actionManager.closeMenu();
    },
    // scale
    scaleAction: function (param) {
        df.scale = param;
        console.log(df.scale)
        let list = []
        for (let index in df.GROUP[df.SelectedPDBId]) {
            for (let i in df.GROUP[df.SelectedPDBId][index]) {
                let aaa = df.GROUP[df.SelectedPDBId][index][i];
                list.push(aaa);
                aaa.scale.set(df.scale, df.scale, df.scale);
                if (aaa.surface) {
                    let bbb = aaa.surface;
                    bbb.scale.set(df.scale, df.scale, df.scale);
                }
            }
        } // 等两个绘制都完成后执行
        df.tool.vrCameraCenter(canon, camera, list);
        df.actionManager.closeMenu();
    }
}

function createThirdButton(dicts, position, action, parentButton, length) {
    if (parentButton.subMenu) {
        parentButton.subMenu.buttons.forEach(button => {
            if (button && button.mesh) {
                df.GROUP['menu'].remove(button.mesh);
                button.mesh.geometry.dispose();
                button.mesh.material.dispose();
                // 清除引用
                button.mesh = null;
            }
        });
        parentButton.subMenu.buttons = [];
    } else {
        parentButton.subMenu = new SubMenu({buttons: [], parent: parentButton});
    }
    let number = 0
    let y = position.y
    // position.x = position.x + (length - 2) * df.lineSpacing;
    for (let dkt in dicts) {
        position.y = y - number * (df.textMenuHeight + df.letterSpacing);
        let button = buttonFactory.createButton(df.DEFBUTTON, {
            text: dkt,
            position: position,
            label: dkt,
            action: action,
            params: dkt,
            lastButton: true,
            length: length,
            parentButton: parentButton
        });
        number += 1
        parentButton.subMenu.addButton(button);
    }
    return parentButton.subMenu
}


function createLoadPDBButton(x, y, z, parentButton) {
    if (parentButton.subMenu) {
        parentButton.subMenu.buttons.forEach(button => {
            if (button && button.mesh) {
                df.GROUP['menu'].remove(button.mesh);
                button.mesh.geometry.dispose();
                button.mesh.material.dispose();
                // 清除引用
                button.mesh = null;
            }
        });
        parentButton.subMenu.buttons = [];
    } else {
        parentButton.subMenu = new SubMenu({buttons: [], parent: parentButton});
    }
    if (df.FILE_PATH.length > 0) {
        let number = 0;
        for (let idx in df.FILE_PATH) {
            let text = df.FILE_PATH[idx];
            if (df.pdbObjects.includes(text)) {
                continue
            }
            // x = x + df.lineSpacing;
            let button = buttonFactory.createButton(df.DEFBUTTON, {
                text: text,
                position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
                label: text,
                length: 2,
                params: text,
                action: df.actionManager.loadFileAction,
                parentButton: parentButton
            });
            number += 1
            parentButton.subMenu.addButton(button);
        }
    }
    return parentButton.subMenu
}


function createScaleButton(x, y, z, parentButton) {
    if (parentButton.subMenu) {
        parentButton.subMenu.buttons.forEach(button => {
            if (button && button.mesh) {
                df.GROUP['menu'].remove(button.mesh);
                button.mesh.geometry.dispose();
                button.mesh.material.dispose();
                // 清除引用
                button.mesh = null;
            }
        });
        parentButton.subMenu.buttons = [];
    } else {
        parentButton.subMenu = new SubMenu({buttons: [], parent: parentButton});
    }
    let number = 0;
    let listDir = [0.01, 0.015, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2]
    for (let idx in listDir) {
        let text = listDir[idx];
        let button = buttonFactory.createButton(df.DEFBUTTON, {
            text: text,
            position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
            label: text,
            length: 3,
            params: text,
            action: df.actionManager.scaleAction,
            parentButton: parentButton
        });
        number += 1
        parentButton.subMenu.addButton(button);
    }
    return parentButton.subMenu
}

function createMenuButton(group) {
    // 创建初始化 button
    let x = -0.5,
        y = 0.25,
        z = -1.5;
    let number = 0;

    // length 1
    // load button
    let loadPDB = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Load",
        position: new THREE.Vector3(x, y, z),
        label: "",
        length: 1,
        updateSubMenu: function () {
            let path = {'filePath': df.DATA_PATH};
            path = JSON.stringify(path);
            let url = df.LOAD_URL;
            df.api.apiRequest(url, path, function (responseData) {
                console.log(responseData)
                df.FILE_PATH = responseData["files"];
                if (df.FILE_PATH) {
                    let buttons = createLoadPDBButton(x, y, z, loadPDB);
                }
            });
        },
    });
    // Drag
    number += 1;
    let drag = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Drag",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "drag",
        length: 1,
    });
    // number += 1;
    // let design = buttonFactory.createButton(df.DEFBUTTON, {
    //     text: "Design",
    //     position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
    //     label: "design",
    //     length: 1,
    // });
    // Structure
    number += 1;
    let structure = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Show structure",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "structure",
        length: 1,
    });
    // Structure
    number += 1;
    let ligand = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Ligand",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "ligand",
        length: 1,
    });
    // Scuba
    number += 1;
    let surface = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Surface",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "surface",
        length: 1,
    });
    number += 1;
    let color = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Color",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "color",
        length: 1,
    });
    number += 1;
    let toolkits = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Toolkits",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "toolkits",
        length: 1,
        action: ""
    });
    number += 1;
    let design = buttonFactory.createButton(df.DEFBUTTON, {
        text: "SCUBA",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "SCUBA",
        length: 1,
        state: 1,
        action: df.actionManager.clearPDBAction,
    });
    number += 1;
    let design1 = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Design",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "Design",
        length: 1,
        state: 1,
        action: df.actionManager.clearPDBAction,
    });
    number += 1;
    let score1 = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Score",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "Score",
        length: 1,
        state: 1,
        action: df.actionManager.clearPDBAction,
    });

    number += 1;
    let docking = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Docking",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "docking",
        length: 1,
        action: ""
    });
    number += 1;
    let energy = buttonFactory.createButton(df.DEFBUTTON, {
        text: "DDFire",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "energy",
        length: 1,
        action: ""
    });
    number += 1;
    let exportPDB = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Export",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "export PDB",
        length: 1,
        state: 1,
        action: "",
        updateSubMenu: function () {
            createThirdButton(
                df.pdbText,
                new THREE.Vector3(x, y, z),
                df.actionManager.exportPDBAction,
                exportPDB,
                2);
        }
    });
    number += 1;
    let clearPDB = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Clear",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "CLEAR",
        length: 1,
        state: 1,
        action: df.actionManager.clearPDBAction,
    });
    number += 1;
    let exit = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Exit",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "exit",
        length: 1,
        action: ""
    });


    number = 0;
    let align = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Align",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "align",
        length: 2,
        action: ""
    });
    // x = x + df.lineSpacing;

    // number += 1;
    // let refineStructure = buttonFactory.createButton(df.DEFBUTTON, {
    //     text: "Refine Structure",
    //     position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
    //     label: "refineStructure",
    //     length: 2,
    // });
    let scale = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Scale",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "Scale",
        length: 2,
    });
    let diffuse = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Diffuse",
        position: new THREE.Vector3(x, y + (-number * (df.textMenuHeight + df.letterSpacing)), z),
        label: "diffuse",
        length: 2,
        action: df.actionManager.diffuse,
    });

    toolkits.subMenu = new SubMenu({
        buttons: [
            align,
            // docking,
            // energy,
            // refineStructure,
            scale,
            diffuse,
        ],
        parent: toolkits
    });
    loadPDB.subMenu = new SubMenu({
        buttons: df.FILE_PATH,
        parent: loadPDB
    })

    // init sub-button
    // general button
    // drag sub-button
    // x = x + df.lineSpacing;
    let zoom = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Zoom",
        position: new THREE.Vector3(x, y, z),
        label: "zoom",
        action: df.actionManager.zoomAction,
        length: 2,
    });
    let dragInit = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Undo",
        position: new THREE.Vector3(x, y, z),
        label: "init",
        action: df.actionManager.dragAction,
        params: df.select_all,
        length: 2,
    });
    // let dragMultiChain = buttonFactory.createButton(df.DEFBUTTON, {
    //     text: "Drag Multi Chain",
    //     position: new THREE.Vector3(x, y, z),
    //     label: "dragMultiChain",
    //     action: df.actionManager.dragAction,
    //     params: df.select_multi_chain,
    //     length: 2,
    // });
    let dragMain = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Drag structure",
        position: new THREE.Vector3(x, y, z),
        label: "dragPDB",
        action: df.actionManager.dragAction,
        params: df.select_main,
        length: 2,
    });
    let dragChain = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Drag chains",
        position: new THREE.Vector3(x, y, z),
        label: "dragChain",
        action: df.actionManager.dragAction,
        params: df.select_chain,
        length: 2,
    });
    let dragResidue = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Drag residues",
        position: new THREE.Vector3(x, y, z),
        label: "dragResidue",
        action: df.actionManager.dragAction,
        params: df.select_residue,
        length: 2,
    });
    // let selectResidues = buttonFactory.createButton(df.DEFBUTTON, {
    //     text: "select Residues",
    //     position: new THREE.Vector3(x, y, z),
    //     label: "dragAtom",
    //     action: df.actionManager.dragAction,
    //     params: df.select_residues,
    //     length: 2,
    // });
    // let dragResidues = buttonFactory.createButton(df.DEFBUTTON, {
    //     text: "drag Residues",
    //     position: new THREE.Vector3(x, y, z),
    //     label: "dragLigand",
    //     action: df.actionManager.dragAction,
    //     params: df.drag_residues,
    //     length: 2,
    // });
    drag.subMenu = new SubMenu({
        buttons: [
            zoom,
            dragInit,
            dragMain,
            dragChain,
            // dragMultiChain,
            dragResidue,
            // selectResidues,
            // dragResidues,
        ],
        parent: drag,
    });
    // structure
    let structureHide = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Hide structure",
        position: new THREE.Vector3(x, y, z),
        label: "hide",
        action: df.actionManager.structureAction,
        params: df.HIDE,
        length: 2,
    });
    // let structureLine = buttonFactory.createButton(df.DEFBUTTON, {
    //     text: "Line",
    //     position: new THREE.Vector3(x, y, z),
    //     label: "line",
    //     action: df.actionManager.structureAction,
    //     params: df.LINE,
    // length: 2,
    // });
    // let structureDot = buttonFactory.createButton(df.DEFBUTTON, {
    //     text: "Dot",
    //     position: new THREE.Vector3(x, y, z),
    //     label: "dot",
    //     action: df.actionManager.structureAction,
    //     params: df.DOT,
    // });
    // let structureBackbone = buttonFactory.createButton(df.DEFBUTTON, {
    //     text: "BackBone",
    //     position: new THREE.Vector3(x, y, z),
    //     label: "backbone",
    //     action: df.actionManager.structureAction,
    //     params: df.BACKBONE,
    // });
    // let structureSphere = buttonFactory.createButton(df.DEFBUTTON, {
    //     text: "Sphere",
    //     position: new THREE.Vector3(x, y, z),
    //     label: "sphere",
    //     action: df.actionManager.structureAction,
    //     params: df.SPHERE,
    // });
    let structureBallRod = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Ball & Rod",
        position: new THREE.Vector3(x, y, z),
        label: "ballrod",
        action: df.actionManager.structureAction,
        params: df.BALL_AND_ROD,
        length: 2,
    });
    let structureCartoon = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Cartoon",
        position: new THREE.Vector3(x, y, z),
        label: "cartoon",
        action: df.actionManager.structureAction,
        params: df.CARTOON_SSE,
        length: 2,
    });
    // let structureHBond = buttonFactory.createButton(df.DEFBUTTON, {
    //     text: "Hydrogen Bond",
    //     position: new THREE.Vector3(x, y, z),
    //     label: "hydrogenBond",
    //     action: df.actionManager.structureAction,
    //     params: df.HIDE,
    // });
    // let structureExit = buttonFactory.createButton(df.DEFBUTTON, {
    //     text: "Exit",
    //     position: new THREE.Vector3(x, y, z),
    //     label: "subExit",
    //     lastButton: true,
    //     length: 2,
    //     parentButton: structure
    // });
    structure.subMenu = new SubMenu({
        buttons: [
            structureHide,
            // structureLine,
            // structureDot,
            // structureBackbone,
            // structureSphere,
            structureBallRod,
            structureCartoon,
            // structureHBond,
            // structureExit
        ],
        parent: structure
    });
    // ligand
    let ligandHide = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Hide",
        position: new THREE.Vector3(x, y, z),
        label: "hide",
        action: df.actionManager.ligandAction,
        params: df.HIDE,
        length: 2,
    });
    let ligandLine = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Line",
        position: new THREE.Vector3(x, y, z),
        label: "line",
        action: df.actionManager.ligandAction,
        params: df.LINE,
        length: 2,
    });
    let ligandDot = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Dot",
        position: new THREE.Vector3(x, y, z),
        label: "dot",
        action: df.actionManager.ligandAction,
        params: df.DOT,
        length: 2,
    });
    let ligandBackbone = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Backbone",
        position: new THREE.Vector3(x, y, z),
        label: "backbone",
        action: df.actionManager.ligandAction,
        params: df.BACKBONE,
        length: 2,
    });
    let ligandSphere = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Sphere",
        position: new THREE.Vector3(x, y, z),
        label: "Sphere",
        action: df.actionManager.ligandAction,
        params: df.SPHERE,
        length: 2,
    });
    let ligandBallRod = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Ball & Rod",
        position: new THREE.Vector3(x, y, z),
        label: "ball rod",
        action: df.actionManager.ligandAction,
        params: df.BALL_AND_ROD,
        length: 2,
    });
    // let ligandExit = buttonFactory.createButton(df.DEFBUTTON, {
    //     text: "Exit",
    //     position: new THREE.Vector3(x, y, z),
    //     label: "subExit",
    //     lastButton: true,
    //     length: 2,
    //     parentButton: structure
    // });
    ligand.subMenu = new SubMenu({
        buttons: [
            ligandHide,
            ligandLine,
            ligandDot,
            ligandBackbone,
            ligandSphere,
            ligandBallRod,
            // ligandExit
        ],
        parent: ligand,
    });
    // move camera

    // surface
    let surfaceHide = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Hide",
        position: new THREE.Vector3(x, y, z),
        label: "hide",
        action: df.actionManager.surfaceHideAction,
        params: df.HIDE,
        length: 2,
    });
    let surface10 = buttonFactory.createButton(df.DEFBUTTON, {
        text: "1.0",
        position: new THREE.Vector3(x, y, z),
        label: "1.0",
        action: df.actionManager.surfaceAction,
        params: 1.0,
        length: 2,
    });
    let surface08 = buttonFactory.createButton(df.DEFBUTTON, {
        text: "0.8",
        position: new THREE.Vector3(x, y, z),
        label: "0.8",
        action: df.actionManager.surfaceAction,
        params: 0.8,
        length: 2,
    });
    let surface06 = buttonFactory.createButton(df.DEFBUTTON, {
        text: "0.6",
        position: new THREE.Vector3(x, y, z),
        label: "0.6",
        action: df.actionManager.surfaceAction,
        params: 0.6,
        length: 2,
    });
    let surface04 = buttonFactory.createButton(df.DEFBUTTON, {
        text: "0.4",
        position: new THREE.Vector3(x, y, z),
        label: "0.4",
        action: df.actionManager.surfaceAction,
        params: 0.4,
        length: 2,
    });
    let surface02 = buttonFactory.createButton(df.DEFBUTTON, {
        text: "0.2",
        position: new THREE.Vector3(x, y, z),
        label: "0.2",
        action: df.actionManager.surfaceAction,
        params: 0.2,
        length: 2,
    });
    surface.subMenu = new SubMenu({
        buttons: [
            surfaceHide,
            surface10,
            surface08,
            surface06,
            surface04,
            surface02,
        ],
        parent: surface,
    });
    // color
    let colorByElement = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Element",
        position: new THREE.Vector3(x, y, z),
        label: "Element",
        action: df.actionManager.colorAction,
        params: 601,
        length: 2,
    });
    let colorByResidue = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Residue",
        position: new THREE.Vector3(x, y, z),
        label: "Residue",
        action: df.actionManager.colorAction,
        params: 602,
        length: 2,
    });
    let colorBySecStructure = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Second structure",
        position: new THREE.Vector3(x, y, z),
        label: "Second structure",
        action: df.actionManager.colorAction,
        params: 603,
        length: 2,
    });
    let colorByChain = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Chain",
        position: new THREE.Vector3(x, y, z),
        label: "Chain",
        action: df.actionManager.colorAction,
        params: 604,
        length: 2,
    });
    let colorByPDB = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Structure",
        position: new THREE.Vector3(x, y, z),
        label: "Structure",
        action: df.actionManager.colorAction,
        params: 607,
        length: 2,
    });
    let colorByHYDROPHOBICITY = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Hydrophobicity",
        position: new THREE.Vector3(x, y, z),
        label: "Hydrophobicity",
        action: df.actionManager.colorAction,
        params: 609,
        length: 2,
    });
    color.subMenu = new SubMenu({
        buttons: [
            colorByElement,
            colorByResidue,
            colorBySecStructure,
            colorByChain,
            colorByPDB,
            colorByHYDROPHOBICITY,
        ],
        parent: color,
    });
    // docking
    let dockingTools = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Tools",
        position: new THREE.Vector3(x, y, z),
        label: "tools",
        length: 2,
    });
    let dockingReceptor = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Receptor",
        position: new THREE.Vector3(x, y, z),
        label: "receptor",
        length: 2,
        updateSubMenu: function () {
            // docking Receptor
            createThirdButton(
                df.pdbText,
                new THREE.Vector3(x, y, z),
                df.actionManager.dockingReceptorAction,
                dockingReceptor,
                3);
        }
    });
    let dockingLigand = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Ligand",
        position: new THREE.Vector3(x, y, z),
        label: "ligand",
        length: 2,
        updateSubMenu: function () {
            // docking Ligand
            createThirdButton(
                df.pdbText,
                new THREE.Vector3(x, y, z),
                df.actionManager.dockingLigandAction,
                dockingLigand,
                3);
        }
    });
    let dockingSubmit = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Submit",
        position: new THREE.Vector3(x, y, z),
        label: "submit",
        length: 2,
        action: df.actionManager.dockingSubmitAction
    });
    // let dockingExit = buttonFactory.createButton(df.DEFBUTTON, {
    //     text: "Exit",
    //     position: new THREE.Vector3(x, y, z),
    //     label: "exit",
    //     lastButton: true,
    //     length: 3,
    //     parentButton: docking
    // });
    // docking tool sub
    createThirdButton(
        df.dockingDict,
        new THREE.Vector3(x, y, z),
        df.actionManager.dockingToolsAction,
        dockingTools,
        3);
    docking.subMenu = new SubMenu({
        buttons: [
            dockingTools,
            dockingReceptor,
            dockingLigand,
            dockingSubmit,
            // dockingExit
        ],
        parent: docking,
    });
    let designTools = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Tools",
        position: new THREE.Vector3(x, y, z),
        label: "tools",
        length: 2,
    })
    let designSelect = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Select range",
        position: new THREE.Vector3(x, y, z),
        label: "select",
        length: 2,
        action: df.actionManager.designSelectAction
    });
    let designSubmit = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Submit",
        position: new THREE.Vector3(x, y, z),
        label: "submit",
        length: 2,
        action: df.actionManager.designSubmitAction
    });
    // docking tool sub
    createThirdButton(
        df.DESIGN_TOOLS,
        new THREE.Vector3(x, y, z),
        df.actionManager.designToolAction,
        designTools,
        3);
    design.subMenu = new SubMenu({
        buttons: [
            designTools,
            designSelect,
            designSubmit,
            // dockingExit
        ],
        parent: design,
    });

    // align
    let alignTools = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Tools",
        position: new THREE.Vector3(x, y, z),
        label: "tools",
        length: 3,
    });
    let alignReceptor = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Receptor",
        position: new THREE.Vector3(x, y, z),
        label: "receptor",
        length: 3,
        updateSubMenu: function () {
            createThirdButton(
                df.pdbText,
                new THREE.Vector3(x, y, z),
                df.actionManager.alignReceptorAction,
                alignReceptor,
                4);
        }
    });
    let alignLigand = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Ligand",
        position: new THREE.Vector3(x, y, z),
        label: "ligand",
        length: 3,
        updateSubMenu: function () {
            createThirdButton(
                df.pdbText,
                new THREE.Vector3(x, y, z),
                df.actionManager.alignLigandAction,
                alignLigand,
                4);
        }
    });
    let alignSubmit = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Submit",
        position: new THREE.Vector3(x, y, z),
        label: "submit",
        length: 3,
        action: df.actionManager.alignSubmitAction
    });
    // docking tool sub
    createThirdButton(
        df.ALIGN_TOOLS,
        new THREE.Vector3(x, y, z),
        df.actionManager.alignToolsAction,
        alignTools,
        4);
    align.subMenu = new SubMenu({
        buttons: [
            alignTools,
            alignReceptor,
            alignLigand,
            alignSubmit,
        ],
        parent: align,
    });
    createScaleButton(x, y, z, scale);

    // Energy
    let energyTools = buttonFactory.createButton(df.DEFBUTTON, {
        text: "Tools",
        position: new THREE.Vector3(x, y, z),
        label: "tools",
        length: 2,
    });
    createThirdButton(
        df.ENERGY_TOOLS,
        new THREE.Vector3(x, y, z),
        df.actionManager.energyAction,
        energyTools,
        3);
    energy.subMenu = new SubMenu({
        buttons: [
            energyTools
        ],
        parent: energy,
    });
    // refine Structure
    // createThirdButton(
    //     df.ENERGY_TOOLS,
    //     new THREE.Vector3(x, y, z),
    //     df.actionManager.energyAction,
    //     refineStructure,
    //     2);
    // Export PDB
    createThirdButton(
        df.pdbText,
        new THREE.Vector3(x, y, z),
        df.actionManager.exportPDBAction,
        exportPDB,
        2);
}

export {createMenuButton}
