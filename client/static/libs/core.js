/**
 * init pdb
 */

var df;
df = {
    // dafen
    isScore: false,
    ScoreTemp: 0,

    // w3m
    PathList: [],
    GROUP_VISIBLE: {},

    t: false,

    // remoteUrl: ['https://www.rcsb.org/pdb/files/'],
    remoteUrl: ['/static/data/'],
    isShowWater: false,

    // transfer rotate scale
    PDBPOS: {},

    // context load button
    FILE_PATH: [],
    DATA_PATH: '../client/static/data',
    LOAD_URL: window.location.href + 'load_file_path',

    // delete pdb mesh


    // SURFACE
    SURFACE_STORE: {},
    SURFACE: 14,
    SURFACE_TYPE: 1,
    CURRENT_SURFACE_TYPE: 1,
    SURFACE_OPACITY: 1.0,
    SURFACE_WIREFRAME: false,

    // 重新加载时需要初始化的参数
    pdbId: [],
    pdbText: {},
    SelectedPDBId: undefined,
    pdbInfoList: ['main', 'het', 'water', 'surface', 'dot'],
    pdbContent: {},

    // gamepad
    // selection: 0,
    selection: 102,
    select_all: 100,
    select_main: 101,
    select_chain: 102,
    select_residue: 103,
    select_atom: 104,
    select_ligand: 105,
    select_multi_chain: 106,
    select_region: 200,
    select_residues: 107,
    drag_residues: 108,
    SELECT_RESIDUE_MESH: [],

    // ring
    ringDistance: 20,

    // scuba
    scubaState: false,
    scubaScope: [],
    scubaResScope: [],

    // menu

    // button
    DEFBUTTON: 0,
    DFBUTTONS: [],
    LASTSELECTEDBUTTON: '',

    showMenu: false,
    // menu label
    MAIN_MENU: 0,
    SUB_MENU: 1,
    TRD_MENU: 2,
    // menu content {name: (list)}
    menu_content: {
        "Load PDB": [],
        "Structure": [],
        "Surface": [],
        "Color": [],
        "Beautify": [],
        "Drag": [],
        "Edit": [],
        "Design": [],
        "Docking": [],
        "Align": [],
        "Hydrogen Bond": [],
        "Energy": [],
        "Export": [],
        "Exit": []
    },

    menuList: ["Load PDB", "Protein", "Sequence", "PDB"],
    SequenceMenuList: ["tools"],
    // menu text config
    textMenuWidth: 0.36,
    textMenuHeight: 0.09,
    textContentWidth: 2048,
    textContentHeight: 512,
    letterSpacing: 0.01,
    lineSpacing: 0.45,

    scale: 0,

    textMenuBgColor: '#ffffff',

    // all pdb info group, 这里包含 pdb 用于展示的全部属性
    GROUP: {},
    GROUP_INDEX: ['menu', 'score'],
    GROUP_HET_INDEX: {},
    GROUP_MAIN_INDEX: {},
    GROUP_STRUCTURE_INDEX: {},

    // GROUP-MAIN
    GROUP_COUNT: 46,
    GROUP_MAIN: 0,
    GROUP_HET: 1,
    GROUP_WATER: 2,
    GROUP_SURFACE: 3,

    pptShow: false,
    GeoCenterOffset: "",

    // residue
    residue: '',
    SELECTED_RESIDUE: '',

    exportPDB: false,
    // 0: 3D mode, 1: vr mode,
    mode: 1,
    //Mode
    MODE_THREE: 0,
    MODE_VR: 1,
    // text
    lfpt: "",
    rtpt: "",

    // representation Mode
    HIDE: 0,
    LINE: 1,
    DOT: 2,
    BACKBONE: 3,
    SPHERE: 4,
    STICK: 5,
    BALL_AND_ROD: 6,
    TUBE: 7,
    RIBBON_FLAT: 8,
    RIBBON_ELLIPSE: 9,
    RIBBON_RECTANGLE: 10,
    RIBBON_STRIP: 11,
    RIBBON_RAILWAY: 12,
    CARTOON_SSE: 13,

    HET: 50,
    HET_LINE: 51,
    HET_SPHERE: 52,
    HET_STICK: 53,
    HET_BALL_ROD: 54,
    HET_WATER: 55,
    HET_IRON: 56,

    // type
    GroupType: "Group",
    MeshType: "Mesh",

    // align
    ALIGN_TOOLS: {"tm-align": window.location.href+ 'align'},
    ALIGN_RECEPTOR: '',
    ALIGN_LIGAND: '',
    SELECTED_ALIGN: 'tm-align',

    // design
    DESIGN_TOOLS: {'ProDESIGN': window.location.href, 'SCUBA+ABACUS': window.location.href},
    SELECTED_DESIGN: 'ProDESIGN',

    // docking
    dockingDict: {'HDock': window.location.href + 'hdock'},
    DOCKING_RECEPTOR: '',
    DOCKING_LIGAND: '',
    SELECTED_DOCKING: 'HDock',
    // energy
    ENERGY_TOOLS: {"dDfire": window.location.href},
    SELECTED_ENERGY: 'dDfire',

    // Refine Structure

}

// config
df.config = {
    mainMode: df.CARTOON_SSE,
    hetMode: df.HET_BALL_ROD,
    water_sphere_w: 8,
    surface: df.SURFACE,
    stick_sphere_w: 12,
    stick_radius: 3,
    ball_rod_radius: 0.12,
    tube_radius: 0.2,
    tubesegment: 5,
    ellipse_radius: 0.21,
    ellipse_radius_multiple: 5,
}

export {df};