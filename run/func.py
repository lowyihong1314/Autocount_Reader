from .module import db,SQLTable
from sqlalchemy import text
from flask import jsonify
import json

def get_sql_table_data():
    sql = text("""
        SET NOCOUNT ON;
        SET TEXTSIZE 2147483647;

        SELECT CAST((
            SELECT
                (
                    SELECT
                        s.name AS [schema],
                        t.name AS [table],
                        (
                            SELECT
                                c.name AS [name],
                                ty.name AS [type],
                                c.is_nullable AS isNullable
                            FROM sys.columns c
                            JOIN sys.types ty ON c.user_type_id = ty.user_type_id
                            WHERE c.object_id = t.object_id
                            FOR JSON PATH
                        ) AS columns
                    FROM sys.tables t
                    JOIN sys.schemas s ON t.schema_id = s.schema_id
                    JOIN sys.dm_db_partition_stats ps
                    ON ps.object_id = t.object_id
                    AND ps.index_id IN (0, 1)   -- 堆表 or 聚集索引
                    WHERE t.is_ms_shipped = 0
                    GROUP BY s.name, t.name, t.object_id
                    HAVING SUM(ps.row_count) > 0   -- ⭐ 关键：只要不是空表
                    ORDER BY t.name
                    FOR JSON PATH
                ) AS tables,
                (
                    SELECT
                        OBJECT_NAME(fk.parent_object_id) AS fromTable,
                        pc.name AS fromColumn,
                        OBJECT_NAME(fk.referenced_object_id) AS toTable,
                        rc.name AS toColumn,
                        fk.name AS fkName
                    FROM sys.foreign_keys fk
                    JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
                    JOIN sys.columns pc
                        ON fkc.parent_object_id = pc.object_id
                    AND fkc.parent_column_id = pc.column_id
                    JOIN sys.columns rc
                        ON fkc.referenced_object_id = rc.object_id
                    AND fkc.referenced_column_id = rc.column_id
                    FOR JSON PATH
                ) AS relations
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        ) AS NVARCHAR(MAX)) AS json_result;


    """)

    with db.get_engine(bind='sqlserver').connect() as conn:
        json_text = conn.execute(sql).fetchone()[0]

    # 转为 Python dict
    data = json.loads(json_text)

    # 加载 SQLTable 中记录的位置信息
    saved = {t.table_name: t.to_dict() for t in SQLTable.query.all()}

    # 合并位置信息到表结构
    for t in data.get("tables", []):
        vis = saved.get(t["table"])
        if vis:
            t["x"] = vis["x"]
            t["y"] = vis["y"]
            t["w"] = vis["w"]
            t["h"] = vis["h"]
            t["note"] = vis["note"]
            t["hidden"] = vis["hidden"]
    
    return data

def submit_table_location_data(data):
    if not isinstance(data, list):
        return jsonify({"error": "Expected a list of table data"}), 400

    for item in data:
        table_name = item.get("table_name")
        if not table_name:
            continue

        table = SQLTable.query.filter_by(table_name=table_name).first()
        if not table:
            table = SQLTable(table_name=table_name)

        table.pos_x = float(item.get("x", 100))
        table.pos_y = float(item.get("y", 100))
        table.size_w = int(item.get("w", 240))
        table.size_h = int(item.get("h", 120))
        table.note = item.get("note", table.note or "")
        table.hidden = bool(item.get("hidden", False))

        db.session.add(table)

    db.session.commit()

    return data