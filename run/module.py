from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class SQLTable(db.Model):
    __tablename__ = "sql_table"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)

    table_name = db.Column(db.String(255), nullable=False, unique=True)   # 表名
    note = db.Column(db.String(255), default="", nullable=True)           # 备注说明

    # 坐标信息
    pos_x = db.Column(db.Float, default=100.0, nullable=False)
    pos_y = db.Column(db.Float, default=100.0, nullable=False)

    # 可视化大小（可选）
    size_w = db.Column(db.Integer, default=240, nullable=False)
    size_h = db.Column(db.Integer, default=120, nullable=False)

    # 控制可视化状态
    hidden = db.Column(db.Boolean, default=False, nullable=False)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "table_name": self.table_name,
            "note": self.note,
            "x": self.pos_x,
            "y": self.pos_y,
            "w": self.size_w,
            "h": self.size_h,
            "hidden": self.hidden,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }

    def __repr__(self):
        return f"<SQLTable {self.table_name} ({self.pos_x}, {self.pos_y})>"