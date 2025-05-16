import {w3m} from "./web3D/w3m.js";
import {df} from './core.js';

df.controller = {
    init: function () {
        df.w3m = w3m;
        this.createMenu();
        if (df.mode === df.MODE_VR) {
            df.dfRender.initVR();
        }
    },
    createMenu: function () {
        // =============================== Mode for structure =======================
        // 上传文件
        // let b_upload = document.getElementById("upload_button");
        // b_upload.addEventListener('change', function () {
        //     if (this.files.length > 0) {
        //         let file = this.files[0];
        //         let pdbId = file.name.split(".")[0].trim();
        //         pdbId = pdbId.toLowerCase();
        //         if (!pdbId) {
        //             pdbId = 'yang'
        //         }
        //         df.loader.load(file, 'file', function () {
        //             df.controller.drawGeometry(df.config.mainMode, pdbId);
        //             df.controller.drawGeometry(df.config.hetMode, pdbId);
        //         });
        //         df.SelectedPDBId = pdbId;
        //     }
        // });
        //
        // let b_showWater = document.getElementById("showWater");
        // b_showWater.addEventListener('click', function (e) {
        //     df.isShowWater = e.target.checked;
        //     df.painter.showWater(df.SelectedPDBId);
        // });

        // todo
        //     let dockingButton = document.getElementById("DockingButton");
        //     let dockingTab = document.getElementById("DockingTab");
        //     let closeDockingTab = document.getElementById("CloseDockingTab");
        //     let DockingTool = document.getElementById("DockingTool");
        //     let Receptor = document.getElementById("Receptor");
        //     let Ligand = document.getElementById("Ligand");
        //     let DockingSubmit = document.getElementById("DockingSubmit");
        //     let DockingToolValue = undefined;
        //     let ReceptorValue = undefined;
        //     let LigandValue = undefined;
        //
        //
        //     dockingButton.addEventListener('click', function (e) {
        //         dockingTab.style.display = "block";
        //         df.controller.popSelectOption(DockingTool, Object.keys(df.dockingDict));
        //         df.controller.popSelectOption(Receptor, df.pdbId);
        //         df.controller.popSelectOption(Ligand, df.pdbId);
        //         DockingToolValue = DockingTool.value;
        //         ReceptorValue = Receptor.value;
        //         LigandValue = Ligand.value;
        //     });
        //     DockingTool.addEventListener('change', function () {
        //         DockingToolValue = this.value;
        //     });
        //     Receptor.addEventListener('change', function () {
        //         ReceptorValue = this.value;
        //     });
        //     Ligand.addEventListener('change', function () {
        //         LigandValue = this.value;
        //     });
        //     closeDockingTab.addEventListener('click', function () {
        //         dockingTab.style.display = "none";
        //     });
        //     // 生成 DOCKING_BUTTON
        //     DockingSubmit.addEventListener('click', async function (e) {
        //         dockingTab.style.display = "none";
        //         let url = df.dockingDict[DockingToolValue];
        //         console.log(url);
        //         let data = {
        //             'receptor': df.pdbContent[ReceptorValue],
        //             'ligand': df.pdbContent[LigandValue]
        //         }
        //         data = JSON.stringify(data);
        //
        //         let responseData = await fetch(url, {
        //             method: 'POST',
        //             headers: {
        //                 'Content-Type': 'application/json',
        //             },
        //             body: data,
        //         }).then(response => {
        //             return response.json();
        //         }).then(responseData => {
        //             console.log(responseData);
        //             return responseData;
        //         }).catch(error => {
        //             console.error('Docking fetch Error:', error);
        //         });
        //         console.log("responseData", responseData)
        //     });
    },

    popSelectOption: function (selectId, options) {
        selectId.innerHTML = '';
        options.forEach(option => {
            let optionElement = document.createElement('option');
            optionElement.value = option;
            optionElement.textContent = option;
            selectId.appendChild(optionElement);
        });
    },
    drawGeometry: function (type, pdbId) {
        return new Promise((resolve) => {
            df.tool.showSegmentHolder(true, function () {
                if (w3m.mol[pdbId] === undefined) {
                    resolve(); // 即使没数据也要 resolve，避免卡住
                    return;
                }

                if (type >= df.HET) {
                    df.painter.showHet(type, pdbId);
                } else {
                    df.painter.showAllResidues(type, pdbId);
                }

                df.tool.showSegmentHolder(false, 0);
                resolve(); // 标记完成
            });
        });
    },
}