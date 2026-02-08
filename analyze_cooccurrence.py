import sqlite3

DB_PATH = "/Users/minzi/Downloads/jmail_explorer/jmail.db"

def run_query(conn, query, title):
    print(f"\n--- {title} ---")
    try:
        cursor = conn.cursor()
        cursor.execute(query)
        rows = cursor.fetchall()
        colnames = [description[0] for description in cursor.description]
        
        # Print header
        print(" | ".join(colnames))
        print("-" * (len(" | ".join(colnames)) + 4))
        
        for row in rows:
            print(" | ".join(str(val) for val in row))
    except Exception as e:
        print(f"Error: {e}")

def main():
    conn = sqlite3.connect(DB_PATH)
    
    # 1. Find threads with 3+ unique participants (senders + recipients).
    query1 = """
    WITH participants AS (
        SELECT m.doc_id, m.sender_email as email
        FROM messages m
        UNION
        SELECT m.doc_id, r.address as email
        FROM messages m
        JOIN recipients r ON m.id = r.message_id
    )
    SELECT COUNT(*) as thread_count
    FROM (
        SELECT doc_id
        FROM participants
        GROUP BY doc_id
        HAVING COUNT(DISTINCT email) >= 3
    );
    """
    run_query(conn, query1, "Threads with 3+ unique participants")

    # 2. Most common co-participants (non-Epstein)
    query2 = """
    WITH participants AS (
        SELECT m.doc_id, m.sender_email as email
        FROM messages m
        JOIN entities e ON m.sender_email = e.email
        WHERE e.is_epstein = 0
        UNION
        SELECT m.doc_id, r.address as email
        FROM messages m
        JOIN recipients r ON m.id = r.message_id
        JOIN entities e ON r.address = e.email
        WHERE e.is_epstein = 0
    )
    SELECT p1.email as person1, p2.email as person2, COUNT(DISTINCT p1.doc_id) as shared_threads
    FROM participants p1
    JOIN participants p2 ON p1.doc_id = p2.doc_id AND p1.email < p2.email
    GROUP BY p1.email, p2.email
    ORDER BY shared_threads DESC
    LIMIT 20;
    """
    run_query(conn, query2, "Top 20 non-Epstein co-participant pairs")

    # 3. Threads with messages from 2+ distinct senders
    query3 = """
    SELECT COUNT(*) as thread_count
    FROM (
        SELECT doc_id
        FROM messages
        GROUP BY doc_id
        HAVING COUNT(DISTINCT sender_email) >= 2
    );
    """
    run_query(conn, query3, "Threads with 2+ distinct senders")

    # 4. Distinct threads per entity (top 30)
    query4 = """
    WITH participants AS (
        SELECT m.doc_id, m.sender_email as email
        FROM messages m
        UNION
        SELECT m.doc_id, r.address as email
        FROM messages m
        JOIN recipients r ON m.id = r.message_id
    )
    SELECT email, COUNT(DISTINCT doc_id) as thread_count
    FROM participants
    GROUP BY email
    ORDER BY thread_count DESC
    LIMIT 30;
    """
    run_query(conn, query4, "Top 30 entities by distinct thread count")

    # 5. Bridge entities
    query5 = """
    WITH participants AS (
        SELECT m.doc_id, m.sender_email as email
        FROM messages m
        UNION
        SELECT m.doc_id, r.address as email
        FROM messages m
        JOIN recipients r ON m.id = r.message_id
    )
    SELECT p1.email, COUNT(DISTINCT p2.email) as unique_co_participants
    FROM participants p1
    JOIN participants p2 ON p1.doc_id = p2.doc_id AND p1.email != p2.email
    GROUP BY p1.email
    ORDER BY unique_co_participants DESC
    LIMIT 30;
    """
    run_query(conn, query5, "Top 30 'Bridge' entities (unique co-participants)")

    conn.close()

if __name__ == "__main__":
    main()
