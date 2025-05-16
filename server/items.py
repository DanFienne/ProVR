from pydantic import BaseModel


class HDock(BaseModel):
    receptor: str
    ligand: str


class Design(BaseModel):
    pdb_string: str


class Energy(BaseModel):
    pdb_string: str


class FilePath(BaseModel):
    filePath: str


