import os
import io
from datetime import datetime, timedelta
from fastapi import FastAPI, HTTPException, status, Depends, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from pymongo import MongoClient
from passlib.context import CryptContext
from bson.objectid import ObjectId
import jwt
import xlsxwriter
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

app = FastAPI(title="Backend Dompet Lapangan")

@app.get("/")
def home():
    return {"status": "Mesin Backend Dompet Lapangan Aktif 🚀", "pesan": "Silakan akses lewat aplikasi Frontend!"}

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATABASE MONGODB ---
MONGO_URL = os.getenv("MONGODB_URI")
client = MongoClient(MONGO_URL)
db = client["dompet_lapangan"]
users_collection = db["users"]
events_collection = db["events"]
categories_collection = db["categories"]
expenses_collection = db["expenses"]
incomes_collection = db["incomes"]

# --- STORAGE SUPABASE (GUDANG FOTO) ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# Cek apakah URL dan Key tersedia agar tidak error
if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    supabase = None

# --- PENGATURAN PASSWORD & TOKEN ---
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
SECRET_KEY = os.getenv("JWT_SECRET", "kunci_rahasia_dompet_lapangan_super_aman")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 7

# --- MODEL DATA (EmailStr sudah diganti jadi str biasa) ---
class UserRegister(BaseModel):
    name: str
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class EventCreate(BaseModel):
    name: str
    initial_cash: int

class UpdateCash(BaseModel):
    initial_cash: int

class CategoryCreate(BaseModel):
    event_id: str
    name: str
    allocated_amount: int

class CategoryUpdate(BaseModel):
    allocated_amount: int

# --- FUNGSI BANTUAN TOKEN ---
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Token tidak valid")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Token kadaluarsa atau tidak valid")
    user = users_collection.find_one({"email": email})
    if user is None:
        raise HTTPException(status_code=401, detail="User tidak ditemukan")
    return {"name": user["name"], "email": user["email"]}

# --- ENDPOINT AUTH ---
@app.post("/api/auth/register")
def register_user(user: UserRegister):
    if users_collection.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar!")
    hashed_password = pwd_context.hash(user.password)
    users_collection.insert_one({"name": user.name, "email": user.email, "password": hashed_password})
    return {"message": "Registrasi berhasil"}

@app.post("/api/auth/login")
def login_user(user: UserLogin):
    db_user = users_collection.find_one({"email": user.email})
    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Email atau password salah!")
    access_token = create_access_token(data={"sub": db_user["email"]})
    return {"access_token": access_token, "token_type": "bearer", "user": {"name": db_user["name"], "email": db_user["email"]}}

@app.get("/api/auth/me")
def get_profile(current_user: dict = Depends(get_current_user)):
    return current_user

# --- ENDPOINT KEGIATAN & PAGU ---
@app.post("/api/events")
def create_event(event: EventCreate, current_user: dict = Depends(get_current_user)):
    result = events_collection.insert_one({"user_email": current_user["email"], "name": event.name, "initial_cash": event.initial_cash, "created_at": datetime.utcnow()})
    return {"message": "Kegiatan berhasil dibuat", "id": str(result.inserted_id)}

@app.get("/api/events")
def get_events(current_user: dict = Depends(get_current_user)):
    cursor = events_collection.find({"user_email": current_user["email"]}).sort("created_at", -1)
    return [{"id": str(ev["_id"]), **{k: v for k, v in ev.items() if k != "_id"}} for ev in cursor]

@app.put("/api/events/{event_id}/cash")
def update_event_cash(event_id: str, data: UpdateCash, current_user: dict = Depends(get_current_user)):
    events_collection.update_one({"_id": ObjectId(event_id)}, {"$set": {"initial_cash": data.initial_cash}})
    return {"message": "Modal awal berhasil diperbarui"}

@app.post("/api/categories")
def create_category(category: CategoryCreate, current_user: dict = Depends(get_current_user)):
    result = categories_collection.insert_one({"event_id": category.event_id, "name": category.name, "allocated_amount": category.allocated_amount, "spent_amount": 0, "created_at": datetime.utcnow()})
    return {"message": "Kategori berhasil dibuat", "id": str(result.inserted_id)}

@app.get("/api/categories/{event_id}")
def get_categories(event_id: str, current_user: dict = Depends(get_current_user)):
    cursor = categories_collection.find({"event_id": event_id}).sort("created_at", 1)
    return [{"id": str(cat["_id"]), **{k: v for k, v in cat.items() if k != "_id"}} for cat in cursor]

@app.put("/api/categories/{category_id}")
def update_category_budget(category_id: str, data: CategoryUpdate, current_user: dict = Depends(get_current_user)):
    categories_collection.update_one({"_id": ObjectId(category_id)}, {"$set": {"allocated_amount": data.allocated_amount}})
    return {"message": "Pagu kategori berhasil diperbarui"}

# --- ENDPOINT TRANSAKSI (DENGAN UPLOAD SUPABASE) ---
@app.post("/api/expenses")
def create_expense(event_id: str = Form(...), category_id: str = Form(...), amount: int = Form(...), description: str = Form(...), date: str = Form(...), receipt: UploadFile = File(None), current_user: dict = Depends(get_current_user)):
    receipt_url = None
    if receipt and supabase:
        ext = receipt.filename.split('.')[-1]
        filename = f"exp_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
        
        file_bytes = receipt.file.read()
        supabase.storage.from_("receipts").upload(filename, file_bytes, {"content-type": receipt.content_type})
        receipt_url = f"{SUPABASE_URL}/storage/v1/object/public/receipts/{filename}"

    result = expenses_collection.insert_one({"event_id": event_id, "category_id": category_id, "amount": amount, "description": description, "date": date, "receipt_url": receipt_url, "created_at": datetime.utcnow()})
    categories_collection.update_one({"_id": ObjectId(category_id)}, {"$inc": {"spent_amount": amount}})
    return {"message": "Pengeluaran berhasil dicatat", "id": str(result.inserted_id)}

@app.get("/api/expenses/{event_id}")
def get_expenses(event_id: str, current_user: dict = Depends(get_current_user)):
    cursor = expenses_collection.find({"event_id": event_id}).sort("date", -1)
    return [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} for doc in cursor]

@app.post("/api/incomes")
def create_income(event_id: str = Form(...), amount: int = Form(...), source: str = Form(...), description: str = Form(...), date: str = Form(...), receipt: UploadFile = File(None), current_user: dict = Depends(get_current_user)):
    receipt_url = None
    if receipt and supabase:
        ext = receipt.filename.split('.')[-1]
        filename = f"inc_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
        
        file_bytes = receipt.file.read()
        supabase.storage.from_("receipts").upload(filename, file_bytes, {"content-type": receipt.content_type})
        receipt_url = f"{SUPABASE_URL}/storage/v1/object/public/receipts/{filename}"

    result = incomes_collection.insert_one({"event_id": event_id, "amount": amount, "source": source, "description": description, "date": date, "receipt_url": receipt_url, "created_at": datetime.utcnow()})
    return {"message": "Pemasukan berhasil dicatat", "id": str(result.inserted_id)}

@app.get("/api/incomes/{event_id}")
def get_incomes(event_id: str, current_user: dict = Depends(get_current_user)):
    cursor = incomes_collection.find({"event_id": event_id}).sort("date", -1)
    return [{"id": str(doc["_id"]), **{k: v for k, v in doc.items() if k != "_id"}} for doc in cursor]

# --- ENDPOINT EXCEL ---
@app.get("/api/export/{event_id}")
def export_excel(event_id: str):
    event = events_collection.find_one({"_id": ObjectId(event_id)})
    if not event: raise HTTPException(status_code=404, detail="Kegiatan tidak ditemukan")
    categories = list(categories_collection.find({"event_id": event_id}))
    expenses = list(expenses_collection.find({"event_id": event_id}))
    incomes = list(incomes_collection.find({"event_id": event_id}))

    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    
    title_format = workbook.add_format({'bold': True, 'font_size': 16, 'align': 'center', 'valign': 'vcenter'})
    subtitle_format = workbook.add_format({'bold': True, 'font_size': 12, 'align': 'center', 'valign': 'vcenter'})
    header_format = workbook.add_format({'bold': True, 'bg_color': '#4F81BD', 'font_color': 'white', 'border': 1, 'align': 'center', 'valign': 'vcenter'})
    border_format = workbook.add_format({'border': 1, 'valign': 'vcenter'})
    date_format = workbook.add_format({'border': 1, 'align': 'center', 'valign': 'vcenter'})
    money_format = workbook.add_format({'border': 1, 'num_format': '_-Rp* #,##0_-;-Rp* #,##0_-;_-Rp* "-"_-;_-@_-', 'valign': 'vcenter'})
    total_money_format = workbook.add_format({'bold': True, 'bg_color': '#D9E1F2', 'border': 1, 'num_format': '_-Rp* #,##0_-;-Rp* #,##0_-;_-Rp* "-"_-;_-@_-'})

    ws_kas = workbook.add_worksheet("Buku Kas")
    ws_kas.set_column('A:A', 15)
    ws_kas.set_column('B:B', 35)
    ws_kas.set_column('C:C', 25)
    ws_kas.set_column('D:F', 20)
    
    ws_kas.merge_range('A1:F1', 'BUKU KAS DOMPET LAPANGAN', title_format)
    ws_kas.merge_range('A2:F2', f'Kegiatan: {event["name"]}', subtitle_format)
    
    headers_kas = ["Tanggal", "Keterangan", "Kategori / Sumber", "Pemasukan", "Pengeluaran", "Saldo"]
    for col, h in enumerate(headers_kas): ws_kas.write(4, col, h, header_format)
        
    cat_map = {str(c["_id"]): c["name"] for c in categories}
    all_trx = []
    
    for inc in incomes: all_trx.append({'date': inc['date'], 'desc': inc['description'], 'cat': inc['source'], 'in': inc['amount'], 'out': 0, 'created': inc['created_at']})
    for exp in expenses: all_trx.append({'date': exp['date'], 'desc': exp['description'], 'cat': cat_map.get(exp['category_id'], 'Lainnya'), 'in': 0, 'out': exp['amount'], 'created': exp['created_at']})
        
    all_trx.sort(key=lambda x: (x['date'], x['created']))
    
    row = 5
    saldo = event.get('initial_cash', 0)
    
    ws_kas.write(row, 0, "-", date_format)
    ws_kas.write(row, 1, "Modal Awal Kegiatan", border_format)
    ws_kas.write(row, 2, "-", border_format)
    ws_kas.write(row, 3, saldo, money_format)
    ws_kas.write(row, 4, 0, money_format)
    ws_kas.write(row, 5, saldo, money_format)
    row += 1
    
    for trx in all_trx:
        saldo += trx['in']
        saldo -= trx['out']
        ws_kas.write(row, 0, trx['date'], date_format)
        ws_kas.write(row, 1, trx['desc'], border_format)
        ws_kas.write(row, 2, trx['cat'], border_format)
        ws_kas.write(row, 3, trx['in'] if trx['in'] > 0 else "-", money_format)
        ws_kas.write(row, 4, trx['out'] if trx['out'] > 0 else "-", money_format)
        ws_kas.write(row, 5, saldo, money_format)
        row += 1

    ws_rekap = workbook.add_worksheet("Rekap Anggaran")
    ws_rekap.set_column('A:A', 5)
    ws_rekap.set_column('B:B', 30)
    ws_rekap.set_column('C:E', 20)
    
    ws_rekap.merge_range('A1:E1', 'REKAPITULASI PAGU ANGGARAN', title_format)
    ws_rekap.merge_range('A2:E2', f'Kegiatan: {event["name"]}', subtitle_format)
    
    headers_rekap = ["No", "Kategori Pagu", "Anggaran", "Terpakai", "Sisa Pagu"]
    for col, h in enumerate(headers_rekap): ws_rekap.write(4, col, h, header_format)
        
    row_rek = 5
    total_anggaran = 0
    total_terpakai = 0
    
    for idx, cat in enumerate(categories):
        sisa = cat['allocated_amount'] - cat['spent_amount']
        ws_rekap.write(row_rek, 0, idx+1, date_format)
        ws_rekap.write(row_rek, 1, cat['name'], border_format)
        ws_rekap.write(row_rek, 2, cat['allocated_amount'], money_format)
        ws_rekap.write(row_rek, 3, cat['spent_amount'], money_format)
        ws_rekap.write(row_rek, 4, sisa, money_format)
        total_anggaran += cat['allocated_amount']
        total_terpakai += cat['spent_amount']
        row_rek += 1
        
    ws_rekap.merge_range(row_rek, 0, row_rek, 1, "TOTAL KESELURUHAN", workbook.add_format({'bold': True, 'bg_color': '#D9E1F2', 'border': 1, 'align': 'center'}))
    ws_rekap.write(row_rek, 2, total_anggaran, total_money_format)
    ws_rekap.write(row_rek, 3, total_terpakai, total_money_format)
    ws_rekap.write(row_rek, 4, total_anggaran - total_terpakai, total_money_format)

    workbook.close()
    output.seek(0)
    filename = f"Laporan_{event['name'].replace(' ', '_')}.xlsx"
    return StreamingResponse(output, headers={'Content-Disposition': f'attachment; filename="{filename}"'}, media_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')