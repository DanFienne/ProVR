from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi import FastAPI, Request
from items import HDock, Design, Energy, FilePath
from alignment import pymol_align_global
from dssp import get_ss_from_pymol
from dfire.calene import DFIRE
from pmscore import compare_structures
import subprocess
import tempfile
import config
import httpx
import os

app = FastAPI()
templates = Jinja2Templates(directory="../client/templates")
app.mount("/static", StaticFiles(directory="../client/static"), name="static")

# dfire
dfire_model = DFIRE()


# load config.json


@app.post("/dfire")
async def h_dock(response: Energy):
    pdb_str = response.pdb_string
    energy = dfire_model.calc_energy(pdb_str)
    score = "{:.3f}".format(energy)
    return JSONResponse(content=score)


def h_dock_cmd(receptor, ligand):
    path = 'hdockData'
    command1 = f"hdock {receptor} {ligand}"
    command2 = f"createpl Hdock.out {path}/top10.pdb -nmax 10 -complex -models"

    # Execute the command
    subprocess.run(command1, shell=True)
    subprocess.run(command2, shell=True)
    return path


# 添加cors中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=config.cors_origins,
    allow_credentials=True,
    allow_methods=config.cors_methods,
    allow_headers=config.cors_headers,
)


@app.get("/")
async def read_root(request: Request):
    context = {"request": request, "message": "Hello, FastAPI with Jinja2!"}
    return templates.TemplateResponse("index.html", {"request": request, "context": context})


@app.post("/hdock")
async def h_dock(response: HDock):
    receptor = response.receptor
    ligand = response.ligand

    with tempfile.NamedTemporaryFile(delete=False) as receptor_file:
        receptor_file_path = receptor_file.name
        receptor_file.write(receptor.encode())
    with tempfile.NamedTemporaryFile(delete=False) as ligand_file:
        ligand_file_path = ligand_file.name
        ligand_file.write(ligand.encode())

    file_path = h_dock_cmd(receptor_file_path, ligand_file_path)

    os.unlink(receptor_file_path)
    os.unlink(ligand_file_path)
    context = {"filePath": file_path}

    return JSONResponse(content=context)


@app.post("/design")
async def abacus(response: Design):
    pdb_string = response.pdb_string
    test_list = ''
    with tempfile.NamedTemporaryFile(dir=test_list, delete=False) as pdb_file:
        pdb_file.write(pdb_string.encode())
    # scuba-d
    command = [
        'python3.8', 'inference_par.py',
        '--test_list', test_list,
        '--write_pdbfile',
        '--batch_size', '1',
        '--sample_from_raw_pdbfile',
        '--diff_noising_scale', '0.1'
    ]
    # 运行命令
    subprocess.run(command)
    input_pdb = ""
    output_pdb = ""
    log_file = ""
    # abacus
    subprocess.run(['ABACUS-DesignSeq', '-in', input_pdb, '-out', output_pdb, '-log', log_file])
    pass


@app.post("/align")
async def align(response: HDock):
    receptor = response.receptor
    ligand = response.ligand

    path_data = "./data/"

    with open(path_data + 'receptor.pdb', 'w', encoding='utf-8') as fw1:
        fw1.writelines(receptor)
    with open(path_data + 'ligand.pdb', 'w', encoding='utf-8') as fw2:
        fw2.writelines(ligand)

    pymol_align_global(path_data + 'receptor.pdb', path_data + 'ligand.pdb')
    # result = ligand
    result = get_ss_from_pymol(path_data + 'aligned_mobile.pdb')
    print(result)
    return JSONResponse(content={"rotation": result})


@app.post("/load_file_path")
async def load_file_path(response: FilePath):
    try:
        data_path = response.filePath
        # 获取文件列表
        files = os.listdir(data_path)
        # 过滤掉不需要的隐藏文件或文件夹（可选）
        files = [f.split('.')[0] for f in files if '.pdb' in f]
        return JSONResponse(content={"files": files})
    except FileNotFoundError:
        return JSONResponse(status_code=404, content={"error": "Directory not found"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@app.post("/score")
async def score(response: HDock):
    try:
        receptor = response.receptor
        ligand = response.ligand

        path_data = "./data/"
        with open(path_data + 'receptor.pdb', 'w', encoding='utf-8') as fw1:
            fw1.writelines(receptor)
        with open(path_data + 'ligand.pdb', 'w', encoding='utf-8') as fw2:
            fw2.writelines(ligand)

        score = compare_structures(path_data + 'receptor.pdb', path_data + 'ligand.pdb')
        return JSONResponse(content={"score": score})
    except Exception as e:
        print(e)
        return JSONResponse(content={"score": 0})


@app.post("/diffuse")
async def diffuse(request: Design):
    receptor = request.pdb_string
    try:
        # 1) 创建 AsyncClient 时禁用超时
        async with httpx.AsyncClient(timeout=None) as client:
            # 2) 单次请求也可以再指定 timeout=None
            infer_response = await client.post(
                "http://localhost:8000/infer",
                json={"pdb_str": receptor},
                timeout=None
            )
            # 如果状态码不是 2xx 会抛出 httpx.HTTPStatusError
            infer_response.raise_for_status()
            result = infer_response.json()
    except httpx.HTTPStatusError as e:
        # 接口返回了非200
        print(f"[infer] bad status: {e.response.status_code} ─ {e}")
        return JSONResponse(status_code=500, content={"score": 0})
    except Exception as e:
        # 网络错误、超时、解析失败等
        print(f"[infer] request failed: {e}")
        return JSONResponse(status_code=500, content={"score": 0})

    # 此处保证 infer 完全执行结束并返回了结果
    data = result.get("x0_traj_pdb", "")
    # 把返回的大字符串按行拆开
    lines = data.splitlines(keepends=True)

    output_dir = "../client/static/data"
    os.makedirs(output_dir, exist_ok=True)

    header_lines = []
    model_lines = []
    model_count = 0
    in_model = False


    for line in lines:
        if line.startswith("MODEL"):
            in_model = True
            model_lines = [line]
        elif line.startswith("ENDMDL") and in_model:
            model_lines.append(line)
            model_count += 1
            out_path = os.path.join(output_dir, f"f{model_count:03d}.pdb")
            with open(out_path, "w") as fout:
                fout.writelines(header_lines + model_lines)
            in_model = False
        else:
            if in_model:
                model_lines.append(line)
            else:
                header_lines.append(line)

    # 根据需要返回前端信息
    return {"model_count": model_count}


# @app.post("/diffuse")
# async def diffuse(response: Design):
#     try:
#         receptor = response.pdb_string
#         print(receptor)
#         # 使用 httpx 异步客户端调用 /infer 接口
#         async with httpx.AsyncClient() as client:
#             infer_response = await client.post(
#                 "http://localhost:8000/infer",  # 如果两个接口在同一个服务上
#                 json={"pdb_str": receptor}
#             )
#             result = infer_response.json()
#             data = result.get("x0_traj_pdb", "")
#             output_dir = "../client/static/data"
#             model_lines = []
#             model_count = 0
#             for line in data:
#                 if line.startswith('MODEL'):
#                     model_lines = []
#                 elif line.startswith('ENDMDL'):
#                     model_lines.append(line)
#                     model_count += 1
#                     out_path = os.path.join(
#                         output_dir, f'f{model_count:03d}.pdb'
#                     )
#                     with open(out_path, 'w') as fout:
#                         # 写 header
#                         if header_lines:
#                             fout.writelines(header_lines)
#                         # 写模型本体
#                         fout.writelines(model_lines)
#                     model_lines = []
#                 else:
#                     model_lines.append(line)
#
#
#
#     except Exception as e:
#         print(e)
#         return JSONResponse(content={"score": 0})
