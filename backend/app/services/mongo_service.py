from pymongo import MongoClient
from app.config import settings

client = MongoClient(settings.MONGODB_URI)
db = client.medical_chatbot

users_collection = db.users
profiles_collection = db.profiles
chats_collection = db.chats
reports_collection = db.reports