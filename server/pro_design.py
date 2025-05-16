#!/usr/bin/env python
# -*- coding:utf-8 -*-

from einops import rearrange, repeat
from Bio.PDB import PDBParser
from copy import deepcopy
import numpy as np
import dataclasses
import torch.nn as nn
import torch.nn.functional as F
from inspect import isfunction
import torch
import io
import os
import re

import argparse


parser = argparse.ArgumentParser()
parser.add_argument('-g', '--gpu_list', type=int, nargs='+',
                    help='list of GPU IDs')
# parser.add_argument('--device', type=str, default='cuda',
#       help='set device')

parser.add_argument('--device', type=str, default='cpu',
                    help='set device')

parser.add_argument('--train_data_dir', type=str, default='examples/train',
                    help='train data directory')
parser.add_argument('--test_data_dir', type=str, default='examples/test',
                    help='test data directory')
parser.add_argument('-b', '--batch_size', type=int, default=1000,
                    help='batch size, default=1000')
# parser.add_argument('--num_workers', type=int, default=1,
#      help='number of workers, default=1')
parser.add_argument('-lr', '--learning_rate', type=float, default=1e-3,
                    help='learning rate, default=1e-3')
parser.add_argument('-e', '--epochs', type=int, default=100)
parser.add_argument('-d', '--dim', type=int, default=256)
parser.add_argument('--prefix', type=str, default='log')
parser.add_argument('--checkpoint', type=str, default=None,
                    help='path to save or load checkpoint')
parser.add_argument('--save_file', type=str, default="model89",
                    help='path to save or load model')
parser.add_argument('--pdb_file', type=str, default=None,
                    help='pdb_file to design')

args = parser.parse_args()

restype_1to3 = {
    'A': 'ALA',
    'R': 'ARG',
    'N': 'ASN',
    'D': 'ASP',
    'C': 'CYS',
    'Q': 'GLN',
    'E': 'GLU',
    'G': 'GLY',
    'H': 'HIS',
    'I': 'ILE',
    'L': 'LEU',
    'K': 'LYS',
    'M': 'MET',
    'F': 'PHE',
    'P': 'PRO',
    'S': 'SER',
    'T': 'THR',
    'W': 'TRP',
    'Y': 'TYR',
    'V': 'VAL',
}

restypes = [
    'A', 'R', 'N', 'D', 'C', 'Q', 'E', 'G', 'H', 'I', 'L', 'K', 'M', 'F', 'P',
    'S', 'T', 'W', 'Y', 'V'
]

restype_name_to_atom14_names = {
    'ALA': ['N', 'CA', 'C', 'O', 'CB', '', '', '', '', '', '', '', '', ''],
    'ARG': ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD', 'NE', 'CZ', 'NH1', 'NH2', '', '', ''],
    'ASN': ['N', 'CA', 'C', 'O', 'CB', 'CG', 'OD1', 'ND2', '', '', '', '', '', ''],
    'ASP': ['N', 'CA', 'C', 'O', 'CB', 'CG', 'OD1', 'OD2', '', '', '', '', '', ''],
    'CYS': ['N', 'CA', 'C', 'O', 'CB', 'SG', '', '', '', '', '', '', '', ''],
    'GLN': ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD', 'OE1', 'NE2', '', '', '', '', ''],
    'GLU': ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD', 'OE1', 'OE2', '', '', '', '', ''],
    'GLY': ['N', 'CA', 'C', 'O', '', '', '', '', '', '', '', '', '', ''],
    'HIS': ['N', 'CA', 'C', 'O', 'CB', 'CG', 'ND1', 'CD2', 'CE1', 'NE2', '', '', '', ''],
    'ILE': ['N', 'CA', 'C', 'O', 'CB', 'CG1', 'CG2', 'CD1', '', '', '', '', '', ''],
    'LEU': ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD1', 'CD2', '', '', '', '', '', ''],
    'LYS': ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD', 'CE', 'NZ', '', '', '', '', ''],
    'MET': ['N', 'CA', 'C', 'O', 'CB', 'CG', 'SD', 'CE', '', '', '', '', '', ''],
    'PHE': ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD1', 'CD2', 'CE1', 'CE2', 'CZ', '', '', ''],
    'PRO': ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD', '', '', '', '', '', '', ''],
    'SER': ['N', 'CA', 'C', 'O', 'CB', 'OG', '', '', '', '', '', '', '', ''],
    'THR': ['N', 'CA', 'C', 'O', 'CB', 'OG1', 'CG2', '', '', '', '', '', '', ''],
    'TRP': ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD1', 'CD2', 'NE1', 'CE2', 'CE3', 'CZ2', 'CZ3', 'CH2'],
    'TYR': ['N', 'CA', 'C', 'O', 'CB', 'CG', 'CD1', 'CD2', 'CE1', 'CE2', 'CZ', 'OH', '', ''],
    'VAL': ['N', 'CA', 'C', 'O', 'CB', 'CG1', 'CG2', '', '', '', '', '', '', ''],
    'UNK': ['', '', '', '', '', '', '', '', '', '', '', '', '', ''],
}

restype_num = len(restypes)

atom_types = [
    'N', 'CA', 'C', 'O', 'CB', 'CG', 'CG1', 'CG2', 'OG', 'OG1', 'SG', 'CD',
    'CD1', 'CD2', 'ND1', 'ND2', 'OD1', 'OD2', 'SD', 'CE', 'CE1', 'CE2', 'CE3',
    'NE', 'NE1', 'NE2', 'OE1', 'OE2', 'CH2', 'NH1', 'NH2', 'OH', 'CZ', 'CZ2',
    'CZ3', 'NZ', 'OXT'
]
atom_order = {atom_type: i for i, atom_type in enumerate(atom_types)}

atom14_type_num = 14

restype_3to1 = {v: k for k, v in restype_1to3.items()}
restype_order = {restype: i for i, restype in enumerate(restypes)}
restypes_with_x = restypes + ['X']

unk_restype_index = restype_num  # Catch-all index for unknown restypes.



class ProDesign(nn.Module):
    def __init__(self, dim, device='cuda', layer_num=3):
        super().__init__()
        self.linear = nn.Linear(34, dim)
        encoder_layer = nn.TransformerEncoderLayer(d_model=dim, nhead=8, activation='gelu', batch_first=True,
                                                   dim_feedforward=4 * dim, norm_first=True)
        self.encode = nn.TransformerEncoder(encoder_layer, layer_num)
        self.fc = nn.Linear(dim, 20)
        self.device = device
        self.to(device)

    def forward(self, ret):
        nei_feature = ret['nei_feature']
        nei_mask = ret['nei_mask'].bool()
        x = self.linear(nei_feature)
        x = self.encode(x, src_key_padding_mask=~nei_mask)
        x = x.masked_fill(~nei_mask[..., None], 0)
        x = x.sum(1) / nei_mask.sum(-1, keepdim=True).clamp_min(1)
        x = self.fc(x)
        return x

    def loss(self, preds, ret):
        loss = F.cross_entropy(preds, ret['label'])
        return loss

    def accuracy(self, preds, ret):
        acc = torch.eq(torch.argmax(preds, -1), ret['label']).float().mean()
        return acc


def l2_norm(v, dim=-1, epsilon=1e-12):
    return v / torch.clamp(torch.linalg.norm(v, dim=dim, keepdim=True), min=epsilon)


def exists(val):
    return val is not None


def default(val, d):
    if exists(val):
        return val
    return d() if isfunction(d) else d


def rigids_from_3x3(points, indices=None, epsilon=1e-6):
    """Create rigids from 3 points.
    This creates a set of rigid transformations from 3 points by Gram Schmidt
    orthogonalization.
    """
    indices = default(indices, (0, 1, 2))
    # Shape (b, l, 3, 3)
    assert points.shape[-1] == 3
    assert points.shape[-2] >= 3
    v1 = points[..., indices[0], :] - points[..., indices[1], :]
    v2 = points[..., indices[2], :] - points[..., indices[1], :]

    e1 = l2_norm(v1, epsilon=epsilon)
    c = torch.sum(e1 * v2, dim=-1, keepdim=True)
    u2 = v2 - e1 * c
    e2 = l2_norm(u2, epsilon=epsilon)
    e3 = torch.cross(e1, e2, dim=-1)
    R = torch.stack((e1, e2, e3), dim=-1)
    t = points[..., indices[1], :]

    return R, t


def select_residue(ret, cut_off=12):
    # select residue
    assert ret['seq'].size(0) == len(ret['str_seq'])
    n_idx = atom_order['N']
    ca_idx = atom_order['CA']
    c_idx = atom_order['C']
    assert ret['coord'].shape[-2] > min(n_idx, ca_idx, c_idx)
    noX_idx = torch.arange(ret['seq'].size(0))[ret['seq'] != unk_restype_index]
    select_idx = -1
    ret['mask'] = torch.sum(ret['coord_mask'], dim=-1) > 0
    while select_idx == -1 or ~ret['mask'][select_idx]:
        select_idx = np.random.choice(noX_idx)
    assert ret['mask'][select_idx], ret['mask'][select_idx]
    nei_mask = torch.sqrt(
        ((ret['coord'][..., ca_idx, :] - ret['coord'][..., select_idx, ca_idx, :]) ** 2).sum(-1)) <= cut_off
    nei_mask = nei_mask * ret['mask']

    if nei_mask.sum() < 2:
        return None
    nei_mask[select_idx] = False
    nei_type = F.one_hot(ret['seq'], 21)  # X

    nei_idx = torch.arange(ret['seq'].size(0), device=ret['seq'].device) - select_idx

    R, t = rigids_from_3x3(ret['coord'], indices=(c_idx, ca_idx, n_idx))
    target_R = R[..., select_idx, :, :]
    target_t = t[..., select_idx, :]
    nei_R = torch.einsum('... d h, ... d w -> ... w h', target_R, R)
    nei_t = torch.einsum('... d w, ... d -> ... w', R, target_t - t)
    nei_feature = torch.cat((nei_type, rearrange(nei_R, '... h w -> ... (h w)'), nei_t, nei_idx[:, None]), dim=-1)
    ret['nei_feature'] = nei_feature.masked_select(nei_mask[:, None]).reshape((-1, nei_feature.size(-1)))
    ret['nei_mask'] = torch.ones(nei_mask.sum(), device=nei_mask.device)
    ret['select_idx'] = select_idx
    ret['label'] = ret['seq'][select_idx]
    return ret


@dataclasses.dataclass(frozen=True)
class Protein:
    atom_positions: np.ndarray
    aatype: np.ndarray
    atom_mask: np.ndarray
    residue_index: np.ndarray
    b_factors: np.ndarray
    str_aatype: str


def from_pdb_string(chain, modtype, modres, header) -> Protein:
    atom_positions = []
    aatype = []
    atom_mask = []
    residue_index = []
    b_factors = []
    str_seq = ''

    def summary(resname, atoms):
        res_shortname = restype_3to1.get(resname, 'X')
        restype_idx = restype_order.get(
            res_shortname, restype_num)
        pos = np.zeros((atom14_type_num, 3))  # atom14
        mask = np.zeros((atom14_type_num,))
        res_b_factors = np.zeros((atom14_type_num,))
        atom_types = restype_name_to_atom14_names.get(resname,
                                                      restype_name_to_atom14_names.get(
                                                          'UNK'))
        for atom in atoms:
            if atom.name not in atom_types:
                continue
            idx = atom_types.index(atom.name)
            pos[idx] = atom.coord
            mask[idx] = 1.
            res_b_factors[idx] = atom.bfactor
        return res_shortname, restype_idx, pos, mask, res_b_factors

    pre_res_idx = -1

    for res in chain:
        if res.id[2] != ' ':
            raise ValueError(
                f'PDB contains an insertion code at chain {chain.id} and residue '
                f'index {res.id[1]}. These are not supported.')

        mod, res_idx = res.id[:2]
        assert res_idx != pre_res_idx, 'maybe raise res_idx error!'

        if mod.strip():
            chain_id = res.full_id[2]
            mod = mod.split('_')[-1]
            if 'MODRES' not in header or mod not in modtype:
                # pass
                continue
            for key, val in modres.items():
                if (mod, chain_id, str(res_idx)) == key:
                    mod_atoms = {x: [] for x in range(len(val))}
                    for atom in res:
                        i = re.sub(r'[A-Z]+', '', atom.name)
                        name = re.sub(r'[0-9]+', '', atom.name)
                        if not i:
                            continue
                        atom.name = name  # rename
                        mod_atoms[int(i) - 1].append(atom)

                    for i, res in enumerate(val):
                        res_shortname, restype_idx, pos, mask, res_b_factors = summary(res, mod_atoms[i])
                        if np.sum(mask) < 0.5:
                            # If no known atom positions are reported for the residue then skip it.
                            continue
                        aatype.append(restype_idx)
                        atom_positions.append(pos)
                        atom_mask.append(mask)
                        residue_index.append(pre_res_idx + 1)
                        b_factors.append(res_b_factors)
                        str_seq += res_shortname
                        pre_res_idx += 1
        else:
            res_shortname, restype_idx, pos, mask, res_b_factors = summary(res.resname, res)
            if np.sum(mask) < 0.5:
                # If no known atom positions are reported for the residue then skip it.
                continue

            aatype.append(restype_idx)
            atom_positions.append(pos)
            atom_mask.append(mask)
            residue_index.append(res_idx)
            b_factors.append(res_b_factors)
            str_seq += res_shortname
            #
            pre_res_idx = res_idx

        assert pre_res_idx >= pre_res_idx

    return Protein(
        atom_positions=np.array(atom_positions),
        atom_mask=np.array(atom_mask),
        aatype=np.array(aatype),
        residue_index=np.array(residue_index),
        b_factors=np.array(b_factors),
        str_aatype=str_seq)


def additional(tensors, res_state, idx, chain_id):
    # 氨基酸属性
    is_type = ''
    index_dict = torch.tensor([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19])
    if chain_id in res_state.keys():
        chain_state = res_state[chain_id]
        if idx in chain_state.keys():
            is_type = chain_state[idx]
    # 含芳香族的氨基酸
    if is_type == "Nonpolar":
        index_dict = torch.tensor([0, 7, 9, 10, 12, 19])
    # 亲水性氨基酸
    if is_type == "Polar uncharged":
        index_dict = torch.tensor([2, 4, 5, 14, 15, 16])
    elif is_type == "Positively charged":
        index_dict = torch.tensor([1, 8, 11])
    elif is_type == "Negatively charged":
        index_dict = torch.tensor([3, 6])
    elif is_type == "Sulfur-containing":
        index_dict = torch.tensor([4, 12])
    elif is_type == "Aromatic":
        index_dict = torch.tensor([13, 17, 18])
    select_pred = torch.index_select(tensors, 1, index_dict)
    return index_dict, select_pred

def get_feature(chain, modtype, modres, header, device="cpu"):
    protein = from_pdb_string(chain, modtype, modres, header)
    seq = torch.tensor(protein.aatype, dtype=torch.int64).to(device)
    coord = torch.from_numpy(protein.atom_positions).to(device)
    coord_mask = torch.from_numpy(protein.atom_mask).to(device)
    ret = dict(seq=seq, str_seq=protein.str_aatype, coord=coord, coord_mask=coord_mask)
    return ret


def from_aatype_to_strtype(seq):
    restype_idx = ''
    for idx in seq:
        restype_idx = restype_idx + (restypes_with_x[idx])
    return restype_idx

def update_feature(ret, fixed, is_begin=False):
    if is_begin:
        random_seq = torch.tensor([np.random.randint(20) for _ in range(ret['seq'].size(0))], dtype=torch.int64,
                                  device=ret['seq'].device)
        seq_mask = torch.zeros(ret['seq'].size(0), device=ret['seq'].device)
        seq_mask[fixed] = 1
        random_seq = torch.where(seq_mask == 1, ret['seq'], random_seq)
        ret['seq'] = random_seq
    idx = None
    while idx is None or idx in fixed:
        ret = select_residue(ret)
        idx = ret['select_idx']

    ret['nei_feature'] = ret['nei_feature'].unsqueeze(0).float()
    ret['nei_mask'] = ret['nei_mask'].unsqueeze(0)
    return ret


def get_identity(a, b):
    assert len(a) == len(b)
    identity = sum(a[i] == b[i] for i in range(len(a))) / len(a)
    return identity


def str_to_fasta(fasta_str, fasta_name):
    with open(f'{fasta_name}.fasta', 'w') as f:
        f.writelines(fasta_str)


def design(pdb_string,
           fasta_name,
           num=None,
           fixed_dict=None,
           total_step=None,
           save_step=None,
           res_state=None
           ):
    pdb_struc = io.StringIO(pdb_string)
    parser = PDBParser(QUIET=True, get_header=True)
    structure = parser.get_structure('none', pdb_struc)
    header = parser.get_header()

    modres = {}
    modtype = set()
    if 'MODRES' in header:
        for mod in header['MODRES']:
            mod_info = mod.split()
            key, value = tuple(mod_info[1:4]), mod_info[4]
            if key not in modres:
                modres[key] = []
            modres[key].append(value)
            modtype.add(mod_info[1])

    models = list(structure.get_models())
    if len(models) != 1:
        raise ValueError(
            f'Only single model PDBs are supported. Found {len(models)} models.')
    model = models[0]
    chains = list(model.get_chains())
    fasta_str = ''
    for number in range(len(chains)):
        chain = chains[number]
        chain_id = chain.id
        if chain_id not in fixed_dict.keys():
            continue
        else:
            fixed = fixed_dict[chain_id]

        default_ret = get_feature(chain, modtype, modres, header, device=args.device)
        if len(fixed) == len(default_ret["str_seq"]):
            fasta_str += f'{chain.id}>\n{default_ret["str_seq"]}\n'
        else:
            default_seq = from_aatype_to_strtype(default_ret['seq'])

            model = ProDesign(dim=args.dim, device=args.device)
            model.load_state_dict(
                torch.load(f'{args.save_file}.pt',
                           map_location=torch.device('cpu')))
            model.eval()
            with torch.no_grad():
                for i in range(num):
                    ret = update_feature(deepcopy(default_ret), fixed, is_begin=True)
                    assert ret != default_ret

                    for step in range(total_step):
                        preds = model(ret)
                        # 根据约束求res
                        idx = ret['select_idx']
                        print(idx)
                        index_id, preds = additional(preds, res_state, idx, chain_id)
                        print(preds)
                        res = index_id[preds.argmax(-1)].item()
                        ret['seq'][idx] = res
                        update_feature(ret, fixed)
                        if (step + 1) % save_step == 0:
                            str_seq = from_aatype_to_strtype(ret["seq"])
                            identity = get_identity(default_seq, str_seq)
                            # fasta_str += f'> {pdb_file} {args.save_file}_num{i}_step{step + 1} identity:{identity}\n{str_seq}\n'
                            fasta_str += f'{chain.id}> \n{str_seq}\n'
                            print(f'num {i} step {step + 1} identity {identity}\n', str_seq)
    str_to_fasta(fasta_str, fasta_name)
    return fasta_str
