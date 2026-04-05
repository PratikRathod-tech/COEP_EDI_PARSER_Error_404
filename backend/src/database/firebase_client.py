import firebase_admin
from firebase_admin import credentials, firestore
import os
import json
import datetime

class FirebaseEDIClient:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FirebaseEDIClient, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        key_path = os.path.join(os.getcwd(), "serviceAccountKey.json")
        if not os.path.exists(key_path):
            print("[FIREBASE-WARN] serviceAccountKey.json not found. Firestore sync disabled.")
            self.db = None
            self._initialized = True
            return

        try:
            cred = credentials.Certificate(key_path)
            firebase_admin.initialize_app(cred)
            self.db = firestore.client()
            self._initialized = True
            print("[FIREBASE] Firestore client initialized successfully.")
        except Exception as e:
            print(f"[FIREBASE-ERROR] Failed to initialize Firebase: {e}")
            self.db = None
            self._initialized = True

    def upload_data(self, filename, record_type, data):
        """
        Uploads a piece of EDI processing data to Firestore.
        Automatically handles merging into the document for that filename.
        """
        if self.db is None:
            return False

        try:
            # File ID based on filename (slugified)
            doc_id = filename.replace(".", "_")
            doc_ref = self.db.collection("edi_processed_data").document(doc_id)
            
            # Prepare update map
            update_map = {
                "filename": filename,
                "last_updated": firestore.SERVER_TIMESTAMP,
                record_type: data
            }
            
            # Set with merge=True to append new types (e.g. adding summary to existing validation)
            doc_ref.set(update_map, merge=True)
            print(f"[FIREBASE] Successfully synced '{record_type}' for {filename}.")
            return True
        except Exception as e:
            print(f"[FIREBASE-UPLOAD-ERROR] {e}")
            return False

def sync_file_to_firebase(filename, record_type, data_path_or_dict):
    """
    Helper to sync a file's output to Firebase.
    """
    client = FirebaseEDIClient()
    
    data = None
    if isinstance(data_path_or_dict, str):
        if os.path.exists(data_path_or_dict):
            with open(data_path_or_dict, 'r', encoding='utf-8') as f:
                if data_path_or_dict.endswith(".json"):
                    data = json.load(f)
                else:
                    data = f.read()
    else:
        data = data_path_or_dict

    if data:
        client.upload_data(filename, record_type, data)
