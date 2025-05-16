# Falcon-VR
## Introduction

Falcon-VR 是一个基于 Three.js 开发的先进蛋白质设计工具，旨在为研究人员和生物学家提供沉浸式的虚拟现实体验。通过利用最新的 WebVR 技术，Falcon-VR 提供了一个功能强大的平台，使用户能够在无限的虚拟环境中直观地设计和可视化蛋白质结构。

### 主要功能
* 沉浸式体验: Falcon-VR 提供完全沉浸的虚拟现实环境，增强用户直观探索和操作蛋白质结构的能力。
* 基于网络的可访问性: 设计为无缝运行在网络上，Falcon-VR 无需下载或安装软件，确保使用方便和访问便利。
* 全面的结构分析: 配备了一整套详细的结构分析工具，支持研究人员执行复杂的蛋白质设计任务。
* 互动可视化: 使用 VR 控制器与蛋白质模型进行互动，并以物理意义的方式变形模型，促进对分子动力学的深入理解。
* 前沿技术: 原生构建于 WebVR，Falcon-VR 利用现代网络技术的全部潜力，提供高性能、响应迅速的 VR 体验。

### 为什么选择 Falcon-VR？
Falcon-VR 因其致力于提供一个易于访问、用户友好的平台，将 VR 的强大功能带给研究人员和生物学家而脱颖而出。通过消除传统软件的障碍，并使用户能够实时与复杂的分子结构互动，Falcon-VR 赋予用户推动科学发现和创新的能力。

## News


## Documentation

### Implement

| 参数      |                  示例                  |                                                                                                 描述 |
|:--------|:------------------------------------:|---------------------------------------------------------------------------------------------------:|
| Tools   | "design","docking","energy","align"  |                    该参数表示工具所实现的特定功能或工作目标。例如，“design”蛋白质设计；“docking”对接工具；“energy”能量计算工具；“align”对齐工具。 |
| Name    |        "ProDESIGN","HDock"...        |                                         该参数代表工具的具体名称，如“ProDESIGN”或“HDock”等。每个名称对应一个特定的工具，能够执行相应的功能 |
| Address |  "https://0.0.0.0:9098/design"       | 该参数表示工具对应的网络地址或访问路径，例如"https://0.0.0.0:9098/design" 。这个地址用于在网络环境中访问和使用相应的工具，确保用户能够通过浏览器或API接口进行操作。 |



## Video Tutorials


## Requirements
```
git clone https://github.com/DanFienne/falcon2.git
```

```
pip install "fastapi[standard]"
# openmm
conda install -c conda-forge openmm
conda install -c conda-forge pdbfixer
conda install -c conda-forge pymol-open-source
```

## Quickstart
```
cd server
uvicorn app:app --host ip_address --port port

example: 
uvicorn app:app --reload --host 0.0.0.0 --port 9098 --ssl-keyfile server.key --ssl-certfile server.crt
```
使用头盔直接访问 ip_address

功能:


## Citation
```
@article{10.1093/bioinformatics/btaa696,
    author = {Xu, Kui and Liu, Nan and Xu, Jingle and Guo, Chunlong and Zhao, Lingyun and Wang, Hong-Wei and Zhang, Qiangfeng Cliff},
    title = "{VRmol: an Integrative Web-Based Virtual Reality System to Explore Macromolecular Structure}",
    journal = {Bioinformatics},
    year = {2020},
    month = {08},
    issn = {1367-4803},
    doi = {10.1093/bioinformatics/btaa696},
    url = {https://doi.org/10.1093/bioinformatics/btaa696},
    note = {btaa696},
    eprint = {https://academic.oup.com/bioinformatics/advance-article-pdf/doi/10.1093/bioinformatics/btaa696/33560033/btaa696.pdf},
}
```