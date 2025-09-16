# ProVR

## Introduction

ProVR 是一个基于 Three.js 开发的先进蛋白质设计工具，旨在为研究人员和生物学家提供沉浸式的虚拟现实体验。通过利用最新的 WebVR
技术，ProVR 提供了一个功能强大的平台，使用户能够在无限的虚拟环境中直观地设计和可视化蛋白质结构。

### 主要功能

* 沉浸式体验: ProVR 提供完全沉浸的虚拟现实环境，增强用户直观探索和操作蛋白质结构的能力。
* 基于网络的可访问性: 设计为无缝运行在网络上，ProVR 无需下载或安装软件，确保使用方便和访问便利。
* 全面的结构分析: 配备了一整套详细的结构分析工具，支持研究人员执行复杂的蛋白质设计任务。
* 互动可视化: 使用 VR 控制器与蛋白质模型进行互动，并以物理意义的方式变形模型，促进对分子动力学的深入理解。
* 前沿技术: 原生构建于 WebVR，ProVR 利用现代网络技术的全部潜力，提供高性能、响应迅速的 VR 体验。

### 为什么选择 ProVR？

ProVR 因其致力于提供一个易于访问、用户友好的平台，将 VR 的强大功能带给研究人员和生物学家而脱颖而出。通过消除传统软件的障碍，并使用户能够实时与复杂的分子结构互动，ProVR
赋予用户推动科学发现和创新的能力。

## 在线体验

[ProVR](https://github.com/your-repo/webxr-app)

## 适用设备

* Pico 4 Ultra
* Pico 4
* Oculus quest 3
* Oculus quest 2

建议使用最新版 Chrome、Edge、Firefox 浏览器，获得最佳体验。

## Documentation

### Implement

| 参数      |                 示例                  |                                                                                                 描述 |
|:--------|:-----------------------------------:|---------------------------------------------------------------------------------------------------:|
| Tools   | "design","docking","energy","align" |                    该参数表示工具所实现的特定功能或工作目标。例如，“design”蛋白质设计；“docking”对接工具；“energy”能量计算工具；“align”对齐工具。 |
| Name    |       "ProDESIGN","HDock"...        |                                         该参数代表工具的具体名称，如“ProDESIGN”或“HDock”等。每个名称对应一个特定的工具，能够执行相应的功能 |
| Address |    "https://0.0.0.0:9098/design"    | 该参数表示工具对应的网络地址或访问路径，例如"https://0.0.0.0:9098/design" 。这个地址用于在网络环境中访问和使用相应的工具，确保用户能够通过浏览器或API接口进行操作。 |

## Video Tutorials

## Requirements

```
git clone https://github.com/DanFienne/ProVR.git
```

```
python <= 3.12
pip install "fastapi[standard]"



# openmm
conda install -c conda-forge openmm
conda install -c conda-forge pdbfixer
conda install -c conda-forge pymol-open-source
```

## Quickstart

```
# 注册/登录账号
https://HOST:PORT/  改为自行设置的HOST和PORT
 
# 示例： https://127.0.0.1:9098/

# 上传PDB文件
接口： https://HOST:PORT/dashboard

# 示例：https://127.0.0.1:9098/dashboard 【在电脑端上传】

# 脚本启动
./run.sh  [CONDA-ENV]  [HOST]  [PORT] 

传入自己的conda-env、host、port

# 命令启动
cd server
example: 
uvicorn app:app --reload --host 0.0.0.0 --port 9098 --ssl-keyfile server.key --ssl-certfile server.crt

# 使用头盔直接访问 ip_address

# 注册/登录账号
https://HOST:PORT/  exp； https://127.0.0.1:9098/

# 上传PDB文件
https://HOST:PORT/dashboard 【在电脑端上传】 exp：https://127.0.0.1:9098/dashboard
上传PDB后，可以在VR菜单的Load中加载PDB文件

# 访问vr
https://HOST:PORT/vr exp：https://127.0.0.1:9098/vr
```

## ProVR 联网与使用指南

本指南将帮助你快速获取服务器 IP，并让 VR 头显连接到 ProVR 服务。

---

### 前置条件

* 已在服务器上运行 ProVR 服务
* VR 头显具备浏览器并可正常联网
* 服务器与 VR 头显网络可达（同局域网或公网可访问）

----

### 第一步：获取服务器 IP 地址（HOST）

根据你的系统选择对应方法，记录下“IPv4 地址”。

* Windows 11

    1. 打开命令提示符（Win+R 输入 cmd 回车）
    2. 输入：ipconfig
    3. 在当前联网的适配器下找到 IPv4 地址（示例：192.168.1.23）
* macOS / Linux

    1. 打开终端（Terminal）
    2. 输入：ifconfig 或 ip addr
    3. 找到当前网络接口（如 en0、wlan0）的 IPv4 地址（示例：192.168.1.23）

提示：

* 如果机器有多个网卡/适配器，请选择与 VR 头显在同一网络的那个接口的 IPv4。
* 若使用公网访问，请使用服务器的公网 IP 或已绑定的域名。

---

### 第二步：让 VR 头显访问 ProVR

你可以在`局域网模式`或`公网模式（联网模式）`下使用。

* 局域网模式（推荐低延迟）

    1. 确保 VR 头显与服务器在同一局域网（同一 Wi‑Fi/有线网络）
    2. 在 VR 头显的浏览器地址栏输入：
        * http://<服务器IPv4>:<服务端口>
        * 例：http://192.168.1.23:9098
    3. 如能访问首页，即表示连接成功
* 公网模式（远程访问）

    1. 确保服务器的公网地址可达，且已放行对应端口（云厂商安全组/本机防火墙）
    2. 在 VR 头显的浏览器地址栏输入服务器地址：
       * http://<域名或公网IP>:<服务端口>
       * 例：https://vr.example.com 或 http://203.0.113.10:9098
    3. 建议为公网启用 HTTPS，提升安全性与兼容性

---

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
