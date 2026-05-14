import csv
import io
import structlog
from typing import List, Dict, Optional
from app.db.database import get_db_connection

log = structlog.get_logger()

class AssetService:
    def get_assets(self) -> List[Dict]:
        conn = get_db_connection()
        try:
            rows = conn.execute("SELECT * FROM assets ORDER BY created_at DESC").fetchall()
            return [dict(r) for r in rows]
        finally:
            conn.close()

    def get_asset_by_ip(self, ip_address: str) -> Optional[Dict]:
        if not ip_address:
            return None
        conn = get_db_connection()
        try:
            row = conn.execute("SELECT * FROM assets WHERE ip_address = ?", (ip_address,)).fetchone()
            return dict(row) if row else None
        finally:
            conn.close()

    def process_csv_upload(self, file_content: bytes) -> dict:
        """Process a CSV file and upsert assets."""
        decoded = file_content.decode('utf-8')
        reader = csv.DictReader(io.StringIO(decoded))
        
        assets_imported = 0
        conn = get_db_connection()
        try:
            for row in reader:
                # Basic mapping (expecting typical headers, converting to lowercase with underscores)
                normalized_row = {k.strip().lower().replace(' ', '_'): v.strip() for k, v in row.items() if k}
                
                ip_address = normalized_row.get('ip_address') or normalized_row.get('ip')
                hostname = normalized_row.get('hostname') or normalized_row.get('host')
                
                if not ip_address and not hostname:
                    continue # Skip invalid rows
                    
                # Upsert logic based on IP (or Hostname)
                existing = None
                if ip_address:
                    existing = conn.execute("SELECT id FROM assets WHERE ip_address = ?", (ip_address,)).fetchone()
                
                if existing:
                    conn.execute("""
                        UPDATE assets 
                        SET hostname=?, asset_type=?, owner=?, department=?, criticality=?, vendor=?, model=?, location=?, tags=?, os=?, environment=?, business_unit=?
                        WHERE id=?
                    """, (
                        hostname,
                        normalized_row.get('asset_type', ''),
                        normalized_row.get('owner', ''),
                        normalized_row.get('department', ''),
                        normalized_row.get('criticality', 'Medium'),
                        normalized_row.get('vendor', ''),
                        normalized_row.get('model', ''),
                        normalized_row.get('location', ''),
                        normalized_row.get('tags', ''),
                        normalized_row.get('os', ''),
                        normalized_row.get('environment', ''),
                        normalized_row.get('business_unit', ''),
                        existing['id']
                    ))
                else:
                    conn.execute("""
                        INSERT INTO assets (hostname, ip_address, asset_type, owner, department, criticality, vendor, model, location, tags, os, environment, business_unit)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        hostname,
                        ip_address,
                        normalized_row.get('asset_type', ''),
                        normalized_row.get('owner', ''),
                        normalized_row.get('department', ''),
                        normalized_row.get('criticality', 'Medium'),
                        normalized_row.get('vendor', ''),
                        normalized_row.get('model', ''),
                        normalized_row.get('location', ''),
                        normalized_row.get('tags', ''),
                        normalized_row.get('os', ''),
                        normalized_row.get('environment', ''),
                        normalized_row.get('business_unit', '')
                    ))
                assets_imported += 1
            
            conn.commit()
            log.info("assets_imported", count=assets_imported)
            return {"status": "success", "imported": assets_imported}
        except Exception as e:
            log.error("asset_import_error", error=str(e))
            conn.rollback()
            raise e
        finally:
            conn.close()

asset_service = AssetService()
