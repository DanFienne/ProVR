from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse, PlainTextResponse
from items import HDock, Design, Energy, FilePath
from alignment import pymol_align_global
from dssp import get_ss_from_pymol
from dfire.calene import DFIRE
from pmscore import compare_structures
import subprocess
import tempfile
import config
import httpx
import secrets
import urllib.parse

from logConf import *

from jose import jwt, JWTError
from passlib.hash import bcrypt
from sqlalchemy import (
    create_engine, Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import sessionmaker, declarative_base, Session, relationship

from pathlib import Path
import shutil, os, datetime
from typing import Optional, List

from fastapi import (
    FastAPI, Depends, HTTPException,
    File, UploadFile, Form, Header, Request, Query
)

app = FastAPI()
templates = Jinja2Templates(directory="../client/templates")
app.mount("/static", StaticFiles(directory="../client/static"), name="static")

UPLOAD_DIR = Path(__file__).parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)  # 用于保存上传的 pdb 文件
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

# dfire
dfire_model = DFIRE()


# load config.json


@app.post("/dfire")
async def h_dock(response: Energy):
    pdb_str = response.pdb_string
    pdb_str = pdb_str.split("\n")
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


@app.get("/vr")
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

# denglu
# ────────────────────── 配置 ──────────────────────
JWT_SECRET = os.getenv("JWT_SECRET", "CHANGE_ME")  # 生产环境请放到环境变量
JWT_ALGO = "HS256"
TOKEN_EXPIRES_MIN = 60 * 24 * 7  # 7 天

BASE_DIR = Path(__file__).parent
UPLOAD_ROOT = BASE_DIR / "uploads"
UPLOAD_ROOT.mkdir(exist_ok=True)

DB_URL = f"sqlite:///{BASE_DIR / 'app.db'}"
engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)
    files = relationship("PDBFile", back_populates="owner")
    providers = relationship("UserProvider", back_populates="user")


# 新增：第三方绑定
class UserProvider(Base):
    __tablename__ = "user_providers"
    id = Column(Integer, primary_key=True)
    provider = Column(String, nullable=False)  # github / google / wechat
    provider_uid = Column(String, nullable=False)  # GitHub id / Google sub / 微信 openid
    user_id = Column(Integer, ForeignKey("users.id"))
    user = relationship("User", back_populates="providers")
    __table_args__ = (UniqueConstraint('provider', 'provider_uid', name='_provider_uid_uc'),)


Base.metadata.create_all(engine)
app.mount("/user-files", StaticFiles(directory=UPLOAD_ROOT), name="user-files")


class PDBFile(Base):
    __tablename__ = "pdb_files"
    id = Column(Integer, primary_key=True)
    filename = Column(String, nullable=False)
    uploaded = Column(DateTime, default=datetime.datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))
    owner = relationship("User", back_populates="files")


Base.metadata.create_all(engine)

# ─────────────────── FastAPI 初始化 ───────────────────
app.mount("/user-files", StaticFiles(directory=UPLOAD_ROOT), name="user-files")


# ─────────────────── 工具函数 ───────────────────
def db_session() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_token(data: dict) -> str:
    to_encode = data.copy()
    to_encode.update(exp=datetime.datetime.utcnow() +
                         datetime.timedelta(minutes=TOKEN_EXPIRES_MIN))
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGO)


def verify_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except JWTError:
        return None


def get_token(auth: str = Header(None, alias="Authorization")):
    if not auth or not auth.startswith("Bearer "):
        raise HTTPException(401, "缺少或无效的 Authorization 头")
    return auth.removeprefix("Bearer ").strip()


def current_user(
        token: str = Depends(get_token),
        db: Session = Depends(db_session)
) -> User:
    payload = verify_token(token)
    if not payload:
        raise HTTPException(401, "Token 已失效或不合法")
    user = db.query(User).filter_by(id=payload["uid"]).first()
    if not user:
        raise HTTPException(401, "用户不存在")
    return user


# ─────────────────── API ───────────────────
@app.post("/api/register")
def api_register(username: str = Form(...), password: str = Form(...),
                 db: Session = Depends(db_session)):
    if db.query(User).filter_by(username=username).first():
        raise HTTPException(400, "用户名已存在")
    user = User(username=username, password=bcrypt.hash(password))
    db.add(user)
    db.commit()
    db.refresh(user)
    (UPLOAD_ROOT / str(user.id)).mkdir(exist_ok=True)
    return {"token": create_token({"uid": user.id})}


@app.post("/api/login")
def api_login(username: str = Form(...), password: str = Form(...),
              db: Session = Depends(db_session)):
    user = db.query(User).filter_by(username=username).first()
    if not user or not bcrypt.verify(password, user.password):
        raise HTTPException(401, "用户名或密码错误")
    return {"token": create_token({"uid": user.id})}


@app.post("/api/upload-pdb")
def api_upload_pdb(file: UploadFile = File(...),
                   user: User = Depends(current_user),
                   db: Session = Depends(db_session)):
    if not file.filename.lower().endswith(".pdb"):
        raise HTTPException(400, "仅允许 .pdb 文件")
    dest_dir = UPLOAD_ROOT / str(user.id)
    dest_dir.mkdir(exist_ok=True)
    dest = dest_dir / file.filename
    with dest.open("wb") as buf:
        shutil.copyfileobj(file.file, buf)
    db.add(PDBFile(filename=file.filename, owner=user))
    db.commit()
    return {"filename": file.filename,
            "url": f"/user-files/{user.id}/{file.filename}"}


@app.get("/api/my-files", response_model=List[str])
def api_my_files(user: User = Depends(current_user)):
    return [f.filename for f in user.files]


@app.delete("/api/delete-pdb")
def api_delete_pdb(filename: str = Query(...), user: User = Depends(current_user),
                   db: Session = Depends(db_session)):
    rec = db.query(PDBFile).filter_by(filename=filename, owner=user).first()
    if not rec:
        raise HTTPException(404, "文件不存在")
    # 删除磁盘文件
    file_path = UPLOAD_ROOT / str(user.id) / filename
    try:
        file_path.unlink(missing_ok=True)
    except Exception as e:
        raise HTTPException(500, f"删除磁盘文件失败: {e}")
    # 删除数据库记录
    db.delete(rec);
    db.commit()
    return {"detail": "删除成功"}


# ─────────────────── 页面路由 ───────────────────
@app.get("/", response_class=HTMLResponse)  # 登录 / 注册
def page_index(request: Request):     return templates.TemplateResponse("1.html", {"request": request})


@app.get("/dashboard", response_class=HTMLResponse)  # 上传面板
def page_dash():      return HTML_DASHBOARD


# ─────────────────── 登录 / 注册页 ───────────────────
HTML_INDEX = """
<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PDB Manager • 登录 / 注册</title>
<style>
:root{--glass:rgba(255,255,255,.25);--brd:rgba(255,255,255,.35);--brand:#6366f1}
html,body{height:100%;margin:0;font-family:-apple-system,system-ui,Roboto,sans-serif}
body{display:flex;align-items:center;justify-content:center;
     background:linear-gradient(135deg,#667eea 0%,#764ba2 100%) fixed}
.card{width:min(420px,90%);padding:3.5rem 3rem;border-radius:1.2rem;
      backdrop-filter:blur(32px) saturate(150%);background:var(--glass);
      border:1px solid var(--brd);box-shadow:0 15px 35px rgba(0,0,0,.15);
      animation:fade .6s ease}
h1{margin:0 0 2rem;font-size:1.8rem;color:#fff;text-align:center}
label{display:block;margin:.8rem 0 .25rem;font-size:.9rem;color:#f1f1f1}
input{width:100%;padding:.75rem 1rem;border:none;border-radius:.6rem;
      background:rgba(255,255,255,.9);font-size:1rem}
input:focus{outline:none;box-shadow:0 0 0 3px rgba(99,102,241,.35)}
button{width:100%;margin-top:2rem;padding:.8rem;border:none;border-radius:.8rem;
       background:var(--brand);color:#fff;font-size:1.05rem;font-weight:600;
       cursor:pointer;transition:.25s}
button:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(0,0,0,.25)}
.switcher{margin-top:1.5rem;text-align:center;color:#f1f1f1;font-size:.9rem;
          cursor:pointer}
#error{color:#ffb4b4;margin-top:1rem;text-align:center;min-height:1.2rem}
@keyframes fade{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
</style>

<div class="card">
  <h1 id="title">登录到 ProVR</h1>
  <form id="form">
    <label>用户名</label>
    <input name="username" id="username" autocomplete="username" required>
    <label>密码</label>
    <input name="password" id="password" type="password" autocomplete="current-password" required>
    <button id="submitBtn">登录</button>
    <div id="error"></div>
  </form>
  <div class="switcher" id="switcher">没有账号？立即注册</div>
</div>

<script>
const MODE = {login:"login",register:"register"};
let cur = MODE.login;
const title=document.getElementById("title"),
      switcher=document.getElementById("switcher"),
      submit=document.getElementById("submitBtn"),
      form=document.getElementById("form"),
      err=document.getElementById("error");
switcher.onclick=()=>setMode(cur===MODE.login?MODE.register:MODE.login);
function setMode(m){
  cur=m;
  const l=m===MODE.login;
  title.textContent=l?"登录到 ProVR":"注册新账号";
  submit.textContent=l?"登录":"注册";
  switcher.textContent=l?"没有账号？立即注册":"已有账号？返回登录";
}
form.onsubmit=async e=>{
  e.preventDefault();err.textContent="";
  const fd=new FormData(form);
  const res=await fetch("/api/"+cur,{method:"POST",body:fd});
  const j=await res.json();
  if(!res.ok){err.textContent=j.detail;return}
  localStorage.token=j.token;location.href="/vr";
};
if(localStorage.token)location.href="/vr";
</script>
"""
HTML_DASHBOARD = """<!doctype html><html lang="zh-CN"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>PDB Manager • Dashboard</title>
<style>
:root{--brand:#6366f1;--bg:#f7f9fc;--card:#fff;--gray:#6b7280}
*{box-sizing:border-box}body{margin:0;font-family:-apple-system,system-ui,Roboto,sans-serif;background:var(--bg);min-height:100vh;display:flex;flex-direction:column}
header{background:#fff;box-shadow:0 1px 4px rgba(0,0,0,.05);padding:.9rem 1.2rem;display:flex;justify-content:space-between;align-items:center}
h1{font-size:1.25rem;margin:0;color:var(--brand)}
#logout{background:var(--brand);color:#fff;border:none;padding:.45rem .9rem;border-radius:.5rem;cursor:pointer}#logout:hover{opacity:.92}
main{flex:1;max-width:960px;width:100%;margin:1.5rem auto;display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;padding:0 1rem}@media(max-width:720px){main{grid-template-columns:1fr}}
.card{background:var(--card);border-radius:1rem;padding:1.5rem;box-shadow:0 4px 12px rgba(0,0,0,.06);animation:rise .5s}
.card h2{margin:0 0 1rem;font-size:1.1rem}
input[type=file]{width:100%;padding:.9rem;border:2px dashed #cfd8e3;border-radius:.8rem;background:#fafbff;font-size:.95rem;cursor:pointer}
input[type=file]:hover{border-color:var(--brand)}
button.upload{width:100%;margin-top:1rem;padding:.75rem;border:none;border-radius:.8rem;background:var(--brand);color:#fff;font-size:1rem;font-weight:600;cursor:pointer}
button.upload:hover{transform:translateY(-1px)}
ul{list-style:none;padding:0;margin:0;max-height:60vh;overflow:auto}
li{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #f0f0f0;padding:.55rem .1rem;font-size:.95rem}
li:last-child{border:none}li a{color:var(--brand);text-decoration:none;word-break:break-all;flex:1}
li span{font-size:.8rem;color:var(--gray);margin-left:.6rem}
button.del{background:none;border:none;color:#d33;cursor:pointer;font-size:.9rem;margin-left:.6rem}
button.del:hover{opacity:.75}
#msg{margin-top:.7rem;font-size:.9rem}
@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
</style>
<header><h1>PDB Manager</h1><button id="logout">退出登录</button></header>

<script>
// 同步回调 token，并做登录守卫
(function syncTokenAndGuard(){
  // 接收 #access_token 或 ?access_token
  const m = location.hash.match(/access_token=([^&]+)/) || location.search.match(/[?&]access_token=([^&]+)/);
  if (m) {
    try {
      localStorage.token = decodeURIComponent(m[1]);
      // 清理地址栏，避免泄露
      history.replaceState(null, "", location.pathname);
    } catch(e) {}
  }
  // 未登录则回到登录页，带 next 回来
  if (!localStorage.token) {
    location.href = "/?next=" + encodeURIComponent(location.pathname);
  }
})();
</script>

<main>
  <section class="card">
    <h2>上传新的 PDB 文件</h2>
    <form id="uploadForm"><input id="fileInput" type="file" accept=".pdb" required>
      <button class="upload">上传</button><div id="msg"></div></form>
  </section>
  <section class="card">
    <h2>我的文件</h2>
    <ul id="fileList"><li>加载中…</li></ul>
  </section>
</main>
<script>
if(!localStorage.token)location.href="/";
const hdr={"Authorization":"Bearer "+localStorage.token};
function parseJwt(t){return JSON.parse(atob(t.split('.')[1]));}
let uid="me";
try{ uid=parseJwt(localStorage.token).uid; }catch(e){ uid="me"; }
const list=document.getElementById("fileList"),msg=document.getElementById("msg");
async function load(){const r=await fetch("/api/my-files",{headers:hdr});
  if(!r.ok){localStorage.removeItem("token");location.href="/";return}
  const a=await r.json();
  if(!a.length){list.innerHTML="<li><span>暂无文件</span></li>";return}
  list.innerHTML="";a.forEach(f=>{const li=document.createElement("li");
    li.innerHTML=`<a href="/user-files/${uid}/${encodeURIComponent(f)}" target="_blank">${f}</a>
                  <button class="del" title="删除" data-f="${encodeURIComponent(f)}">🗑</button>`;
    list.appendChild(li);});
  // 绑定删除按钮事件
  list.querySelectorAll("button.del").forEach(btn=>{
    btn.onclick=async e=>{
      const fn=decodeURIComponent(e.target.dataset.f);
      if(!confirm("确定删除 '"+fn+"' ?"))return;
      const res=await fetch("/api/delete-pdb?filename="+encodeURIComponent(fn),
                   {method:"DELETE",headers:hdr});
      if(res.ok){load();}
      else{alert("删除失败: "+(await res.json()).detail);}
    };
  });
}
load();
document.getElementById("uploadForm").onsubmit=async e=>{
 e.preventDefault();msg.style.color="";msg.textContent="上传中…";
 const fd=new FormData();fd.append("file",fileInput.files[0]);
 const r=await fetch("/api/upload-pdb",{method:"POST",body:fd,headers:hdr});
 const j=await r.json();
 if(!r.ok){msg.style.color="#d33";msg.textContent=j.detail;return}
 msg.style.color="green";msg.textContent="上传成功！";fileInput.value="";load();};
logout.onclick=()=>{localStorage.removeItem("token");location.href="/";}
</script>"""

# WeChat 网站扫码登录
WECHAT_APP_ID = os.getenv("WECHAT_APP_ID", "")
WECHAT_APP_SECRET = os.getenv("WECHAT_APP_SECRET", "")
WECHAT_QR_AUTH_URL = "https://open.weixin.qq.com/connect/qrconnect"
WECHAT_TOKEN_URL = "https://api.weixin.qq.com/sns/oauth2/access_token"
# --- state 防 CSRF（演示使用内存；生产可用 Redis，并定时清理过期） ---
STATE_STORE = {}


def issue_state():
    s = secrets.token_urlsafe(24)
    STATE_STORE[s] = {"ts": datetime.datetime.utcnow().timestamp()}
    return s


# 绑定/登录并签发 JWT
from jose import jwt


def login_or_create_user_by_provider(db: Session, provider: str, provider_uid: str,
                                     default_name: Optional[str] = None) -> str:
    link = db.query(UserProvider).filter_by(provider=provider, provider_uid=provider_uid).first()
    if link:
        uid = link.user_id
    else:
        base_name = default_name or f"{provider}_{provider_uid}"
        name = base_name;
        i = 1
        while db.query(User).filter_by(username=name).first():
            i += 1;
            name = f"{base_name}_{i}"
        user = User(username=name, password=bcrypt.hash(secrets.token_urlsafe(16)))
        db.add(user);
        db.commit();
        db.refresh(user)
        db.add(UserProvider(provider=provider, provider_uid=provider_uid, user_id=user.id))
        db.commit()
        uid = user.id
        (UPLOAD_ROOT / str(uid)).mkdir(exist_ok=True)
    return create_token({"uid": uid})


STATE_STORE = {}  # {state: {"next": "/vr", "ts": 123456}}


def issue_state(next_path: str = "/vr"):
    s = secrets.token_urlsafe(24)
    STATE_STORE[s] = {"next": next_path, "ts": datetime.datetime.utcnow().timestamp()}
    return s


# ---------- GitHub ----------
@app.get("/login/github")
def login_github():
    state = issue_state()
    params = {
        "client_id": GITHUB_CLIENT_ID,
        "redirect_uri": f"{OAUTH_REDIRECT_BASE}/auth/github/callback",
        "scope": "read:user user:email",
        "state": state,
        "allow_signup": "true",
    }
    return RedirectResponse(f"{GITHUB_AUTH_URL}?{urllib.parse.urlencode(params)}")


@app.get("/auth/github/callback")
async def github_callback(code: str = Query(None), state: str = Query(None), db: Session = Depends(db_session)):
    if not code or not state or state not in STATE_STORE:
        return PlainTextResponse("Invalid state or code", status_code=400)
    meta = STATE_STORE.pop(state, {})
    next_path = meta.get("next", "/vr")
    async with httpx.AsyncClient(headers={"Accept": "application/json"}) as client:
        token_res = await client.post(GITHUB_TOKEN_URL, data={
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": f"{OAUTH_REDIRECT_BASE}/auth/github/callback",
            "state": state
        })
        token_res.raise_for_status()
        tk = token_res.json()
        access_token = tk.get("access_token")
    if not access_token:
        return PlainTextResponse("Failed to get access_token", status_code=400)
    async with httpx.AsyncClient(headers={"Authorization": f"Bearer {access_token}",
                                          "Accept": "application/json"}) as client:
        ures = await client.get(GITHUB_USER_URL)
        ures.raise_for_status()
        uinfo = ures.json()
    provider_uid = str(uinfo.get("id"))
    default_name = uinfo.get("login") or f"github_{provider_uid}"
    token = login_or_create_user_by_provider(db, "github", provider_uid, default_name)

    # resp = RedirectResponse(url=next_path)
    # set_session_cookie(resp, {"uid": token})
    # return resp
    return RedirectResponse(f"{next_path}#access_token={urllib.parse.quote(token)}")


# ---------------- 会话（服务端 Session via 签名 Cookie） ----------------
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

SESSION_SECRET = os.getenv("SESSION_SECRET", "CHANGE_ME_TO_A_LONG_RANDOM_STRING")
SESSION_COOKIE_NAME = "sessionid"
SESSION_MAX_AGE = 60 * 60 * 24 * 7  # 7 天
serializer = URLSafeTimedSerializer(SESSION_SECRET, salt="session")


def set_session_cookie(resp, data: dict):
    # data 示例：{"uid": 123}
    token = serializer.dumps(data)
    resp.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        secure=False if os.getenv("ENV") == "dev" else True,  # 本地调试可设 False，生产必须 True 且启用 HTTPS
        samesite="Lax",
        path="/"
    )


# ---------- Google ----------
@app.get("/login/google")
def login_google():
    state = issue_state()
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": f"{OAUTH_REDIRECT_BASE}/auth/google/callback",
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent"
    }
    return RedirectResponse(f"{GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}")


@app.get("/auth/google/callback")
async def google_callback(code: str = Query(None), state: str = Query(None), db: Session = Depends(db_session)):
    if not code or not state or state not in STATE_STORE:
        return PlainTextResponse("Invalid state or code", status_code=400)
    STATE_STORE.pop(state, None)
    async with httpx.AsyncClient() as client:
        tres = await client.post(GOOGLE_TOKEN_URL, data={
            "code": code,
            "client_id": GOOGLE_CLIENT_ID,
            "client_secret": GOOGLE_CLIENT_SECRET,
            "redirect_uri": f"{OAUTH_REDIRECT_BASE}/auth/google/callback",
            "grant_type": "authorization_code"
        }, headers={"Content-Type": "application/x-www-form-urlencoded"})
        tres.raise_for_status()
        tdata = tres.json()
        access_token = tdata.get("access_token")
        id_token = tdata.get("id_token")
    if not access_token and not id_token:
        return PlainTextResponse("Failed to get token", status_code=400)
    async with httpx.AsyncClient(headers={"Authorization": f"Bearer {access_token}"}) as client:
        ures = await client.get(GOOGLE_USERINFO_URL)
        ures.raise_for_status()
        uinfo = ures.json()
    provider_uid = uinfo.get("sub")
    default_name = (uinfo.get("email") or uinfo.get("name") or f"google_{provider_uid}").split("@")[0]
    token = login_or_create_user_by_provider(db, "google", provider_uid, default_name)
    return RedirectResponse(f"/vr#access_token={urllib.parse.quote(token)}")


# ---------- WeChat 网站扫码 ----------
@app.get("/login/wechat")
def login_wechat():
    state = issue_state()
    params = {
        "appid": os.getenv("WECHAT_APP_ID", ""),
        "redirect_uri": f"{OAUTH_REDIRECT_BASE}/auth/wechat/callback",
        "response_type": "code",
        "scope": "snsapi_login",
        "state": state
    }
    return RedirectResponse(f"{WECHAT_QR_AUTH_URL}?{urllib.parse.urlencode(params)}#wechat_redirect")


@app.get("/auth/wechat/callback")
async def wechat_callback(code: str = Query(None), state: str = Query(None), db: Session = Depends(db_session)):
    if not code or not state or state not in STATE_STORE:
        return PlainTextResponse("Invalid state or code", status_code=400)
    STATE_STORE.pop(state, None)
    async with httpx.AsyncClient() as client:
        token_res = await client.get("https://api.weixin.qq.com/sns/oauth2/access_token", params={
            "appid": os.getenv("WECHAT_APP_ID", ""),
            "secret": os.getenv("WECHAT_APP_SECRET", ""),
            "code": code,
            "grant_type": "authorization_code"
        })
        token_res.raise_for_status()
        tk = token_res.json()
        if "errcode" in tk and tk["errcode"] != 0:
            return PlainTextResponse(f"WeChat token error: {tk}", status_code=400)
        access_token = tk.get("access_token")
        openid = tk.get("openid")
    if not access_token or not openid:
        return PlainTextResponse("Failed to get access_token/openid", status_code=400)
    provider_uid = openid
    default_name = f"wx_{openid[:8]}"
    token = login_or_create_user_by_provider(db, "wechat", provider_uid, default_name)
    return RedirectResponse(f"/vr#access_token={urllib.parse.quote(token)}")
