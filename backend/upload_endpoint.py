#!/usr/bin/env python3
"""
Upload endpoint addition for final solution bridge
Proper file upload handling with FastAPI
"""

# AIDEV-NOTE: Add these imports and endpoints to final_solution_bridge.py

from fastapi import UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
import shutil

# Add this endpoint to the main app:

@app.post("/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    """Handle multiple file uploads from frontend."""
    try:
        backend_dir = Path(__file__).parent
        uploaded_files = []
        
        print(f"📤 Receiving {len(files)} files for upload")
        
        for file in files:
            if not file.filename:
                continue
                
            # Validate file type
            allowed_extensions = {'.csv', '.json', '.txt', '.fasta', '.md', '.png', '.jpg', '.jpeg', '.pdf'}
            file_ext = Path(file.filename).suffix.lower()
            
            if file_ext not in allowed_extensions:
                print(f"⚠️ Skipping {file.filename}: unsupported file type")
                continue
            
            # Save file to backend directory
            file_path = backend_dir / file.filename
            
            try:
                with open(file_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                
                file_size = file_path.stat().st_size
                
                uploaded_files.append({
                    "name": file.filename,
                    "size": file_size,
                    "type": file_ext[1:],  # Remove the dot
                    "content_type": file.content_type,
                    "uploaded_at": datetime.now().isoformat(),
                    "path": str(file_path)
                })
                
                print(f"✅ Uploaded: {file.filename} ({file_size} bytes)")
                
            except Exception as file_error:
                print(f"❌ Failed to save {file.filename}: {file_error}")
        
        return {
            "success": True,
            "uploaded_files": uploaded_files,
            "total": len(uploaded_files),
            "message": f"Successfully uploaded {len(uploaded_files)} files"
        }
        
    except Exception as e:
        print(f"❌ Upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upload-single")
async def upload_single_file(file: UploadFile = File(...)):
    """Handle single file upload."""
    try:
        backend_dir = Path(__file__).parent
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename provided")
        
        # Save file
        file_path = backend_dir / file.filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = file_path.stat().st_size
        
        print(f"✅ Single upload: {file.filename} ({file_size} bytes)")
        
        return {
            "success": True,
            "filename": file.filename,
            "size": file_size,
            "type": Path(file.filename).suffix[1:],
            "uploaded_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Single upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Add these to imports at top of file:
# from fastapi import UploadFile, File, Form, HTTPException
# import shutil