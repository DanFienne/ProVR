#!/usr/bin/env python
# -*- coding:utf-8 -*-

# 氢键 Hydrogen bonds
from pyrosetta import *
import tempfile
import os
init()

def atom_name(pose, atom, res, statue):
    atom_id = AtomID(atom, res)
    residue = pose.residue(atom_id.rsd())
    if statue == 'donor':
        atom_bs = residue.atom_base(atom)
        sidechain_atom_name = residue.atom_name(atom_bs)
    else:
        sidechain_atom_name = residue.atom_name(atom)
    return sidechain_atom_name


def pyrosetta_hbonds(pdb_data):
    temp_pdb = tempfile.NamedTemporaryFile(delete=False, suffix=".pdb")
    temp_pdb.write(pdb_data.encode())
    temp_pdb.close()
    pose = pose_from_pdb(temp_pdb.name)
    os.unlink(temp_pdb.name)
    pose_info = pose.pdb_info()
    hbond_set = pose.get_hbonds()
    hydrogen_set = list()
    for hd in range(1, hbond_set.nhbonds() + 1):
        hydrogen_bond = {}
        hbond = hbond_set.hbond(hd)
        hydrogen_bond["donor"] = hbond.don_res()
        hydrogen_bond["don_hatm"] = hbond.don_hatm()
        hydrogen_bond["acc"] = hbond.acc_res()
        hydrogen_bond["acc_atm"] = hbond.acc_atm()
        hydrogen_bond["donor_chain"] = pose_info.chain(hydrogen_bond["donor"])
        hydrogen_bond["donor_id"] = pose_info.number(hydrogen_bond["donor"])
        hydrogen_bond["acc_chain"] = pose_info.chain(hydrogen_bond["acc"])
        hydrogen_bond["acc_id"] = pose_info.number(hydrogen_bond["acc"])
        if hydrogen_bond["donor_chain"] == hydrogen_bond["acc_chain"]:
            continue
        hydrogen_set.append(hydrogen_bond)
        hydrogen_bond["don_side_atom"] = atom_name(pose, hydrogen_bond["don_hatm"], hydrogen_bond["donor"], "donor")
        hydrogen_bond["acc_side_atom"] = atom_name(pose, hydrogen_bond["acc_atm"], hydrogen_bond["acc"], "acc")

    return hydrogen_set


if __name__ == '__main__':
    with open("test.pdb", "r") as fr:
        data = "".join(fr.readlines())
    print(pyrosetta_hbonds(data))