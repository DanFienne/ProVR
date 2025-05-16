#!/usr/bin/env python
# -*- coding:utf-8 -*-
from pymol import cmd


def pymol_align_global(pdb_a, pdb_b):
    for i in range(10):
        cmd.load(pdb_a, 'receptor')
        cmd.load(pdb_b, 'ligand')
        cmd.align('ligand', 'receptor')
        cmd.save("./data/aligned_mobile.pdb", "ligand")
        cmd.delete('receptor')
        cmd.delete('ligand')
    return 'success'


def pymol_align_chain(
        pdb_a,
        pdb_b,
        chain_a,
        chain_b,
        res_st_a,
        res_st_b,
        res_ed_a,
        res_ed_b):
    cmd.load(pdb_a, 'receptor')
    cmd.load(pdb_b, 'ligand')
    receptor = "receptor and chain {} and resi {}-{}".format(chain_a, res_st_a, res_ed_a)
    ligand = "ligand and chain {} and resi {}-{}".format(chain_b, res_st_b, res_ed_b)
    cmd.align(receptor, ligand)
    cmd.save('align.pdb', 'ligand')
    cmd.quit()


if __name__ == '__main__':
    pymol_align_global('./data/receptor.pdb', './data/ligand.pdb')
