from fastapi import FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

# Memuat link rahasia dari file .env
load_dotenv()

app = FastAPI(title="Financial Web API")

# Variabel database
MONGODB_URI = os.getenv("MONGODB_URI")
client = None
db = None

@app.on_event("startup")
async def startup_db_client():
    global client, db
    print("Proses menyambungkan ke MongoDB Atlas...")
    # Menggunakan Motor untuk koneksi Async
    client = AsyncIOMotorClient(MONGODB_URI)
    # Membuat/memilih database bernama "keuangan_db"

    db = client.get_database("keuangan_db") 
    print("Berhasil tersambung ke MongoDB Atlas!")

@app.on_event("shutdown")
async def shutdown_db_client():
    print("Menutup koneksi database...")
    client.close()

@app.get("/")
async def root():
    return {"message": "Halo! Backend FastAPI Anda sudah berjalan dengan sempurna."}

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return None