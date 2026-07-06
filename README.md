# COEP_EDI_PARSER_Error_404
Building a project based on problem statement 2 of COEP Hackthon 
# EDI Parser System

An end-to-end web application for parsing Electronic Data Interchange (EDI) files and converting them into structured JSON format. The application automates data extraction, validation, and error handling to simplify the processing of EDI transactions.

## Features

- Upload EDI files through an intuitive React-based web interface.
- Parse EDI transactions (X12/EDIFACT).
- Convert EDI data into structured JSON.
- Validate EDI file format and detect errors.
- Display parsed output in a user-friendly interface.
- Download parsed JSON results.
- FastAPI-powered backend for efficient processing.

## Tech Stack

### Frontend
- React.js
- HTML5
- CSS3
- JavaScript

### Backend
- Python
- FastAPI

### Data Formats
- EDI (X12/EDIFACT)
- JSON

## Project Structure

```
EDI-Parser-System/
│
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
│
├── backend/
│   ├── main.py
│   ├── parser.py
│   ├── requirements.txt
│   └── utils/
│
└── README.md
```

## Workflow

1. Upload an EDI file.
2. Backend validates the file.
3. Parse EDI segments.
4. Extract transaction data.
5. Convert parsed data into JSON.
6. Display JSON output.
7. Download the converted file.

## Installation

### Clone Repository

```bash
git clone https://github.com/yourusername/EDI-Parser-System.git
cd EDI-Parser-System
```

## Backend Setup

```bash
cd backend

python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt

uvicorn main:app --reload
```

Backend runs at:

```
http://localhost:8000
```

## Frontend Setup

```bash
cd frontend

npm install

npm start
```

Frontend runs at:

```
http://localhost:3000
```

## API Endpoint

### Parse EDI File

**POST**

```
/parse
```

### Request

Upload an EDI file using multipart/form-data.

### Response

```json
{
    "transaction_set": "850",
    "purchase_order": {
        "buyer": "ABC Corporation",
        "seller": "XYZ Suppliers",
        "items": [
            {
                "item": "Laptop",
                "quantity": 5,
                "price": 45000
            }
        ]
    }
}
```

## Key Highlights

- Automated extraction of 500+ EDI transaction records.
- Reduced manual processing effort through automation.
- Implemented validation and robust error handling.
- Converts complex EDI files into developer-friendly JSON.
- Built using a scalable FastAPI backend with a responsive React frontend.

## Future Enhancements

- Support additional EDI standards.
- Batch processing of multiple EDI files.
- User authentication.
- Export to CSV and XML.
- Database integration.
- Dashboard for transaction history.
