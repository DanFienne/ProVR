#!/usr/bin/env python  -*- 
# -*- coding: utf-8    -*-
# -*- Author: DanFeng  -*-

from collections import defaultdict
import numpy as np
import math


class DFIRE(object):
    def __init__(self, dfire_pair="dfire/dfire_pair.lib", pdb_file="../datasets/pro_CA.pdb"):
        self.dfire_pair = dfire_pair
        self.edfire, self.ATOM_TYPE = self.read_lib()

    def read_lib(self):
        MBIN = 30
        edfire = np.zeros((168, 168, 30))
        ATOM_TYPE = defaultdict(int)
        with open(self.dfire_pair, "r") as fr:
            fp = fr.readlines()
        na_a2 = 0
        for line in fp:
            if line[0] == "#":
                continue
            ss = line.split()
            an1 = ss[0] + ' ' + ss[1]
            an2 = ss[2] + ' ' + ss[3]

            if ATOM_TYPE[an1] == 0:
                ATOM_TYPE[an1] = na_a2
                na_a2 += 1
            if ATOM_TYPE[an2] == 0:
                ATOM_TYPE[an2] = na_a2
                na_a2 += 1
            id1 = ATOM_TYPE[an1]
            id2 = ATOM_TYPE[an2]

            ss = ss[4:]
            edfire[id1][id2] = [float(ss[m]) for m in range(MBIN)]
            edfire[id2][id1] = edfire[id1][id2]

        return edfire, ATOM_TYPE

    def calc_energy(self, fp):
        number_residue = -1
        atom_id = []
        res_id = []
        res_x = []

        rinfo_0 = ""

        for line in fp:
            if line.startswith("ATOM"):
                residue_info = line[17:27]
                if residue_info != rinfo_0:
                    rinfo_0 = residue_info
                    number_residue += 1
                residue_name = line[17:20].strip()
                atom_name = line[13:16].strip()

                atom_name_1 = residue_name + " " + atom_name

                if self.ATOM_TYPE[atom_name_1] < 1:
                    continue

                atom_id.append(self.ATOM_TYPE[atom_name_1])

                coordinate = line[30:54].strip().split()
                res_axis = [
                    float(coordinate[0]),
                    float(coordinate[1]),
                    float(coordinate[2])
                ]

                res_x.append(res_axis)
                res_id.append(number_residue)

        number_atom = len(atom_id)
        print(number_atom)

        eall = 0.

        for i in range(number_atom):
            for j in range(i + 1, number_atom):
                r = 0.
                for m in range(3):
                    xd = res_x[i][m] - res_x[j][m]
                    r += (xd * xd)
                r = math.sqrt(r)
                b = int(r * 2)
                if b >= 30:
                    continue
                eall += self.edfire[atom_id[i]][atom_id[j]][b]

        return eall

