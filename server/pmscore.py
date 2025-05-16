#!/usr/bin/env python
# -*- coding:utf-8 -*-
import sys
from pymol import cmd

def rmsd_to_score(rmsd):
    """
    将 RMSD 映射为 0-100 的相似度得分。
    假设 RMSD = 0 时为 100 分，RMSD >= 10 时为 0 分。
    """
    if rmsd >= 10:
        return 0
    else:
        return round((1 - rmsd / 10) * 100, 2)

def compare_structures(pdb1, pdb2):
    # 清空当前 PyMOL 会话
    cmd.reinitialize()

    # 加载两个 PDB 文件
    cmd.load(pdb1, "mol1")
    cmd.load(pdb2, "mol2")

    # 对齐并获取 RMSD
    result = cmd.align("mol1", "mol2")
    rmsd = result[0]

    # 计算得分
    score = rmsd_to_score(rmsd)

    return score
