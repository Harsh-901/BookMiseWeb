import uuid
from flask import Blueprint, jsonify, request
from .supabase_client import supabase
from supabase import create_client, Client
from datetime import datetime, timedelta, timezone, date

main = Blueprint('main', __name__)

#book
#upload book
@main.route("/api/upload-book", methods=["POST"])
def upload_book():
    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        title = request.form.get("title")
        author = request.form.get("author", "")
        total_pages = request.form.get("total_pages")
        user_id = request.form.get("user_id")

        if not title or not user_id:
            return jsonify({"error": "Missing required fields"}), 400

        try:
            total_pages = int(total_pages)
        except (ValueError, TypeError):
            total_pages = 0

        filename = f"{uuid.uuid4()}.pdf"

        upload_response = supabase.storage.from_("books-pdf").upload(
            path=filename,
            file=file.read(),
            file_options={"content-type": "application/pdf"}
        )

        if hasattr(upload_response,"error") and upload_response.error:
            return jsonify({"error":upload_response.error.message}),500
        print("Upload response:", upload_response)

        public_url = supabase.storage.from_("books-pdf").get_public_url(filename)

        response = supabase.from_("books").insert({
            "title": title,
            "author": author,
            "pdf_url": public_url,
            "total_pages": total_pages,
            "user_id": user_id
        }).execute()

        print("Insert response:", response)

        return jsonify(response.data), 201

    except Exception as e:
        print("🔥 Internal error:", str(e))
        return jsonify({"error": str(e)}), 500

#get book details    
@main.route("/api/books", methods=["GET"])
def get_books():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "Missing user_id"}), 400
    
    try:
        response = supabase.table("books").select("*").eq("user_id", user_id).execute()
        return jsonify(response.data), 200
    except Exception as e:
        print("Error Fetching Books:", e)
        return jsonify({"error": str(e)}), 500

#get book details
@main.route("/api/books/<book_id>", methods=["GET"])
def get_book(book_id):
    try:
        response = supabase.table("books").select("*").eq("id", book_id).single().execute()
        return jsonify(response.data), 200
    except Exception as e:
        print("Error fetching book:", e)
        return jsonify({"error": str(e)}), 500
    
#update book    
@main.route("/api/books/<book_id>", methods=["PUT"])
def update_book(book_id):
    try:
        data = request.get_json()
        fields = {k: v for k, v in data.items() if k in ["title", "author", "total_pages"]}

        if not fields:
            return jsonify({"error": "No valid fields to update"}),400
        
        response = supabase.table("books").update(fields).eq("id", book_id).execute()
        return jsonify(response.data), 200
    except Exception as e:
        print("Error updating book:", e)
        return jsonify({"error": str(e)}), 500
    
#delete book
@main.route("/api/books/<book_id>", methods=["DELETE"])
def delete_book(book_id):
    try:
        book_response = supabase.table("books").select("*").eq("id",book_id).single().execute()
        book=book_response.data
        if not book:
            return jsonify({"error": "Book not found"}), 404
        
        filename = book["pdf_url"].split("/")[-1]
        supabase.storage.from_("books-pdf").remove([filename])

        response = supabase.table("books").delete().eq("id", book_id).execute()
        return jsonify(response.data),200
    
    except Exception as e:
        print("Error deleting book:", e)
        return jsonify({"error": str(e)}), 500

#process
#save progress
@main.route("/api/progrress", methods=["POST"])
def save_progress():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        book_id = data.get("book_id")
        page_no = data.get("page_no")
        
        percent = 0.0
        try:
            page_no = int(data.get("page_no",0))
            book = supabase.table("books").select("total_pages").eq("id", book_id).single().execute().data
            total_pages = int(book["total_pages"]) if book else 0

            if total_pages > 0:
                percent = round((page_no / total_pages)*100,2)

        except Exception as e:
            print("Error calulating progress:", e)

        if not user_id or not book_id:
            return jsonify({"error":"Missing user_id or book_id"}), 400
        
        existing = supabase.table("progress").select("*").eq("user_id",user_id).eq("book_id", book_id).execute().data

        IST = timezone(timedelta(hours=5, minutes=30))

        if existing:
            response = supabase.table("progress").update({
                "page_no":page_no,
                "percent":percent,
                "update_at":datetime.now(IST).isoformat()
            }).eq("user_id", user_id).eq("book_id", book_id).execute()
        else:
            response = supabase.table("progress").insert({
                "user_id":user_id,
                "book_id":book_id,
                "page_no":page_no,
                "percent":percent,
                "update_at":datetime.now(IST).isoformat()
            }).execute()
    
    except Exception as e:
        print("Error saving progress:", e)
        return jsonify({"error": str(e)}), 500
    
#streak
from datetime import datetime, timedelta, date

@main.route("/api/reading-streak", methods=["GET"])
def get_reading_streak():
    try:
        user_id = request.args.get("user_id")
        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400

        logs = supabase.table("reading_logs") \
            .select("date") \
            .eq("user_id", user_id) \
            .order("date", desc=False) \
            .execute().data

        if not logs:
            return jsonify({"streak": 0, "total_days": 0}), 200

        dates = sorted([datetime.strptime(log["date"], "%Y-%m-%d").date() for log in logs])

        today = date.today()
        streak = 0

        for i in range(len(dates) - 1, -1, -1):
            expected_date = today - timedelta(days=(len(dates) - 1 - i))
            if dates[i] == expected_date:
                streak += 1
            else:
                break

        return jsonify({
            "streak": streak,
            "total_days": len(set(dates))
        }), 200

    except Exception as e:
        print("🔥 Error in reading streak:", e)
        return jsonify({"error": str(e)}), 500

#get progress    
@main.route("/api/progress", methods=["GET"])
def get_progress():
    user_id = request.args.get("user_id")
    if not user_id:
        return jsonify({"error": "Missing user_id"}), 400
    
    try:
        response = supabase.table("progress").select("*").eq("user_id", user_id).execute()
        return jsonify(response.data),200
    except Exception as e:
        print("Error getting progress:", e)
        return jsonify({"error": str(e)}), 500
    

#notes
#add note
@main.route("/api/notes", methods=["POST"])
def add_note():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        book_id = data.get("book_id")   
        page_no = data.get("page_no")
        content = data.get("content")
        highlighted_text = data.get("highlighted_text")

        
        if not all([user_id, book_id, page_no, content]):
            return jsonify({"error":"Missing required fields"}), 400
        
        response = supabase.table("notes").insert({
            "user_id":user_id,
            "book_id":book_id,
            "page_no":page_no,
            "content":content,
            "highlighted_text":highlighted_text
        }).execute()

        

        return jsonify(response.data), 201
    except Exception as e:
        print("Error adding note:", e)
        return jsonify({"error": str(e)}), 500

#get notes    
@main.route("/api/notes", methods=["GET"])
def get_notes():
    try:
        user_id = request.args.get("user_id")
        book_id = request.args.get("book_id")
        page_no = request.args.get("page_no")
        pinned = request.args.get("pinned")
        search = request.args.get("search")

        if not user_id:
            return jsonify({"error": "Missing user_id"}), 400
        
        query = supabase.table("notes").select("*").eq("user_id", user_id)

        if book_id:
            query = query.eq("book_id", book_id)
        if page_no:
            query = query.eq("page_no", page_no)
        if pinned is not None:
            query = query.eq("pinned", pinned.lower()==True)
        if search:
            query = query.or_(
                f"content.ilike.%{search}%,highlighted_text.ilike.%{search}%"
            )

        response = query.execute()
        return jsonify(response.data), 200
    
    except Exception as e:
        print("Error filtering notes:",e)
        return jsonify({"error": str(e)}), 500

#delete notes    
@main.route("/api/notes/<note_id>",methods=["DELETE"])
def delete_note(note_id):
    try:
        response = supabase.table("notes").delete().eq("id",note_id).execute()
        return jsonify(response.data),200
    except Exception as e:
        print("Error deleting note:", e)
        return jsonify({"error": str(e)}), 500

#edit notes
@main.route("/api/notes/<note_id>", methods=["POST"])
def edit_note(note_id):
    try:
        data = request.get_json()
        content = data.get("content")
        page_no = data.get("page_no")
        highlighted_text = data.get("highlighted_text")

        update_fields = {}
        if content is not None:
            update_fields["content"] = content
        if page_no is not None:
            update_fields["page_no"] = page_no
        update_fields["updated_at"] = datetime.now(timezone(timedelta(hours = 5,minutes=30))).isoformat()

        if highlighted_text is not None:
            update_fields["highlighted_text"] = highlighted_text

        if not update_fields:
            return jsonify({"error":"No fields to update"}), 400
        
        response = supabase.table("notes").update(update_fields).eq("id", note_id).execute()
        return jsonify(response.data), 200
    
    except Exception as e:
        print("Error editing note:", e)
        return jsonify({"error": str(e)}), 500

#pin note
@main.route("/api/notes/<note_id>/pin", methods=["PATCH"])
def toggle_pin_note(note_id):
    try:
        data = request.get_json()
        pinned = data.get("pinned")
        x = data.get("x")
        y = data.get("y")

        if pinned is None:
            return jsonify({"error": "Missing 'pinned' field(true/false)"}), 400
        
        update_fields = {
            "pinned": pinned,
            "updated_at": datetime.now(timezone(timedelta(hours = 5,minutes=30))).isoformat(),
        }

        if x is not None:
            update_fields["x"] = x
        if y is not None:   
            update_fields["y"] = y
        
        response = supabase.table("notes").update(update_fields).eq("id", note_id).execute()

        return jsonify(response.data), 200
    
    except Exception as e:
        print("Error pinning/unpinning note", e)
        return jsonify({"error": str(e)}), 500

#pomodoro
#pomodoro main
@main.route("/api/pomodoro", methods=["POST"])
def log_pomodoro():
    try:
        data = request.get_json()
        user_id = data.get("user_id")
        book_id = data.get("book_id")
        duration = int(data.get("duration", 25))
        status = data.get("status")

        if not user_id or not book_id:
            return jsonify({"error":"Missing user_id or book_id"}), 400
        
        IST = timezone(timedelta(hours=5, minutes=30))
        start_time = datetime.now(IST)
        end_time = start_time + timedelta(minutes=duration)

        response = supabase.table("pomodoro_sessions").insert({
            "user_id": user_id,
            "book_id": book_id,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "duration": duration,
            "status": status
        }).execute()

        return jsonify(response.data),201
    
    except Exception as e:
        print("Error logging pomodoro:", e)
        return jsonify({"error": str(e)}), 500

#get pomodoro    
@main.route("/api/pomodoro", methods=["GET"])
def get_pomodoro_sessions():
    user_id = request.args.get("user_id")
    book_id = request.args.get("book_id")

    if not user_id or not book_id:
        return jsonify({"error": "Missing user_id or book_id"}), 400

    try:
        response = supabase.table("pomodoro_sessions").select("*")\
            .eq("user_id", user_id).eq("book_id", book_id).order("start_time", desc=True).execute()
        return jsonify(response.data), 200
    except Exception as e:
        print("Error fetching Pomodoro sessions:", e)
        return jsonify({"error": str(e)}), 500

#social media
#posts
#create post
@main.route("/api/posts", methods=["POST"])
def create_post():
    data = request.get_json()
    user_id = data.get("user_id")
    content = data.get("content")
    book_id = data.get("book_id")

    if not user_id or not content:
        return jsonify({"error": "user_id and content are required"}), 400

    insert_data = {
        "user_id": user_id,
        "content": content
    }

    try:
        if book_id:
            uuid.UUID(str(book_id))  # validate UUID
            insert_data["book_id"] = book_id
    except ValueError:
        return jsonify({"error": "Invalid UUID for book_id"}), 400

    try:
        response = supabase.table("posts").insert(insert_data).execute()
        return jsonify(response.data), 201  # success
    except Exception as e:
        return jsonify({"error": str(e)}), 500

#get all post
@main.route("/api/posts", methods=["GET"])
def get_posts():
    try:
        response = supabase.table("posts").select("*").order("created_at", desc=True).execute()
        return jsonify(response.data), 200
    
    except Exception as e:
        print("Error fetching posts:", e)
        return jsonify({"error": str(e)}), 500

#dlt post
@main.route("/api/posts/<post_id>", methods=["DELETE"])
def delete_post(post_id):
    try:
        user_id= request.args.get("user_id")
        q = supabase.table("posts").delete().eq("id", post_id)
        if user_id:
            q = q.eq("user_id", user_id)

        response = q.execute()
        return jsonify({"message": "Post deleted", "result":response.data}), 200
    
    except Exception as e:
        print("error deleting post", e)
        return jsonify({"error":str(e)}), 500

#like/unlike
@main.route("/api/likes", methods=["POST"])
def like_unlike_post():
    data = request.get_json()
    user_id = data.get("user_id")
    post_id = data.get("post_id")

    if not user_id or not post_id:
        return jsonify({"error": "user_id and post_id are required"}), 400

    try:
        existing = supabase.table("likes").select("*") \
            .eq("user_id", user_id).eq("post_id", post_id).execute().data

        post_data = supabase.table("posts").select("like_count").eq("id", post_id).single().execute().data
        current_count = post_data["like_count"] if post_data and "like_count" in post_data else 0

        if existing:
            supabase.table("likes").delete() \
                .eq("user_id", user_id).eq("post_id", post_id).execute()
            supabase.table("posts").update({"like_count": max(current_count - 1, 0)}) \
                .eq("id", post_id).execute()
            return jsonify({"liked": False}), 200
        else:
            supabase.table("likes").insert({
                "user_id": user_id,
                "post_id": post_id
            }).execute()
            supabase.table("posts").update({"like_count": current_count + 1}).eq("id", post_id).execute()
            return jsonify({"liked": True}), 201

    except Exception as e:
        print("Error in like/unlike:", e)
        return jsonify({"error": str(e)}), 500

#comments

# ---------- ADD COMMENT ----------
@main.route("/api/comments", methods=["POST"])
def add_comment():
    data = request.get_json()
    user_id  = data.get("user_id")
    post_id  = data.get("post_id")
    content  = data.get("content")

    if not user_id or not post_id or not content:
        return jsonify({"error": "user_id, post_id and content are required"}), 400

    try:
        resp = supabase.table("comments").insert({
            "user_id": user_id,
            "post_id": post_id,
            "content": content
        }).execute()
        return jsonify(resp.data), 201
    except Exception as e:
        print("Error adding comment:", e)
        return jsonify({"error": str(e)}), 500


# ---------- GET COMMENTS FOR A POST ----------
@main.route("/api/comments", methods=["GET"])
def get_comments():
    post_id = request.args.get("post_id")
    if not post_id:
        return jsonify({"error": "post_id query param required"}), 400

    try:
        resp = (supabase.table("comments")
                         .select("*")
                         .eq("post_id", post_id)
                         .order("created_at", desc=False)
                         .execute())
        return jsonify(resp.data), 200
    except Exception as e:
        print("Error fetching comments:", e)
        return jsonify({"error": str(e)}), 500


# ---------- DELETE COMMENT ----------
@main.route("/api/comments/<comment_id>", methods=["DELETE"])
def delete_comment(comment_id):
    user_id = request.args.get("user_id")  
    try:
        q = supabase.table("comments").delete().eq("id", comment_id)
        if user_id:
            q = q.eq("user_id", user_id)
        resp = q.execute()
        return jsonify(resp.data), 200
    except Exception as e:
        print("Error deleting comment:", e)
        return jsonify({"error": str(e)}), 500
