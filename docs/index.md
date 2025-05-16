Contents
====

- [Overview](#Overview)
- [Quick Start](#quick-start)
    - [Installing Falcon2-VR](#installing-siga)
    - [Running Falcon2-VR](#Running-Falcon2-VR)
    - [Implement](#Implement)
- [Geting Start VR Mode](#Geting-Start-VR-Mode)
    - [Enter VR Scene](#Enter-VR-Scene)
    - [VR Menu](#VR-Menu)
    - [Loading PDB](#Loading-PDB)
    - [Drag PDB](#Drag-PDB)
    - [Design PDB](#Design-PDB)
    - [Surface](#Surface)
    - [Color](#color)
    - [Align](#align)
    - [Docking](#docking)
    - [Energy](#energy)
    - [RefineStructure](#refineStructure)

* [Citation](#citation)
* [FAQ](#faq)
* [Support](#support)
* [Authors](#authors)

Overview
========

Falcon-VR 是一个基于 Three.js 开发的先进蛋白质设计工具，旨在为研究人员和生物学家提供沉浸式的虚拟现实体验。通过利用最新的 WebVR 技术，Falcon-VR 提供了一个功能强大的平台，使用户能够在无限的虚拟环境中直观地设计和可视化蛋白质结构。

Quick Start
===========


## Running Falcon2-VR

### Quickstart
```
cd falcon2/server
uvicorn app:app --host ip_address --port port
```
使用VR头盔直接访问 ip_address

### Implement

<table>
  <tr>
    <th style="text-align: left;">参数</th>
    <th style="text-align: left;">示例</th>
    <th style="text-align: left;">描述</th>
  </tr>
  <tr>
    <td style="text-align: left;">Tools</td>
    <td style="text-align: left;">"design","docking","energy","align"</td>
    <td style="text-align: left;">该参数表示工具所实现的特定功能或工作目标。例如，“design”蛋白质设计；“docking”对接工具；“energy”能量计算工具；“align”对齐工具。</td>
  </tr>
  <tr>
    <td style="text-align: left;">Name</td>
    <td style="text-align: left;">"ProDESIGN","HDock"</td>
    <td style="text-align: left;">该参数代表工具的具体名称，如“ProDESIGN”或“HDock”等。每个名称对应一个特定的工具，能够执行相应的功能。</td>
  </tr>
  <tr>
    <td style="text-align: left;">Address</td>
    <td style="text-align: left;">"https://0.0.0.0:9098/design"</td>
    <td style="text-align: left;">该参数表示工具对应的网络地址或访问路径，例如"https://0.0.0.0:9098/design" 。这个地址用于在网络环境中访问和使用相应的工具，确保用户能够通过浏览器或API接口进行操作。</td>
  </tr>
</table>

## Geting Start VR Mode

VR设备：

| Oculus Quest                                                        |
|:--------------------------------------------------------------------|
| <img src="images/gamepad.png" alt="Cate" width="400" height="auto"> |
| <img src="images/quest.jpg" alt="Cate" width="400" height="auto">   |

### Enter VR Scene

首先：VR程序启动，需要一个支持WebXR的浏览器。例如Google Chrome、Microsoft Edge、Firefox Reality等。

点击屏幕上`ENTER VR`按钮，进入VR模式。如图：
![ENTER VR](images/img.png)

### VR Menu

点击VR屏幕中的<img src="images/cate.png" alt="Cate" width="25" height="auto">,弹出VR中的菜单，实现VR的功能交互：
![MENU](images/menu.png)

### Loading PDB

点击`Menu`菜单中的`load PDB`按钮，加载PDB。PDB文件需提前放至`client/static/data`目录下, PDB ID会在点击`load PDB`
后，显示出来。选择目标PDB ID，加载PDB。

其中：
easy 是简单的设计蛋白模式
hard 是困难的设计蛋白模式

### Drag PDB

Drag按钮用于在PDB结构中拖动特定的元素。通过选择"Drag Chain"、"Drag Residue"、"Drag Residue"或"Drag Residue"，可以在 VR
场景中拖动结构中的单个链、配体、残基或药物。

可以通过选择Drag Chain，来拖拽主链蛋白和配体蛋白。


### Surface

`Surface`使用的是范德华力表面。通过调整透明度0.2-1.0，有0.2、0.4、0.6、0.8、1.0

![surface.png](images/surface.png)

### Color

通过VR
Menu的颜色的菜单，可以根据`元素（Element）`、`残基（Residue）`、`二级结构（SecStructure）`、`链（Chain）`、`蛋白质（PDB）`、`疏水性（HYDROPHOBICITY）`
等方式进行多样化修改颜色。

| `蛋白质（PDB）`                                                            | `元素（Element）`                                                             | `残基（Residue）`                                                             | `二级结构（SecStructure）`                                                 |
|:----------------------------------------------------------------------|:--------------------------------------------------------------------------|:--------------------------------------------------------------------------|:---------------------------------------------------------------------|
| 使用`Spectrum`从冷色调到暖色调的颜色渐变。                                            | 使用`Spectrum`从冷色调到暖色调的颜色渐变。                                                | 使用`Spectrum`从冷色调到暖色调的颜色渐变。                                                | 使用`Spectrum`从冷色调到暖色调的颜色渐变。                                           |
| <img src="images/color_pdb.png" alt="Cate" width="300" height="auto"> | <img src="images/color_element.png" alt="Cate" width="300" height="auto"> | <img src="images/color_residue.png" alt="Cate" width="300" height="auto"> | <img src="images/color_ss.png" alt="Cate" width="300" height="auto"> | 

### Align

`Align`功能是用于蛋白质结构对比的关键工具。

首先通过精确的序列比对算法，确定两条蛋白质链之间的最佳匹配区段。随后，基于序列比对的结果，进行结构比对，将两个蛋白质的三维结构进行精确的空间对齐。

该功能不仅能够帮助用户识别蛋白质之间的结构相似性，还可以用于分析同源蛋白质的结构差异、研究结构上的保守性区域，以及探讨蛋白质结构与功能之间的关系。Align工具为蛋白质结构生物学家提供了直观且高效的手段，以在虚拟现实环境中对复杂的生物分子进行详细的比较分析。


### 投影
要将 Oculus Quest 的画面投屏到电脑上，可以通过 ADB 工具和 scrcpy 实现。以下是详细步骤：

###  1.准备工作

确保 Oculus Quest 设备和电脑连接在同一个 Wi-Fi 网络下。

确保 Oculus Quest 已开启「开发者模式」和「USB 调试」功能。

### 安装必要工具：

在电脑上安装 ADB（Android Debug Bridge），或使用更友好的图形化工具 SideQuest。

下载并安装 scrcpy（一个开源的 Android 屏幕镜像工具）。

### 连接设备

使用 USB 数据线将 Oculus Quest 连接至电脑。

打开终端（命令提示符或 PowerShell），输入以下命令确认设备已连接：
```
adb devices
```
若设备已连接，将显示设备序列号。

启用无线调试

输入以下命令，切换到无线调试模式（默认端口为 5555）：
```
adb tcpip 5555
```
断开 USB 连接，并获取 Oculus Quest 的 IP 地址（可在设备设置 > 关于 > 网络中查看）。

使用以下命令连接设备（将 VR头盔IP 替换为实际 IP 地址）：
```
adb connect ‘VR头盔IP’:5555
```
启动投屏

在终端中运行以下命令，启动 scrcpy 并进行投屏：
```
scrcpy -m 1024 --bit-rate 2M --max-fps 30 --no-control
```
参数说明：

-m 1024：限制分辨率为 1024 像素，减小延迟

--bit-rate 2M：设置视频码率为 2 Mbps

--max-fps 30：限制最大帧率为 30 FPS

--no-control：仅投屏，不控制设备


Citation
========

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

FAQ
====

Support
=======

Authors
=======
