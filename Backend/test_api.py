from supabase import create_client

url = "https://ywrtpfmuctnflfbhplmb.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cnRwZm11Y3RuZmxmYmhwbG1iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0Mjc4NDUsImV4cCI6MjA2NjAwMzg0NX0.nPErWM1ydA1syG1NtCAHFHCUTDT2-31rW_4hQFSz7aM"  # Make sure it's anon, not service

supabase = create_client(url, key)

data = {
    "title": "Final Debug",
    "author": "Test",
    "pdf_url": "https://example.com/test.pdf",
    "total_pages": 100,
    "user_id": "guest123"
}


try:
    response = supabase.table("books").insert(data).execute()
    print("✅ Insert success:", response)
except Exception as e:
    print("❌ Insert failed:", e)
