/* Global */
import {df} from '../core.js';
import * as THREE from '../../js/three.module.js';

var w3m, canvas, gl;
var drug = false;

w3m = {
    // 所有信息存放处
    mol: {},
    // Graphics Mode ( gmode )
    // Fill Mode ( fmode )
    HIDE: 100,
    DOT: 101,
    LINE: 102,
    BACKBONE: 103,
    TUBE: 104,
    CARTOON: 105,
    PUTTY: 106,
    CUBE: 107,
    STRIP: 108,
    RIBBON: 109,
    RAILWAY: 110,
    ARROW: 111,
    CYLINDER: 112,
    STICK: 113,
    SPHERE: 114,
    BALL_AND_ROD: 115,
    CLENGTH: 0,
    // END MODE
    END_XX: 500,
    END_OO: 501,
    END_SS: 502,
    END_XO: 503,
    END_OX: 504,
    END_SX: 505,
    END_XS: 506,
    END_OS: 507,
    END_SO: 508,
    // COLOR MODE
    COLOR_BY_ELEMENT: 601,
    COLOR_BY_RESIDUE: 602,
    COLOR_BY_SS: 603,
    COLOR_BY_CHAIN: 604,
    COLOR_BY_REP: 605,
    COLOR_BY_B_FACTOR: 606,
    COLOR_BY_SPECTRUM: 607,
    COLOR_BY_CHAIN_SPECTRUM: 608,
    COLOR_BY_HYDROPHOBICITY: 609,
    COLOR_BY_USER: 610,
    COLOR_BY_PDB: 611,
    // SS
    HELIX: 150,
    HELIX_HEAD: 1500,
    HELIX_BODY: 1501,
    HELIX_FOOT: 1502,
    SHEET: 151,
    SHEET_HEAD: 1510,
    SHEET_BODY: 1511,
    SHEET_FOOT: 1512,
    LOOP: 152,
    LOOP_HEAD: 1520,
    LOOP_BODY: 1521,
    LOOP_FOOT: 1522,
    // Atom Type
    ATOM_MAIN: 1,
    ATOM_HET: 2,
    ATOM_UNK: 3,
    // 氨基酸链
    CHAIN_AA: 301,
    // 核酸链
    CHAIN_NA: 302,
    CHAIN_UNK: 303,
    // 小分子
    CHAIN_HET: 304,
    // LABEL
    LABEL_AREA_NONE: 700,
    LABEL_AREA_ATOM: 701,
    LABEL_AREA_BACKBONE: 702,
    LABEL_AREA_RESIDUE: 703,
    LABEL_AREA_CHAIN: 704,
    LABEL_AREA_MOL: 705,

    LABEL_ATOM_NAME: 711,
    LABEL_ATOM_ID: 712,
    LABEL_ATOM_NAME_AND_ID: 713,
    LABEL_ELEMENT: 721,
    LABEL_ELEMENT_AND_ID: 722,
    LABEL_RESIDUE_NAME: 731,
    LABEL_RESIDUE_ID: 732,
    LABEL_RESIDUE_NAME_AND_ID: 733,
    LABEL_CHAIN_ID: 741,
    LABEL_CHAIN_AND_RESIDUE: 742,
    LABEL_CHAIN_AND_RESIDUE_ID: 743,
    LABEL_MIX: 744,
    LABEL_OCCUPANCY: 751,
    LABEL_B_FACTOR: 752,
    LABEL_VDW_RADIUS: 753,

    INNERFACE_VARY: 1000,
    INNERFACE_TURNOVER: 1001,
    INNERFACE_NON_TURNOVER: 1002,
}

w3m.pdb = function (text, pdbId) {
    let o = {
        type: 'pdb',
        id: pdbId,
        info: {},
        ss: {},
        helix: {},
        sheet: {},
        chain: {},
        residue: {},
        residue_id: {},
        residueData: {},
        residueTypeList: {},
        rep: {},
        rep_real: {},
        label_area: {},
        label_content: {},
        label_area_real: {},
        single: {},
        ssbond: [],
        connect: {},
        highlight: {},
        hide: {},
        color: {
            main: [],
            het: []
        },
        color_real: [],
        tree: {
            main: {},
            het: {}
        },
        atom: {
            main: [],
            het: []
        },
        getMain: function (id) {
            return [id, o.atom.main[id][6], o.color_real[id]];
        },
        getHet: function (id) {
            return [id, o.atom.het[id][6], o.color_real[id]];
        },
        getAtom: function (id) {
            return o.atom.main[id] ? this.getMain(id) : (o.atom.het[id] ? this.getHet(id) : null);
        },
    }
    let parse = function (text) {
        // load PDB
        w3m.global.drugLimit = {
            x: [],
            y: [],
            z: []
        }
        if (df.exportPDB) {
            df.tool.savePDB(text, pdbId + '.pdb');
            df.exportPDB = false;
            return;
        } else {
            // load PDB file
            text = text.split('\n');
            for (let i = 0; i < text.length; i++) {
                // let s = text[i].toLowerCase();
                let s = text[i];
                let s_head = w3m_sub(s, 0, 6).toLowerCase();
                switch (s_head) {
                    case 'atom':
                        doAtom(s);
                        break;
                    case 'hetatm':
                        doHet(s);
                        break;
                    case 'conect':
                        doConnect(s);
                        break;
                    case 'ssbond':
                        doSSBond(s);
                        break;
                    case 'helix':
                        doHelix(s);
                        break;
                    case 'sheet':
                        doSheet(s);
                        break;
                    case 'header':
                        doHeader(s);
                        break;
                }
            }
        }
        text = null;
        doLaterWork();
        // laid
        let chain_idArray = Object.keys(o.residueData);
        if (chain_idArray.length !== 0) {
            let lChainName = chain_idArray[chain_idArray.length - 1];
            let residueArray = Object.keys(o.residueData[lChainName]);
            residueArray.sort(customCompare);
            let lResidueId = residueArray[residueArray.length - 1];
            o.residueData[lChainName][lResidueId].laid = o.atom.main[o.atom.main.length - 1][1];
            o.residueTypeList = Object.keys(o.residueTypeList);
        }
        w3m.mol[o.id] = o;
        df.pdbId.push(o.id);
        // Color
        w3m.tool.updateMolColorMap(o.id);
    }
    let doAtom = function (s) {
        // ignore certain extra amino acids in the atom
        let atom_alt = w3m_sub(s, 17).toLowerCase();
        if (atom_alt !== '' && atom_alt !== 'a') {
            return;
        }

        // if not AA or NA
        let chain_type = w3m.tool.getChainType(w3m_sub(s, 18, 20).toLowerCase());
        if (chain_type === w3m.CHAIN_UNK) {
            doHet(s);
            return;
        }

        let atom_id = parseInt(w3m_sub(s, 7, 11));
        let atom_name = w3m_sub(s, 13, 16).toLowerCase();
        let residue_name = w3m_sub(s, 18, 20).toLowerCase() || 'xxx';
        let chain_id = w3m_sub(s, 22) || 'x';
        let residue_id = w3m_sub(s, 23, 27);
        let xyz = [
            parseFloat(w3m_sub(s, 31, 38)),
            parseFloat(w3m_sub(s, 39, 46)),
            parseFloat(w3m_sub(s, 47, 54))];
        let occupancy = parseFloat(w3m_sub(s, 55, 60));
        let b_factor = parseFloat(w3m_sub(s, 61, 66)) || 0.0;
        let element = w3m_sub(s, 77, 78).toLowerCase();
        if (residue_id === '') return;
        math.limit(xyz[0], w3m.global.limit.x);
        math.limit(xyz[1], w3m.global.limit.y);
        math.limit(xyz[2], w3m.global.limit.z);

        // get residue type 0~20 exp: ALA...
        if (o.residueTypeList[residue_name] === undefined) {
            o.residueTypeList[residue_name] = residue_name;
        }
        if (b_factor) {
            math.average(b_factor, w3m.global.average.b_factor);
            math.limit(b_factor, w3m.global.limit.b_factor);
            if (chain_type === w3m.CHAIN_AA && w3m.structure.backbone.amino_acid.indexOf(atom_name) >= 0) {
                math.average(b_factor, w3m.global.average.b_factor_backbone);
                math.limit(b_factor, w3m.global.limit.b_factor_backbone);
            } else if ((chain_type === w3m.CHAIN_NA && w3m.structure.backbone.nucleic_acid.indexOf(atom_name) >= 0)) {
                math.average(b_factor, w3m.global.average.b_factor_backbone);
                math.limit(b_factor, w3m.global.limit.b_factor_backbone);
            }
        }
        // o.mol
        w3m_isset(o.tree.main[chain_id]) ? void (0) : o.tree.main[chain_id] = {};
        w3m_isset(o.tree.main[chain_id][residue_id]) ? void (0) : o.tree.main[chain_id][residue_id] = {};
        o.tree.main[chain_id][residue_id][atom_name] = atom_id;
        // o.chain
        w3m_isset(o.chain[chain_id]) ? void (0) : o.chain[chain_id] = chain_type;
        w3m_isset(o.residue[chain_id]) ? void (0) : o.residue[chain_id] = {};
        w3m_isset(o.residue[chain_id][residue_id]) ? void (0) : o.residue[chain_id][residue_id] = residue_name;
        w3m_isset(o.ss[chain_id]) ? void (0) : o.ss[chain_id] = {};
        w3m_isset(o.ss[chain_id][residue_id]) ? void (0) : o.ss[chain_id][residue_id] = w3m.LOOP;
        // o.rep
        w3m_isset(o.rep[chain_id]) ? void (0) : o.rep[chain_id] = {};
        w3m_isset(o.rep[chain_id][residue_id]) ? void (0) : o.rep[chain_id][residue_id] = w3m.config.rep_mode_main;
        // o.label
        w3m_isset(o.label_area[chain_id]) ? void (0) : o.label_area[chain_id] = {};
        w3m_isset(o.label_area[chain_id][residue_id]) ?
            void (0) : o.label_area[chain_id][residue_id] = w3m.config.label_area_main;
        w3m_isset(o.label_content[chain_id]) ? void (0) : o.label_content[chain_id] = {};
        w3m_isset(o.label_content[chain_id][residue_id]) ?
            void (0) : o.label_content[chain_id][residue_id] = w3m.config.label_content_main;
        // o.atom
        o.atom.main[atom_id] = [w3m.ATOM_MAIN, atom_id, atom_name, residue_name, chain_id, residue_id, xyz, occupancy, b_factor, element];
        // residueData
        if (o.residueData[chain_id] === undefined) {
            o.residueData[chain_id] = {};
        }
        if (o.residueData[chain_id][residue_id] === undefined) {
            //last atom id
            let residueArray = Object.keys(o.residueData[chain_id]);
            if (residueArray.length > 0) {
                o.residueData[chain_id][residueArray[residueArray.length - 1]].laid = atom_id - 1;
            }
            let sse = o.ss[chain_id][residue_id];
            o.residueData[chain_id][residue_id] = {
                id: residue_id,
                name: residue_name,
                chain: chain_id,
                sse: sse,
                faid: atom_id, //first atom id
                bbond: [], //Backbone id arrays
                lines: [], //paired id arrays
                path: [], //path to draw TUBE-style
                tangents: [],
                normals: [],
                binormals: [],
                arrow: [], //if sse is arrowed
                issel: false
            }
        }
        //Ca atom id
        if (atom_name === 'ca') {
            o.residueData[chain_id][residue_id].caid = atom_id;
        } else if (o.residueData[chain_id][residue_id].caid === undefined) {
            o.residueData[chain_id][residue_id].caid = atom_id;
        }
    }
    let doHet = function (s) {
        let atom_id = parseInt(w3m_sub(s, 7, 11)),
            atom_name = w3m_sub(s, 13, 16).toLowerCase(),
            residue_name = w3m_sub(s, 18, 20).toLowerCase() || 'xxx',
            chain_id = w3m_sub(s, 22) || 'x',
            residue_id = w3m_sub(s, 23, 27),
            xyz = [parseFloat(w3m_sub(s, 31, 38)), parseFloat(w3m_sub(s, 39, 46)), parseFloat(w3m_sub(s, 47, 54))],
            occupancy = parseFloat(w3m_sub(s, 55, 60)),
            b_factor = parseFloat(w3m_sub(s, 61, 66)) || 0.0,
            element = w3m_sub(s, 77, 78).toLowerCase();
        if (residue_id === '') return;
        math.limit(xyz[0], w3m.global.limit.x);
        math.limit(xyz[1], w3m.global.limit.y);
        math.limit(xyz[2], w3m.global.limit.z);

        math.limit(xyz[0], w3m.global.drugLimit.x);
        math.limit(xyz[1], w3m.global.drugLimit.y);
        math.limit(xyz[2], w3m.global.drugLimit.z);

        if (b_factor) {
            math.average(b_factor, w3m.global.average.b_factor);
            math.limit(b_factor, w3m.global.limit.b_factor);
        }
        // o.tree.het
        w3m_isset(o.chain[chain_id]) ? void (0) : o.chain[chain_id] = w3m.CHAIN_UNK;
        w3m_isset(o.tree.het[chain_id]) ? void (0) : o.tree.het[chain_id] = {};
        w3m_isset(o.tree.het[chain_id][residue_id]) ? void (0) : o.tree.het[chain_id][residue_id] = {};
        o.tree.het[chain_id][residue_id][atom_name] = atom_id;
        // o.atom
        o.atom.het[atom_id] = [w3m.ATOM_HET, atom_id, atom_name, residue_name, chain_id, residue_id, xyz, occupancy, b_factor, element];
        // o.single
        o.single[atom_id] = element;
    };
    // Het connect with Main protein
    let doConnect = function (s) {
        let atom_id_main = parseInt(w3m_sub(s, 7, 11));

        w3m_isset(o.connect[atom_id_main]) ? void (0) : o.connect[atom_id_main] = [];
        let other = function (start, stop) {
            let atom_id_other = parseInt(w3m_sub(s, start, stop));
            if (atom_id_other && o.getAtom(atom_id_other)) {
                w3m_isset(o.connect[atom_id_other]) && o.connect[atom_id_other].indexOf(atom_id_main) >= 0 ?
                    void (0) :
                    o.connect[atom_id_main].push(atom_id_other);
                delete o.single[atom_id_other];
            }
        };
        // 截取后面的连接点
        other(12, 16);
        other(17, 21);
        other(22, 26);
        other(27, 31);
        delete o.single[atom_id_main];
    };

    let doSSBond = function (s) {
        let chain_id_1 = w3m_sub(s, 16);
        let residue_id_1 = w3m_sub(s, 18, 22);
        let chain_id_2 = w3m_sub(s, 30);
        let residue_id_2 = w3m_sub(s, 32, 36);
        o.ssbond.push([chain_id_1, residue_id_1, chain_id_2, residue_id_2]);
    };

    let doHelix = function (s) {
        let chain_id = w3m_sub(s, 20);
        let helix_start = w3m_sub(s, 22, 26);
        let helix_stop = w3m_sub(s, 34, 38);
        w3m_isset(o.helix[chain_id]) ? void (0) : o.helix[chain_id] = [];
        o.helix[chain_id].push([helix_start, helix_stop]);
    };
    let doSheet = function (s) {
        let chain_id = w3m_sub(s, 22);
        let sheet_id = w3m_sub(s, 12, 14);
        let strand_start = w3m_sub(s, 23, 27);
        let strand_stop = w3m_sub(s, 34, 38);
        w3m_isset(o.sheet[chain_id]) ? void (0) : o.sheet[chain_id] = {};
        w3m_isset(o.sheet[chain_id][sheet_id]) ? void (0) : o.sheet[chain_id][sheet_id] = [];
        o.sheet[chain_id][sheet_id].push([strand_start, strand_stop]);
    };
    let doLaterWork = function () {
        // 渲染
        let main_atom_total = o.atom.main.length;
        if (main_atom_total > 30000) {
            w3m.config.geom_tube_segment = 6;
            w3m.config.geom_stick_round_end = false;
        } else if (main_atom_total > 20000) {
            w3m.config.geom_tube_segment = 8;
            w3m.config.geom_stick_round_end = false;
        } else if (main_atom_total > 10000) {
            w3m.config.geom_tube_segment = 10;
        }
        // highlight & hide
        for (let i in o.chain) {
            o.highlight[i] = [];
            o.hide[i] = [];
        }
        // delete ssbond in connect: found sg
        for (let i = 0, l = o.ssbond.length; i < l; i++) {
            let bond = o.ssbond[i];
            let atom_id_1;
            let atom_id_2;
            if (o.tree.main[bond[0]]) {
                if (o.tree.main[bond[0]][bond[1]]) {
                    if (o.tree.main[bond[0]][bond[1]]["sg"]) {
                        atom_id_1 = o.atom.main[o.tree.main[bond[0]][bond[1]]["sg"]][1];
                    }
                }
            }
            if (o.tree.main[bond[2]]) {
                if (o.tree.main[bond[2]][bond[3]]) {
                    if (o.tree.main[bond[2]][bond[3]]["sg"]) {
                        atom_id_2 = o.atom.main[o.tree.main[bond[2]][bond[3]]["sg"]][1];
                    }
                }
            }
            let index_1 = 0;
            let index_2 = 0;
            if (atom_id_1 && w3m_isset(o.connect[atom_id_1])) {
                index_1 = o.connect[atom_id_1].indexOf(atom_id_2);
                index_1 >= 0 ? o.connect[atom_id_1].splice(index_1, 1) : void (0);
            }
            if (index_2 && w3m_isset(o.connect[atom_id_2])) {
                index_2 = o.connect[atom_id_2].indexOf(atom_id_1);
                index_2 >= 0 ? o.connect[atom_id_2].splice(index_2, 1) : void (0);
            }
        }
        // delete [] Connect
        for (let i in o.connect) {
            if (!o.connect[i].length) {
                delete (o.connect[i]);
            }
        }
        // split helix and sheet
        for (let i in o.chain) {
            if (o.chain[i] !== w3m.CHAIN_AA) {
                continue;
            }
            // helix
            if (w3m_isset(o.helix[i])) {
                for (let ii = 0, ll = o.helix[i].length; ii < ll; ii++) {
                    let helix = o.helix[i][ii];
                    let helixStart = helix[0];
                    let helixEnd = helix[1];
                    for (let iii in o.residueData[i]) {
                        if (customCompare(iii, helixStart) >= 0) {
                            if (customCompare(iii, helixEnd) <= 0) {
                                o.ss[i][iii] = w3m.HELIX;
                                o.residueData[i][iii].sse = w3m.HELIX;
                            }
                        }
                    }
                }
            }
            // sheet
            if (w3m_isset(o.sheet[i])) {
                for (let j in o.sheet[i]) {
                    let sheet = o.sheet[i][j];
                    for (let jj = 0, ll = sheet.length; jj < ll; jj++) {
                        let strand = sheet[jj];
                        let sheetStart = strand[0];
                        let sheetEnd = strand[1];
                        for (let jjj in o.residueData[i]) {
                            if (customCompare(jjj, sheetStart) >= 0) {
                                if (customCompare(jjj, sheetEnd) <= 0) {
                                    o.ss[i][jjj] = w3m.SHEET;
                                    o.residueData[i][jjj].sse = w3m.SHEET;
                                }
                            }
                        }
                    }
                }
            }
            // merge
            let ss_fragment = w3m_split_by_difference(o.ss[i]);
            ss_fragment.forEach(function (fg) {
                let fg_start = fg[0];
                let fg_stop = fg[1];
                let fg_range = [fg[0], fg[1]];
                let head = '';
                let body = '';
                let foot = '';

                switch (fg[2]) {
                    case w3m.HELIX:
                        head = w3m.HELIX_HEAD;
                        body = w3m.HELIX_BODY;
                        foot = w3m.HELIX_FOOT;
                        break;
                    case w3m.SHEET:
                        head = w3m.SHEET_HEAD;
                        body = w3m.SHEET_BODY;
                        foot = w3m.SHEET_FOOT;
                        break;
                    case w3m.LOOP:
                        head = w3m.LOOP_HEAD;
                        body = w3m.LOOP_BODY;
                        foot = w3m.LOOP_FOOT;
                        break;
                }
                o.ss[i][fg_start] = [head, fg_range];
                if (o.residueData[i][fg_start]) {
                    o.residueData[i][fg_start].sse = head;
                }

                for (let resid in o.residueData[i]) {
                    if (customCompare(resid, fg[0]) > 0) {
                        if (customCompare(resid, fg[1]) < 0) {
                            o.ss[i][resid] = [body, fg_range];
                            o.residueData[i][resid].sse = body;
                        }
                    }
                }
                o.ss[i][fg_stop] = [foot, fg_range];
                if (o.residueData[i][fg_stop]) {
                    o.residueData[i][fg_stop].sse = foot;
                }
            });
        }
    };
    let doHeader = function (s) {
        o.info.id = w3m_sub(s, 63, 66).toUpperCase();
        if (o.id === "none") {
            o.id = 'yang'
        }
        o.info.classification = w3m_capword(w3m_sub(s, 11, 50));
    };
    switch (typeof text) {
        case 'string':
            parse(text);
            break;
        default:
            return false;
    }
    return o;
}

/* Tool */
w3m.tool = {

    updateMolColorMap: function (mol_id) {
        this.updateMolColorMapMain(mol_id);
        this.updateMolColorMapHet(mol_id);
    },
    // 更换颜色主程序
    updateMolColorMapMain: function (mol_id) {
        let mol = w3m.mol[mol_id];
        let array;
        switch (w3m.config.color_mode_main) {
            case w3m.COLOR_BY_ELEMENT:
                array = w3m.color.element;
                mol.color.main = mol.atom.main.map(function (atom) {
                    return array[atom[9]];
                });
                break;
            case w3m.COLOR_BY_RESIDUE:
                array = w3m.color.residue;
                mol.color.main = mol.atom.main.map(function (atom) {
                    return array[atom[3]];
                });
                break;
            // 二级结构
            case w3m.COLOR_BY_SS:
                array = {};
                array[w3m.HELIX] = array[w3m.HELIX_HEAD] = array[w3m.HELIX_BODY] = array[w3m.HELIX_FOOT] = w3m.color.ss.helix;
                array[w3m.SHEET] = array[w3m.SHEET_HEAD] = array[w3m.SHEET_BODY] = array[w3m.SHEET_FOOT] = w3m.color.ss.sheet;
                array[w3m.LOOP] = array[w3m.LOOP_HEAD] = array[w3m.LOOP_BODY] = array[w3m.LOOP_FOOT] = w3m.color.ss.loop;
                mol.color.main = mol.atom.main.map(function (atom) {
                    return array[mol.ss[atom[4]][atom[5]][0]];
                });
                break;
            case w3m.COLOR_BY_CHAIN:
                array = w3m.color.chain;
                mol.color.main = mol.atom.main.map(function (atom) {
                    return array[atom[4].toLowerCase()];
                });
                break;
            // 整体颜色
            case w3m.COLOR_BY_REP:
                let array_raw = w3m.color.rep;
                array = [];
                array[w3m.HIDE] = array_raw.hide;
                array[w3m.DOT] = array_raw.dot;
                array[w3m.LINE] = array_raw.line;
                array[w3m.BACKBONE] = array_raw.backbone;
                array[w3m.STICK] = array_raw.stick;
                array[w3m.TUBE] = array_raw.tube;
                array[w3m.CARTOON] = array_raw.cartoon;
                array[w3m.CUBE] = array_raw.cube;
                array[w3m.STRIP] = array_raw.strip;
                array[w3m.RAILWAY] = array_raw.railway;
                array[w3m.RIBBON] = array_raw.ribbon;
                array[w3m.ARROW] = array_raw.arrow;
                array[w3m.SPHERE] = array_raw.sphere;
                mol.color.main = mol.atom.main.map(function (atom) {
                    return array[mol.rep[atom[4].toLowerCase()][atom[5]]]; // depends on rep
                });
                break;
            case w3m.COLOR_BY_B_FACTOR:
                let range = w3m.global.limit.b_factor[1] - w3m.global.limit.b_factor[0],
                    smallest = w3m.global.limit.b_factor[0];
                if (range) {
                    mol.color.main = mol.atom.main.map(function (atom) {
                        return 1000 + Math.round((atom[8] - smallest) / range * 100);
                    });
                } else {
                    mol.color.main = mol.atom.main.map(function (atom) {
                        return 1050;
                    });
                }
                break;
            case w3m.COLOR_BY_SPECTRUM:
                var len = mol.atom.main.length,
                    token = 100 / len;
                mol.color.main = mol.atom.main.map(function (atom, i) {
                    return 1100 - Math.round(i * token);
                });
                break;
            case w3m.COLOR_BY_CHAIN_SPECTRUM:
                var tmp = {
                    id: null
                };
                mol.color.main = mol.atom.main.map(function (atom, i) {
                    if (tmp.id === atom[4]) {
                        var atom_id_start = tmp.start,
                            atom_id_stop = tmp.stop,
                            len = atom_id_stop - atom_id_start;
                    } else {
                        var chain = mol.tree.main[atom[4]],
                            atom_id_start = w3m_find_object_first(w3m_find_first(chain, true), true),
                            atom_id_stop = w3m_find_object_last(w3m_find_last(chain, true), true),
                            len = atom_id_stop - atom_id_start;
                        tmp = {
                            id: atom[4],
                            start: atom_id_start,
                            stop: atom_id_stop
                        };
                    }
                    return 1100 - Math.round((i - atom_id_start) * 100 / len);
                });
                break;
            case w3m.COLOR_BY_HYDROPHOBICITY:
                array = w3m.color.hydrophobicity;
                mol.color.main = mol.atom.main.map(function (atom) {
                    return array[atom[3]];
                });
                break;
            case w3m.COLOR_BY_PDB:
                array = 401 + Object.keys(w3m.mol).indexOf(mol_id)
                mol.color.main = mol.atom.main.map(function () {
                    return array;
                });
                break;
            default:
                array = 400 + Object.keys(df.w3m.mol).length
                mol.color.main = mol.atom.main.map(function () {
                    return array;
                });
                break;
        }
    },
    updateMolColorMapHet: function (mol_id) {
        let mol = w3m.mol[mol_id];
        let array = w3m.color.element;
        switch (w3m.config.color_mode_het) {
            case w3m.COLOR_BY_ELEMENT:
                array = w3m.color.element;
                mol.color.het = mol.atom.het.map(function (atom) {
                    return array[atom[9]];
                });
                break;
            case w3m.COLOR_BY_CHAIN:
                array = w3m.color.chain;
                mol.color.het = mol.atom.het.map(function (atom) {
                    return array[atom[4].toLowerCase()];
                });
                break;
            case w3m.COLOR_BY_REP:
                let color = w3m.color.rep.hide;
                switch (w3m.config.rep_mode_het) {
                    case w3m.HIDE:
                        color = w3m.color.rep.hide;
                        break;
                    case w3m.DOT:
                        color = w3m.color.rep.dot;
                        break;
                    case w3m.LINE:
                        color = w3m.color.rep.line;
                        break;
                    case w3m.STICK:
                        color = w3m.color.rep.stick;
                        break;
                    case w3m.BALL_AND_ROD:
                        color = w3m.color.rep.ball_and_rod;
                        break;
                    case w3m.SPHERE:
                        color = w3m.color.rep.sphere;
                        break;
                }
                mol.color.het = mol.atom.het.map(function (atom) {
                    return color;
                });
                break;
            case w3m.COLOR_BY_B_FACTOR:
                var range = w3m.global.limit.b_factor[1] - w3m.global.limit.b_factor[0],
                    smallest = w3m.global.limit.b_factor[0];
                if (range) {
                    mol.color.het = mol.atom.het.map(function (atom) {
                        return 1000 + Math.round((atom[8] - smallest) / range * 100);
                    });
                } else {
                    mol.color.het = mol.atom.het.map(function (atom) {
                        return 1050;
                    });
                }
                break;
            case w3m.COLOR_BY_PDB:
                array = 101 + Object.keys(w3m.mol).indexOf(mol_id)
                console.log("array", array)
                mol.color.het = mol.atom.het.map(function (atom) {
                    return array
                });
                break;
            default:
                array = w3m.color.element;
                mol.color.het = mol.atom.het.map(function (atom) {
                    return array[atom[9]];
                });
                break;
        }
    },

    getChainType: function (residue_name) {
        if (w3m.dict.amino_acid.indexOf(residue_name) >= 0) {
            return w3m.CHAIN_AA;
        } else if (w3m.dict.nucleic_acid.indexOf(residue_name) >= 0) {
            // 核酸链 nucleic acid
            return w3m.CHAIN_NA;
        } else {
            //unknown ChainNType
            return w3m.CHAIN_UNK;
        }
    },

    pipelineMain: function () {
        this.clearMain();
        this.clearExt();
        this.plugin();
        this.fillMain();
        this.bufferMain();
    },

    bufferMain: function () {
        w3m.vertex_main_point = [];
        w3m.vertex_main_line = [];
        w3m.vertex_main_triangle = [];
        w3m.vertex_main_line_strip = [];
        w3m.vertex_main_triangle_strip = [];
    },
    clear: function () {
        this.clearMain();
        this.clearHet();
        this.clearExt();
        this.clearLabel();
    },
    clearMain: function () {
        w3m.fillqueue_main = [];
        w3m.vertex_main_point = [];
        w3m.vertex_main_line = [];
        w3m.vertex_main_triangle = [];
        w3m.vertex_main_line_strip = [];
        w3m.vertex_main_triangle_strip = [];
        w3m.vertex_index = [];
        w3m.index = [];
        w3m.drawqueue_main = [];
        w3m.drawqueue_index = [];
        w3m.breakpoint_line_strip = [];
        w3m.breakpoint_triangle_strip = [];
    },
    clearHet: function () {
        w3m.fillqueue_het = [];
        w3m.vertex_het_point = [];
        w3m.vertex_het_line = [];
        w3m.vertex_het_triangle = [];
        w3m.drawqueue_het = [];
    },
    clearExt: function () {
        w3m.vertex_ext_line = [];
        w3m.vertex_ext_triangle = [];
        w3m.drawqueue_ext = [];
    },
    clearLabel: function () {
        w3m.fillqueue_label = [];
        w3m.vertex_label = [];
        w3m.drawqueue_label = [];
    },

    plugin: function () {
        // 设定初始结构，代码中很多地方都没用
        for (let i in w3m.mol) {
            let mol = w3m.mol[i];
            for (let res in mol.residue) {
                mol.rep_real[res] = mol.rep[res];
                mol.label_area_real[res] = mol.label_area[res];
            }
        }

        // color -> color real
        for (let i in w3m.mol) {
            let mol = w3m.mol[i],
                highlight = mol.highlight,
                highlight_enable = false;
            for (let j in highlight) {
                if (highlight[j].length > 0) {
                    highlight_enable = true;
                    break;
                }
            }
            mol.atom.main.forEach(function (atom, atom_id) {
                let chain_id = atom[4],
                    residue_id = atom[5];
                mol.color_real[atom_id] = highlight_enable && highlight[chain_id].indexOf(residue_id) < 0 ?
                    1 : mol.color.main[atom_id];
            });
            mol.color.het.forEach(function (color_id, atom_id) {
                mol.color_real[atom_id] = highlight_enable ? 1 : color_id;
            });
        }
    },

    fillMain: function () {
        let danFeng = this;
        if (df.residue && df.residue !== "") {
            this.mol2fillQueueMain(df.residue);
        } else {
            // mol -> fillqueue
            for (let i in w3m.mol) {
                this.mol2fillQueueMain(i);
            }
        }
        // fillqueue -> vertex
        w3m.fillqueue_main.forEach(function (q) {
            // q[1], 结构类型
            switch (q[1]) {
                case w3m.LINE:
                    danFeng.fillMainAsLine(q[2], q[3], q[4], q[5]);
                    break;
                case w3m.BACKBONE:
                    danFeng.fillMainAsBackbone(q[2], q[3], q[4], q[5]);
                    break;
                case w3m.CARTOON:
                    danFeng.fillMainAsCartoon(q[2], q[3], q[4], q[5]);
                    break;
                case w3m.CUBE:
                    danFeng.fillMainAsCube(q[2], q[3], q[4], q[5]);
                    break;
                default:
                    void (0);
            }
        });
    },

    /* mol -> fillqueue*/
    mol2fillQueueMain: function (mol_id) {
        let mol = w3m.mol[mol_id];
        let rep_default = w3m.config.rep_mode_main;
        for (let i in mol.rep_real) {
            let resKeys = Object.keys(mol.residue[i]);
            resKeys.sort(customCompare);
            let part = w3m_split_by_difference(mol.rep_real[i]);
            for (let ii = 0, ll = part.length; ii < ll; ii++) {
                let start = part[ii][0];
                let stop = part[ii][1];
                let rep = part[ii][2];
                if (rep === rep_default && [w3m.TUBE, w3m.PUTTY, w3m.CARTOON].indexOf(rep) >= 0) {
                    if (ii !== 0 && w3m.HIDE !== part[ii - 1][2] && rep !== part[ii - 1][2]) {
                        let startIndex = findResidueIdIndex(resKeys, start);
                        start = resKeys[startIndex - 1];
                    }
                    if (ii !== ll - 1 && w3m.HIDE !== part[ii + 1][2] && rep !== part[ii + 1][2]) {
                        let stopIndex = findResidueIdIndex(resKeys, stop);
                        stop = resKeys[stopIndex + 1];
                    }
                }
                w3m.fillqueue_main.push([w3m.ATOM_MAIN, rep, mol_id, i, start, stop]);
            }
        }

    },

    fillMainAsLine: function (mol_id, chain_id, start, stop) {
        let mol = w3m.mol[mol_id];
        let chain = mol.tree.main[chain_id];
        let chain_type = mol.chain[chain_id];
        let chain_first = w3m_find_first(chain);
        let bridge = chain_type === w3m.CHAIN_AA ? w3m.structure.bridge.amino_acid : w3m.structure.bridge.nucleic_acid;
        let residueKeys = Object.keys(mol.residue[chain_id]).sort(customCompare);
        for (let io in residueKeys) {
            let i = residueKeys[io];
            let st = customCompare(i, start);
            let ed = customCompare(i, stop);
            if (st >= 0) {
                if (ed <= 0) {
                    if (!w3m_isset(chain[i])) {
                        continue;
                    }
                    let residue = chain[i];
                    let resKeys = Object.keys(chain);
                    resKeys.sort(customCompare)
                    let resIndex = findResidueIdIndex(resKeys, i);
                    // bridge link
                    if (w3m_isset(chain[resKeys[resIndex - 1]]) && i !== chain_first) {
                        let atom_id_pre = chain[resKeys[resIndex - 1]][bridge[0]];
                        let atom_id_cur = residue[bridge[1]];
                        if (w3m_isset(atom_id_pre) && w3m_isset(atom_id_cur)) {
                            let atom = w3m.tool.getMainAtomById(mol_id, atom_id_cur);
                            if (atom) {
                                w3m.mol[mol_id].residueData[atom.chainname][atom.resid].lines.push([atom_id_pre, atom_id_cur]);
                            }
                        }
                    }
                    // inner link
                    let residue_name = mol.residue[chain_id][i];
                    let structure = w3m.structure.pair[residue_name];
                    for (let ii = 0, ll = structure.length; ii < ll; ii += 2) {
                        let atom_id_1 = residue[structure[ii]]
                        let atom_id_2 = residue[structure[ii + 1]];
                        if (w3m_isset(atom_id_1) && w3m_isset(atom_id_2)) {
                            let atom = w3m.tool.getMainAtomById(mol_id, atom_id_2);
                            if (atom) {
                                w3m.mol[mol_id].residueData[atom.chainname][atom.resid].lines.push([atom_id_1, atom_id_2]);
                            }
                        }
                    }
                }
            }
        }
    },

    fillMainAsBackbone: function (mol_id, chain_id, start, stop) {
        let mol = w3m.mol[mol_id];
        let chain = mol.tree.main[chain_id];
        let chain_type = mol.chain[chain_id];
        let structure = chain_type === w3m.CHAIN_AA ? w3m.structure.backbone.amino_acid :
            w3m.structure.backbone.nucleic_acid;
        let part = w3m_split_by_undefined(chain, start, stop);
        for (var i in part) {
            let path = [];
            let part_start = part[i][0];
            let part_stop = part[i][1];

            let residueKeys = Object.keys(mol.residue[chain_id]).sort(customCompare);
            for (let io in residueKeys) {
                let i = residueKeys[io];
                let st = customCompare(i, part_start);
                let ed = customCompare(i, part_stop);
                if (st >= 0) {
                    if (ed <= 0) {
                        let residue = chain[i];
                        for (let ii = 0, ll = structure.length; ii < ll; ii++) {
                            let atom_id = residue[structure[ii]];
                            let atom = w3m.tool.getMainAtomById(mol_id, atom_id);
                            if (atom) {
                                w3m.mol[mol_id].residueData[atom.chainname][atom.resid].bbond.push(atom_id);
                            }
                        }
                    }
                }
            }
        }
    },

    // sheet & arrow
    fillMainAsCartoon: function (mol_id, chain_id, start, stop) {
        let mol = w3m.mol[mol_id];
        if (mol.chain[chain_id] !== w3m.CHAIN_AA) {
            return;
        }
        let chain = mol.tree.main[chain_id];
        let structure = w3m.structure.residue.amino_acid;
        let normal_token = w3m.structure.normal.amino_acid;

        let part = w3m_split_by_undefined(chain, start, stop);
        for (let d = 0, l = part.length; d < l; d++) {
            let path = [];
            let part_start = part[d][0];
            let part_stop = part[d][1];
            let last_normal = [];

            // 记录 normal
            let residueKeys = Object.keys(mol.residue[chain_id]).sort(customCompare);
            for (let io in residueKeys) {
                let i = residueKeys[io];
                let st = customCompare(i, part_start);
                let ed = customCompare(i, part_stop);
                let normal = [0, 0, 0];
                let turnover = [0, 0, 0];
                if (st >= 0) {
                    if (ed <= 0) {
                        let residue = chain[i];
                        if (!w3m_isset(residue[structure])) {
                            continue;
                        }
                        let atom_info = mol.getMain(residue[structure]);
                        if (w3m_isset(residue[normal_token[0]]) && w3m_isset(residue[normal_token[1]])) {
                            normal = vec3.point(mol.atom.main[residue[normal_token[0]]][6],
                                mol.atom.main[residue[normal_token[1]]][6]);
                            // normal fix! Necessary! Important! for beta-sheel
                            turnover = st > 0 && vec3.dot(last_normal, normal) < 0;
                            // 调整normal朝向
                            turnover ? normal = vec3.negate(normal) : void (0);
                        } else {
                            normal = [0, 0, 0];
                            turnover = [0, 0, 0];
                        }
                        atom_info[4] = normal;
                        atom_info[6] = turnover;
                        path.push(atom_info);
                        last_normal = w3m_copy(normal);
                    }
                }
            }
            let frame = [];
            if (path.length > 2) {
                this.naturalFrame(path, frame, mol_id);
            }
            /* Fill */
            // SS
            let ss_map = mol.ss[chain_id];
            let ss_array = {};
            for (let io in residueKeys) {
                let i = residueKeys[io];
                let st = customCompare(i, part_start);
                let ed = customCompare(i, part_stop);
                if (st >= 0) {
                    if (ed <= 0) {
                        // todo
                        switch (ss_map[i][0]) {
                            case w3m.HELIX:
                            case w3m.HELIX_HEAD:
                            case w3m.HELIX_BODY:
                            case w3m.HELIX_FOOT:
                                ss_array[i] = w3m.HELIX;
                                break;
                            case w3m.SHEET:
                            case w3m.SHEET_HEAD:
                            case w3m.SHEET_BODY:
                            case w3m.SHEET_FOOT:
                                ss_array[i] = w3m.SHEET;
                                break;
                            case w3m.LOOP:
                            case w3m.LOOP_HEAD:
                            case w3m.LOOP_BODY:
                            case w3m.LOOP_FOOT:
                                ss_array[i] = w3m.LOOP;
                                break;
                        }
                    }
                }
            }

            let ss_split = w3m_split_by_difference(ss_array);
            let ss = {
                loop: [],
                helix: [],
                sheet: []
            };

            for (let ii in ss_split) {
                let ss_split_array = ss_split[ii];
                let ss_start = ss_split_array[0];
                let ss_stop = ss_split_array[1];
                let ss_type = ss_split_array[2];

                if ([w3m.HELIX, w3m.SHEET].indexOf(ss_type) >= 0 && w3m_isset(ss_split[ii - 1])) {
                    if ([w3m.HELIX, w3m.SHEET].indexOf(ss_split[ii - 1][2]) >= 0) {
                        ss.loop.push([ss_split[ii - 1][1], ss_start]);
                    }
                }
                switch (ss_type) {
                    case w3m.HELIX:
                        ss.helix.push([ss_start, ss_stop]);
                        break;
                    case w3m.SHEET:
                        ss.sheet.push([ss_start, ss_stop]);
                        break;
                    case w3m.LOOP:
                        ss.loop.push([ss_start, ss_stop]);
                        break;
                }
            }

            let keysIndex = Object.keys(mol.residue[chain_id]).sort(customCompare);

            let seg = w3m.config.smooth_segment % 2 ? w3m.config.smooth_segment + 1 : w3m.config.smooth_segment;
            for (let ii in ss.helix) {
                let ss_start = ss.helix[ii][0];
                let ss_stop = ss.helix[ii][1];

                let ss_start_index = findResidueIdIndex(keysIndex, ss_start);
                let ss_stop_index = findResidueIdIndex(keysIndex, ss_stop);
                let start_index = findResidueIdIndex(keysIndex, part_start);
                let stop_index = findResidueIdIndex(keysIndex, part_start);

                let geom_start = (ss_start_index - start_index) * (seg + 1);
                let geom_stop = (ss_stop_index - stop_index) * (seg + 1);
                let geom_frame = frame.slice(geom_start, geom_stop + 1);
                if (w3m.config.geom_helix_mode === w3m.HIDE) {
                } else {
                    let inner_face_turnover_count = 0;
                    geom_frame.forEach(function (item) {
                        item[6] ? inner_face_turnover_count++ : void (0)
                    });
                    let inner_face = inner_face_turnover_count / geom_frame.length > 0.5 ?
                        w3m.INNERFACE_TURNOVER : w3m.INNERFACE_NON_TURNOVER;
                    let inner_differ = !!w3m.config.geom_helix_inner_differ;
                    let side_differ = !!w3m.config.geom_helix_side_differ;
                    let side_color = side_differ ? w3m.config.geom_helix_side_color : null;
                    let msg = {
                        inner_differ: inner_differ,
                        inner_face: inner_face,
                        side_differ: side_differ,
                        side_color: side_color
                    };
                    switch (w3m.config.geom_helix_mode) {
                        case w3m.CUBE:
                            this.cubeFiller(geom_frame, msg);
                            break;
                    }
                }
            }
            for (let ii in ss.sheet) {
                let ss_start = ss.sheet[ii][0];
                let ss_stop = ss.sheet[ii][1];
                let ss_start_index = findResidueIdIndex(keysIndex, ss_start);
                let ss_stop_index = findResidueIdIndex(keysIndex, ss_stop);
                let start_index = findResidueIdIndex(keysIndex, part_start);
                let stop_index = findResidueIdIndex(keysIndex, part_start);

                let geom_start = (ss_start_index - start_index) * (seg + 1);
                let geom_stop = (ss_stop_index - stop_index) * (seg + 1);
                let geom_frame = frame.slice(geom_start, geom_stop + 1);

                w3m.config.geom_sheet_flat ? geom_frame = this.zigzagFix(geom_frame) : void (0);
                if (w3m.config.geom_sheet_mode === w3m.HIDE) {
                } else {
                    let side_differ = !!w3m.config.geom_sheet_side_differ;
                    let side_color = side_differ ? w3m.config.geom_sheet_side_color : null;
                    let msg = {
                        side_differ: side_differ,
                        side_color: side_color
                    };
                    switch (w3m.config.geom_sheet_mode) {
                        /* ARROW */
                        case w3m.ARROW:
                            this.arrowFiller(geom_frame, msg, mol_id);
                            break;
                    }
                }
            }
        }
    },

    cubeFiller: function (frame, msg) {
        msg = msg || {};
        let side_differ = w3m_isset(msg.side_differ) ? msg.side_differ : w3m.config.geom_cube_side_differ;
        let side_color = msg.side_color || w3m.config.geom_cube_side_color;
        let inner_differ = w3m_isset(msg.inner_differ) ? msg.inner_differ : false;
        let inner_face = w3m_isset(msg.inner_face) ? msg.inner_face : false;
        let shell = [];
        this.cubeShell(frame, shell, {
            side_differ: side_differ,
            side_color: side_color,
            inner_differ: inner_differ,
            inner_face: inner_face
        });
        return shell;
    },

    arrowFiller: function (frame, msg, mol_id) {
        msg = msg || {};
        let side_differ = w3m_isset(msg.side_differ) ? msg.side_differ : w3m.config.geom_arrow_side_differ;
        let side_color = msg.side_color || w3m.config.geom_arrow_side_color;
        let inner_differ = w3m_isset(msg.inner_differ) ? msg.inner_differ : false;
        let inner_face = w3m_isset(msg.inner_face) ? msg.inner_face : false;
        let len = frame.length;
        let seg = w3m.config.smooth_segment % 2 ? w3m.config.smooth_segment + 1 : w3m.config.smooth_segment;

        // body
        let offset = df.GeoCenterOffset;
        let shell = this.cubeFiller(frame.slice(0, len - (seg + 1)), {
            end_mode: w3m.END_XO,
            side_differ: side_differ,
            side_color: side_color,
            inner_differ: inner_differ,
            inner_face: inner_face
        });

        for (let i = 0; i < shell.length; i++) {
            for (let j = 0; j < 4; j++) {
                let k = j * 2 + 1;
                let pos = new THREE.Vector3(shell[i][k][1][0], shell[i][k][1][1], shell[i][k][1][2]);
                let atom = w3m.tool.getMainAtomById(mol_id, shell[i][k][0]);
                if (atom && atom.resid) {
                    w3m.mol[mol_id].residueData[atom.chainname][atom.resid].arrow.push(pos);
                }
            }
        }
        // arrow head
        shell = this.arrowheadFiller(frame.slice(len - (seg + 2)), {
            side_differ: side_differ,
            side_color: side_color,
            inner_differ: inner_differ,
            inner_face: inner_face
        });
        for (let si = 0; si < shell.length; si++) {
            for (let sj = 0; sj < 4; sj++) {
                let k = sj * 2 + 1;
                let pos = new THREE.Vector3(shell[si][k][1][0], shell[si][k][1][1], shell[si][k][1][2]);
                let atom = w3m.tool.getMainAtomById(mol_id, shell[si][k][0]);
                if (atom && atom.resid) {
                    w3m.mol[mol_id].residueData[atom.chainname][atom.resid].arrow.push(pos);
                }
            }
        }
    },

    arrowheadFiller: function (frame, msg) {
        msg = msg || {};
        let side_differ = w3m_isset(msg.side_differ) ? msg.side_differ : false,
            side_color = msg.side_color || w3m.config.geom_arrow_side_color,
            inner_differ = w3m_isset(msg.inner_differ) ? msg.inner_differ : false,
            inner_face = w3m_isset(msg.inner_face) ? msg.inner_face : false;
        let shell = [];
        this.arrowheadShell(frame, shell, {
            side_differ: side_differ,
            side_color: side_color,
            inner_differ: inner_differ,
            inner_face: inner_face
        });
        return shell;
    },

    arrowheadShell: function (frame, shell, msg) {
        msg = msg || {};
        var width_max = w3m_isset(msg.width_max) ? msg.width_max : w3m.config.geom_arrowhead_lower,
            width_min = w3m_isset(msg.width_min) ? msg.width_min : w3m.config.geom_arrowhead_upper,
            height = w3m_isset(msg.height) ? msg.height : w3m.config.geom_arrow_height,
            h$2 = height / 2,
            side_differ = w3m_isset(msg.side_differ) ? msg.side_differ : w3m.config.geom_arrow_side_differ,
            side_color = msg.side_color || w3m.config.geom_arrow_side_color,
            inner_differ = w3m_isset(msg.inner_differ) ? msg.inner_differ : false,
            inner_color = w3m.config.geom_helix_inner_color,
            inner_face = msg.inner_face || w3m.INNERFACE_VARY;
        // shell
        for (var i = 0, l = frame.length; i < l; i++) {
            var t = i * 2 > l - 1 ? (i - 1) / (l - 2) : i / (l - 2),
                id = frame[i][0],
                o = frame[i][1],
                color = frame[i][2],
                e1 = frame[i][4],
                _e1 = vec3.negate(e1),
                e2 = frame[i][5],
                _e2 = vec3.negate(e2);
            var color_side = side_differ ? side_color : color,
                w_h = [((1 - t) * width_max + width_min) / 2, h$2],
                e1_p_e2 = math.polysum(w_h, [e1, e2]),
                e1_m_e2 = math.polysum(w_h, [e1, _e2]);
            if (inner_differ) {
                if (inner_face == w3m.INNERFACE_VARY) {
                    var color_upper = frame[i][6] ? inner_color : color,
                        color_lower = !frame[i][6] ? inner_color : color;
                } else {
                    var color_upper = inner_face == w3m.INNERFACE_TURNOVER ? inner_color : color,
                        color_lower = inner_face == w3m.INNERFACE_NON_TURNOVER ? inner_color : color;
                }
            } else {
                var color_upper = color_lower = color;
            }
            shell[i] = [
                [id, vec3.plus(o, e1_p_e2), color_side, e1],
                [id, vec3.plus(o, e1_p_e2), color_upper, e2],
                [id, vec3.minus(o, e1_m_e2), color_upper, e2],
                [id, vec3.minus(o, e1_m_e2), color_side, _e1],
                [id, vec3.minus(o, e1_p_e2), color_side, _e1],
                [id, vec3.minus(o, e1_p_e2), color_lower, _e2],
                [id, vec3.plus(o, e1_m_e2), color_lower, _e2],
                [id, vec3.plus(o, e1_m_e2), color_side, e1]
            ];
        }
    },

    zigzagFix: function (path) {
        let len = path.length;
        let n = w3m.config.smooth_segment % 2 ? w3m.config.smooth_segment + 1 : w3m.config.smooth_segment;
        let ori = [];
        let ori_len = (len - 1) / (n + 1) + 1;
        for (let i = 0; i < ori_len; i++) {
            w3m_isset(path[i * (n + 1)]) ? ori[i] = w3m_copy(path[i * (n + 1)]) : void (0);
        }
        // curve
        let curve_xyz = [];
        let curve_normal = [];
        let sample_xyz = [];
        let sample_normal = [];
        let curve_len = (ori_len - 1) * n + 1;
        if (ori_len < 5) {
            /* Line */
            curve_xyz = math.lineFit(curve_len - 1, ori[0][1], ori[ori_len - 1][1]);
            curve_normal = math.lineFit(curve_len - 1, ori[0][4], ori[ori_len - 1][4]);
        } else if (ori_len < 8) {
            /* Quad */
            sample_xyz = ori_len % 2 ? ori[(ori_len - 1) / 2][1] : vec3.mid(ori[ori_len / 2 - 1][1], ori[ori_len / 2][1]);
            sample_normal = ori_len % 2 ? ori[(ori_len - 1) / 2][4] : vec3.mid(ori[ori_len / 2 - 1][4], ori[ori_len / 2][4]);
            // curve
            curve_xyz = math.quadFit(curve_len - 1, ori[0][1], sample_xyz, ori[ori_len - 1][1]);
            curve_normal = math.quadFit(curve_len - 1, ori[0][4], sample_normal, ori[ori_len - 1][4]);
        } else {
            /* Cube */
            sample_xyz = [ori[Math.floor(0.25 * ori_len)][1], ori[Math.floor(0.75 * ori_len)][1]];
            sample_normal = [ori[Math.floor(0.25 * ori_len)][4], ori[Math.floor(0.75 * ori_len)][4]];
            curve_xyz = math.cubeFit4parts(curve_len - 1, ori[0][1], sample_xyz[0], sample_xyz[1], ori[ori_len - 1][1]);
            curve_normal = math.cubeFit4parts(curve_len - 1, ori[0][4], sample_normal[0], sample_normal[1], ori[ori_len - 1][4]);
        }
        // fixed point
        let fixed = [];
        for (let i = 0; i < curve_len; i++) {
            let offset = fixed.length;
            let id = path[offset][0];
            let xyz = curve_xyz[i][0],
                color = path[offset][2],
                tan = vec3.unit(curve_xyz[i][1]),
                normal = vec3.unit(curve_normal[i][0]), // fix normal, more flat
                binormal = vec3.cross(tan, normal);
            fixed.push([id, xyz, color, tan, normal, binormal]);
            if ((i - n / 2) % n === 0) {
                id = path[offset + 1][0];
                color = path[offset + 1][2];
                fixed.push([id, xyz, color, tan, normal, binormal]);
            }
        }
        return fixed;
    },

    cubeShell: function (frame, shell, msg) {
        msg = msg || {};
        let width = msg.width || w3m.config.geom_cube_width,
            w$2 = width / 2,
            height = msg.height || w3m.config.geom_cube_height,
            h$2 = height / 2,
            side_differ = w3m_isset(msg.side_differ) ? msg.side_differ : w3m.config.geom_cube_side_differ,
            side_color = msg.side_color || w3m.config.geom_cube_side_color,
            inner_differ = w3m_isset(msg.inner_differ) ? msg.inner_differ : false,
            inner_color = w3m.config.geom_helix_inner_color,
            inner_face = w3m_isset(msg.inner_face) ? msg.inner_face : w3m.INNERFACE_VARY;

        for (let i = 0, l = frame.length; i < l; i++) {
            let id = frame[i][0],
                o = frame[i][1],
                color = frame[i][2],
                e1 = frame[i][4],
                _e1 = vec3.negate(e1),
                e2 = frame[i][5],
                _e2 = vec3.negate(e2),
                e1_p_e2 = math.polysum([w$2, h$2], [e1, e2]),
                e1_m_e2 = math.polysum([w$2, h$2], [e1, _e2]),
                color_upper = 0,
                color_lower = 0;
            let color_side = side_differ ? side_color : color;
            if (inner_differ) {
                if (inner_face === w3m.INNERFACE_VARY) {
                    color_upper = frame[i][6] ? inner_color : color;
                    color_lower = !frame[i][6] ? inner_color : color;
                } else {
                    color_upper = inner_face === w3m.INNERFACE_TURNOVER ? inner_color : color;
                    color_lower = inner_face === w3m.INNERFACE_NON_TURNOVER ? inner_color : color;
                }
            } else {
                color_upper = color_lower = color;
            }
            shell[i] = [
                [id, vec3.plus(o, e1_p_e2), color_side, e1],
                [id, vec3.plus(o, e1_p_e2), color_upper, e2],
                [id, vec3.minus(o, e1_m_e2), color_upper, e2],
                [id, vec3.minus(o, e1_m_e2), color_side, _e1],
                [id, vec3.minus(o, e1_p_e2), color_side, _e1],
                [id, vec3.minus(o, e1_p_e2), color_lower, _e2],
                [id, vec3.plus(o, e1_m_e2), color_lower, _e2],
                [id, vec3.plus(o, e1_m_e2), color_side, e1]
            ];
        }
    },

    naturalFrame: function (path, frame, mol_id) {
        // path -> all atoms
        let offset = df.GeoCenterOffset;
        // 平滑段数, 首9, 尾11, 全长20
        let n = w3m.config.smooth_segment % 2 ?
            w3m.config.smooth_segment + 1 : w3m.config.smooth_segment;
        // 平滑曲率
        let k = w3m.config.smooth_curvature;
        let len = path.length;
        // /* xyz, color & tan */
        // 计算的第一个residue的 曲率变化
        path[0][3] = math.polysum([k, -k / 4], [vec3.point(path[0][1], path[1][1]), vec3.point(path[0][1], path[2][1])]);
        let tan = vec3.unit(path[0][3]);
        let binormal = vec3.unit(vec3.cross(tan, path[0][4]));
        let normal = vec3.cross(binormal, tan);
        path[0][4] = vec3.cross(binormal, tan);
        let atom = w3m.tool.getMainAtomById(mol_id, path[0][0]);
        frame[0] = [path[0][0], path[0][1], path[0][2], tan, path[0][4], binormal, path[0][6]];
        for (let i = 1; i < len; i++) {
            // tan
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
                frame.push([id, xyz, color, tan, normal, binormal, turnover]);
                if (ii === n / 2) {
                    id = path[i][0]; // switch id, color, turnover
                    color = path[i][2];
                    turnover = path[i][6];
                    frame.push([id, xyz, color, tan, normal, binormal, turnover]);
                }
                atom = w3m.tool.getMainAtomById(mol_id, id);
                if (w3m.CLENGTH === 1) {
                    if (atom) {
                        if (w3m.mol[mol_id].residueData[atom.chainname][atom.resid].path.length === (w3m.config.smooth_segment + 1)) {
                            continue;
                        }
                        // w3m.mol[mol_id].residueData[atom.chainname][atom.resid].path.push(new THREE.Vector3(xyz[0] + offset.x, xyz[1] + offset.y, xyz[2] + offset.z));
                        w3m.mol[mol_id].residueData[atom.chainname][atom.resid].path.push(new THREE.Vector3(xyz[0], xyz[1], xyz[2]));
                        w3m.mol[mol_id].residueData[atom.chainname][atom.resid].binormals.push(new THREE.Vector3(binormal[0], binormal[1], binormal[2]));
                        w3m.mol[mol_id].residueData[atom.chainname][atom.resid].normals.push(new THREE.Vector3(normal[0], normal[1], normal[2]));
                        w3m.mol[mol_id].residueData[atom.chainname][atom.resid].tangents.push(new THREE.Vector3(tan[0], tan[1], tan[2]));
                    }
                }
            }
        }
        w3m.CLENGTH = 0;
    },

    getMainAtomById: function (mol_id, id) {
        let atom = w3m.mol[mol_id].atom.main[id];
        if (atom !== undefined) {
            return {
                id: atom[1],
                resid: atom[5],
                chainname: atom[4]
            };
        }
        return undefined;
    },

    // tube
    fillMainAsCube: function (mol_id, chain_id, start, stop) {
        this.fillMainAsCubeStripRibbonRailwayArrow(w3m.CUBE, mol_id, chain_id, start, stop);
    },

    fillMainAsCubeStripRibbonRailwayArrow: function (rep, mol_id, chain_id, start, stop) {
        let mol = w3m.mol[mol_id];
        let chain = mol.tree.main[chain_id];
        let guide = w3m.structure.residue.amino_acid;
        let normal_token = w3m.structure.normal.amino_acid;
        let part = w3m_split_by_undefined(chain, start, stop);
        for (let i = 0, l = part.length; i < l; i++) {
            w3m.CLENGTH = 1;
            let path = [];
            let part_start = part[i][0];
            let part_stop = part[i][1];
            let last_normal = [];
            let residueKeys = Object.keys(mol.residue[chain_id]).sort(customCompare);
            for (let io in residueKeys) {
                let i = residueKeys[io];
                let st = customCompare(i, part_start);
                let ed = customCompare(i, part_stop);
                if (st >= 0) {
                    if (ed <= 0) {
                        let residue = chain[i];
                        let atom_id = residue[guide];
                        if (!w3m_isset(atom_id = residue[guide])) {
                            continue;
                        }
                        let normal = [0, 0, 0];
                        let turnover = [0, 0, 0];
                        let atom_info = mol.getMain(atom_id);
                        if (w3m_isset(residue[normal_token[0]]) && w3m_isset(residue[normal_token[1]])) {
                            normal = vec3.point(mol.atom.main[residue[normal_token[0]]][6],
                                mol.atom.main[residue[normal_token[1]]][6]);
                            // normal fix! Necessary! Important! for beta-sheel
                            turnover = st > 0 && vec3.dot(last_normal, normal) < 0;
                            // 调整normal朝向
                            turnover ? normal = vec3.negate(normal) : void (0);
                        } else {
                            normal = [0, 0, 0];
                            turnover = [0, 0, 0];
                        }

                        atom_info[4] = normal;
                        atom_info[6] = turnover;
                        path.push(atom_info);
                        last_normal = w3m_copy(normal);
                    }
                }
            }
            let frame = [];
            if (path.length > 2) {
                df.PathList.push(path);
                this.naturalFrame(path, frame, mol_id);
            }
            switch (rep) {
                case w3m.CUBE:
                    this.cubeFiller(frame);
                    break;
            }
        }
    },

}

/* API */
w3m.api = {
    switchRepModeMain: function (rep_mode, pdbId) {
        w3m.config.rep_mode_main = rep_mode;
        if (pdbId) {
            // 指定PDB展示的结构
            w3m.api.updateMolRepMap(pdbId);
            w3m.config.color_mode_main === w3m.COLOR_BY_REP ? w3m.tool.updateMolColorMapMain(residue) : void (0);
        } else {
            for (let i in w3m.mol) {
                w3m.api.updateMolRepMap(i);
                w3m.config.color_mode_main === w3m.COLOR_BY_REP ? w3m.tool.updateMolColorMapMain(i) : void (0);
            }
        }
        this.refreshMain();
    },
    updateMolRepMap: function (mol_id) { // main only
        let map = w3m.mol[mol_id].rep;
        let rep = w3m.config.rep_mode_main;
        for (let chain_id in map) {
            for (let residue_id in map[chain_id]) {
                map[chain_id][residue_id] = rep;
            }
        }
    },
    refreshMain: function () {
        w3m.tool.pipelineMain();
    },
}

/* Global */
w3m.global = {
    // limit
    limit: {
        x: [],
        y: [],
        z: [],
        b_factor: [0.0, 0.0],
        b_factor_backbone: [0.0, 0.0]
    },
    average: {
        b_factor: [0, 0],
        b_factor_backbone: [0, 0]
    },
}

/* Config */
w3m.config = {
    // rep
    rep_mode_main: w3m.TUBE,
    rep_mode_het: w3m.TUBE,
    // color
    // color_mode_main: w3m.COLOR_BY_SPECTRUM,
    color_mode_main: w3m.COLOR_BY_CHAIN,
    color_mode_het: w3m.COLOR_BY_PDB,

    // smooth
    smooth_segment: 19,
    smooth_curvature: 0.8,

    label_area_main: w3m.LABEL_AREA_NONE,
    label_content_main: w3m.LABEL_ATOM_NAME,

    geom_dot_as_cross: 0,
    geom_cross_radius: 0.15,
    geom_helix_mode: w3m.CUBE,
    geom_tube_round_end: 1,
    geom_backbone_as_tube: 1,
    geom_helix_side_differ: 0,
    geom_helix_side_color: 11,
    geom_helix_inner_differ: 0,
    geom_helix_inner_color: 12,
    geom_cube_width: 2.0,
    geom_cube_height: 0.4,
    geom_cube_side_differ: 0,
    geom_cube_side_color: 14,
    geom_sheet_mode: w3m.ARROW,
    geom_sheet_flat: 1,
    geom_sheet_side_differ: 0,
    geom_sheet_side_color: 13,
    geom_loop_mode: w3m.TUBE,
    geom_arrow_width: 2.0,
    geom_arrow_height: 0.4,
    geom_arrowhead_lower: 3.6,
    geom_arrowhead_upper: 0.4,
    geom_arrow_side_differ: 0,
    geom_arrow_side_color: 18,
}

w3m.ajax = (function () {
    var io = new XMLHttpRequest(),
        id = '',
        url = '',
        url_index = 0,
        callback = null;
    drug = false;
    var last = ".pdb";
    //io.timeout = 180000; // timeout ms
    io.onprogress = function (e) {
        var loaded = df.tool.toHumanByte(e.loaded);
        if (drug === false) {
            df.tool.showSegmentHolder(true, "Loading file " + loaded);
        }
    };
    io.onload = function () {
        if (this.status == 200) {
            var responseText = io.responseText;
            callback(responseText);
        } else {
            if (w3m_isset(df.remoteUrl[++url_index])) {
                this.get(id, callback);
            } else {
                url_index = 0;

                df.tool.printProgress('pdb file not found!');
                df.tool.showSegmentHolder(false);
                df.tool.showSegmentHolder(true, 'NOT FOUND : Fail to load PDF file !');
                setTimeout(function (e) {
                    df.tool.showSegmentholder(false);
                }, 5000)
            }
        }
    };
    io.onabort = function () {
        url_index = 0;
    },
        io.ontimeout = function () {
            if (w3m_isset(df.remoteUrl[++url_index])) {
                if (drug) {
                    this.getDrug(id, callback);
                } else {
                    this.get(id, callback);
                }
            } else {
                url_index = 0;
            }
        },
        io.onerror = function (e) {
            url_index++;
            this.get(id, callback);
        },
        io.get = function (mol_id, fn) {
            drug = false;
            if (mol_id.indexOf("http://") != -1) {
                //debugger;
                url = mol_id;
            } else if (mol_id.indexOf("https://") != -1) {
                url = mol_id;
                //debugger;
            } else {
                if (url_index > 0 && last == '.pdb') {
                    url_index--;
                    last = '.cif';
                } else {
                    if (url_index > 0 && last != '.cif') {
                        url_index--;
                    }
                    last = '.pdb';
                }
                url = df.remoteUrl[url_index] + mol_id + last;
            }
            console.log(url);
            id = mol_id;
            callback = fn;
            this.open('GET', url, true);
            this.send();
        };
    io.getResidue = function (resName, fn) {
        resName = resName.toUpperCase();
        url = SERVERURL + "/data/amino_acid/" + resName + '.pdb';
        callback = fn;
        drug = false;
        this.open('GET', url, true);
        this.send();
    };
    io.getDrug = function (mol_id, dbname, fn) {
        id = mol_id;
        url = df.DRUBDB_URL[dbname] + mol_id + '.pdb';
        callback = fn;
        drug = true;
        this.open('GET', url, true);
        this.send();
    };
    io.getDocking = function (path, dockingName, fn) {
        id = dockingName;
        url = path + "/" + dockingName;
        callback = fn;
        drug = true;
        this.open('GET', url, true);
        this.send();
    };
    return io;
})();
export {w3m};