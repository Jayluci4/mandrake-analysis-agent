"""
S3 File Upload Service - Industry Standard Implementation
Handles file uploads, storage, and lifecycle management using AWS S3
"""

import os
import boto3
import json
import hashlib
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from botocore.exceptions import ClientError, NoCredentialsError
from dotenv import load_dotenv
import uuid
import mimetypes

# Load environment variables
load_dotenv()

class S3FileService:
    """
    Industry-standard S3 file management service with best practices:
    - Pre-signed URLs for direct uploads
    - Organized folder structure
    - Automatic lifecycle management
    - Security validation
    - Metadata tracking
    """

    def __init__(self):
        """Initialize S3 client with credentials from environment."""
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'us-east-1')
        )
        self.bucket_name = os.getenv('MY_S3_BUCKET_NAME')

        # Define folder structure following best practices
        self.folders = {
            'uploads': {
                'pending': 'uploads/pending/',      # Files awaiting processing
                'processed': 'uploads/processed/',  # Successfully processed files
                'failed': 'uploads/failed/'        # Failed processing
            },
            'generated': {
                'plots': 'generated/plots/',       # Matplotlib/seaborn charts
                'data': 'generated/data/',         # CSV, JSON results
                'reports': 'generated/reports/',   # Analysis reports
                'visualizations': 'generated/visualizations/'  # Other visualizations
            },
            'persistent': {
                'archives': 'persistent/archives/',  # Long-term storage
                'models': 'persistent/models/'      # Trained models
            }
        }

        # File type validation rules
        self.allowed_extensions = {
            # Biomedical data formats
            'sequences': ['.fasta', '.fa', '.fastq', '.fq', '.gbk', '.gb'],
            'structures': ['.pdb', '.sdf', '.mol', '.xyz', '.cif'],
            'data': ['.csv', '.tsv', '.json', '.xml', '.h5', '.hdf5'],
            'images': ['.png', '.jpg', '.jpeg', '.tiff', '.svg'],
            'documents': ['.txt', '.md', '.pdf', '.doc', '.docx'],
            'archives': ['.zip', '.tar', '.gz', '.bz2']
        }

        # Size limits by file type (in bytes)
        self.size_limits = {
            'default': 10 * 1024 * 1024,        # 10MB default
            'images': 5 * 1024 * 1024,          # 5MB for images
            'data': 50 * 1024 * 1024,           # 50MB for data files
            'archives': 100 * 1024 * 1024,      # 100MB for archives
            'sequences': 100 * 1024 * 1024      # 100MB for sequence files
        }

    def generate_presigned_url(self, file_name: str, file_type: str,
                              expiration: int = 3600) -> Dict:
        """
        Generate a pre-signed URL for direct client-to-S3 upload.

        Args:
            file_name: Original filename
            file_type: MIME type of the file
            expiration: URL expiration time in seconds (default: 1 hour)

        Returns:
            Dict containing upload URL and metadata
        """
        try:
            # Generate unique key with timestamp to prevent conflicts
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_id = str(uuid.uuid4())[:8]
            file_extension = Path(file_name).suffix

            # Determine folder based on processing status
            s3_key = f"uploads/pending/{timestamp}_{unique_id}_{file_name}"

            # Generate pre-signed POST URL (more secure than PUT)
            response = self.s3_client.generate_presigned_post(
                Bucket=self.bucket_name,
                Key=s3_key,
                Fields={
                    'Content-Type': file_type,
                    'x-amz-meta-original-name': file_name,
                    'x-amz-meta-upload-timestamp': timestamp,
                    'x-amz-meta-unique-id': unique_id
                },
                Conditions=[
                    {'Content-Type': file_type},
                    ['content-length-range', 0, self.get_size_limit(file_extension)]
                ],
                ExpiresIn=expiration
            )

            return {
                'success': True,
                'upload_url': response['url'],
                'fields': response['fields'],
                's3_key': s3_key,
                'expires_in': expiration,
                'metadata': {
                    'original_name': file_name,
                    'unique_id': unique_id,
                    'timestamp': timestamp,
                    'bucket': self.bucket_name
                }
            }

        except ClientError as e:
            return {
                'success': False,
                'error': f"Failed to generate pre-signed URL: {str(e)}"
            }

    def upload_file_direct(self, file_path: str, s3_folder: str = 'uploads/pending/') -> Dict:
        """
        Upload a file directly to S3 (for server-side uploads).

        Args:
            file_path: Local file path
            s3_folder: Target S3 folder

        Returns:
            Upload status and metadata
        """
        try:
            file_name = Path(file_path).name
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            unique_id = str(uuid.uuid4())[:8]

            s3_key = f"{s3_folder}{timestamp}_{unique_id}_{file_name}"

            # Upload with metadata
            with open(file_path, 'rb') as file_data:
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=s3_key,
                    Body=file_data,
                    Metadata={
                        'original-name': file_name,
                        'upload-timestamp': timestamp,
                        'unique-id': unique_id,
                        'file-size': str(os.path.getsize(file_path))
                    },
                    ServerSideEncryption='AES256'  # Enable encryption at rest
                )

            # Generate file URL
            file_url = f"https://{self.bucket_name}.s3.amazonaws.com/{s3_key}"

            return {
                'success': True,
                's3_key': s3_key,
                'url': file_url,
                'metadata': {
                    'original_name': file_name,
                    'unique_id': unique_id,
                    'timestamp': timestamp,
                    'size': os.path.getsize(file_path)
                }
            }

        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }

    def move_file(self, source_key: str, destination_folder: str) -> bool:
        """
        Move file within S3 (e.g., from pending to processed).

        Args:
            source_key: Current S3 key
            destination_folder: Target folder

        Returns:
            Success status
        """
        try:
            file_name = Path(source_key).name
            destination_key = f"{destination_folder}{file_name}"

            # Copy to new location
            self.s3_client.copy_object(
                Bucket=self.bucket_name,
                CopySource={'Bucket': self.bucket_name, 'Key': source_key},
                Key=destination_key
            )

            # Delete from old location
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=source_key
            )

            return True

        except Exception as e:
            print(f"Error moving file: {e}")
            return False

    def list_files(self, folder_path: str, limit: int = 100) -> List[Dict]:
        """
        List files in a specific S3 folder.

        Args:
            folder_path: S3 folder path
            limit: Maximum number of files to return

        Returns:
            List of file metadata
        """
        try:
            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=folder_path,
                MaxKeys=limit
            )

            files = []
            if 'Contents' in response:
                for obj in response['Contents']:
                    # Get object metadata
                    metadata_response = self.s3_client.head_object(
                        Bucket=self.bucket_name,
                        Key=obj['Key']
                    )

                    files.append({
                        'key': obj['Key'],
                        'name': Path(obj['Key']).name,
                        'size': obj['Size'],
                        'last_modified': obj['LastModified'].isoformat(),
                        'metadata': metadata_response.get('Metadata', {}),
                        'url': f"https://{self.bucket_name}.s3.amazonaws.com/{obj['Key']}"
                    })

            return sorted(files, key=lambda x: x['last_modified'], reverse=True)

        except Exception as e:
            print(f"Error listing files: {e}")
            return []

    def generate_download_url(self, s3_key: str, expiration: int = 3600) -> str:
        """
        Generate a pre-signed URL for file download.

        Args:
            s3_key: S3 object key
            expiration: URL expiration in seconds

        Returns:
            Pre-signed download URL
        """
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': s3_key},
                ExpiresIn=expiration
            )
            return url
        except Exception as e:
            print(f"Error generating download URL: {e}")
            return ""

    def delete_old_files(self, folder: str, days_old: int = 2) -> int:
        """
        Delete files older than specified days (cleanup).

        Args:
            folder: S3 folder to clean
            days_old: Age threshold in days

        Returns:
            Number of files deleted
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=days_old)
            deleted_count = 0

            response = self.s3_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=folder
            )

            if 'Contents' in response:
                for obj in response['Contents']:
                    if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
                        self.s3_client.delete_object(
                            Bucket=self.bucket_name,
                            Key=obj['Key']
                        )
                        deleted_count += 1
                        print(f"Deleted old file: {obj['Key']}")

            return deleted_count

        except Exception as e:
            print(f"Error during cleanup: {e}")
            return 0

    def get_size_limit(self, file_extension: str) -> int:
        """Get size limit for file type."""
        ext_lower = file_extension.lower()

        # Check file categories
        for category, extensions in self.allowed_extensions.items():
            if ext_lower in extensions:
                return self.size_limits.get(category, self.size_limits['default'])

        return self.size_limits['default']

    def validate_file(self, file_name: str, file_size: int) -> Tuple[bool, str]:
        """
        Validate file type and size.

        Returns:
            (is_valid, error_message)
        """
        file_extension = Path(file_name).suffix.lower()

        # Check if extension is allowed
        allowed = False
        for category, extensions in self.allowed_extensions.items():
            if file_extension in extensions:
                allowed = True
                break

        if not allowed:
            return False, f"File type {file_extension} not allowed"

        # Check size limit
        size_limit = self.get_size_limit(file_extension)
        if file_size > size_limit:
            return False, f"File size exceeds limit ({file_size} > {size_limit} bytes)"

        return True, ""

    def setup_lifecycle_policies(self):
        """
        Set up S3 lifecycle policies for automatic cleanup.
        Note: S3 Express One Zone doesn't support transitions, only expiration.
        """
        lifecycle_config = {
            'Rules': [
                {
                    'ID': 'cleanup-pending-uploads',
                    'Status': 'Enabled',
                    'Filter': {'Prefix': 'uploads/pending/'},
                    'Expiration': {
                        'Days': 2  # Delete pending uploads after 2 days
                    }
                },
                {
                    'ID': 'cleanup-failed-uploads',
                    'Status': 'Enabled',
                    'Filter': {'Prefix': 'uploads/failed/'},
                    'Expiration': {
                        'Days': 2  # Delete failed uploads after 2 days
                    }
                },
                {
                    'ID': 'cleanup-processed-uploads',
                    'Status': 'Enabled',
                    'Filter': {'Prefix': 'uploads/processed/'},
                    'Expiration': {
                        'Days': 7  # Keep processed files for 7 days
                    }
                },
                {
                    'ID': 'cleanup-generated-files',
                    'Status': 'Enabled',
                    'Filter': {'Prefix': 'generated/'},
                    'Expiration': {
                        'Days': 30  # Delete generated files after 30 days
                    }
                }
                # Note: persistent/ folder has no expiration - manual management only
            ]
        }

        try:
            self.s3_client.put_bucket_lifecycle_configuration(
                Bucket=self.bucket_name,
                LifecycleConfiguration=lifecycle_config
            )
            print("✅ Lifecycle policies configured successfully")
            return True
        except Exception as e:
            print(f"❌ Failed to set lifecycle policies: {e}")
            return False


# Singleton instance
s3_service = S3FileService()